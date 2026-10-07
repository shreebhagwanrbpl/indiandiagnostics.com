import { fetchFullCatalog } from "@/lib/data-fetcher";

let cachedProducts = null;
let lastFetchTime = 0;
const PRODUCTS_CACHE_TTL_MS = 60 * 1000; // 60 seconds

export function normalizeProduct(item, defaultCategory = "Diagnostic Equipment") {
  if (!item || typeof item !== "object") return null;
  const title = String(item.title || item.name || item.productName || item.itemName || "").trim();
  if (!title) return null;
  const slug = item.slug || item.productSlug || item.itemSlug || title.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
  const image = item.image || item.imgUrl || item.imageUrl || (Array.isArray(item.images) ? item.images[0] : "") || "";
  const images = Array.isArray(item.images) && item.images.length ? item.images : image ? [image] : [];
  const features = Array.isArray(item.features) ? item.features.filter(Boolean) : typeof item.features === "string" ? item.features.split(",").map((f) => f.trim()).filter(Boolean) : [];
  return { ...item, id: item.uid || item.id || item.categoryProductId || slug, categoryProductId: item.categoryProductId || "", title, slug, category: item.category || item.categoryName || defaultCategory, subCategory: item.subCategory || item["sub category"] || item.subCategoryName || "", description: item.desc || item.description || item.detail || item.summary || "", desc: item.desc || item.description || "", price: item.price || "", capacity: item.capacity || "", throughput: item.throughput || "", instrument: item.instrument || "", model: item.model || "", usage: item.usage || "", brand: item.brand || "", parameters: item.parameters || "", automation: item.automation || "", availability: item.availability || item.status || "", size: item.size || "", features, specs: item.specs && typeof item.specs === "object" ? item.specs : null, badge: item.badge || item.tag || "", status: item.status || item.availability || "In Stock", image, images, video: item.video || "", pdf: item.pdf || "", isPublished: item.isPublished !== false };
}

export async function fetchAllDynamicProducts(force = false) {
  try {
    if (!force && cachedProducts && Date.now() - lastFetchTime < PRODUCTS_CACHE_TTL_MS) {
      return cachedProducts;
    }
    const products = await fetchFullCatalog();
    const normalized = Array.isArray(products) ? products.map((item) => normalizeProduct(item)).filter(Boolean) : [];
    if (normalized.length > 0) {
      cachedProducts = normalized;
      lastFetchTime = Date.now();
    }
    return normalized.length > 0 ? normalized : (cachedProducts || []);
  } catch (error) {
    console.error("Error fetching products from Admin API:", error);
    return cachedProducts || [];
  }
}
