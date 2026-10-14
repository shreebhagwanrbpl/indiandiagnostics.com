import "server-only";

import { WEBSITE_ID, COMPANY_ID } from "./catalog-utils";

export const ADMIN_API_BASE_URL = (
  process.env.ADMIN_API_BASE_URL ||
  process.env.ADMIN_API_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://admin.rajbiosis.app")
).replace(/\/+$/, "");

export const FALLBACK_ADMIN_BASE_URL = (
  ADMIN_API_BASE_URL.includes("localhost") || ADMIN_API_BASE_URL.includes("127.0.0.1")
    ? "https://admin.rajbiosis.app"
    : "http://localhost:3000"
).replace(/\/+$/, "");

// High-speed In-Memory Cache with Stale-While-Revalidate
const memoryCache = new Map();
const inFlightRequests = new Map();

const CACHE_TTL_MS = 60 * 1000; // 60 seconds fresh TTL
const STALE_TTL_MS = 10 * 60 * 1000; // 10 minutes stale-while-revalidate window

function buildUrl(pathname, params = {}, baseUrl = ADMIN_API_BASE_URL) {
  const path = String(pathname || "");
  const url = new URL(
    `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`
  );

  const query = {
    websiteId: WEBSITE_ID,
    companyId: COMPANY_ID,
    ...params,
  };

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

async function executeAdminFetch(urlStr, options = {}, timeoutMs = 6000) {
  const isGet = !options.method || options.method.toUpperCase() === "GET";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(urlStr, {
      ...options,
      signal: controller.signal,
      ...(isGet ? { next: { revalidate: 60 } } : { cache: "no-store" }),
      headers: {
        Accept: "application/json",
        ...(options.headers || {}),
      },
    });

    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    if (!response.ok || body?.success === false || body?.ok === false) {
      const message = typeof body === "string" ? body : JSON.stringify(body);
      throw new Error(`Admin API ${response.status}: ${message}`);
    }

    return body;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithFallback(pathname, options = {}, params = {}) {
  const primaryUrl = buildUrl(pathname, params, ADMIN_API_BASE_URL).toString();
  try {
    const data = await executeAdminFetch(primaryUrl, options);
    // If requesting catalog and primary returned 0 products, try fallback if available
    if (
      pathname.includes("/api/catalog") &&
      Array.isArray(data?.products) &&
      data.products.length === 0 &&
      FALLBACK_ADMIN_BASE_URL &&
      FALLBACK_ADMIN_BASE_URL !== ADMIN_API_BASE_URL
    ) {
      try {
        const fallbackUrl = buildUrl(pathname, params, FALLBACK_ADMIN_BASE_URL).toString();
        const fallbackData = await executeAdminFetch(fallbackUrl, options, 4000);
        if (Array.isArray(fallbackData?.products) && fallbackData.products.length > 0) {
          return fallbackData;
        }
      } catch {
        // Fallback failed, keep primary data
      }
    }
    return data;
  } catch (primaryErr) {
    if (FALLBACK_ADMIN_BASE_URL && FALLBACK_ADMIN_BASE_URL !== ADMIN_API_BASE_URL) {
      try {
        const fallbackUrl = buildUrl(pathname, params, FALLBACK_ADMIN_BASE_URL).toString();
        return await executeAdminFetch(fallbackUrl, options, 4000);
      } catch {
        // Fallback failed too
      }
    }
    throw primaryErr;
  }
}

export async function adminFetch(pathname, options = {}, params = {}) {
  const isGet = !options.method || options.method.toUpperCase() === "GET";

  if (!isGet) {
    return fetchWithFallback(pathname, options, params);
  }

  const cacheKey = buildUrl(pathname, params, ADMIN_API_BASE_URL).toString();
  const now = Date.now();

  if (options.fresh) {
    memoryCache.delete(cacheKey);
    inFlightRequests.delete(cacheKey);
  }

  const cached = memoryCache.get(cacheKey);
  const isCatalog = pathname.includes("/api/catalog");
  const effectiveCacheTTL = isCatalog ? 1000 : CACHE_TTL_MS;
  const effectiveStaleTTL = isCatalog ? 2000 : STALE_TTL_MS;

  // 1. Fresh cache hit -> Return immediately (0ms)
  if (cached && now - cached.timestamp < effectiveCacheTTL) {
    return cached.data;
  }

  // 2. Stale cache exists -> Return stale immediately, trigger background refresh
  if (cached && now - cached.timestamp < effectiveStaleTTL) {
    if (!inFlightRequests.has(cacheKey)) {
      const backgroundPromise = fetchWithFallback(pathname, options, params)
        .then((freshData) => {
          memoryCache.set(cacheKey, { data: freshData, timestamp: Date.now() });
          return freshData;
        })
        .catch(() => {
          // Silent background fallback
        })
        .finally(() => {
          inFlightRequests.delete(cacheKey);
        });
      inFlightRequests.set(cacheKey, backgroundPromise);
    }
    return cached.data;
  }

  // 3. No cache or completely expired -> Deduplicate in-flight requests
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const fetchPromise = fetchWithFallback(pathname, options, params)
    .then((data) => {
      memoryCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    })
    .catch((err) => {
      // If we have any cached data at all, return it on failure
      if (cached?.data) {
        return cached.data;
      }
      return null;
    })
    .finally(() => {
      inFlightRequests.delete(cacheKey);
    });

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

export async function postAdminQuery(endpoint, payload = {}) {
  const body = JSON.stringify({
    websiteId: WEBSITE_ID,
    companyId: COMPANY_ID,
    ...payload,
  });

  const primaryUrl = buildUrl(endpoint, {}, ADMIN_API_BASE_URL).toString();
  try {
    return await executeAdminFetch(
      primaryUrl,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      },
      2500
    );
  } catch (primaryErr) {
    if (FALLBACK_ADMIN_BASE_URL && FALLBACK_ADMIN_BASE_URL !== ADMIN_API_BASE_URL) {
      try {
        const fallbackUrl = buildUrl(endpoint, {}, FALLBACK_ADMIN_BASE_URL).toString();
        return await executeAdminFetch(
          fallbackUrl,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          },
          1500
        );
      } catch {
        // Fallback failed
      }
    }
    throw primaryErr;
  }
}

export async function fetchCatalogDataFromAdmin(options = {}) {
  const response = await adminFetch("/api/catalog", options);
  const payload = response?.data && !response?.products && !response?.categories
    ? response.data
    : response;

  return {
    categories: Array.isArray(payload?.categories) ? payload.categories : [],
    products: Array.isArray(payload?.products)
      ? payload.products
      : Array.isArray(payload?.data?.products)
        ? payload.data.products
        : Array.isArray(payload?.data)
          ? payload.data
          : [],
  };
}

export async function fetchCatalogFromAdmin(options = {}) {
  const catalog = await fetchCatalogDataFromAdmin(options);
  return catalog.products;
}
