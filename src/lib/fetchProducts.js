import { fetchFullCatalog } from "@/lib/data-fetcher";

export function normalizeProduct(item, defaultCategory = "Diagnostic Equipment") {
  if (!item || typeof item !== "object") return null;

  const textValue = (...values) => {
    for (const value of values) {
      if (typeof value === "string" && value.trim()) return value.trim();
      if (typeof value === "number" && Number.isFinite(value)) return String(value);
      if (value && typeof value === "object") {
        const nested = textValue(value.name, value.title, value.label, value.value);
        if (nested) return nested;
      }
    }
    return "";
  };

  const title = textValue(item.title, item.name, item.productName, item.itemName);
  if (!title) return null;

  const category = textValue(item.category, item.categoryName, item.category_name, item.categoryTitle, item.category_label) || defaultCategory;
  const subCategory = textValue(item.subCategory, item.subcategory, item.subCategoryName, item.subcategoryName, item.sub_category, item["sub category"]);
  const slug = item.slug || item.productSlug || item.itemSlug || title.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
  const image = item.image || item.imgUrl || item.imageUrl || (Array.isArray(item.images) ? item.images[0] : "") || "";
  const images = Array.isArray(item.images) && item.images.length ? item.images : image ? [image] : [];
  const features = Array.isArray(item.features) ? item.features.filter(Boolean) : typeof item.features === "string" ? item.features.split(",").map((f) => f.trim()).filter(Boolean) : [];

  return {
    ...item,
    id: item.uid || item.id || item.categoryProductId || slug,
    categoryProductId: item.categoryProductId || "",
    title,
    slug,
    category,
    subCategory,
    description: item.desc || item.description || item.detail || item.summary || "",
    desc: item.desc || item.description || "",
    price: item.price || "",
    capacity: item.capacity || "",
    throughput: item.throughput || "",
    instrument: item.instrument || "",
    model: item.model || "",
    usage: item.usage || "",
    brand: item.brand || "",
    parameters: item.parameters || "",
    automation: item.automation || "",
    availability: item.availability || item.status || "In Stock",
    size: item.size || "",
    features,
    specs: item.specs && typeof item.specs === "object" ? item.specs : null,
    badge: item.badge || item.tag || "",
    status: item.status || item.availability || "In Stock",
    image,
    images,
    video: item.video || "",
    pdf: item.pdf || "",
    isPublished: item.isPublished !== false,
  };
}

export async function fetchAllDynamicProducts(force = false) {
  try {
    const products = await fetchFullCatalog(force);
    return Array.isArray(products) ? products.map((item) => normalizeProduct(item)).filter(Boolean) : [];
  } catch (error) {
    console.error("Error fetching products from Admin API:", error);
    return [];
  }
}
