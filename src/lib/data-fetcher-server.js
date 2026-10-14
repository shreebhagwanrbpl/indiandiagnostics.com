import "server-only";

import { COMPANY_ID, WEBSITE_ID, makeSlug, isVisibleForWebsite } from "./catalog-utils";
import { adminFetch, fetchCatalogDataFromAdmin } from "./admin-api";

const unwrap = (response) => response?.data ?? response?.pages ?? response ?? null;

function normalizeProduct(product = {}, index = 0) {
  const title = product.title || product.name || product.productName || product.itemName || "Biomedical Equipment";
  const images = Array.isArray(product.images) && product.images.length
    ? product.images
    : product.image ? [product.image]
    : product.imageUrl ? [product.imageUrl]
    : product.imgUrl ? [product.imgUrl]
    : [];
  const id = product.id || product.uid || product.productId || `${makeSlug(title) || "product"}-${index}`;
  return {
    ...product,
    id,
    uid: product.uid || id,
    productId: product.productId || id,
    title,
    name: title,
    slug: product.slug || makeSlug(title),
    description: product.description ?? product.desc ?? "",
    desc: product.desc ?? product.description ?? "",
    category: product.category || "Diagnostic & Laboratory Equipment",
    categoryId: product.categoryId || product.categoryID || makeSlug(product.category || "diagnostic"),
    subCategory: product.subCategory || product.subcategory || product.category || "General",
    subcategoryId: product.subcategoryId || product.subCategoryId || makeSlug(product.subCategory || product.subcategory || product.category || "general"),
    companyId: product.companyId || COMPANY_ID,
    images,
    image: images[0] || product.image || "",
    video: product.video || "",
    pdf: product.pdf || "",
    brand: product.brand || "",
    model: product.model || "",
    capacity: product.capacity || "",
    throughput: product.throughput || "",
    instrument: product.instrument || "",
    usage: product.usage || "",
    parameters: product.parameters || "",
    automation: product.automation || "",
    availability: product.availability || product.status || "In Stock",
    status: product.status || product.availability || "In Stock",
    badge: product.badge || product.tag || "",
    size: product.size || "",
    isPublished: product.isPublished !== false,
  };
}

export async function fetchDocCached(path) {
  const parts = String(path || "").split("/").filter(Boolean);
  if (parts[0] === "__website__" && parts[1] === "districts") {
    return unwrap(await adminFetch("/api/site-data", {}, { type: "district", pageType: "district", district: parts[2] }));
  }
  if (parts[0] === "__website__") {
    const pageType = parts[1] || "";
    if (pageType) return unwrap(await adminFetch("/api/site-data", {}, { type: pageType, pageType }));
  }
  if (parts[0] === "websites" && parts[2] === "pages" && parts[3]) {
    return unwrap(await adminFetch("/api/site-data", {}, { type: parts[3], pageType: parts[3] }));
  }
  if (parts[0] === "websites" && parts[2] === "districts" && parts[3]) {
    return unwrap(await adminFetch("/api/site-data", {}, { type: "district", pageType: "district", district: parts[3] }));
  }
  return null;
}

export async function fetchWebsitePage(pageType) {
  return unwrap(await adminFetch("/api/site-data", {}, { type: pageType, pageType }));
}

export const fetchHomeData = () => fetchWebsitePage("home");
export const fetchContactData = () => fetchWebsitePage("contact");
export const fetchServicesData = () => fetchWebsitePage("services");

export async function fetchDistrictData(district) {
  if (!district) return null;
  return unwrap(await adminFetch("/api/site-data", {}, { type: "district", pageType: "district", district }));
}

