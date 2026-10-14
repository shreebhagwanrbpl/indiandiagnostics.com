export const dynamic = "force-dynamic";
export const revalidate = 0;

import ProductDetails from "./ProductDetails";
import { fetchProductBySlug, fetchDocCached } from "@/lib/data-fetcher-server";

export async function generateMetadata({ params }) {
    const { slug } = await params;
    const product = await fetchProductBySlug(slug).catch(() => null);

    const productName = product?.title || slug
        ?.replace(/-/g, " ")
        ?.replace(/\b\w/g, (c) => c.toUpperCase());

    const title = `${productName} Supplier in India | Specifications, Dealer & Distributor | Raj Biosis Private Limited`;

    const description = product?.description || product?.desc
        ? `${(product.description || product.desc).substring(0, 160)}... Buy ${productName} in India. Authorized supplier Raj Biosis Private Limited.`
        : `Buy ${productName} in India. Trusted supplier, dealer and distributor of ${productName} for hospitals, laboratories, diagnostic centers, research institutes and healthcare facilities. Contact Raj Biosis Private Limited for technical specifications and quotation.`;

    const url = `https://indiandiagnostics.com/items/${slug}`;
    const ogImage = product?.image || "/logo.png";

    return {
        title,
        description,
        keywords: [
            productName,
            `${productName} Supplier`,
            `${productName} Dealer`,
            `${productName} Distributor`,
            `${productName} Manufacturer`,
            `${productName} Specifications`,
            `${productName} Supplier in India`,
            `${productName} Dealer in India`,
            `${productName} Distributor in India`,
            `Buy ${productName}`,
            `${productName} for Laboratory`,
            `${productName} for Hospital`,
            `${productName} for Diagnostic Center`,
            "Biomedical Equipment",
            "Medical Equipment",
            "Laboratory Equipment",
            "Diagnostic Equipment",
            "Hospital Equipment",
            "Healthcare Equipment",
            "Raj Biosis Private Limited",
            "Raj Biosis",
        ],
        alternates: {
            canonical: url,
        },
        openGraph: {
            title,
            description,
            url,
            siteName: "Raj Biosis Private Limited",
            type: "website",
            locale: "en_IN",
            images: [
                {
                    url: ogImage,
                    width: 800,
                    height: 600,
                    alt: productName,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [ogImage],
        },
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                "max-video-preview": -1,
                "max-image-preview": "large",
                "max-snippet": -1,
            },
        },
        metadataBase: new URL("https://indiandiagnostics.com"),
    };
}

export default async function Page({ params }) {
    const { slug } = await params;
    const [product, contactData] = await Promise.all([
        fetchProductBySlug(slug).catch(() => null),
        fetchDocCached("__website__/contact").catch(() => null),
    ]);

    return (
        <ProductDetails
            slug={slug}
            initialProduct={product}
            initialContactInfo={contactData?.contactInfo || []}
        />
    );
}