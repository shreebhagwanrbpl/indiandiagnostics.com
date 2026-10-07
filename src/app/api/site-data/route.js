import { NextResponse } from "next/server";
import { WEBSITE_ID, COMPANY_ID, isVisibleForWebsite } from "@/lib/catalog-utils";
import { adminFetch } from "@/lib/admin-api";

export const dynamic = "auto";
export const revalidate = 60;

const headers = { "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=300" };
const json = (data, status = 200) => NextResponse.json(data, { status, headers });

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || searchParams.get("pageType");
    const district = searchParams.get("district") || "";
    const districts = searchParams.get("districts");
    const collection = searchParams.get("collection");
    const path = searchParams.get("path") || "";

    if (districts === "1" || type === "districts") {
      const data = await adminFetch("/api/site-data", {}, { type: "districts", pageType: "districts", websiteId: WEBSITE_ID, companyId: COMPANY_ID });
      const rows = data?.data?.districts ?? data?.districts ?? data?.data ?? data;
      return json(Array.isArray(rows) ? rows : []);
    }

    if (type === "district" || district) {
      const data = await adminFetch("/api/site-data", {}, { type: "district", pageType: "district", district, websiteId: WEBSITE_ID, companyId: COMPANY_ID });
      return json(data?.data ?? data ?? null);
    }

    if (collection && (collection.includes("products") || collection.includes("categoryproducts"))) {
      const data = await adminFetch("/api/catalog", {}, { websiteId: WEBSITE_ID, companyId: COMPANY_ID });
      const products = data?.products ?? data?.data?.products ?? data?.data ?? data;
      return json(Array.isArray(products) ? products.filter((item) => isVisibleForWebsite(item, WEBSITE_ID)) : []);
    }

    let pageType = type;
    if (!pageType && path) {
      const parts = path.split("/").filter(Boolean);
      if (parts[0] === "__website__" && parts[1] === "pages") pageType = parts[2];
      else if (parts[0] === "__website__" && parts[1] === "districts") {
        const data = await adminFetch("/api/site-data", {}, { type: "district", pageType: "district", district: parts[2], websiteId: WEBSITE_ID, companyId: COMPANY_ID });
        return json(data?.data ?? data ?? null);
      }
      else if (parts[0] === "websites" && parts[2] === "pages") pageType = parts[3];
      else if (parts[0] === "websites" && parts[2] === "districts") {
        const data = await adminFetch("/api/site-data", {}, { type: "district", pageType: "district", district: parts[3], websiteId: WEBSITE_ID, companyId: COMPANY_ID });
        return json(data?.data ?? data ?? null);
      }
    }

    if (pageType) {
      const data = await adminFetch("/api/site-data", {}, { type: pageType, pageType, websiteId: WEBSITE_ID, companyId: COMPANY_ID });
      return json(data?.data ?? data ?? null);
    }

    return json(null);
  } catch (error) {
    return json({ ok: false, error: error?.message || "Site data request failed" }, 500);
  }
}
