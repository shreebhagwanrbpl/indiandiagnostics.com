import { NextResponse } from "next/server";
import { fetchFullCatalog } from "@/lib/data-fetcher-server";

export const dynamic = "auto";
export const revalidate = 60;

const headers = {
  "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=300",
};

export async function GET() {
  try {
    const products = await fetchFullCatalog();
    return NextResponse.json({ products }, { headers });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Catalog request failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
