import { NextResponse } from "next/server";
import { fetchFullCatalogData } from "@/lib/data-fetcher-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const headers = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "Pragma": "no-cache",
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fresh = searchParams.get("fresh") === "1" || searchParams.has("t");
    const { products, categories } = await fetchFullCatalogData({ fresh });
    return NextResponse.json({ products, categories }, { headers });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Catalog request failed" },
      { status: 500, headers }
    );
  }
}
