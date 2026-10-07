const clientCache = new Map();
const inFlight = new Map();
const CACHE_TTL_MS = 60 * 1000;

const parseResponse = async (response) => {
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok || body?.ok === false) {
    const message = typeof body === "string" ? body : JSON.stringify(body);
    throw new Error(`API ${response.status}: ${message}`);
  }
  return body;
};

const get = async (url) => {
  const cached = clientCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  if (inFlight.has(url)) {
    return inFlight.get(url);
  }

  const p = (async () => {
    try {
      const res = await fetch(url, { cache: "default", headers: { Accept: "application/json" } });
      const data = await parseResponse(res);
      clientCache.set(url, { data, timestamp: Date.now() });
      return data;
    } catch (err) {
      if (clientCache.has(url)) return clientCache.get(url).data;
      throw err;
    } finally {
      inFlight.delete(url);
    }
  })();

  inFlight.set(url, p);
  return p;
};

export async function fetchDocCached(path) {
  try { return await get(`/api/site-data?path=${encodeURIComponent(path)}`); }
  catch (error) { console.error(`[data-fetcher] ${path}`, error); return null; }
}

export async function fetchFullCatalog() {
  try {
    const body = await get("/api/catalog");
    const products = body?.products ?? body?.data?.products ?? body?.data ?? body;
    return Array.isArray(products) ? products : [];
  } catch (error) {
    console.error("[data-fetcher] catalog", error);
    return [];
  }
}

export const fetchHomeData = () => fetchDocCached("__website__/pages/home");
export const fetchContactData = () => fetchDocCached("__website__/pages/contact");
export const fetchServicesData = () => fetchDocCached("__website__/pages/services");
export const fetchDistrictData = (district) => fetchDocCached(`__website__/districts/${encodeURIComponent(district || "")}`);

export async function fetchAllDistricts() {
  try { return await get("/api/site-data?districts=1"); }
  catch (error) { console.error("[data-fetcher] districts", error); return []; }
}

export const fetchActiveDistricts = fetchAllDistricts;

export function subscribeToCatalog(onUpdate, intervalMs = 60000) {
  let active = true;
  let lastSignature = "";

  const emit = async () => {
    try {
      const products = await fetchFullCatalog();
      if (!active) return;
      const signature = JSON.stringify(products.map((p) => [p.id, p.slug, p.updatedAt, p.updated_at]));
      if (signature !== lastSignature) {
        lastSignature = signature;
        onUpdate(products);
      }
    } catch (error) {
      console.error("[data-fetcher] catalog polling", error);
    }
  };

  emit();
  const timer = setInterval(emit, intervalMs);
  return () => { active = false; clearInterval(timer); };
}
