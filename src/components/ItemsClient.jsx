"use client";

import { useEffect, useState, useMemo, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import PageBanner from "@/components/PageBanner";
import ProductCard from "@/components/ProductCard";
import { fetchAllDynamicProducts, normalizeProduct } from "@/lib/fetchProducts";
import { subscribeToCatalog } from "@/lib/data-fetcher";
import {
  Search,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
  RotateCcw,
  ShieldCheck,
  ArrowRight,
  Package,
} from "lucide-react";

function ProductsContent({ city, initialProducts = [], initialCategories = [] }) {
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [loading, setLoading] = useState(initialProducts.length === 0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");

  const categoryTrackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlCategory = searchParams ? (searchParams.get("category") || searchParams.get("cat")) : null;

  const pathParts = pathname.split("/").filter(Boolean);
  const staticRoutes = ["about", "services", "items", "contact", "products"];
  const district =
    pathParts.length > 0 && !staticRoutes.includes(pathParts[0])
      ? pathParts[0]
      : null;

  const makeLink = (path) => {
    if (!district) return path;
    if (path === "/") return `/${district}`;
    if (path.startsWith("/items?")) {
      return `/${district}${path}`;
    }
    return `/${district}${path.startsWith("/") ? path : `/${path}`}`;
  };

  // Initial client fetch if initialProducts was empty
  useEffect(() => {
    let isMounted = true;

    if (products.length === 0) {
      const loadInitialProducts = async () => {
        try {
          const fetched = await fetchAllDynamicProducts();
          if (isMounted && fetched && fetched.length > 0) {
            setProducts(fetched);
          }
        } catch (err) {
          console.error("Error loading dynamic products:", err);
        } finally {
          if (isMounted) setLoading(false);
        }
      };
      loadInitialProducts();
    } else {
      setLoading(false);
    }

    // Real-time catalog subscription with live focus auto-refresh (Admin sync)
    const unsubscribe = subscribeToCatalog((update) => {
      if (!isMounted) return;
      const updatedProducts = Array.isArray(update) ? update : update?.products;
      const updatedCategories = update?.categories;

      if (Array.isArray(updatedProducts)) {
        const normalized = updatedProducts
          .map((item) => normalizeProduct(item))
          .filter(Boolean);
        setProducts(normalized);
      }
      if (Array.isArray(updatedCategories)) {
        setCategories(updatedCategories);
      }
    }, 3000);

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [products.length]);

  // Sync category from URL search params when changed
  useEffect(() => {
    if (urlCategory && typeof urlCategory === "string" && urlCategory.trim()) {
      const decoded = decodeURIComponent(urlCategory.trim());
      setSelectedCategory(decoded);
    }
  }, [urlCategory]);

  // Check scroll overflows for category slider
  const checkScrollState = () => {
    if (!categoryTrackRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = categoryTrackRef.current;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
  };

  useEffect(() => {
    checkScrollState();
    const el = categoryTrackRef.current;
    if (el) {
      el.addEventListener("scroll", checkScrollState, { passive: true });
      window.addEventListener("resize", checkScrollState);
      return () => {
        el.removeEventListener("scroll", checkScrollState);
        window.removeEventListener("resize", checkScrollState);
      };
    }
  }, [categories, products]);

  const scrollCategories = (direction) => {
    if (!categoryTrackRef.current) return;
    const scrollAmount = 280;
    categoryTrackRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // Build active categories list with item counts
  const { categoriesList, categoryCounts } = useMemo(() => {
    const counts = new Map();
    counts.set("All Categories", products.length);

    for (const prod of products) {
      const cat = String(prod.category || "").trim();
      if (cat) {
        counts.set(cat, (counts.get(cat) || 0) + 1);
      }
    }

    const names = new Set();
    // Add categories from product list
    for (const prod of products) {
      const cat = String(prod.category || "").trim();
      if (cat) names.add(cat);
    }
    // Add categories from admin categories list if available
    for (const c of categories) {
      const name = String(c.name || c.category || "").trim();
      if (name) names.add(name);
    }

    const list = ["All Categories", ...Array.from(names).sort()];
    return { categoriesList: list, categoryCounts: counts };
  }, [products, categories]);

  // Filter products based on selected category and search
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === "All Categories" ||
        (product.category &&
          product.category.toLowerCase().trim() === selectedCategory.toLowerCase().trim()) ||
        (product.subCategory &&
          product.subCategory.toLowerCase().trim() === selectedCategory.toLowerCase().trim());

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        (product.title && product.title.toLowerCase().includes(q)) ||
        (product.description && product.description.toLowerCase().includes(q)) ||
        (product.category && product.category.toLowerCase().includes(q)) ||
        (product.brand && product.brand.toLowerCase().includes(q)) ||
        (product.model && product.model.toLowerCase().includes(q));

      return matchesCategory && matchesQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  const resetAllFilters = () => {
    setSelectedCategory("All Categories");
    setSearchQuery("");
  };

  return (
    <div className="bg-[#F4FBFC]/40 text-[#10373C]">
      {/* Page Banner - Matches Home Carousel Height */}
      <PageBanner
        badge="Product Inventory"
        title={city ? `Diagnostic Equipment Collection in ${city}` : "Diagnostic Equipment Collection"}
        subtitle="Explore our certified catalog of clinical chemistry analyzers, hematology counters, PCR systems, patient monitors, and laboratory consumables."
      />

      {/* Main Catalog Section */}
      <section className="section-padding bg-gradient-to-b from-white via-[#F4FBFC] to-[#E4F8FA]">
        <div className="container-custom">
          {/* Controls Bar - Sticky directly below Navbar */}
          <div className="sticky top-20 z-40 rounded-2xl sm:rounded-3xl border border-[#B6E2E7] bg-white/95 backdrop-blur-xl p-4 sm:p-5 shadow-lg shadow-black/5 transition-all">
            <div className="grid gap-4 md:grid-cols-12 items-center">
              {/* Search Box */}
              <div className="md:col-span-5 relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#008B9A]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by equipment name, model, or parameter..."
                  className="w-full rounded-xl border border-[#B6E2E7] bg-[#F4FBFC]/60 pl-10 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm text-[#10373C] transition-all focus:border-[#008B9A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008B9A]/20"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#45656A] hover:text-[#008B9A] cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Category Filter Horizontal Slider */}
              <div className="md:col-span-7 relative flex items-center">
                {canScrollLeft && (
                  <button
                    type="button"
                    onClick={() => scrollCategories("left")}
                    aria-label="Scroll left"
                    className="absolute -left-2 z-10 hidden sm:flex h-8 w-8 items-center justify-center rounded-full border border-[#B6E2E7] bg-white text-[#10373C] shadow-md hover:bg-[#F4FBFC]"
                  >
                    <ChevronLeft size={16} />
                  </button>
                )}

                <div
                  ref={categoryTrackRef}
                  className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none w-full px-1"
                >
                  <Filter size={16} className="text-[#008B9A] shrink-0 mr-1" />
                  {categoriesList.map((cat) => {
                    const isSelected =
                      selectedCategory.toLowerCase().trim() === cat.toLowerCase().trim();
                    const count = categoryCounts.get(cat);

                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#008B9A] !text-white shadow-md shadow-[#008B9A]/30"
                            : "bg-[#F4FBFC] border border-[#B6E2E7] text-[#45656A] hover:bg-[#D4F1F4]"
                        }`}
                      >
                        <span>{cat}</span>
                        {typeof count === "number" && (
                          <span
                            className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                              isSelected ? "bg-white/25 text-white" : "bg-[#B6E2E7]/50 text-[#10373C]"
                            }`}
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {canScrollRight && (
                  <button
                    type="button"
                    onClick={() => scrollCategories("right")}
                    aria-label="Scroll right"
                    className="absolute -right-2 z-10 hidden sm:flex h-8 w-8 items-center justify-center rounded-full border border-[#B6E2E7] bg-white text-[#10373C] shadow-md hover:bg-[#F4FBFC]"
                  >
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Results Count & Clear Button */}
            <div className="mt-3 flex items-center justify-between border-t border-[#B6E2E7]/40 pt-3 text-xs font-semibold text-[#45656A]">
              <span>
                Showing <strong className="text-[#008B9A] font-bold">{filteredProducts.length}</strong> of{" "}
                {products.length} instruments
                {selectedCategory !== "All Categories" && (
                  <span className="ml-1 text-[#008B9A]">in &ldquo;{selectedCategory}&rdquo;</span>
                )}
              </span>

              {(selectedCategory !== "All Categories" || searchQuery) && (
                <button
                  onClick={resetAllFilters}
                  className="text-[#008B9A] font-bold hover:underline cursor-pointer"
                >
                  Reset all filters
                </button>
              )}
            </div>
          </div>

          {/* =========================================================
              PRODUCT GRID OR ZERO RESULTS STATE
          ========================================================== */}
          {filteredProducts.length === 0 && !loading ? (
            products.length === 0 ? (
              /* Global Catalog Coming Soon */
              <div className="mt-12 overflow-hidden rounded-3xl border border-[#B6E2E7] bg-gradient-to-b from-white via-[#F4FBFC] to-white p-8 sm:p-14 text-center shadow-lg shadow-[#008B9A]/5">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-[#008B9A] to-[#22AFC0] text-white shadow-lg shadow-[#008B9A]/25">
                  <Sparkles size={36} className="animate-pulse" />
                </div>

                <div className="mt-6 flex justify-center">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#B6E2E7] bg-[#F4FBFC] px-4 py-1.5 text-xs font-bold text-[#008B9A] uppercase tracking-wider">
                    <Clock size={14} /> New Catalog In Arrival
                  </span>
                </div>

                <h3 className="mt-4 text-3xl sm:text-4xl font-black text-[#10373C] tracking-tight">
                  Products Coming Soon
                </h3>

                <p className="mx-auto mt-4 max-w-2xl text-base text-[#45656A] leading-relaxed">
                  Our certified medical instruments, diagnostic platforms, and laboratory supplies catalog are currently being updated with verified technical specifications. Stay tuned for exciting additions, or reach out to our team directly for customized equipment quotes and priority bookings.
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                  <a
                    href={makeLink("/contact")}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#008B9A] px-8 py-4 text-sm font-bold !text-white shadow-lg shadow-[#008B9A]/25 transition-all hover:bg-[#005C66] hover:shadow-xl hover:shadow-[#008B9A]/35"
                  >
                    <span>Contact Our Specialists</span>
                    <ArrowRight size={18} />
                  </a>

                  <a
                    href={makeLink("/services")}
                    className="inline-flex items-center gap-2 rounded-2xl border border-[#B6E2E7] bg-white px-8 py-4 text-sm font-bold text-[#10373C] shadow-sm transition-all hover:bg-[#F4FBFC]"
                  >
                    <span>View Engineering Services</span>
                  </a>
                </div>
              </div>
            ) : (
              /* Filter / Search Match Empty State */
              <div className="mt-12 rounded-3xl border border-[#B6E2E7] bg-white p-12 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F4FBFC] text-[#008B9A]">
                  <Package size={28} />
                </div>
                <h3 className="mt-4 text-xl font-bold text-[#10373C]">
                  No matching instruments found
                </h3>
                <p className="mt-2 text-sm text-[#45656A] max-w-md mx-auto">
                  No instruments matched your current category or search criteria. Try selecting &ldquo;All Categories&rdquo; or clearing your search term.
                </p>
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={resetAllFilters}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#008B9A] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#005C66] transition cursor-pointer"
                  >
                    <RotateCcw size={13} />
                    <span>Reset All Filters</span>
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id || product.slug}
                  product={product}
                  makeLink={makeLink}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Bulk Procurement Banner */}
      <section className="section-padding bg-white border-t border-[#B6E2E7]/60">
        <div className="container-custom">
          <div className="rounded-3xl border border-[#B6E2E7] bg-gradient-to-r from-[#F4FBFC] via-[#E4F8FA] to-[#D4F1F4] p-8 sm:p-12 shadow-lg">
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#008B9A]/30 bg-white px-4 py-1.5 text-xs font-bold text-[#005C66] uppercase tracking-wider">
                  <ShieldCheck size={16} className="text-[#008B9A]" /> Bulk Hospital Orders & Tenders
                </span>

                <h2 className="mt-4 text-2xl sm:text-3xl font-black text-[#10373C]">
                  Procuring for a Hospital, Diagnostic Network, or Medical College?
                </h2>

                <p className="mt-3 text-sm sm:text-base text-[#45656A] leading-relaxed">
                  We supply turnkey instrument setups, annual reagent supply contracts, and comprehensive biomedical AMC coverage with dedicated SLA commitments across India.
                </p>
              </div>

              <div className="lg:col-span-4 flex justify-start lg:justify-end">
                <a
                  href={makeLink("/contact")}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#008B9A] px-7 py-4 text-sm font-bold !text-white shadow-lg shadow-[#008B9A]/25 transition-all hover:bg-[#005C66]"
                >
                  <span>Request Bulk Quote</span>
                  <ArrowRight size={18} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ItemsClient({ city, initialProducts = [], initialCategories = [] }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center bg-[#F4FBFC]">
          <div className="flex items-center gap-3 text-sm font-bold text-[#008B9A]">
            <span className="h-4 w-4 rounded-full border-2 border-[#008B9A] border-t-transparent animate-spin" />
            <span>Loading diagnostic inventory...</span>
          </div>
        </div>
      }
    >
      <ProductsContent
        city={city}
        initialProducts={initialProducts}
        initialCategories={initialCategories}
      />
    </Suspense>
  );
}
