export const dynamic = "force-dynamic";
export const revalidate = 0;

import ItemsClient from "@/components/ItemsClient";
import { fetchFullCatalogData } from "@/lib/data-fetcher-server";

export default async function ProductsPage({ city }) {
  const catalog = await fetchFullCatalogData().catch(() => ({ products: [], categories: [] }));

  return (
    <ItemsClient
      city={city}
      initialProducts={catalog.products}
      initialCategories={catalog.categories}
    />
  );
}