export async function fetchFullCatalogData(options = {}) {
  const catalog = await fetchCatalogDataFromAdmin(options);
  const rawCategories = Array.isArray(catalog?.categories) ? catalog.categories : [];
  const rawProducts = Array.isArray(catalog?.products) ? catalog.products : [];

  // 1. Identify hidden categories and subcategories from admin
  const hiddenCategoryKeys = new Set();
  const hiddenSubcategoryKeys = new Set();

  for (const cat of rawCategories) {
    const isCatVisible = isVisibleForWebsite(cat, WEBSITE_ID);
    const catName = String(cat?.name || cat?.category || cat?.title || "").toLowerCase().trim();
    const catSlug = String(cat?.slug || makeSlug(catName) || "").toLowerCase().trim();
    const catId = String(cat?.id || cat?.categoryId || "").toLowerCase().trim();

    if (!isCatVisible) {
      if (catName) hiddenCategoryKeys.add(catName);
      if (catSlug) hiddenCategoryKeys.add(catSlug);
      if (catId) hiddenCategoryKeys.add(catId);
    }

    // Check its subcategories
    const subs = Array.isArray(cat?.subcategories) ? cat.subcategories : [];
    for (const sub of subs) {
      const isSubVisible = isCatVisible && isVisibleForWebsite(sub, WEBSITE_ID);
      const subName = String(sub?.name || sub?.subCategory || sub?.title || "").toLowerCase().trim();
      const subSlug = String(sub?.slug || makeSlug(subName) || "").toLowerCase().trim();
      const subId = String(sub?.id || sub?.subcategoryId || "").toLowerCase().trim();

      if (!isSubVisible) {
        if (subName) hiddenSubcategoryKeys.add(subName);
        if (subSlug) hiddenSubcategoryKeys.add(subSlug);
        if (subId) hiddenSubcategoryKeys.add(subId);
      }
    }
  }

  // 2. Filter and normalize visible categories
  const categories = rawCategories
    .filter((cat) => isVisibleForWebsite(cat, WEBSITE_ID))
    .map((category, index) => {
      const name = String(category?.name || category?.category || category?.title || "").trim();
      const id = String(category?.id || category?.categoryId || category?.slug || makeSlug(name) || `category-${index}`);
      const slug = category?.slug || makeSlug(name) || id;

      const rawSubs = Array.isArray(category?.subcategories) ? category.subcategories : [];
      const subcategories = rawSubs
        .filter((sub) => isVisibleForWebsite(sub, WEBSITE_ID))
        .map((sub, sIdx) => {
          const sName = String(sub?.name || sub?.subCategory || sub?.title || "").trim();
          return {
            ...sub,
            id: String(sub?.id || sub?.subcategoryId || sub?.slug || makeSlug(sName) || `sub-${sIdx}`),
            name: sName,
            subCategory: sName,
            slug: sub?.slug || makeSlug(sName),
          };
        })
        .filter((s) => s.name);

      return {
        ...category,
        id,
        categoryId: category?.categoryId || id,
        name,
        category: name,
        slug,
        subcategories,
      };
    })
    .filter((category) => category.name);

  const categoryById = new Map();
  const categoryByName = new Map();
  for (const category of categories) {
    categoryById.set(String(category.id).toLowerCase(), category);
    categoryById.set(String(category.categoryId).toLowerCase(), category);
    categoryById.set(String(category.slug).toLowerCase(), category);
    categoryByName.set(String(category.name).toLowerCase().trim(), category);
  }

  // 3. Filter products: must be visible for website AND its category/subcategory must not be hidden
  const products = rawProducts
    .filter((product) => {
      if (!isVisibleForWebsite(product, WEBSITE_ID)) return false;

      const catId = String(product?.categoryId || product?.categoryID || "").toLowerCase().trim();
      const catName = String(product?.category || product?.categoryName || "").toLowerCase().trim();
      const catSlug = String(product?.categorySlug || "").toLowerCase().trim();
      if (
        (catId && hiddenCategoryKeys.has(catId)) ||
        (catName && hiddenCategoryKeys.has(catName)) ||
        (catSlug && hiddenCategoryKeys.has(catSlug))
      ) {
        return false;
      }

      const subId = String(product?.subcategoryId || product?.subCategoryId || "").toLowerCase().trim();
      const subName = String(product?.subCategory || product?.subcategory || product?.subCategoryName || "").toLowerCase().trim();
      const subSlug = String(product?.subCategorySlug || "").toLowerCase().trim();
      if (
        (subId && hiddenSubcategoryKeys.has(subId)) ||
        (subName && hiddenSubcategoryKeys.has(subName)) ||
        (subSlug && hiddenSubcategoryKeys.has(subSlug))
      ) {
        return false;
      }

      return true;
    })
    .map((product, index) => {
      const categoryId = String(product?.categoryId || product?.categoryID || product?.category_id || "").toLowerCase();
      const categoryName = typeof product?.category === "string" ? product.category.trim() : (product?.category?.name || product?.category?.title || "");
      const matchedCategory = categoryById.get(categoryId) || categoryByName.get(String(categoryName).toLowerCase().trim());
      return normalizeProduct({
        ...product,
        category: matchedCategory?.name || categoryName || product?.categoryName || product?.category_name || "",
        categoryId: matchedCategory?.id || categoryId,
        subCategory: product?.subCategory || product?.subcategory || product?.subCategoryName || "",
      }, index);
    });

  // 4. Ensure each category has all its actual active subcategories linked from products
  for (const category of categories) {
    const catNameLower = category.name.toLowerCase();
    const existingSubNames = new Set((category.subcategories || []).map((s) => s.name.toLowerCase()));
    for (const product of products) {
      if (String(product.category || "").toLowerCase() === catNameLower) {
        const subName = String(product.subCategory || "").trim();
        if (
          subName &&
          !existingSubNames.has(subName.toLowerCase()) &&
          !hiddenSubcategoryKeys.has(subName.toLowerCase())
        ) {
          existingSubNames.add(subName.toLowerCase());
          if (!category.subcategories) category.subcategories = [];
          category.subcategories.push({
            id: makeSlug(subName),
            name: subName,
            subCategory: subName,
            slug: makeSlug(subName),
          });
        }
      }
    }
  }

  return { categories, products };
}

export async function fetchFullCatalog(options = {}) {
  const catalog = await fetchFullCatalogData(options);
  return catalog.products;
}

export async function fetchProductBySlug(slug) {
  if (!slug) return null;
  const products = await fetchFullCatalog();
  const target = String(slug).toLowerCase().trim();
  return products.find(
    (p) =>
      p.slug?.toLowerCase() === target ||
      makeSlug(p.title)?.toLowerCase() === target ||
      String(p.id)?.toLowerCase() === target
  ) || null;
}

export async function fetchActiveDistricts() {
  const response = await adminFetch("/api/site-data", {}, { type: "districts", pageType: "districts" });
  const rows = response?.data?.districts ?? response?.districts ?? response?.data ?? response;
  return Array.isArray(rows) ? rows.map((row, index) => ({
    ...row,
    id: row.id || row.slug || `dist-${index}`,
    slug: row.slug || row.id || makeSlug(row.district || row.name || `dist-${index}`),
  })) : [];
}

export const fetchAllDistricts = fetchActiveDistricts;
