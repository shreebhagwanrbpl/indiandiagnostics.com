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

// Verified local high-definition biomedical equipment multi-product showcase images (Top 3)
const FALLBACK_SLIDES = [
  {
    id: "biomedical-1",
    type: "image",
    url: "/images/hero/slide-1-clinical-analyzers-trio.jpg",
    title: "Clinical Automated Analyzers & Lab Equipment",
  },
  {
    id: "biomedical-2",
    type: "image",
    url: "/images/hero/slide-2-icu-care-machines-trio.jpg",
    title: "ICU & Critical Care Diagnostic Systems",
  },
  {
    id: "biomedical-3",
    type: "image",
    url: "/images/hero/slide-3-ultrasound-lab-devices-trio.jpg",
    title: "Diagnostic Imaging & Laboratory Centrifuge Units",
  },
];

export default function HeroCarousel({
  homeData = null,
  slides: propSlides = null,
  images: propImages = null,
  locationTitle = "",
  makeLink = (path) => path,
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const videoRefs = useRef({});

  const isInvalidOrOldHeroImage = (url) => {
    if (!url || typeof url !== "string") return true;
    const trimmed = url.trim();
    if (!trimmed) return true;
    const lower = trimmed.toLowerCase();
    // Filter out previous non-biomedical images if any legacy URLs remain
    return (
      lower.includes("photo-1579684385127") ||
      lower.includes("photo-1516549655169") ||
      lower.includes("resort") ||
      lower.includes("beach-umbrella") ||
      lower.includes("hotel")
    );
  };

  const extractUrl = (item) => {
    if (!item) return "";
    if (typeof item === "string") return item.trim();
    if (typeof item === "object") {
      return (
        item.url ||
        item.imageUrl ||
        item.image ||
        item.src ||
        item.secure_url ||
        item.downloadURL ||
        item.link ||
        item.mediaUrl ||
        item.path ||
        item.photo ||
        item.bannerUrl ||
        item.banner ||
        ""
      ).trim();
    }
    return "";
  };

  const parseMediaList = (data, directSlides, directImages) => {
    const list = [];
    const seenUrls = new Set();

    const addMediaItem = (item, defaultType = "image") => {
      const url = extractUrl(item);
      if (!url || isInvalidOrOldHeroImage(url) || seenUrls.has(url)) return;

      seenUrls.add(url);
      const isVid =
        (typeof item === "object" && item?.type === "video") ||
        (typeof item === "object" && item?.isVideo) ||
        /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url);

      list.push({
        id: (typeof item === "object" && item?.id) || `media-${list.length}-${url.slice(-8)}`,
        type: isVid ? "video" : (typeof item === "object" && item?.type) || defaultType,
        url,
      });
    };

    // 1. Direct slides or images passed via props
    if (Array.isArray(directSlides) && directSlides.length > 0) {
      directSlides.forEach((item) => addMediaItem(item));
    }
    if (Array.isArray(directImages) && directImages.length > 0) {
      directImages.forEach((item) => addMediaItem(item, "image"));
    }

    // 2. Extract from homeData dynamic database object
    if (data && typeof data === "object") {
      // Direct media array
      if (Array.isArray(data.media)) {
        data.media.forEach((item) => addMediaItem(item));
      }

      // Arrays of hero/carousel/banner images or slides
      const candidateArrays = [
        data.heroImages,
        data.images,
        data.slides,
        data.heroSlides,
        data.heroMedia,
        data.banners,
        data.bannerImages,
        data.sliderImages,
        data.carousel,
        data.sliders,
        data.slider,
        data.gallery,
      ];

      candidateArrays.forEach((arr) => {
        if (Array.isArray(arr)) {
          arr.forEach((item) => addMediaItem(item));
        }
      });

      // Single hero image fields
      const singleImageCandidates = [
        data.imageUrl,
        data.image,
        data.heroImage,
        data.bannerUrl,
        data.banner,
        data.bgImage,
        data.backgroundImage,
        data.coverImage,
      ];

      singleImageCandidates.forEach((img) => {
        if (img) addMediaItem(img, "image");
      });

      // Video fields
      if (Array.isArray(data.videos)) {
        data.videos.forEach((v) => addMediaItem(v, "video"));
      }
      if (data.videoUrl) addMediaItem(data.videoUrl, "video");
      if (data.video) addMediaItem(data.video, "video");
    }

    return list;
  };

  const dbSlides = parseMediaList(homeData, propSlides, propImages);
  const rawSlides = dbSlides.length > 0 ? dbSlides : FALLBACK_SLIDES;
  // Hero section strictly limited to top 3 images
  const slides = rawSlides.slice(0, 3);

  // ONLY MongoDB/admin data supplies copy.
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
    <section className="relative overflow-hidden bg-gradient-to-r from-[#F0F8F9] via-[#E8F5F7] to-[#F5FAFB] text-[#10373C] border-b border-[#B6E2E7]/40">
      {/* =========================================================
          FLOATING BIOMEDICAL CAROUSEL (Light Mode Aesthetic)
          - Full image carousel with authentic biomedical equipment
          - Transparent content panel with crisp dark typography
          - Floating carousel controls
      ========================================================= */}

      <div
        className="relative w-full h-[370px] sm:h-[410px] md:h-[450px] lg:h-[480px] overflow-hidden bg-gradient-to-r from-[#F0F8F9] via-[#EAF5F7] to-[#F5FAFB]"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Background slide - Zoomed out full equipment view */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeMedia?.id || currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center justify-end"
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
                src={activeMedia?.url || FALLBACK_SLIDES[0].url}
                alt={`Biomedical equipment carousel slide ${currentSlide + 1}`}
                className="h-full w-full object-contain sm:object-contain object-right lg:object-right brightness-[1.0] contrast-[1.03] opacity-100 drop-shadow-lg"
                onError={(e) => {
                  const fallbackIdx = currentSlide % FALLBACK_SLIDES.length;
                  const fallbackUrl = FALLBACK_SLIDES[fallbackIdx].url;
                  if (e.currentTarget.src !== fallbackUrl) {
                    e.currentTarget.src = fallbackUrl;
                  }
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Soft directional scrim - Protects text readability on the left while keeping machines fully bright on the right */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#F0F8F9] via-[#F0F8F9]/85 to-transparent w-full md:w-[60%] lg:w-[48%] pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/40 to-transparent pointer-events-none" />

        {/* =========================================================
            TRANSPARENT CONTENT SECTION (Crisp Dark Text)
        ========================================================= */}
        <div className="container-custom relative z-20 h-full flex items-center py-4 sm:py-5">
          <div className="w-full max-w-[340px] sm:max-w-[420px] md:max-w-[460px] lg:max-w-[490px] xl:max-w-[510px]">
            <motion.div
              key={`content-${currentSlide}`}
              initial={{ opacity: 0, x: -12, y: 3 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="relative text-left"
            >
              {/* Badge */}
              <div className="relative inline-flex items-center gap-1.5 rounded-full border border-[#008B9A]/30 bg-[#008B9A]/10 px-3 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.08em] !text-[#005C66] shadow-sm backdrop-blur-sm">
                <Sparkles
                  size={12}
                  className="shrink-0 text-[#008B9A]"
                />
                <span>
                  {locationTitle
                    ? `Leading Biomedical Supplier in ${locationTitle}`
                    : "Pioneering Biomedical & Diagnostic Innovations"}
                </span>
              </div>

              {/* Dynamic title - Clean dark blackish-teal text */}
              {heroTitle && (
                <motion.h1
                  key={`title-${currentSlide}-${heroTitle}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 }}
                  className="relative mt-2 sm:mt-2.5 text-lg sm:text-xl md:text-2xl lg:text-[26px] xl:text-[28px] font-extrabold leading-[1.22] tracking-tight !text-[#10373C]"
                >
                  {heroTitle}
                </motion.h1>
              )}

              {/* Dynamic description - Dark readable text */}
              {heroDescription && (
                <motion.p
                  key={`desc-${currentSlide}-${heroDescription}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.08 }}
                  className="relative mt-2 sm:mt-2.5 max-w-[450px] text-xs sm:text-[13px] md:text-sm font-normal leading-relaxed !text-[#38555A] line-clamp-3"
                >
                  {heroDescription}
                </motion.p>
              )}

              {/* Dynamic buttons */}
              {(btn1Text || btn2Text) && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.12 }}
                  className="relative mt-3 sm:mt-3.5 flex flex-wrap items-center gap-2.5"
                >
                  {btn1Text && (
                    <Link
                      href={btn1Href}
                      className="group inline-flex min-h-9 sm:min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[#008B9A] px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold !text-white shadow-md shadow-[#008B9A]/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#007684] hover:shadow-lg"
                    >
                      <span className="!text-white font-bold">{btn1Text}</span>
                      <ArrowRight
                        size={14}
                        className="!text-white transition-transform duration-300 group-hover:translate-x-1"
                      />
                    </Link>
                  )}

                  {btn2Text && (
                    <Link
                      href={btn2Href}
                      className="group inline-flex min-h-9 sm:min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#B6E2E7] bg-white px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold !text-[#10373C] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#008B9A] hover:!text-[#008B9A] hover:shadow-md"
                    >
                      <PhoneCall
                        size={14}
                        className="text-[#008B9A] transition-colors duration-300"
                      />
                      <span className="font-bold">{btn2Text}</span>
                    </Link>
                  )}
                </motion.div>
              )}

              {/* Trust strip */}
              <div className="relative mt-3.5 sm:mt-4 hidden flex-wrap items-center gap-2 border-t border-[#B6E2E7]/70 pt-3 sm:flex">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-[#B6E2E7] bg-white/90 px-3 py-0.5 text-[10.5px] sm:text-[11px] font-bold text-[#10373C] shadow-xs">
                  <CheckCircle2
                    size={13}
                    className="shrink-0 text-[#008B9A]"
                  />
                  <span>ISO 13485 Certified</span>
                </div>

                <div className="inline-flex items-center gap-1.5 rounded-full border border-[#B6E2E7] bg-white/90 px-3 py-0.5 text-[10.5px] sm:text-[11px] font-bold text-[#10373C] shadow-xs">
                  <CheckCircle2
                    size={13}
                    className="shrink-0 text-[#008B9A]"
                  />
                  <span>24/7 SLA Field Support</span>
                </div>

                <div className="inline-flex items-center gap-1.5 rounded-full border border-[#B6E2E7] bg-white/90 px-3 py-0.5 text-[10.5px] sm:text-[11px] font-bold text-[#10373C] shadow-xs">
                  <CheckCircle2
                    size={13}
                    className="shrink-0 text-[#008B9A]"
                  />
                  <span>NABL Traceable QC</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* =========================================================
            FLOATING CAROUSEL CONTROLS (Light Mode)
        ========================================================= */}
        {slides.length > 1 && (
          <>
            {/* Desktop / tablet floating controls */}
            <div className="absolute bottom-3 right-3 z-30 hidden items-center gap-1.5 rounded-xl border border-[#B6E2E7] bg-white/95 p-1 shadow-lg backdrop-blur-xl sm:flex md:bottom-4 md:right-4">
              <button
                type="button"
                onClick={() => setIsPlaying((value) => !value)}
                title={isPlaying ? "Pause Slideshow" : "Play Slideshow"}
                aria-label={isPlaying ? "Pause Slideshow" : "Play Slideshow"}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#B6E2E7] bg-white text-[#10373C] transition-all hover:border-[#008B9A] hover:bg-[#008B9A] hover:text-white"
              >
                {isPlaying ? <Pause size={13} /> : <Play size={13} />}
              </button>

              <button
                type="button"
                onClick={handlePrev}
                title="Previous Slide"
                aria-label="Previous Slide"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#B6E2E7] bg-white text-[#10373C] transition-all hover:border-[#008B9A] hover:bg-[#008B9A] hover:text-white"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex h-8 items-center gap-1.5 rounded-lg border border-[#B6E2E7] bg-[#F4FBFC] px-2 text-[11px] font-bold text-[#10373C]">
                {activeMedia?.type === "video" ? (
                  <Film size={11} className="text-[#008B9A]" />
                ) : (
                  <ImageIcon size={11} className="text-[#008B9A]" />
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
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#B6E2E7] bg-white text-[#10373C] transition-all hover:border-[#008B9A] hover:bg-[#008B9A] hover:text-white"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Floating pagination */}
            <div className="absolute bottom-3 left-3 z-30 flex items-center gap-1.5 rounded-full border border-[#B6E2E7] bg-white/95 px-2.5 py-1.5 shadow-md backdrop-blur-xl md:bottom-4 md:left-4">
              {slides.map((slide, idx) => (
                <button
                  key={slide.id || idx}
                  type="button"
                  onClick={() => setCurrentSlide(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === idx
                    ? "w-6 bg-[#008B9A] shadow-sm"
                    : "w-1.5 bg-[#B6E2E7] hover:bg-[#008B9A]/60"
                    }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Mobile next/previous floating controls */}
        {slides.length > 1 && (
          <div className="absolute bottom-3 right-3 z-30 flex items-center gap-1.5 sm:hidden">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous Slide"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#B6E2E7] bg-white text-[#10373C] shadow-md"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              type="button"
              onClick={handleNext}
              aria-label="Next Slide"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#B6E2E7] bg-white text-[#10373C] shadow-md"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
