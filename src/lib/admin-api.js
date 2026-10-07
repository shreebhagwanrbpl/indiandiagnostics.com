import "server-only";

import { WEBSITE_ID, COMPANY_ID } from "./catalog-utils";

export const ADMIN_API_BASE_URL = (
  process.env.ADMIN_API_BASE_URL ||
  process.env.ADMIN_API_URL ||
  "https://admin.rajbiosis.app"
).replace(/\/+$/, "");

// High-performance server-side in-memory cache & request deduplication
const serverCache = new Map();
const inFlightServerRequests = new Map();
const SERVER_CACHE_TTL_MS = 60 * 1000; // 60 seconds

function buildUrl(pathname, params = {}) {
  const path = String(pathname || "");
  const url = new URL(
    `${ADMIN_API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`
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

export async function adminFetch(pathname, options = {}, params = {}) {
  const isGet = !options.method || options.method === "GET";
  const targetUrl = buildUrl(pathname, params).toString();

  // Return from in-memory cache if available and fresh
  if (isGet) {
    const cached = serverCache.get(targetUrl);
    if (cached && Date.now() - cached.timestamp < SERVER_CACHE_TTL_MS) {
      return cached.data;
    }
    if (inFlightServerRequests.has(targetUrl)) {
      return inFlightServerRequests.get(targetUrl);
    }
  }

  const fetchPromise = (async () => {
    try {
      const response = await fetch(targetUrl, {
        ...options,
        next: isGet ? { revalidate: 60 } : undefined,
        cache: isGet ? "default" : "no-store",
        headers: {
          Accept: "application/json",
          ...(options.headers || {}),
        },
      });

      const text = await response.text();
      let body = null;
      try { body = text ? JSON.parse(text) : null; }
      catch { body = text; }

      if (!response.ok || body?.success === false || body?.ok === false) {
        // Return stale cache on server error if available
        if (isGet && serverCache.has(targetUrl)) {
          return serverCache.get(targetUrl).data;
        }
        const message = typeof body === "string" ? body : JSON.stringify(body);
        throw new Error(`Admin API ${response.status}: ${message}`);
      }

      if (isGet) {
        serverCache.set(targetUrl, { data: body, timestamp: Date.now() });
      }

      return body;
    } catch (err) {
      if (isGet && serverCache.has(targetUrl)) {
        return serverCache.get(targetUrl).data;
      }
      throw err;
    } finally {
      if (isGet) {
        inFlightServerRequests.delete(targetUrl);
      }
    }
  })();

  if (isGet) {
    inFlightServerRequests.set(targetUrl, fetchPromise);
  }

  return fetchPromise;
}

export async function postAdminQuery(endpoint, payload = {}) {
  return adminFetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      websiteId: WEBSITE_ID,
      companyId: COMPANY_ID,
      ...payload,
    }),
  });
}

export async function fetchCatalogFromAdmin() {
  const response = await adminFetch("/api/catalog");
  const products =
    response?.products ??
    response?.data?.products ??
    response?.data ??
    response;
  return Array.isArray(products) ? products : [];
}
