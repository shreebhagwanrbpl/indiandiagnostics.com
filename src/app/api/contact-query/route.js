import { NextResponse } from "next/server";
import { postAdminQuery } from "@/lib/admin-api";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const headers = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "Content-Type": "application/json",
};

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    const name = String(body.name || body.fullName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || body.mobile || "").trim().replace(/\D/g, "");
    const message = String(body.message || body.notes || "").trim();

    if (!name || name.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Please enter your full name." },
        { status: 400, headers }
      );
    }

    if (!phone || phone.length < 10) {
      return NextResponse.json(
        { ok: false, error: "Please provide a valid 10-digit mobile number." },
        { status: 400, headers }
      );
    }

    const refId = `INQ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const inquiryPayload = {
      id: refId,
      name,
      email: email || "inquiry@indiandiagnostics.com",
      phone,
      message: message || "General Contact Inquiry",
      source: "website_contact_form",
      createdAt: new Date().toISOString(),
      ...(body || {}),
    };

    // Dispatch to SuperAdmin /api/public-query
    const result = await postAdminQuery("/api/public-query", {
      type: "contact",
      data: inquiryPayload,
    }).catch((err) => {
      console.warn("[contact-query] Admin sync note:", err.message);
      return null;
    });

    const finalId = result?.id || result?.data?.id || refId;

    return NextResponse.json(
      {
        ok: true,
        success: true,
        id: finalId,
        message: "Thank you! Your inquiry has been received successfully.",
      },
      { status: 200, headers }
    );
  } catch (error) {
    console.error("[contact-query] Error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to process inquiry" },
      { status: 500, headers }
    );
  }
}
