"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  ArrowRight,
  PhoneCall,
  Sparkles,
  CheckCircle2,
  Image as ImageIcon,
  Film,
} from "lucide-react";

// IMPORTANT:
// Fallback contains MEDIA ONLY.
// No fallback title, description, or button text is used.
const FALLBACK_SLIDES = [
  {
    id: "fallback-1",
    type: "image",
    url: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1900&q=80",
  },
  {
    id: "fallback-2",
    type: "image",
    url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1900&q=80",
  },
  {
    id: "fallback-3",
    type: "image",
    url: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1900&q=80",
  },
];

export default function HeroCarousel({
  homeData = null,
  locationTitle = "",
  makeLink = (path) => path,
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const videoRefs = useRef({});

  const parseMediaList = (data) => {
    if (!data) return [];

    const list = [];

    if (Array.isArray(data.media) && data.media.length > 0) {
      data.media.forEach((item, idx) => {
        const url = typeof item === "string" ? item : item?.url;
        const type =
          item?.type ||
          (url?.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)
            ? "video"
            : "image");

        if (url) {
          list.push({
            id: `media-${idx}`,
            type,
            url,
          });
        }
      });
    }

    if (
      list.length === 0 &&
      Array.isArray(data.images) &&
      data.images.length > 0
    ) {
      data.images.forEach((url, idx) => {
        if (url) {
          list.push({
            id: `img-${idx}`,
            type: "image",
            url,
          });
        }
      });
    }

    if (list.length === 0 && (data.imageUrl || data.image)) {
      const singleImg = data.imageUrl || data.image;

      if (singleImg) {
        list.push({
          id: "single-img",
          type: "image",
          url: singleImg,
        });
      }
    }

    if (Array.isArray(data.videos) && data.videos.length > 0) {
      data.videos.forEach((vUrl, idx) => {
        if (vUrl && !list.some((item) => item.url === vUrl)) {
          list.push({
            id: `vid-${idx}`,
            type: "video",
            url: vUrl,
          });
        }
      });
    }

    if (data.videoUrl && !list.some((item) => item.url === data.videoUrl)) {
      list.push({
        id: "single-vid",
        type: "video",
        url: data.videoUrl,
      });
    }

    return list;
  };

  const dbSlides = parseMediaList(homeData);
  const slides = dbSlides.length > 0 ? dbSlides : FALLBACK_SLIDES;

  // ONLY Firestore/admin data supplies copy.
  // There is intentionally NO static fallback for these four fields.
  const heroTitle = homeData?.title?.trim() || "";
  const heroDescription = homeData?.description?.trim() || "";
  const btn1Text = homeData?.button1Text?.trim() || "";
  const btn2Text = homeData?.button2Text?.trim() || "";

  const btn1Href = makeLink("/items");
  const btn2Href = makeLink("/contact");

  useEffect(() => {
    if (!isPlaying || slides.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5500);

    return () => clearInterval(timer);
  }, [isPlaying, slides.length]);

  useEffect(() => {
    if (currentSlide >= slides.length && slides.length > 0) {
      setCurrentSlide(slides.length - 1);
    }
  }, [slides.length, currentSlide]);

  useEffect(() => {
    const currentMedia = slides[currentSlide];

    if (currentMedia?.type === "video") {
      const vid = videoRefs.current[currentSlide];

      if (vid) {
        vid.currentTime = 0;
        vid.play().catch(() => { });
      }
    }
  }, [currentSlide, slides]);

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;

    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }
  };

  const activeMedia = slides[currentSlide] || slides[0];

  return (
    <section className="relative overflow-hidden bg-[#062D31] text-white">
      {/* =========================================================
          FLOATING BIOMEDICAL CAROUSEL
          - Full image carousel
          - Floating glass content panel
          - Floating carousel controls
          - No static copy fallback
      ========================================================= */}

      <div
        className="relative w-full h-[500px] sm:h-[560px] md:h-[620px] lg:h-[660px] overflow-hidden bg-[#062D31]"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Background slide */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeMedia?.id || currentSlide}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.01 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            {activeMedia?.type === "video" ? (
              <video
                ref={(el) => {
                  videoRefs.current[currentSlide] = el;
                }}
                src={activeMedia.url}
                className="h-full w-full object-cover object-center"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
              />
            ) : (
              <img
                src={activeMedia?.url}
                alt={`Biomedical carousel slide ${currentSlide + 1}`}
                className="h-full w-full object-cover object-center brightness-[0.88] contrast-[1.04]"
                onError={(e) => {
                  // Image fallback is intentionally retained.
                  e.currentTarget.src = FALLBACK_SLIDES[0].url;
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Biomedical teal cinematic overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#021B1E]/72 via-[#062D31]/35 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#021B1E]/65 via-transparent to-[#062D31]/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_45%,rgba(0,139,154,0.18),transparent_42%)]" />

        {/* =========================================================
            FLOATING CONTENT CARD
        ========================================================= */}
        <div className="container-custom relative z-20 h-full flex items-center py-8 sm:py-10">
          <div className="w-full max-w-3xl">
            <motion.div
              key={`content-${currentSlide}`}
              initial={{ opacity: 0, x: -25, y: 8 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="relative max-w-3xl rounded-[28px] border border-white/25 bg-[#062D31]/88 p-5 sm:p-7 md:p-9 shadow-2xl backdrop-blur-xl"
            >
              {/* Decorative teal glow */}
              <div className="pointer-events-none absolute -left-8 -top-8 h-24 w-24 rounded-full bg-[#008B9A]/20 blur-2xl" />

              {/* Badge */}
              <div className="relative inline-flex items-center gap-2 rounded-full border border-[#22AFC0]/35 bg-[#062D31]/75 px-3.5 py-1.5 text-[10px] sm:text-xs font-extrabold uppercase tracking-[0.12em] !text-white shadow-lg">
                <Sparkles
                  size={14}
                  className="shrink-0 text-[#22AFC0]"
                />
                <span>
                  {locationTitle
                    ? `Leading Biomedical Supplier in ${locationTitle}`
                    : "Pioneering Biomedical & Diagnostic Innovations"}
                </span>
              </div>

              {/* Dynamic title */}
              {heroTitle && (
                <motion.h1
                  key={`title-${currentSlide}-${heroTitle}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.08 }}
                  className="relative mt-4 text-3xl font-black leading-[1.08] tracking-tight !text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.9)] sm:text-4xl md:text-5xl lg:text-6xl"
                >
                  {heroTitle}
                </motion.h1>
              )}

              {/* Dynamic description */}
              {heroDescription && (
                <motion.p
                  key={`desc-${currentSlide}-${heroDescription}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.16 }}
                  className="relative mt-4 max-w-2xl text-sm font-medium leading-7 !text-white/95 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] sm:text-base"
                >
                  {heroDescription}
                </motion.p>
              )}

              {/* Dynamic buttons */}
              {(btn1Text || btn2Text) && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.24 }}
                  className="relative mt-6 flex flex-wrap items-center gap-3"
                >
                  {btn1Text && (
                    <Link
                      href={btn1Href}
                      className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#22AFC0]/40 bg-[#008B9A] px-5 py-3 text-sm font-extrabold !text-white shadow-xl shadow-[#008B9A]/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#007684] hover:shadow-2xl"
                    >
                      <span className="!text-white">{btn1Text}</span>
                      <ArrowRight
                        size={17}
                        className="!text-white transition-transform duration-300 group-hover:translate-x-1"
                      />
                    </Link>
                  )}

                  {btn2Text && (
                    <Link
                      href={btn2Href}
                      className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/30 bg-black/35 px-5 py-3 text-sm font-extrabold !text-white backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-white hover:bg-white hover:!text-[#10373C]"
                    >
                      <PhoneCall
                        size={17}
                        className="text-[#22AFC0] transition-colors duration-300 group-hover:text-[#008B9A]"
                      />
                      <span className="font-extrabold">{btn2Text}</span>
                    </Link>
                  )}
                </motion.div>
              )}

              {/* Trust strip stays part of design, not copy fallback */}
              <div className="relative mt-6 hidden flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/15 pt-4 text-xs font-semibold !text-white/95 sm:flex">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2
                    size={15}
                    className="shrink-0 text-[#22AFC0]"
                  />
                  <span>ISO 13485 Certified</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <CheckCircle2
                    size={15}
                    className="shrink-0 text-[#22AFC0]"
                  />
                  <span>24/7 SLA Field Support</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <CheckCircle2
                    size={15}
                    className="shrink-0 text-[#22AFC0]"
                  />
                  <span>NABL Traceable QC</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* =========================================================
            FLOATING CAROUSEL CONTROLS
        ========================================================= */}
        {slides.length > 1 && (
          <>
            {/* Desktop / tablet floating controls */}
            <div className="absolute bottom-5 right-5 z-30 hidden items-center gap-2 rounded-2xl border border-white/20 bg-[#062D31]/90 p-1.5 shadow-2xl backdrop-blur-xl sm:flex md:bottom-7 md:right-7">
              <button
                type="button"
                onClick={() => setIsPlaying((value) => !value)}
                title={isPlaying ? "Pause Slideshow" : "Play Slideshow"}
                aria-label={isPlaying ? "Pause Slideshow" : "Play Slideshow"}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white transition-all hover:border-[#22AFC0] hover:bg-[#008B9A] hover:text-white"
              >
                {isPlaying ? <Pause size={15} /> : <Play size={15} />}
              </button>

              <button
                type="button"
                onClick={handlePrev}
                title="Previous Slide"
                aria-label="Previous Slide"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white transition-all hover:border-[#22AFC0] hover:bg-[#008B9A] hover:text-white"
              >
                <ChevronLeft size={19} />
              </button>

              <div className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 text-xs font-extrabold text-[#E4F8FA]">
                {activeMedia?.type === "video" ? (
                  <Film size={13} className="text-[#22AFC0]" />
                ) : (
                  <ImageIcon size={13} className="text-[#22AFC0]" />
                )}
                <span>
                  {String(currentSlide + 1).padStart(2, "0")} /{" "}
                  {String(slides.length).padStart(2, "0")}
                </span>
              </div>

              <button
                type="button"
                onClick={handleNext}
                title="Next Slide"
                aria-label="Next Slide"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white transition-all hover:border-[#22AFC0] hover:bg-[#008B9A] hover:text-white"
              >
                <ChevronRight size={19} />
              </button>
            </div>

            {/* Floating pagination */}
            <div className="absolute bottom-5 left-5 z-30 flex items-center gap-2 rounded-full border border-white/15 bg-[#062D31]/88 px-3 py-2 backdrop-blur-xl md:bottom-7 md:left-7">
              {slides.map((slide, idx) => (
                <button
                  key={slide.id || idx}
                  type="button"
                  onClick={() => setCurrentSlide(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${currentSlide === idx
                    ? "w-8 bg-[#22AFC0] shadow-lg shadow-[#22AFC0]/50"
                    : "w-2 bg-white/45 hover:bg-white"
                    }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Mobile next/previous floating controls */}
        {slides.length > 1 && (
          <div className="absolute bottom-5 right-5 z-30 flex items-center gap-2 sm:hidden">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous Slide"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-[#062D31]/75 text-white shadow-xl backdrop-blur-xl"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              onClick={handleNext}
              aria-label="Next Slide"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-[#062D31]/75 text-white shadow-xl backdrop-blur-xl"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
