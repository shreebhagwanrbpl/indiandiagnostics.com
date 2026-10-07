"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "@/lib/client-api";
import { db } from "@/lib/client-api";
import Link from "next/link";
import { usePathname } from "next/navigation";
import PageBanner from "@/components/PageBanner";
import SectionTitle from "@/components/SectionTitle";
import ServiceCard from "@/components/ServiceCard";
import {
  Microscope,
  FlaskConical,
  ShieldCheck,
  Stethoscope,
  Wrench,
  Activity,
  Award,
  Zap,
  CheckCircle2,
  FileCheck,
  Cpu,
} from "lucide-react";

const workflowSteps = [
  {
    step: "01",
    title: "Diagnostic Audit & Consultation",
    desc: "We analyze your hospital sample load, space constraints, and technical requirements to select the exact analyzer configuration.",
    icon: FileCheck,
  },
  {
    step: "02",
    title: "Precision Solution Engineering",
    desc: "Custom lab layout designs, power backup specifications, and reagent supply schedule formulation.",
    icon: Cpu,
  },
  {
    step: "03",
    title: "Installation & NABL Calibration",
    desc: "Certified engineers perform physical installation, IQ/OQ/PQ protocols, and NABL-traceable reference calibration.",
    icon: Award,
  },
  {
    step: "04",
    title: "24/7 SLA Field Maintenance",
    desc: "Round-the-clock technical emergency support, scheduled preventive maintenance visits, and automated reagent restocking.",
    icon: Zap,
  },
];

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [contactInfo, setContactInfo] = useState([]);
  const [loading, setLoading] = useState(true);

  const pathname = usePathname();
  const pathParts = pathname.split("/").filter(Boolean);
  const staticRoutes = ["about", "services", "products", "contact", "items"];
  const district =
    pathParts.length > 0 && !staticRoutes.includes(pathParts[0])
      ? pathParts[0]
      : "";

  const makeLink = (path) => {
    if (!district) return path;
    if (path === "/") return `/${district}`;
    return `/${district}${path}`;
  };

  const icons = [
    <Microscope size={28} key={1} />,
    <FlaskConical size={28} key={2} />,
    <ShieldCheck size={28} key={3} />,
    <Stethoscope size={28} key={4} />,
    <Wrench size={28} key={5} />,
    <Activity size={28} key={6} />,
  ];

  useEffect(() => {
    let isMounted = true;
    const fetchServicesAndContact = async () => {
      try {
        const hostname =
          typeof window !== "undefined" ? window.location.hostname : "";
        const websiteId =
          hostname === "localhost" || hostname === "127.0.0.1"
            ? "globalhealthcartcom"
            : hostname.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

        const [servicesSnap, contactSnap] = await Promise.all([
          getDoc(doc(db, "websites", websiteId, "pages", "services")),
          getDoc(doc(db, "websites", websiteId, "pages", "contact")),
        ]);

        if (!isMounted) return;

        // Services are 100% Admin API driven. No static fallback is used.
        if (servicesSnap && servicesSnap.exists()) {
          const dbServices = Array.isArray(servicesSnap.data().services)
            ? servicesSnap.data().services
              .filter(
                (service) =>
                  service &&
                  typeof service.title === "string" &&
                  service.title.trim()
              )
              .map((service) => ({
                ...service,
                title: service.title.trim(),
                desc:
                  typeof service.desc === "string"
                    ? service.desc.trim()
                    : "",
              }))
            : [];

          setServices(dbServices);
        } else {
          setServices([]);
        }

        if (contactSnap && contactSnap.exists()) {
          setContactInfo(contactSnap.data().contactInfo || []);
        }
      } catch (error) {
        console.error("Error loading services/contact data:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchServicesAndContact();
    return () => {
      isMounted = false;
    };
  }, []);

  // Dynamically extract emergency helpline phone number
  const emergencyPhone = (() => {
    const item = contactInfo.find((c) => {
      const l = (c?.label || "").toLowerCase();
      return (
        l.includes("phone") ||
        l.includes("mobile") ||
        l.includes("helpline") ||
        l.includes("emergency") ||
        l.includes("tel") ||
        l.includes("contact")
      );
    });
    if (!item) return "";
    if (Array.isArray(item.value)) return item.value[0] || "";
    return typeof item.value === "string" ? item.value.trim() : "";
  })();

  return (
    <div className="bg-[#F4FBFC]/40 text-[#10373C]">
      {/* Banner */}
      <PageBanner
        badge="Technical Services"
        title="Biomedical Support From Setup to Service"
        subtitle="NABL-certified calibration, 2-hour emergency repair SLAs, cold-chain reagent distribution, and turnkey pathology setup."
      />

      {/* Services Grid Section */}
      <section className="section-padding bg-gradient-to-b from-white via-[#F4FBFC] to-[#E4F8FA]">
        <div className="container-custom">
          <SectionTitle
            badge="Full Service Catalog"
            title="Designed Around Reliable Operations"
            description="Explore our specialized services designed to keep clinical laboratories and hospital departments operating at peak accuracy."
            center
          />

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <div className="col-span-full flex min-h-[220px] items-center justify-center rounded-3xl border border-[#B6E2E7] bg-white p-10 text-center shadow-sm">
                <p className="text-lg font-semibold text-[#45656A]">
                  Loading services...
                </p>
              </div>
            ) : services.length === 0 ? (
              <div className="col-span-full flex min-h-[220px] items-center justify-center rounded-3xl border border-dashed border-[#B6E2E7] bg-white p-10 text-center shadow-sm">
                <div>
                  <h3 className="text-2xl font-bold text-[#10373C]">
                    Services Not Found
                  </h3>
                  <p className="mt-2 text-sm text-[#45656A]">
                    No services are currently available for this website.
                  </p>
                </div>
              </div>
            ) : (
              services.map((service, index) => (
                <ServiceCard
                  key={service.id || `${service.title}-${index}`}
                  icon={icons[index % icons.length]}
                  title={service.title}
                  description={service.desc}
                  badge={service.badge}
                  turnaround={service.turnaround}
                  highlights={service.highlights}
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Workflow Process Section */}
      <section className="section-padding bg-white border-y border-[#B6E2E7]/60">
        <div className="container-custom">
          <SectionTitle
            badge="Execution Framework"
            title="Our 4-Step Engineering Workflow"
            description="A systematic process ensuring seamless integration, rapid compliance, and long-term instrument reliability."
            center
          />

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={index}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-[#B6E2E7] bg-[#F4FBFC] p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-[#008B9A] hover:shadow-xl"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-4xl font-black text-[#008B9A]/40 group-hover:text-[#008B9A] transition-colors">
                        {step.step}
                      </span>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#008B9A] shadow-sm">
                        <Icon size={24} />
                      </div>
                    </div>

                    <h3 className="mt-6 text-xl font-bold text-[#10373C] group-hover:text-[#008B9A] transition-colors">
                      {step.title}
                    </h3>

                    <p className="mt-3 text-sm leading-relaxed text-[#45656A]">
                      {step.desc}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#B6E2E7]/40">
                    <span className="text-xs font-bold text-[#005C66]">Phase {index + 1} Milestone</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Breakdown SLA Box */}
      <section className="section-padding bg-gradient-to-b from-[#E4F8FA] via-white to-[#F4FBFC]">
        <div className="container-custom">
          <div className="rounded-3xl border border-[#B6E2E7] bg-gradient-to-r from-[#10373C] to-[#45656A] p-8 sm:p-12 text-white shadow-xl">
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#008B9A] px-4 py-1.5 text-xs font-bold text-white uppercase tracking-wider">
                  <Zap size={14} /> Emergency Breakdown Helpline
                </span>

                <h3 className="mt-4 text-3xl font-black !text-white sm:text-4xl">
                  Facing an Equipment Emergency in ICU or Lab?
                </h3>

                <p className="mt-3 text-base !text-[#E4F8FA] leading-relaxed">
                  Our certified field engineers are equipped with OEM diagnostic kits and genuine spare parts for instant on-site restoration.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-6 text-sm font-semibold !text-white">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-[#22AFC0]" />
                    <span>2-Hour On-Site SLA</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-[#22AFC0]" />
                    <span>Loaner Analyzer Option</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-[#22AFC0]" />
                    <span>NABL Re-calibration Included</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 flex flex-col items-center justify-center text-center border-t lg:border-t-0 lg:border-l border-[#B6E2E7]/20 pt-6 lg:pt-0 lg:pl-8">
                <p className="text-xs font-bold uppercase tracking-wider !text-[#E4F8FA]">Emergency Dispatch</p>
                {emergencyPhone ? (
                  <a
                    href={`tel:${emergencyPhone.replace(/\s+/g, "")}`}
                    className="mt-2 text-2xl font-black !text-white hover:!text-[#22AFC0] transition-colors inline-block"
                  >
                    {emergencyPhone}
                  </a>
                ) : (
                  <p className="mt-2 text-sm !text-[#E4F8FA]">24/7 Field Dispatch Active</p>
                )}
                <Link
                  href={makeLink("/contact")}
                  className="mt-5 w-full rounded-2xl bg-[#008B9A] py-3.5 text-center text-sm font-bold text-white shadow-lg transition-all hover:bg-[#005C66]"
                >
                  Book Priority Repair
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}