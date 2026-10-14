"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { makeSlug } from "@/data/productsData";
import { fetchAllDynamicProducts } from "@/lib/fetchProducts";

import {
    FaPlay,
    FaShareAlt,
    FaWhatsapp,
    FaFacebook,
    FaInstagram,
    FaLink,
} from "react-icons/fa";

import {
    Microscope,
    ShieldCheck,
    CheckCircle2,
    Download,
    Send,
    Phone,
    Mail,
    Building2,
    Sparkles,
    Layers,
    Award,
    FileText,
    Check,
    Clock,
    Settings,
} from "lucide-react";

import {
    doc,
    getDoc,
    addDoc,
    collection,
    db,
} from "@/lib/client-api";

const loadImageBase64 = async (src) => {
    try {
        if (!src || typeof src !== "string") {
            throw new Error("Invalid image source");
        }

        if (!src.startsWith("http")) {
            return new Promise((resolve, reject) => {
                const img = new window.Image();
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0);
                    try {
                        resolve(canvas.toDataURL("image/png"));
                    } catch (e) {
                        reject(e);
                    }
                };
                img.onerror = (e) => reject(e);
                img.src = src;
            });
        }

        try {
            const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(src)}`;
            const response = await fetch(proxyUrl);
            if (response.ok) {
                const blob = await response.blob();
                return await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = () => reject(new Error("FileReader failed"));
                    reader.readAsDataURL(blob);
                });
            }
        } catch (proxyErr) {
            console.warn("Proxy method failed, trying direct fetch:", proxyErr);
        }

        try {
            const response = await fetch(src, { cache: "no-cache" });
            if (response.ok) {
                const blob = await response.blob();
                return await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = () => reject(new Error("FileReader failed"));
                    reader.readAsDataURL(blob);
                });
            }
        } catch (fetchErr) {
            console.warn("Direct fetch failed, falling back to canvas:", fetchErr);
        }

        return await new Promise((resolve, reject) => {
            const img = new window.Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                try {
                    resolve(canvas.toDataURL("image/png"));
                } catch (e) {
                    reject(e);
                }
            };
            img.onerror = () => reject(new Error("Image element load failed"));
            img.src = src;
        });
    } catch (err) {
        console.error("loadImageBase64 failed for src:", src, err);
        throw err;
    }
};

/**
 * Extracts comprehensive technical & clinical specifications for any diagnostic product.
 * STRICTLY OMITS ANY PRICE OR RATE FIELDS as requested.
 */
export function extractProductAllDetails(product) {
    if (!product) return [];
    const specsMap = new Map();

    const add = (label, val) => {
        if (val === null || val === undefined || typeof val === "object") return;
        const str = String(val).trim();
        if (!str || str === "N/A" || str.toLowerCase() === "null" || str.toLowerCase() === "undefined") return;
        const keyLower = label.toLowerCase().trim();
        if (
            keyLower.includes("price") ||
            keyLower.includes("mrp") ||
            keyLower.includes("cost") ||
            keyLower.includes("rate") ||
            keyLower === "id" ||
            keyLower === "uid" ||
            keyLower === "createdat" ||
            keyLower === "created_at" ||
            keyLower.startsWith("__")
        ) {
            return;
        }
        if (!specsMap.has(keyLower)) {
            specsMap.set(keyLower, { label, value: str });
        }
    };

    const title = String(product.title || product.name || "");
    const category = String(product.category || "");
    const subCategory = String(product.subCategory || "");
    const desc = String(product.description || product.desc || "");
    const combinedText = `${title} ${category} ${subCategory} ${desc}`;

    // 1. Brand extraction
    let brand = product.brand ? String(product.brand).trim() : "";
    if (!brand) {
        const knownBrands = [
            "OSCAR", "Erba", "Mindray", "Transasia", "Sysmex", "Roche", "Abbott",
            "Bio-Rad", "Siemens", "Arkray", "Span", "Merck", "Agappe", "Tulip",
            "SD Biosensor", "Accu-Chek", "Horiba", "Beckman Coulter", "Rayto",
            "Beacon", "Accurex", "Coral", "J. Mitra", "Stago", "Snibe", "Wondfo"
        ];
        for (const b of knownBrands) {
            const regex = new RegExp(`\\b${b}\\b`, "i");
            if (regex.test(title)) {
                brand = b;
                break;
            }
        }
        if (!brand) {
            const firstWord = title.split(/\s+/)[0];
            if (firstWord && firstWord.length >= 3 && /^[A-Z0-9]+$/i.test(firstWord) && !["The", "New", "All", "Pro", "Auto", "Dual", "Mini"].includes(firstWord)) {
                brand = firstWord.toUpperCase();
            } else {
                brand = "Raj Biosis Certified";
            }
        }
    }
    add("Brand / Manufacturer", brand);

    // 2. Model / Instrument Series
    let model = product.model ? String(product.model).trim() : "";
    if (!model) {
        const modelMatch = title.match(/\b([A-Z0-9]{2,}[-][A-Z0-9]+|[A-Z]{1,3}\s*\d{2,4}[A-Za-z]?|\d+P|\d+\s*Parameter[s]?)\b/i);
        if (modelMatch) {
            model = modelMatch[0];
        } else {
            model = "Standard Series";
        }
    }
    add("Model / Series", model);

    // 3. Category & Sub Category
    if (category) add("Category", category);
    if (subCategory && subCategory !== category) add("Sub Category", subCategory);

    // 4. Instrument / Product Type
    let instrumentType = product.instrument ? String(product.instrument).trim() : "";
    if (!instrumentType) {
        const textLower = combinedText.toLowerCase();
        if (textLower.includes("urine") || textLower.includes("urinary")) {
            instrumentType = "Urinalysis Test Strips / Reagent System";
        } else if (textLower.includes("hematology") || textLower.includes("cbc")) {
            instrumentType = "Hematology Analyzer & Cell Counter";
        } else if (textLower.includes("chemistry") || textLower.includes("biochemistry")) {
            instrumentType = "Clinical Chemistry Analyzer";
        } else if (textLower.includes("electrolyte")) {
            instrumentType = "Electrolyte Analyzer (ISE)";
        } else if (textLower.includes("coagulation")) {
            instrumentType = "Automated Coagulation Analyzer";
        } else if (textLower.includes("elisa") || textLower.includes("reader")) {
            instrumentType = "Microplate ELISA Reader & Washer";
        } else if (textLower.includes("centrifuge")) {
            instrumentType = "Laboratory Centrifuge System";
        } else if (textLower.includes("microscope")) {
            instrumentType = "Diagnostic Optical Microscope";
        } else if (textLower.includes("rapid") || textLower.includes("card")) {
            instrumentType = "Rapid Immunoassay Diagnostic Kit";
        } else {
            instrumentType = "In-Vitro Diagnostic (IVD) Laboratory Equipment";
        }
    }
    add("Product Classification", instrumentType);

    // 5. Test Parameters / Profile
    let params = product.parameters || product.testParameters || "";
    if (params && typeof params === "string") {
        add("Test Parameters", params.replace(/\|/g, ", "));
    } else {
        const textLower = combinedText.toLowerCase();
        if (textLower.includes("10p") || textLower.includes("10 parameter")) {
            add("Test Parameters", "10 Parameters (Glucose, Bilirubin, Ketone, Specific Gravity, Blood, pH, Protein, Urobilinogen, Nitrite, Leukocytes)");
        } else if (textLower.includes("urinary") || textLower.includes("urine")) {
            add("Test Parameters", "Urinary Multi-Parameter Clinical Panel");
        } else if (textLower.includes("hematology") || textLower.includes("cbc")) {
            add("Test Parameters", "Complete Blood Count (CBC) with 3-Part / 5-Part Differential");
        } else if (textLower.includes("chemistry") || textLower.includes("biochemistry")) {
            add("Test Parameters", "Liver Function, Kidney Function, Lipid Panel, Blood Glucose, Cardiac Enzymes");
        } else if (textLower.includes("electrolyte")) {
            add("Test Parameters", "Na+ (Sodium), K+ (Potassium), Cl- (Chloride), iCa2+ (Ionized Calcium)");
        } else {
            add("Application Profile", "Diagnostic Clinical Panel");
        }
    }

    // 6. Specimen / Sample Type
    const textLower = combinedText.toLowerCase();
    let specimen = "Diagnostic Biological Specimen";
    if (textLower.includes("urine") || textLower.includes("urinary")) {
        specimen = "Fresh Urine Specimen (No Centrifugation Required)";
    } else if (textLower.includes("hematology") || textLower.includes("blood") || textLower.includes("cbc")) {
        specimen = "Whole Blood (EDTA Anti-coagulated)";
    } else if (textLower.includes("chemistry") || textLower.includes("biochemistry")) {
        specimen = "Serum, Plasma, or Whole Blood";
    } else if (textLower.includes("electrolyte")) {
        specimen = "Serum, Whole Blood, Plasma, or Diluted Urine";
    } else if (textLower.includes("rapid") || textLower.includes("strip") || textLower.includes("card")) {
        specimen = "Whole Blood, Serum, or Plasma";
    }
    add("Sample / Specimen Type", specimen);

    // 7. Testing Principle / Methodology
    let methodology = "";
    if (textLower.includes("strip") || textLower.includes("urinary")) {
        methodology = "Dry Chemistry Colorimetric Reflectance Strip";
    } else if (textLower.includes("chemistry") || textLower.includes("biochemistry")) {
        methodology = "Photometric Colorimetry & Enzymatic Immunoturbidimetry";
    } else if (textLower.includes("hematology")) {
        methodology = "Electrical Impedance Principle & Laser Flow Cytometry";
    } else if (textLower.includes("electrolyte")) {
        methodology = "Direct / Indirect Ion-Selective Electrode (ISE)";
    } else if (textLower.includes("coagulation")) {
        methodology = "Magnetic Sensor / Photo-Optical Clot Detection";
    } else if (textLower.includes("rapid") || textLower.includes("card")) {
        methodology = "Lateral Flow Immunochromatographic Assay (LFIA)";
    } else {
        methodology = "Standardized In-Vitro Diagnostic (IVD) Protocol";
    }
    add("Testing Methodology", methodology);

    // 8. Throughput / Reading Time
    let throughput = product.throughput ? String(product.throughput).trim() : "";
    if (!throughput) {
        if (textLower.includes("strip") || textLower.includes("rapid")) {
            throughput = "Rapid Results in 60 to 120 Seconds";
        } else if (textLower.includes("hematology")) {
            throughput = "60 Samples / Hour";
        } else if (textLower.includes("chemistry") || textLower.includes("biochemistry")) {
            throughput = "200 to 400 Tests / Hour";
        } else if (textLower.includes("electrolyte")) {
            throughput = "60 Samples / Hour (Quick Cycle)";
        } else {
            throughput = "High-efficiency Continuous Processing";
        }
    }
    add("Throughput / Response Time", throughput);

    // 9. Automation & Calibration
    let automation = product.automation ? String(product.automation).trim() : "";
    if (!automation) {
        if (textLower.includes("strip") || textLower.includes("manual")) {
            automation = "Manual Visual & Semi-Automated Strip Reader Compatible";
        } else {
            automation = "Fully Automated with Auto-Calibration & QC Monitoring";
        }
    }
    add("Automation Grade", automation);

    // 10. Storage & Temperature
    let storage = "";
    if (textLower.includes("strip") || textLower.includes("reagent") || textLower.includes("kit")) {
        storage = "Store at 2°C - 30°C in Cool & Dry Place (Avoid Direct Sunlight)";
    } else {
        storage = "Operating Temperature: 15°C - 35°C, Humidity: 20% - 85% RH";
    }
    add("Storage / Operating Environment", storage);

    // 11. Capacity / Packaging
    let capacity = product.capacity || product.packSize || "";
    if (!capacity) {
        const packMatch = title.match(/\b(\d+\s*(?:strips?|tests?|vials?|ml|pcs|pieces|reactions?))\b/i);
        if (packMatch) {
            capacity = packMatch[0];
        } else if (textLower.includes("strip")) {
            capacity = "100 Strips / Airtight Canister";
        } else {
            capacity = "Standard Laboratory Unit Packaging";
        }
    }
    add("Packaging / Unit Capacity", capacity);

    // 12. Regulatory Compliance
    add("Quality Standards", "ISO 13485:2016 & CE IVD Certified");

    // 13. Availability & Distribution
    add("Availability", product.availability || product.status || "In Stock (Ready for Dispatch)");
    add("Authorized Distributor", "Raj Biosis Private Limited (Pan-India Logistics & Engineering Support)");

    // 14. Any custom specs from admin object / array
    if (product.specs && typeof product.specs === "object") {
        if (Array.isArray(product.specs)) {
            product.specs.forEach((item) => {
                if (item && item.label && item.value) {
                    add(item.label, item.value);
                } else if (typeof item === "string" && item.includes(":")) {
                    const [k, v] = item.split(":");
                    add(k.trim(), v.trim());
                }
            });
        } else {
            Object.entries(product.specs).forEach(([k, v]) => {
                if (v && typeof v !== "object") {
                    const cleanLabel = k.replace(/([A-Z])/g, " $1").replace(/[_-]/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());
                    add(cleanLabel, v);
                }
            });
        }
    }

    return Array.from(specsMap.values());
}

const getWebsiteDomain = () => {
    if (typeof window !== "undefined") {
        const host = window.location.hostname;
        if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
            return host;
        }
    }
    return "indiandiagnostics.com";
};

export default function ProductDetails({ slug, initialProduct = null, initialContactInfo = [] }) {
    const [product, setProduct] = useState(initialProduct || null);
    const [loading, setLoading] = useState(!initialProduct);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [selectedImage, setSelectedImage] = useState(
        initialProduct?.image || (Array.isArray(initialProduct?.images) && initialProduct?.images[0]) || "/logo.png"
    );
    const [selectedMedia, setSelectedMedia] = useState("image");
    const [showShare, setShowShare] = useState(false);
    const [contactInfo, setContactInfo] = useState(initialContactInfo || []);
    const [downloadingBrochure, setDownloadingBrochure] = useState(false);

    const shareRef = useRef(null);
    const [form, setForm] = useState({
        name: "",
        email: "",
        phone: "",
        message: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const pathname = usePathname();

    const specificationsList = useMemo(() => {
        return extractProductAllDetails(product);
    }, [product]);

    const pathParts = pathname.split("/").filter(Boolean);
    const city = pathParts.length > 1 ? pathParts[0] : "India";
    const cityName = city.charAt(0).toUpperCase() + city.slice(1);

    // Sync client-side in background if needed
    useEffect(() => {
        let isMounted = true;
        const loadProduct = async () => {
            try {
                const [allProducts, contactSnap] = await Promise.all([
                    fetchAllDynamicProducts(),
                    getDoc(doc(db, "websites", "indiandiagnosticscom", "pages", "contact")).catch(() => null),
                ]);

                if (!isMounted) return;

                if (contactSnap && contactSnap.exists()) {
                    setContactInfo(contactSnap.data().contactInfo || []);
                }

                const found = (allProducts || []).find(
                    (p) => p.slug === slug || makeSlug(p.title) === slug || String(p.id) === slug
                );

                if (found) {
                    setProduct(found);
                    if (!selectedImage || selectedImage === "/logo.png") {
                        const mainImg =
                            (Array.isArray(found.images) && found.images[0]) ||
                            found.image ||
                            found.imgUrl ||
                            found.imageUrl ||
                            "/logo.png";
                        setSelectedImage(mainImg);
                    }
                }
            } catch (error) {
                console.error("Error updating product details:", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadProduct();
        return () => {
            isMounted = false;
        };
    }, [slug, selectedImage]);

    // Close share popup on outside click
    useEffect(() => {
        const close = (e) => {
            if (shareRef.current && !shareRef.current.contains(e.target)) {
                setShowShare(false);
            }
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, []);

    // Brochure PDF Download (Without Price)
    const handleDownloadBrochure = async () => {
        if (!product) return;
        try {
            setDownloadingBrochure(true);
            const { jsPDF } = await import("jspdf");
            const pdfDoc = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
            });

            let logoBase64 = null;
            try {
                logoBase64 = await loadImageBase64("/logo.png");
            } catch (e) {
                console.error("Brochure logo load note:", e);
            }

            const imgUrl =
                product.image ||
                product.imageUrl ||
                product.imgUrl ||
                (product.images && product.images[0]);
            let productImgBase64 = null;
            if (imgUrl && imgUrl !== "/logo.png") {
                try {
                    productImgBase64 = await loadImageBase64(imgUrl);
                } catch (e) {
                    console.error("Brochure product image load note:", e);
                }
            }

            const margin = 15;
            const pageWidth = 210;
            const pageHeight = 297;
            const contentWidth = pageWidth - 2 * margin;

            const colorPrimary = [0, 139, 154];        // #008B9A
            const colorDark = [16, 55, 60];           // #10373C
            const colorGray = [69, 101, 106];          // #45656A
            const colorLightBorder = [182, 226, 231]; // #B6E2E7
            const colorBgWarm = [244, 251, 252];      // #F4FBFC

            // 1. Header
            let headerLeftOffset = margin;
            if (logoBase64) {
                try {
                    pdfDoc.addImage(logoBase64, "PNG", margin, 14, 14, 14);
                    headerLeftOffset += 18;
                } catch (imgErr) {
                    console.warn("PDF logo render:", imgErr);
                }
            }

            pdfDoc.setFont("helvetica", "bold");
            pdfDoc.setFontSize(16);
            pdfDoc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
            pdfDoc.text("Raj Biosis Private Limited", headerLeftOffset, 20);

            pdfDoc.setFont("helvetica", "normal");
            pdfDoc.setFontSize(8.5);
            pdfDoc.setTextColor(colorGray[0], colorGray[1], colorGray[2]);
            pdfDoc.text("Biomedical & Diagnostic Equipment Supplier", headerLeftOffset, 25);

            const websiteText = getWebsiteDomain();
            pdfDoc.setFontSize(8);
            pdfDoc.setTextColor(colorDark[0], colorDark[1], colorDark[2]);
            pdfDoc.text(`Website: ${websiteText}`, 135, 19);
            pdfDoc.text("Email: mail@rajbiosis.com", 135, 24);
            pdfDoc.text("Phone: +91 8318368383", 135, 29);

            pdfDoc.setDrawColor(colorLightBorder[0], colorLightBorder[1], colorLightBorder[2]);
            pdfDoc.setLineWidth(0.6);
            pdfDoc.line(margin, 34, pageWidth - margin, 34);

            // 2. Title & Category
            pdfDoc.setFont("helvetica", "bold");
            pdfDoc.setFontSize(8.5);
            pdfDoc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
            pdfDoc.text((product.category || "DIAGNOSTIC EQUIPMENT").toUpperCase(), margin, 42);

            pdfDoc.setFont("helvetica", "bold");
            pdfDoc.setFontSize(14);
            pdfDoc.setTextColor(colorDark[0], colorDark[1], colorDark[2]);
            const titleLines = pdfDoc.splitTextToSize(product.title, contentWidth);
            pdfDoc.text(titleLines, margin, 48);
            const titleHeight = titleLines.length * 6;

            // 3. Product Image
            const imageY = 48 + titleHeight + 3;
            const imageHeight = 50;
            const imageWidth = 65;
            const imageX = margin + (contentWidth - imageWidth) / 2;

            pdfDoc.setDrawColor(colorLightBorder[0], colorLightBorder[1], colorLightBorder[2]);
            pdfDoc.setFillColor(colorBgWarm[0], colorBgWarm[1], colorBgWarm[2]);
            pdfDoc.roundedRect(imageX - 6, imageY - 2, imageWidth + 12, imageHeight + 4, 3, 3, "FD");

            if (productImgBase64) {
                let format = productImgBase64.startsWith("data:image/png") ? "PNG" : "JPEG";
                try {
                    pdfDoc.addImage(productImgBase64, format, imageX, imageY, imageWidth, imageHeight);
                } catch (imgAddErr) {
                    pdfDoc.setFont("helvetica", "normal");
                    pdfDoc.setFontSize(9);
                    pdfDoc.setTextColor(colorGray[0], colorGray[1], colorGray[2]);
                    pdfDoc.text("Diagnostic Specification Sheet", imageX + 8, imageY + imageHeight / 2);
                }
            }

            // 4. Description Overview
            const descY = imageY + imageHeight + 9;
            pdfDoc.setFont("helvetica", "bold");
            pdfDoc.setFontSize(11);
            pdfDoc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
            pdfDoc.text("Product Overview", margin, descY);

            pdfDoc.setDrawColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
            pdfDoc.setLineWidth(0.6);
            pdfDoc.line(margin, descY + 2, margin + 28, descY + 2);

            pdfDoc.setFont("helvetica", "normal");
            pdfDoc.setFontSize(8.5);
            pdfDoc.setTextColor(colorGray[0], colorGray[1], colorGray[2]);

            let descText = product.desc || product.description || "Precision biomedical diagnostic instrument engineered for clinical accuracy, certified lab standards, and reliable operation.";
            if (descText.length > 350) {
                descText = descText.substring(0, 350) + "...";
            }
            const descLines = pdfDoc.splitTextToSize(descText, contentWidth);
            pdfDoc.text(descLines, margin, descY + 8);
            const descHeight = descLines.length * 4.2;

            // 5. Technical Specifications (All details except price)
            const specsY = descY + 11 + descHeight;
            pdfDoc.setFont("helvetica", "bold");
            pdfDoc.setFontSize(11);
            pdfDoc.setTextColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
            pdfDoc.text("Technical Specifications & Diagnostic Parameters", margin, specsY);

            pdfDoc.setDrawColor(colorPrimary[0], colorPrimary[1], colorPrimary[2]);
            pdfDoc.setLineWidth(0.6);
            pdfDoc.line(margin, specsY + 2, margin + 50, specsY + 2);

            const specs = specificationsList;
            let specRowY = specsY + 8;
            pdfDoc.setFontSize(8);

            for (let i = 0; i < specs.length; i++) {
                const label = specs[i].label;
                const value = String(specs[i].value);

                if (i % 2 === 0) {
                    pdfDoc.setFillColor(colorBgWarm[0], colorBgWarm[1], colorBgWarm[2]);
                    pdfDoc.rect(margin, specRowY - 3.5, contentWidth, 5, "F");
                }

                pdfDoc.setFont("helvetica", "bold");
                pdfDoc.setTextColor(colorDark[0], colorDark[1], colorDark[2]);
                pdfDoc.text(`${label}:`, margin + 2, specRowY);

                pdfDoc.setFont("helvetica", "normal");
                pdfDoc.setTextColor(colorGray[0], colorGray[1], colorGray[2]);
                const valueLines = pdfDoc.splitTextToSize(value, contentWidth - 48);
                pdfDoc.text(valueLines, margin + 45, specRowY);

                specRowY += Math.max(valueLines.length * 3.8, 5);

                if (specRowY > pageHeight - 22) {
                    pdfDoc.addPage();
                    specRowY = margin + 10;
                }
            }

            // 6. Footer
            pdfDoc.setDrawColor(colorLightBorder[0], colorLightBorder[1], colorLightBorder[2]);
            pdfDoc.setLineWidth(0.4);
            pdfDoc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

            pdfDoc.setFont("helvetica", "italic");
            pdfDoc.setFontSize(7.5);
            pdfDoc.setTextColor(colorGray[0], colorGray[1], colorGray[2]);
            pdfDoc.text(
                "Raj Biosis Private Limited | NABL-Traceable Calibration • 24/7 SLA Engineering Support",
                pageWidth / 2,
                pageHeight - 9,
                { align: "center" }
            );

            pdfDoc.save(`${product.title.replace(/\s+/g, "_")}_Brochure.pdf`);
            toast.success("Brochure downloaded successfully!");
        } catch (e) {
            console.error("Error creating brochure PDF:", e);
            toast.error("Failed to generate brochure PDF.");
        } finally {
            setDownloadingBrochure(false);
        }
    };

    // Form Submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        const name = form.name.trim();
        const phone = form.phone.trim().replace(/\D/g, "");
        const email = form.email.trim();

        if (!name || name.length < 2) {
            return toast.error("Please enter your full name.");
        }

        if (!phone || phone.length < 10) {
            return toast.error("Please enter a valid 10-digit mobile number.");
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && !emailRegex.test(email)) {
            return toast.error("Please enter a valid email address.");
        }

        try {
            setSubmitting(true);

            await addDoc(
                collection(
                    db,
                    "websitesQueries",
                    "indiandiagnosticscom",
                    "productQueries"
                ),
                {
                    name,
                    email: email || "inquiry@indiandiagnostics.com",
                    phone,
                    message: form.message.trim() || `Inquiry for ${product.title}`,
                    productName: product.title,
                    productSlug: product.slug || slug,
                    brand: product.brand || "",
                    model: product.model || "",
                    createdAt: new Date(),
                }
            );

            toast.success("Thank you! Your quotation inquiry has been sent successfully.");
            setForm({
                name: "",
                email: "",
                phone: "",
                message: "",
            });
        } catch (error) {
            console.error("Form submit error:", error);
            toast.error(error?.message || "Failed to submit enquiry. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    // Sharing Handlers
    const handleCopy = async () => {
        if (typeof window !== "undefined") {
            await navigator.clipboard.writeText(window.location.href);
            toast.success("Link copied to clipboard!");
            setShowShare(false);
        }
    };

    const handleWhatsapp = () => {
        if (typeof window !== "undefined") {
            const shareText = `🔬 ${product?.title}\n\nTechnical Specifications & Details:\n${window.location.href}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
        }
    };

    const handleFacebook = () => {
        if (typeof window !== "undefined") {
            window.open(
                `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
                "_blank"
            );
        }
    };

    const handleInstagram = async () => {
        if (typeof window !== "undefined") {
            await navigator.clipboard.writeText(window.location.href);
            toast.success("Link copied! You can paste and share on Instagram.");
        }
    };

    const handleNativeShare = async () => {
        if (typeof navigator !== "undefined" && navigator.share) {
            try {
                await navigator.share({
                    title: product?.title,
                    text: `Explore ${product?.title} specifications at Raj Biosis`,
                    url: window.location.href,
                });
            } catch (err) {
                // Ignore AbortError if user closes share dialog
            }
        } else {
            setShowShare(!showShare);
        }
    };

    // Rich structured JSON-LD schemas
    const productSchema = product
        ? {
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.title,
            image: product.image ? [product.image] : [],
            description: product.desc || product.description || product.title,
            brand: {
                "@type": "Brand",
                name: product.brand || "Raj Biosis Private Limited",
            },
        }
        : null;

    const faqSchema = product
        ? {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
                {
                    "@type": "Question",
                    name: `What are the technical specifications of ${product.title}?`,
                    acceptedAnswer: {
                        "@type": "Answer",
                        text: `${product.title} is an IVD-certified medical system supplied by Raj Biosis Private Limited for clinical laboratories, hospitals, and diagnostic centers with complete installation and calibration support.`,
                    },
                },
                {
                    "@type": "Question",
                    name: `How can I request a quotation for ${product.title}?`,
                    acceptedAnswer: {
                        "@type": "Answer",
                        text: `You can submit the enquiry form on this page or call Raj Biosis directly for instant pricing, availability, and technical documentation.`,
                    },
                },
            ],
        }
        : null;

    if (loading) {
        return (
            <section className="py-12 md:py-20 bg-gradient-to-b from-white to-[#F4FBFC]">
                <div className="container-custom">
                    <div className="grid lg:grid-cols-12 gap-8 md:gap-12">
                        {/* Left Skeleton */}
                        <div className="lg:col-span-5 space-y-6">
                            <div className="h-[420px] md:h-[500px] rounded-[32px] bg-gradient-to-br from-[#E4F8FA] via-[#F4FBFC] to-[#D4F1F4] animate-pulse border border-[#B6E2E7]/60" />
                            <div className="h-44 rounded-[32px] bg-gradient-to-br from-[#E4F8FA] via-white to-[#F4FBFC] animate-pulse border border-[#B6E2E7]/60" />
                        </div>
                        {/* Right Skeleton */}
                        <div className="lg:col-span-7 space-y-6">
                            <div className="h-12 w-3/4 bg-gradient-to-r from-[#E4F8FA] to-[#D4F1F4] rounded-2xl animate-pulse" />
                            <div className="h-6 w-1/3 bg-gradient-to-r from-[#E4F8FA] to-[#D4F1F4] rounded-xl animate-pulse" />
                            <div className="grid grid-cols-2 gap-4 mt-8">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="h-20 bg-gradient-to-r from-[#E4F8FA] to-white rounded-2xl animate-pulse border border-[#B6E2E7]/40" />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    if (!product) {
        return (
            <section className="py-20 min-h-[60vh] flex items-center justify-center bg-gradient-to-b from-white to-[#E4F8FA]">
                <div className="container-custom text-center max-w-lg">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#D4F1F4] text-[#008B9A] mb-6">
                        <Microscope size={38} />
                    </div>
                    <h2 className="text-3xl font-black text-[#10373C]">Equipment Not Found</h2>
                    <p className="mt-3 text-sm text-[#45656A] leading-relaxed">
                        The diagnostic equipment you are looking for is either unavailable or has been updated in our catalog.
                    </p>
                    <Link
                        href="/products"
                        className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-[#008B9A] px-8 py-4 text-sm font-bold text-white shadow-lg hover:bg-[#005C66] transition-all"
                    >
                        <span>Browse Full Catalog</span>
                        <span>→</span>
                    </Link>
                </div>
            </section>
        );
    }

    const allImages = (
        Array.isArray(product.images) && product.images.length > 0
            ? product.images
            : [product.image || product.imgUrl || product.imageUrl || selectedImage]
    ).filter((img) => img && img !== "/logo.png");

    return (
        <section className="py-8 md:py-14 bg-gradient-to-b from-[#F4FBFC]/60 via-white to-[#F4FBFC]/80 min-h-screen">
            {productSchema && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
                />
            )}
            {faqSchema && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
                />
            )}

            <div className="container-custom">
                {/* Breadcrumbs */}
                <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs md:text-sm text-[#45656A]">
                    <Link href="/" className="hover:text-[#008B9A] transition-colors font-medium">Home</Link>
                    <span>/</span>
                    <Link href="/products" className="hover:text-[#008B9A] transition-colors font-medium">Products</Link>
                    <span>/</span>
                    <span className="text-[#008B9A] font-bold truncate max-w-[280px] md:max-w-md">{product.title}</span>
                </nav>

                {/* Main Unified 2-Column Responsive Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">

                    {/* COLUMN 1: Image Showcase + Media Thumbnails + Quote Form */}
                    <div className="lg:col-span-5 space-y-6">

                        {/* Main Image Showcase Card */}
                        <div className="group relative h-[360px] sm:h-[420px] md:h-[480px] overflow-hidden rounded-[32px] border border-[#B6E2E7] bg-gradient-to-b from-[#F4FBFC] via-white to-[#E4F8FA]/30 shadow-xl shadow-[#008B9A]/10">
                            {/* Premium Quality Badge */}
                            <div className="absolute left-5 top-5 z-20 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#005C66] to-[#008B9A] px-3.5 py-1.5 text-xs font-bold text-white shadow-md">
                                <Sparkles size={13} />
                                <span>Certified IVD</span>
                            </div>

                            {/* Status Badge */}
                            <div className="absolute right-5 top-5 z-20 flex items-center gap-1.5 rounded-full bg-emerald-500/95 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold text-white shadow-md">
                                <ShieldCheck size={13} />
                                <span>{product.status || product.availability || "In Stock"}</span>
                            </div>

                            {selectedMedia === "video" && product.video ? (
                                <video
                                    controls
                                    autoPlay
                                    className="h-full w-full object-contain p-6"
                                >
                                    <source src={product.video} type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>
                            ) : (
                                <>
                                    {!imageLoaded && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#E4F8FA] via-white to-[#D4F1F4] animate-pulse">
                                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm border border-[#B6E2E7] text-[#008B9A]">
                                                <Microscope size={32} className="animate-bounce" />
                                            </div>
                                            <span className="mt-3 text-xs font-bold text-[#005C66]">Loading Equipment View...</span>
                                        </div>
                                    )}

                                    {selectedImage && selectedImage !== "/logo.png" ? (
                                        <Image
                                            src={selectedImage}
                                            alt={product.title || "Diagnostic Equipment"}
                                            fill
                                            priority
                                            onLoad={() => setImageLoaded(true)}
                                            className="object-contain p-6 transition-transform duration-500 group-hover:scale-105"
                                            sizes="(max-width: 1024px) 100vw, 42vw"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
                                            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white border border-[#B6E2E7] text-[#008B9A] shadow-md">
                                                <Microscope size={42} />
                                            </div>
                                            <span className="mt-4 text-sm font-extrabold uppercase tracking-wider text-[#10373C]">
                                                {product.category || "Biomedical Analyzer"}
                                            </span>
                                            <span className="mt-1 text-xs text-[#45656A]">
                                                Genuine Laboratory Specification
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Media Thumbnails Strip */}
                        {(allImages.length > 1 || product.video || product.pdf) && (
                            <div className="flex flex-wrap gap-3 p-1">
                                {allImages.map((img, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={() => {
                                            setSelectedImage(img);
                                            setSelectedMedia("image");
                                        }}
                                        className={`group relative h-18 w-18 overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                                            selectedMedia === "image" && selectedImage === img
                                                ? "border-[#008B9A] ring-2 ring-[#008B9A]/30 shadow-md"
                                                : "border-[#B6E2E7] hover:border-[#008B9A]"
                                        }`}
                                    >
                                        <Image
                                            src={img}
                                            alt={`Thumbnail ${index + 1}`}
                                            width={72}
                                            height={72}
                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                                        />
                                    </button>
                                ))}

                                {product.video && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedMedia("video")}
                                        className={`group flex h-18 w-18 flex-col items-center justify-center rounded-2xl border-2 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                                            selectedMedia === "video"
                                                ? "border-[#008B9A] bg-[#008B9A]/10 ring-2 ring-[#008B9A]/30"
                                                : "border-[#B6E2E7] hover:border-[#008B9A] bg-white"
                                        }`}
                                    >
                                        <FaPlay size={18} className="text-[#008B9A]" />
                                        <span className="mt-1 text-[10px] font-bold text-[#10373C]">Video</span>
                                    </button>
                                )}

                                {product.pdf && (
                                    <a
                                        href={product.pdf}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group flex h-18 w-18 flex-col items-center justify-center rounded-2xl border-2 border-[#B6E2E7] bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-[#008B9A] hover:shadow-md"
                                    >
                                        <FileText size={20} className="text-[#008B9A]" />
                                        <span className="mt-1 text-[10px] font-bold text-[#10373C]">User PDF</span>
                                    </a>
                                )}
                            </div>
                        )}

                        {/* Quick Enquiry / Request A Quote Form */}
                        {/* Positioned cleanly below thumbnails with ZERO negative margin */}
                        <div className="rounded-[32px] border border-[#B6E2E7] bg-white p-6 sm:p-8 shadow-xl shadow-[#008B9A]/10">
                            {/* Card Header */}
                            <div className="flex items-center justify-between gap-3">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#D9F3F5] to-[#C7EBEF] px-4 py-1.5 text-xs font-bold text-[#005C66]">
                                    <Send size={12} />
                                    Quick Enquiry
                                </span>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-[#008B9A]">
                                    Pan-India Delivery
                                </span>
                            </div>

                            <h3 className="mt-4 text-2xl font-black text-[#10373C]">
                                Request A Quotation
                            </h3>
                            <p className="mt-1.5 text-xs text-[#45656A] leading-relaxed">
                                Get institutional pricing, bulk discounts, and technical datasheets directly from Raj Biosis Private Limited.
                            </p>

                            <div className="mt-3 rounded-2xl bg-[#F4FBFC] border border-[#B6E2E7]/80 p-3 text-xs">
                                <span className="font-semibold text-[#45656A]">Selected Instrument: </span>
                                <span className="font-extrabold text-[#008B9A] block mt-0.5 truncate">
                                    {product.title}
                                </span>
                            </div>

                            {/* Enquiry Form */}
                            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-[#10373C] mb-1.5">
                                        Your Full Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Dr. / Mr. / Ms. Name"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="w-full rounded-2xl border border-[#B6E2E7] bg-[#F4FBFC]/60 px-4 py-3.5 text-sm text-[#10373C] outline-none transition-all placeholder:text-[#5F7D81]/70 focus:border-[#008B9A] focus:bg-white focus:ring-4 focus:ring-[#C7EBEF]/40"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[#10373C] mb-1.5">
                                        Mobile / WhatsApp Number <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        maxLength={10}
                                        placeholder="10-digit Mobile Number"
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })}
                                        className="w-full rounded-2xl border border-[#B6E2E7] bg-[#F4FBFC]/60 px-4 py-3.5 text-sm text-[#10373C] outline-none transition-all placeholder:text-[#5F7D81]/70 focus:border-[#008B9A] focus:bg-white focus:ring-4 focus:ring-[#C7EBEF]/40"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[#10373C] mb-1.5">
                                        Official Email Address
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="hospital / lab email address"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        className="w-full rounded-2xl border border-[#B6E2E7] bg-[#F4FBFC]/60 px-4 py-3.5 text-sm text-[#10373C] outline-none transition-all placeholder:text-[#5F7D81]/70 focus:border-[#008B9A] focus:bg-white focus:ring-4 focus:ring-[#C7EBEF]/40"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[#10373C] mb-1.5">
                                        Requirement Details / Quantity
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="e.g., Required for 100-bed hospital lab, urgent delivery..."
                                        value={form.message}
                                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                                        className="w-full rounded-2xl border border-[#B6E2E7] bg-[#F4FBFC]/60 px-4 py-3 text-sm text-[#10373C] outline-none transition-all placeholder:text-[#5F7D81]/70 focus:border-[#008B9A] focus:bg-white focus:ring-4 focus:ring-[#C7EBEF]/40 resize-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#005C66] via-[#008B9A] to-[#005C66] py-4 text-sm font-extrabold text-white shadow-lg shadow-[#008B9A]/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#008B9A]/40 disabled:cursor-not-allowed disabled:opacity-75"
                                >
                                    {submitting ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Submitting Inquiry...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send size={16} />
                                            <span>Submit Quotation Request</span>
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Trust badges below form */}
                            <div className="mt-5 pt-4 border-t border-[#B6E2E7]/60 grid grid-cols-2 gap-2 text-[11px] font-semibold text-[#45656A]">
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle2 size={14} className="text-[#008B9A] shrink-0" />
                                    <span>Genuine Warranty</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle2 size={14} className="text-[#008B9A] shrink-0" />
                                    <span>NABL Calibration</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle2 size={14} className="text-[#008B9A] shrink-0" />
                                    <span>Fast Pan-India Dispatch</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle2 size={14} className="text-[#008B9A] shrink-0" />
                                    <span>Engineering Support</span>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* COLUMN 2: Header Info + Specifications + Full Description + SEO & FAQs */}
                    <div className="lg:col-span-7 space-y-8">

                        {/* Title & Action Buttons Header */}
                        <div className="rounded-[32px] border border-[#B6E2E7] bg-white p-6 sm:p-8 shadow-xl shadow-[#008B9A]/10">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <span className="inline-flex rounded-full border border-[#008B9A]/30 bg-[#F4FBFC] px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-[#008B9A] shadow-sm">
                                    {product.subCategory && product.subCategory !== product.category
                                        ? `${product.category} • ${product.subCategory}`
                                        : product.category || "Biomedical & Diagnostic Equipment"}
                                </span>

                                {/* Share button with dropdown */}
                                <div ref={shareRef} className="relative">
                                    <button
                                        type="button"
                                        onClick={handleNativeShare}
                                        className="inline-flex items-center gap-2 rounded-full border border-[#B6E2E7] bg-white px-4 py-2 text-xs font-bold text-[#005C66] shadow-sm transition-all hover:border-[#008B9A] hover:bg-[#D9F3F5] hover:text-[#008B9A]"
                                        aria-label="Share Product"
                                    >
                                        <FaShareAlt size={13} />
                                        <span>Share</span>
                                    </button>

                                    {showShare && (
                                        <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-[#B6E2E7] bg-white p-2 shadow-2xl">
                                            <button
                                                type="button"
                                                onClick={handleCopy}
                                                className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-xs font-semibold text-[#45656A] transition hover:bg-[#D9F3F5] hover:text-[#005C66]"
                                            >
                                                <FaLink className="text-[#005C66]" />
                                                <span>Copy Link</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleWhatsapp}
                                                className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-xs font-semibold text-[#45656A] transition hover:bg-[#D9F3F5] hover:text-[#005C66]"
                                            >
                                                <FaWhatsapp className="text-emerald-600" />
                                                <span>WhatsApp</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleFacebook}
                                                className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-xs font-semibold text-[#45656A] transition hover:bg-[#D9F3F5] hover:text-[#005C66]"
                                            >
                                                <FaFacebook className="text-blue-600" />
                                                <span>Facebook</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleInstagram}
                                                className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-xs font-semibold text-[#45656A] transition hover:bg-[#D9F3F5] hover:text-[#005C66]"
                                            >
                                                <FaInstagram className="text-pink-600" />
                                                <span>Instagram</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <h1 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-black leading-tight text-[#10373C]">
                                {product.title}
                            </h1>

                            {/* Download Brochure Button (NO PRICE DISPLAYED AS REQUESTED) */}
                            <div className="mt-6 flex flex-wrap items-center gap-4">
                                <button
                                    type="button"
                                    onClick={handleDownloadBrochure}
                                    disabled={downloadingBrochure}
                                    className="group inline-flex items-center gap-2.5 rounded-2xl bg-[#008B9A] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#008B9A]/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#007684] hover:shadow-xl hover:shadow-[#008B9A]/35 disabled:cursor-not-allowed disabled:opacity-75"
                                >
                                    {downloadingBrochure ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Compiling Technical Brochure...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Download size={18} className="transition-transform group-hover:translate-y-0.5" />
                                            <span>Download Technical Brochure (PDF)</span>
                                        </>
                                    )}
                                </button>

                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#45656A]">
                                    <Building2 size={15} className="text-[#008B9A]" />
                                    <span>Raj Biosis Private Limited • Authorized Supplier</span>
                                </span>
                            </div>
                        </div>

                        {/* Technical Specifications & Parameters (ALL details except price) */}
                        <div className="rounded-[32px] border border-[#B6E2E7] bg-white p-6 sm:p-8 shadow-xl shadow-[#008B9A]/10">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                                <div>
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#D9F3F5] to-[#C7EBEF] px-4 py-1.5 text-xs font-bold text-[#005C66]">
                                        <Layers size={13} />
                                        Complete Technical Specifications
                                    </span>
                                    <h2 className="mt-2 text-2xl font-black text-[#10373C]">
                                        Instrument Parameters & Features
                                    </h2>
                                </div>
                                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3.5 py-1 text-xs font-bold text-emerald-700">
                                    ISO 13485 & CE Standards
                                </span>
                            </div>

                            {/* Specifications Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                {specificationsList.map((item, index) => (
                                    <div
                                        key={index}
                                        className="rounded-2xl border border-[#B6E2E7]/80 bg-gradient-to-br from-[#F4FBFC] via-white to-white p-4 transition-all duration-300 hover:border-[#008B9A] hover:shadow-md hover:shadow-[#008B9A]/10"
                                    >
                                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#008B9A]">
                                            {item.label}
                                        </p>
                                        <p className="mt-1 text-sm font-bold text-[#10373C] break-words">
                                            {item.value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Product Detailed Overview & Description */}
                        <div className="rounded-[32px] border border-[#B6E2E7] bg-white p-6 sm:p-8 shadow-xl shadow-[#008B9A]/10">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#D9F3F5] to-[#C7EBEF] px-4 py-1.5 text-xs font-bold text-[#005C66]">
                                <FileText size={13} />
                                Diagnostic Equipment Overview
                            </span>

                            <h3 className="mt-3 text-2xl font-black text-[#10373C]">
                                Clinical Diagnostic Profile & Operating Utility
                            </h3>

                            <p className="mt-4 text-base leading-relaxed text-[#45656A]">
                                {product.desc || product.description || (
                                    `${product.title} is a clinical-grade diagnostic instrument engineered to deliver precision, high analytical sensitivity, and dependable throughput for pathology laboratories, hospitals, and healthcare institutions. Built in compliance with strict international IVD quality protocols, it ensures reproducible test outcomes, efficient reagent conservation, and seamless operational workflow.`
                                )}
                            </p>

                            {/* Key Highlights */}
                            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6 border-t border-[#B6E2E7]/60">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#D9F3F5] text-[#005C66]">
                                        <Check size={16} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-[#10373C]">High Analytical Precision</h4>
                                        <p className="text-xs text-[#45656A] mt-0.5">Minimal coefficient of variation with stable linear test ranges.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#D9F3F5] text-[#005C66]">
                                        <Clock size={16} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-[#10373C]">Rapid Turnaround Time</h4>
                                        <p className="text-xs text-[#45656A] mt-0.5">Accelerated sample evaluation for emergency & critical care workloads.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#D9F3F5] text-[#005C66]">
                                        <Settings size={16} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-[#10373C]">Standardized Calibration</h4>
                                        <p className="text-xs text-[#45656A] mt-0.5">Compatible with multi-level calibrators and external quality assurance (EQAS).</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#D9F3F5] text-[#005C66]">
                                        <Award size={16} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-[#10373C]">Authorized Supplier Support</h4>
                                        <p className="text-xs text-[#45656A] mt-0.5">Pan-India installation, IQ/OQ validation, and OEM spare availability.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Institutional & Regional Supply Information */}
                        <div className="rounded-[32px] border border-[#B6E2E7] bg-white p-6 sm:p-8 shadow-xl shadow-[#008B9A]/10">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#D9F3F5] to-[#C7EBEF] px-4 py-1.5 text-xs font-bold text-[#005C66]">
                                <Building2 size={13} />
                                Institutional Healthcare Supply
                            </span>

                            <div className="mt-5 space-y-3.5">
                                {[
                                    {
                                        title: `Why Choose Raj Biosis Private Limited for ${product.title}?`,
                                        content: `Raj Biosis Private Limited is an authorized diagnostic distributor and supplier of ${product.title} across ${cityName} and all Indian states. We supply premium hospital equipment, automated analyzers, and certified diagnostic kits backed by dedicated application specialists.`,
                                    },
                                    {
                                        title: `Clinical Applications of ${product.title}`,
                                        content: `Widely utilized across pathology laboratories, multi-specialty hospitals, primary health centers, blood banks, and clinical research facilities for sensitive diagnostic screening, routine monitoring, and confirmatory testing.`,
                                    },
                                    {
                                        title: `Dealer & Distributor Support in ${cityName}`,
                                        content: `We provide cold-chain safe transit, certified installation support, comprehensive user training for laboratory technicians, and uninterrupted reagent / consumable supplies.`,
                                    },
                                    {
                                        title: `Quotation & Order Placement for ${product.title}`,
                                        content: `To receive an official quotation, technical specifications sheet, or tender compliance sheet for ${product.title}, submit the quick inquiry form on this page or reach our biomedical sales desk directly.`,
                                    },
                                ].map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="rounded-2xl border border-[#B6E2E7]/80 bg-gradient-to-br from-[#F4FBFC] to-white p-5 transition-all duration-300 hover:border-[#008B9A] hover:shadow-md"
                                    >
                                        <h4 className="text-base font-extrabold text-[#10373C]">
                                            {item.title}
                                        </h4>
                                        <p className="mt-2 text-xs md:text-sm text-[#45656A] leading-relaxed">
                                            {item.content}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Frequently Asked Questions */}
                        <div className="rounded-[32px] border border-[#B6E2E7] bg-white p-6 sm:p-8 shadow-xl shadow-[#008B9A]/10">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#D9F3F5] to-[#C7EBEF] px-4 py-1.5 text-xs font-bold text-[#005C66]">
                                <ShieldCheck size={13} />
                                Diagnostic Support & FAQs
                            </span>

                            <h3 className="mt-3 text-2xl font-black text-[#10373C]">
                                Frequently Asked Questions
                            </h3>

                            <div className="mt-5 space-y-3">
                                {[
                                    {
                                        q: `What is ${product.title} primarily used for?`,
                                        a: `${product.title} is deployed in hospital laboratories and diagnostic centers for clinical sample evaluation with high reproducibility and accuracy.`,
                                    },
                                    {
                                        q: `How can I request pricing for ${product.title}?`,
                                        a: `Submit the quick quotation form on this page with your phone number and hospital/lab details. Our sales team will share the latest quotation, warranty terms, and delivery timeline immediately.`,
                                    },
                                    {
                                        q: "Do you supply genuine products with warranty?",
                                        a: "Yes. All diagnostic systems and equipment supplied by Raj Biosis Private Limited are 100% genuine, factory-calibrated, and accompanied by manufacturer warranty and technical support.",
                                    },
                                    {
                                        q: "Is nationwide delivery and installation available across India?",
                                        a: "Yes. We offer temperature-controlled dispatch, safe packaging, and on-site engineering installation throughout India.",
                                    },
                                ].map((faq, index) => (
                                    <div
                                        key={index}
                                        className="rounded-2xl border border-[#B6E2E7]/70 bg-gradient-to-br from-[#F4FBFC]/60 to-white p-4.5"
                                    >
                                        <h4 className="text-sm font-bold text-[#10373C]">
                                            {faq.q}
                                        </h4>
                                        <p className="mt-2 text-xs md:text-sm text-[#45656A] leading-relaxed">
                                            {faq.a}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </section>
    );
}