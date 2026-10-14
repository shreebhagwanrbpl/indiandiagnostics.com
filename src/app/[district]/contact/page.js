export const dynamic = "force-dynamic";
export const revalidate = 0;

import ContactPage from "@/app/contact/page";

export default async function Page({ params }) {

  const { district = "jaipur" } = await params;

  const city = district
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return <ContactPage city={city} />;
}