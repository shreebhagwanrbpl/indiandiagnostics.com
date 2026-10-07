import { fetchActiveDistricts, fetchFullCatalog } from "@/lib/data-fetcher-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function sitemap() {
  const now = new Date();
  const urls = [
    { url: "https://indiandiagnostics.com", lastModified: now },
    { url: "https://indiandiagnostics.com/about", lastModified: now },
    { url: "https://indiandiagnostics.com/services", lastModified: now },
    { url: "https://indiandiagnostics.com/contact", lastModified: now },
    { url: "https://indiandiagnostics.com/items", lastModified: now },
  ];

  try {
    const districts = await fetchActiveDistricts();
    for (const district of districts) {
      const slug = district?.slug;
      if (!slug) continue;
      for (const path of ["", "/about", "/services", "/contact", "/items"]) {
        urls.push({ url: `https://indiandiagnostics.com/${slug}${path}`, lastModified: now });
      }
    }
    const products = await fetchFullCatalog();
    for (const product of products) {
      if (!product?.slug) continue;
      urls.push({ url: `https://indiandiagnostics.com/items/${product.slug}`, lastModified: now });
      for (const district of districts) {
        if (district?.slug) urls.push({ url: `https://indiandiagnostics.com/${district.slug}/items/${product.slug}`, lastModified: now });
      }
    }
  } catch (error) {
    console.error("Sitemap error:", error);
  }
  return urls;
}
