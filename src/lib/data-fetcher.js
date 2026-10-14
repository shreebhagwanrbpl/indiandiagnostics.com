const clientMemoryCache = new Map();
const inFlightRequests = new Map();
const CLIENT_CACHE_TTL = 60 * 1000; // 60 seconds
const CLIENT_STALE_TTL = 5 * 60 * 1000; // 5 minutes

const parseResponse = async (response) => {
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok || body?.ok === false) {
    const message = typeof body === "string" ? body : JSON.stringify(body);
    throw new Error(`API ${response.status}: ${message}`);
  }
  return body;
};

const rawGet = (url) =>
  fetch(url, {
    headers: { Accept: "application/json" },
  }).then(parseResponse);

const get = async (url) => {
  const now = Date.now();
  const cached = clientMemoryCache.get(url);

  // 1. Fresh cache hit
  if (cached && now - cached.timestamp < CLIENT_CACHE_TTL) {
    return cached.data;
  }

  // 2. Stale cache exists -> return stale, refresh in background
  if (cached && now - cached.timestamp < CLIENT_STALE_TTL) {
    if (!inFlightRequests.has(url)) {
      const bgPromise = rawGet(url)
        .then((fresh) => {
          clientMemoryCache.set(url, { data: fresh, timestamp: Date.now() });
          return fresh;
        })
        .catch((err) => {
          console.warn(`[client data-fetcher] Background refresh failed for ${url}:`, err);
        })
        .finally(() => {
          inFlightRequests.delete(url);
        });
      inFlightRequests.set(url, bgPromise);
    }
    return cached.data;
  }

  // 3. Request deduplication
  if (inFlightRequests.has(url)) {
    return inFlightRequests.get(url);
  }

  const reqPromise = rawGet(url)
    .then((data) => {
      clientMemoryCache.set(url, { data, timestamp: Date.now() });
      return data;
    })
    .catch((err) => {
      if (cached?.data) {
        return cached.data;
      }
      throw err;
    })
    .finally(() => {
      inFlightRequests.delete(url);
    });

  inFlightRequests.set(url, reqPromise);
  return reqPromise;
};

export async function fetchDocCached(path) {
  try {
    return await get(`/api/site-data?path=${encodeURIComponent(path)}`);
  } catch (error) {
    console.error(`[data-fetcher] ${path}`, error);
    return null;
  }
}

export async function fetchFullCatalogData(forceFresh = false) {
  try {
    const url = forceFresh ? `/api/catalog?fresh=1&t=${Date.now()}` : "/api/catalog";
    const body = await (forceFresh ? rawGet(url) : get(url));
    const products = body?.products ?? body?.data?.products ?? body?.data ?? body;
    const categories = body?.categories ?? body?.data?.categories ?? [];
    return {
      products: Array.isArray(products) ? products : [],
      categories: Array.isArray(categories) ? categories : [],
    };
  } catch (error) {
    console.error("[data-fetcher] catalog data", error);
    return { products: [], categories: [] };
  }
}

export async function fetchFullCatalog(forceFresh = false) {
  const data = await fetchFullCatalogData(forceFresh);
  return data.products;
}

export const fetchHomeData = () => fetchDocCached("__website__/pages/home");
export const fetchContactData = () => fetchDocCached("__website__/pages/contact");
export const fetchServicesData = () => fetchDocCached("__website__/pages/services");
export const fetchDistrictData = (district) =>
  fetchDocCached(`__website__/districts/${encodeURIComponent(district || "")}`);

export async function fetchAllDistricts() {
  try {
    return await get("/api/site-data?districts=1");
  } catch (error) {
    console.error("[data-fetcher] districts", error);
    return [];
  }
}

export const fetchActiveDistricts = fetchAllDistricts;

export function subscribeToCatalog(onUpdate, intervalMs = 3000) {
  let active = true;
  let lastSignature = "";

  const emit = async (forceFresh = false) => {
    if (typeof document !== "undefined" && document.hidden && !forceFresh) return;
    try {
      const { products, categories } = await fetchFullCatalogData(forceFresh);
      if (!active) return;
      const signature = JSON.stringify({
        p: products.map((p) => [p.id, p.slug, p.isPublished, p.status, p.category, p.subCategory, p.updatedAt]),
        c: categories.map((c) => [c.id, c.slug, c.name, (c.subcategories || []).length]),
      });
      if (signature !== lastSignature) {
        lastSignature = signature;
        onUpdate({ products, categories });
      }
    } catch (error) {
      console.error("[data-fetcher] catalog polling", error);
    }
  };

  emit(false);
  const timer = setInterval(() => emit(false), intervalMs);

  const handleLiveSync = () => {
    emit(true);
  };

  if (typeof window !== "undefined") {
    window.addEventListener("focus", handleLiveSync);
  }
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") handleLiveSync();
    });
  }

  return () => {
    active = false;
    clearInterval(timer);
    if (typeof window !== "undefined") {
      window.removeEventListener("focus", handleLiveSync);
    }
  };
}
