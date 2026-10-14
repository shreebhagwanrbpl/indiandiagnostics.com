export const WEBSITE_ID = 'indiandiagnosticscom';
export const COMPANY_ID = "rajbiosis";

export function normalizeWebsiteId(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[.\-\s]/g, "");
}

export function isVisibleForWebsite(data = {}, websiteId = WEBSITE_ID) {
  if (!data) return false;
  if (data.isPublished === false || data.isPublished === "false") return false;
  if (data.isVisible === false || data.isVisible === "false") return false;
  if (data.visible === false || data.visible === "false") return false;
  if (data.hidden === true || data.hidden === "true") return false;

  const status = String(data.status || "").toLowerCase().trim();
  if (status === "inactive" || status === "draft" || status === "hidden" || status === "disabled" || status === "archived") {
    return false;
  }

  const wanted = normalizeWebsiteId(websiteId);

  // Check direct websiteId string
  if (data.websiteId) {
    const directId = normalizeWebsiteId(data.websiteId);
    if (directId === "all" || directId === wanted) return true;
  }

  // Check websiteIds array
  if (Array.isArray(data.websiteIds)) {
    if (data.websiteIds.length === 0) {
      return Boolean(data.websiteId && (normalizeWebsiteId(data.websiteId) === wanted || normalizeWebsiteId(data.websiteId) === "all"));
    }
    return data.websiteIds.some((id) => {
      const value = normalizeWebsiteId(id);
      return value === "all" || value === wanted;
    });
  }

  return true;
}

export function isItemVisibleOnWebsite(data = {}, websiteId = WEBSITE_ID) {
  return isVisibleForWebsite(data, websiteId);
}

export function makeSlug(text = "") {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
