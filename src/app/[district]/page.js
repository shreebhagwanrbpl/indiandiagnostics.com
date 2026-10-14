export const dynamic = "force-dynamic";
export const revalidate = 0;

import Home from "@/app/page";

export default async function DistrictPage({ params }) {

  const { district = "jaipur" } = await params;

  const city = district
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return <Home city={city} />;
}