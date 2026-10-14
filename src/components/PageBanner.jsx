"use client";

import { motion } from "framer-motion";
import { CheckCircle2, ShieldCheck } from "lucide-react";

export default function PageBanner({
  title,
  subtitle,
  badge = "Raj Biosis Private Limited",
  highlights = [
    "ISO 13485 Certified",
    "NABL Traceable Calibration",
    "24/7 SLA Engineering Support",
  ],
}) {
  return (
    <section className="relative w-full min-h-[370px] sm:min-h-[410px] md:min-h-[450px] lg:min-h-[480px] flex items-center justify-center overflow-hidden bg-gradient-to-r from-[#F0F8F9] via-[#E8F5F7] to-[#F5FAFB] text-[#10373C] border-b border-[#B6E2E7]/60 py-8 sm:py-10 lg:py-12">
      {/* Background Soft Ambient Glows */}
      <div className="pointer-events-none absolute -top-16 left-1/4 h-80 w-80 rounded-full bg-[#008B9A]/12 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-[#B6E2E7]/40 blur-3xl" />

      {/* Grid Overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(#008B9A0a_1px,transparent_1px),linear-gradient(90deg,#008B9A0a_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="container-custom relative z-10 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-4xl text-center"
        >
          {/* Badge */}
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#B6E2E7] bg-white/95 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-widest text-[#008B9A] shadow-xs backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#008B9A] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#008B9A]" />
              </span>
              {badge}
            </span>
          </div>

          {/* Title */}
          <h1 className="mt-4 text-3xl font-black tracking-tight text-[#10373C] sm:text-4xl lg:text-5xl leading-tight">
            {title}
          </h1>

          {/* Subtitle */}
          {subtitle && (
            <p className="mx-auto mt-3.5 max-w-2xl text-xs sm:text-sm lg:text-base leading-relaxed text-[#45656A]">
              {subtitle}
            </p>
          )}

          {/* Trust Highlights */}
          {Array.isArray(highlights) && highlights.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-semibold">
              {highlights.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#B6E2E7] bg-white/90 px-3.5 py-1 text-[11px] sm:text-xs font-bold text-[#10373C] shadow-xs backdrop-blur-sm"
                >
                  <CheckCircle2 size={13} className="text-[#008B9A]" />
                  {item}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}