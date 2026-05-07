import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Briefcase, ChevronDown, Clock, Home, Plane, ShieldCheck,
  Calendar, Utensils, Users, Sparkles, Globe2, ArrowRight,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useState } from "react";
import ApplyDialog from "./ApplyDialog";
import { useBulkSiteContent } from "@/hooks/useSiteContentProvider";

import imgVietnam from "@/assets/alrawsha-vietnam.jpg";
import imgKuwait from "@/assets/alrawsha-kuwait.jpg";
import imgLaos from "@/assets/alrawsha-laos.jpg";
import imgSerbia from "@/assets/alrawsha-serbia.jpg";
import imgRussia from "@/assets/alrawsha-russia.jpg";

type CountryKey =
  | "vietnam" | "kuwait" | "laos" | "serbia" | "russia"
  | "malaysia" | "kyrgyzstan" | "qatar" | "dubai" | "iraq"
  | "saudi" | "belarus" | "uzbekistan" | "moldova" | "romania"
  | "greece_cyprus" | "poland";

interface Position {
  en: string;
  bn: string;
  vacancies?: string;
  salary: string;        // e.g. "$350" or "100–120 KWD"
  duty: string;          // e.g. "8h + OT"
  food: string;          // e.g. "Company"
  stay: string;          // e.g. "Company"
  contract?: string;     // optional contract length
  age?: string;          // optional age range
  notes?: string;        // optional extra (e.g. "Driving licence required")
}

interface Country {
  key: CountryKey;
  flag: string;       // emoji fallback
  iso: string;        // 2-letter ISO for flag image
  enName: string;
  bnName: string;
  image: string;
  enTagline: string;
  bnTagline: string;
  processing: string;
  positions: Position[];
}

const COUNTRIES: Country[] = [
  {
    key: "vietnam",
    flag: "🇻🇳",
    iso: "vn",
    enName: "Vietnam",
    bnName: "ভিয়েতনাম",
    image: imgVietnam,
    enTagline: "Hoang CMS Company — Urgent Recruitment",
    bnTagline: "হোয়াং সিএমএস কোম্পানি — জরুরি নিয়োগ",
    processing: "30 days",
    positions: [
      { en: "Brick Factory Labour", bn: "ইটের কারখানা লেবার", vacancies: "25", salary: "$350", duty: "8h + OT", food: "Lunch + dinner (with OT)", stay: "Company", contract: "2 years (renewable)", age: "25–35" },
      { en: "Plywood Factory Labour", bn: "প্লাইউড কারখানা লেবার", vacancies: "12", salary: "$350", duty: "8h + OT", food: "Lunch + dinner (with OT)", stay: "Company", contract: "2 years", age: "25–35" },
      { en: "Ceramic Factory Labour", bn: "সিরামিক কারখানা লেবার", vacancies: "50", salary: "$350", duty: "8h + OT", food: "Lunch + dinner", stay: "Company", contract: "2 years", age: "25–35", notes: "Basic English (Hi/Hello) required" },
      { en: "Hi-Tech Pig Farm Worker", bn: "হাইটেক পিগ ফার্ম ওয়ার্কার", vacancies: "150", salary: "$450–500", duty: "8h + OT", food: "Lunch + dinner", stay: "Company", contract: "2 years", age: "25–35" },
    ],
  },
  {
    key: "kuwait",
    flag: "🇰🇼",
    iso: "kw",
    enName: "Kuwait",
    bnName: "কুয়েত",
    image: imgKuwait,
    enTagline: "Bike Delivery Man — Interview by Delegate",
    bnTagline: "বাইক ডেলিভারি ম্যান — ডেলিগেট কর্তৃক ইন্টারভিউ",
    processing: "Interview ongoing",
    positions: [
      { en: "Bike Delivery Man", bn: "বাইক ডেলিভারি ম্যান", salary: "100–120 KWD + tips", duty: "12 hours", food: "Company", stay: "Company", notes: "Driving licence mandatory" },
    ],
  },
  {
    key: "laos",
    flag: "🇱🇦",
    iso: "la",
    enName: "Laos",
    bnName: "লাওস",
    image: imgLaos,
    enTagline: "Construction Project — Visa in 15 days",
    bnTagline: "কনস্ট্রাকশন প্রজেক্ট — ১৫ দিনে ভিসা",
    processing: "15 days",
    positions: [
      { en: "Helper", bn: "হেল্পার", salary: "$400–450", duty: "8h + OT", food: "Self", stay: "Company" },
      { en: "Mason", bn: "মেশন", salary: "$450–500", duty: "8h + OT", food: "Self", stay: "Company" },
      { en: "Steel Fixer", bn: "স্টিল ফিক্সার", salary: "$450–500", duty: "8h + OT", food: "Self", stay: "Company" },
    ],
  },
  {
    key: "serbia",
    flag: "🇷🇸",
    iso: "rs",
    enName: "Serbia",
    bnName: "সার্বিয়া",
    image: imgSerbia,
    enTagline: "Work Permit Visa — Agriculture",
    bnTagline: "ওয়ার্ক পারমিট ভিসা — এগ্রিকালচার",
    processing: "3–4 months",
    positions: [
      { en: "Agriculture Worker", bn: "এগ্রিকালচার ওয়ার্কার", salary: "Competitive (EU)", duty: "Standard EU labour law", food: "As per contract", stay: "As per contract", contract: "Renewable" },
    ],
  },
  {
    key: "russia",
    flag: "🇷🇺",
    iso: "ru",
    enName: "Russia",
    bnName: "রাশিয়া",
    image: imgRussia,
    enTagline: "RTL & LZL Companies — Work Visa",
    bnTagline: "RTL ও LZL কোম্পানি — ওয়ার্ক ভিসা",
    processing: "Passport submission ongoing",
    positions: [
      { en: "Factory Worker", bn: "ফ্যাক্টরি ওয়ার্কার", salary: "BDT 70,000–80,000", duty: "10 hours", food: "Company", stay: "Company", age: "25–40" },
    ],
  },
  {
    key: "malaysia", flag: "🇲🇾", iso: "my",
    enName: "Malaysia", bnName: "মালয়েশিয়া", image: imgVietnam,
    enTagline: "Work Permit Visa — Multiple Sectors",
    bnTagline: "ওয়ার্ক পারমিট ভিসা — বিভিন্ন সেক্টর",
    processing: "45–60 days",
    positions: [
      { en: "General Worker", bn: "জেনারেল ওয়ার্কার", salary: "RM 1,500–2,000", duty: "8h + OT", food: "Company", stay: "Company", contract: "2 years", age: "21–45" },
    ],
  },
  {
    key: "kyrgyzstan", flag: "🇰🇬", iso: "kg",
    enName: "Kyrgyzstan", bnName: "কিরগিজস্তান", image: imgSerbia,
    enTagline: "Work Permit Visa — Construction & Factory",
    bnTagline: "ওয়ার্ক পারমিট ভিসা — কনস্ট্রাকশন ও ফ্যাক্টরি",
    processing: "30–45 days",
    positions: [
      { en: "Construction Worker", bn: "কনস্ট্রাকশন ওয়ার্কার", salary: "Competitive", duty: "8h + OT", food: "As per contract", stay: "As per contract", age: "22–45" },
    ],
  },
  {
    key: "qatar", flag: "🇶🇦", iso: "qa",
    enName: "Qatar", bnName: "কাতার", image: imgKuwait,
    enTagline: "Work Visa — Service & Construction",
    bnTagline: "ওয়ার্ক ভিসা — সার্ভিস ও কনস্ট্রাকশন",
    processing: "30–45 days",
    positions: [
      { en: "General Worker", bn: "জেনারেল ওয়ার্কার", salary: "QAR 1,200–1,800", duty: "8h + OT", food: "Company", stay: "Company", age: "21–45" },
    ],
  },
  {
    key: "dubai", flag: "🇦🇪", iso: "ae",
    enName: "Dubai (UAE)", bnName: "দুবাই (ইউএই)", image: imgKuwait,
    enTagline: "Employment Visa — Multiple Categories",
    bnTagline: "এমপ্লয়মেন্ট ভিসা — বিভিন্ন ক্যাটাগরি",
    processing: "20–30 days",
    positions: [
      { en: "General Worker", bn: "জেনারেল ওয়ার্কার", salary: "AED 1,200–2,000", duty: "8h + OT", food: "Company", stay: "Company", age: "21–45" },
    ],
  },
  {
    key: "iraq", flag: "🇮🇶", iso: "iq",
    enName: "Iraq", bnName: "ইরাক", image: imgKuwait,
    enTagline: "Work Visa — Oil Field & Construction",
    bnTagline: "ওয়ার্ক ভিসা — অয়েল ফিল্ড ও কনস্ট্রাকশন",
    processing: "45–60 days",
    positions: [
      { en: "General Worker", bn: "জেনারেল ওয়ার্কার", salary: "USD 500–700", duty: "10h + OT", food: "Company", stay: "Company", age: "25–45" },
    ],
  },
  {
    key: "saudi", flag: "🇸🇦", iso: "sa",
    enName: "Saudi Arabia", bnName: "সৌদি আরব", image: imgKuwait,
    enTagline: "Work Visa — All Sectors",
    bnTagline: "ওয়ার্ক ভিসা — সকল সেক্টর",
    processing: "30–45 days",
    positions: [
      { en: "General Worker", bn: "জেনারেল ওয়ার্কার", salary: "SAR 1,200–2,000", duty: "8h + OT", food: "Company", stay: "Company", age: "21–45" },
    ],
  },
  {
    key: "belarus", flag: "🇧🇾", iso: "by",
    enName: "Belarus", bnName: "বেলারুশ", image: imgSerbia,
    enTagline: "Work Permit Visa — Factory & Agriculture",
    bnTagline: "ওয়ার্ক পারমিট ভিসা — ফ্যাক্টরি ও এগ্রিকালচার",
    processing: "60–90 days",
    positions: [
      { en: "Factory Worker", bn: "ফ্যাক্টরি ওয়ার্কার", salary: "Competitive (EU region)", duty: "8h + OT", food: "As per contract", stay: "Company", age: "22–45" },
    ],
  },
  {
    key: "uzbekistan", flag: "🇺🇿", iso: "uz",
    enName: "Uzbekistan", bnName: "উজবেকিস্তান", image: imgSerbia,
    enTagline: "Work Permit Visa — Construction & Industry",
    bnTagline: "ওয়ার্ক পারমিট ভিসা — কনস্ট্রাকশন ও ইন্ডাস্ট্রি",
    processing: "30–45 days",
    positions: [
      { en: "General Worker", bn: "জেনারেল ওয়ার্কার", salary: "Competitive", duty: "8h + OT", food: "As per contract", stay: "As per contract", age: "22–45" },
    ],
  },
  {
    key: "moldova", flag: "🇲🇩", iso: "md",
    enName: "Moldova", bnName: "মলদোভা", image: imgSerbia,
    enTagline: "Work Permit Visa — EU Pathway",
    bnTagline: "ওয়ার্ক পারমিট ভিসা — ইইউ পথ",
    processing: "60–90 days",
    positions: [
      { en: "General Worker", bn: "জেনারেল ওয়ার্কার", salary: "EUR 500–800", duty: "8h + OT", food: "As per contract", stay: "As per contract", age: "22–45" },
    ],
  },
  {
    key: "romania", flag: "🇷🇴", iso: "ro",
    enName: "Romania", bnName: "রোমানিয়া", image: imgSerbia,
    enTagline: "EU Work Permit — Construction & Factory",
    bnTagline: "ইইউ ওয়ার্ক পারমিট — কনস্ট্রাকশন ও ফ্যাক্টরি",
    processing: "3–4 months",
    positions: [
      { en: "Construction Worker", bn: "কনস্ট্রাকশন ওয়ার্কার", salary: "EUR 700–1,000", duty: "Standard EU labour law", food: "As per contract", stay: "Company", contract: "Renewable", age: "22–45" },
    ],
  },
  {
    key: "greece_cyprus", flag: "🇬🇷", iso: "gr",
    enName: "Greece & Cyprus", bnName: "গ্রিস ও সাইপ্রাস", image: imgSerbia,
    enTagline: "EU Work Visa — Agriculture & Hospitality",
    bnTagline: "ইইউ ওয়ার্ক ভিসা — এগ্রিকালচার ও হসপিটালিটি",
    processing: "3–5 months",
    positions: [
      { en: "Agriculture / Hospitality Worker", bn: "এগ্রিকালচার / হসপিটালিটি ওয়ার্কার", salary: "EUR 800–1,200", duty: "Standard EU labour law", food: "As per contract", stay: "As per contract", contract: "Renewable", age: "22–45" },
    ],
  },
  {
    key: "poland", flag: "🇵🇱", iso: "pl",
    enName: "Poland", bnName: "পোল্যান্ড", image: imgSerbia,
    enTagline: "EU Work Permit — Multiple Sectors",
    bnTagline: "ইইউ ওয়ার্ক পারমিট — বিভিন্ন সেক্টর",
    processing: "3–4 months",
    positions: [
      { en: "General Worker", bn: "জেনারেল ওয়ার্কার", salary: "EUR 700–1,100", duty: "Standard EU labour law", food: "As per contract", stay: "As per contract", contract: "Renewable", age: "22–45" },
    ],
  },
];

const OpenPositionsSection = () => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const [active, setActive] = useState<CountryKey | "all">("all");
  const [applyOpen, setApplyOpen] = useState(false);
  const [presetPosition, setPresetPosition] = useState<string>("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data: cmsContent } = useBulkSiteContent("open_positions");
  const lc = cmsContent?.[language];

  // Build CMS overrides keyed by ISO code (case-insensitive)
  const overridesByIso: Record<string, any> = {};
  if (lc?.countries && Array.isArray(lc.countries)) {
    lc.countries.forEach((c: any) => {
      if (c?.iso) overridesByIso[c.iso.toLowerCase()] = c;
    });
  }
  const getOverride = (iso: string) => overridesByIso[iso.toLowerCase()];

  const sectionLabel = lc?.section_label || (bn ? "চলমান নিয়োগ" : "Now Hiring");
  const headingPart1 = lc?.heading || (bn ? "আমাদের " : "Open positions in ");
  const headingHighlight = lc?.heading_highlight || (bn ? "চলমান পজিশনসমূহ" : `${COUNTRIES.length}+ Countries`);
  const description = lc?.description || (bn
    ? "বিশ্বের বিভিন্ন দেশে বৈধ ওয়ার্ক পারমিট ভিসায় নিয়োগ চলছে। বিস্তারিত জানতে যেকোনো দেশের কার্ডে ক্লিক করুন।"
    : "Hiring across multiple countries on valid work permit visas. Click any country card to see role-by-role details.");
  const applyText = lc?.apply_button_text || (bn ? "আবেদন করুন" : "Apply Now");

  const visible = active === "all" ? COUNTRIES : COUNTRIES.filter((c) => c.key === active);
  const openApply = (pos: string) => { setPresetPosition(pos); setApplyOpen(true); };

  const totalVacancies = COUNTRIES.reduce((sum, c) => {
    return sum + c.positions.reduce((s, p) => s + (parseInt(p.vacancies || "0", 10) || (p.vacancies ? 0 : 1)), 0);
  }, 0);
  const totalRoles = COUNTRIES.reduce((s, c) => s + c.positions.length, 0);

  const flagImg = (iso: string, alt: string, size = 24) => (
    <img
      src={`https://flagcdn.com/w80/${iso}.png`}
      srcSet={`https://flagcdn.com/w160/${iso}.png 2x`}
      width={size}
      height={Math.round((size * 3) / 4)}
      alt={alt}
      loading="lazy"
      className="object-cover rounded-[3px] ring-1 ring-black/10 shrink-0"
      style={{ width: size, height: Math.round((size * 3) / 4) }}
    />
  );

  const detailRow = (p: Position) => [
    p.contract && { Icon: Calendar, en: "Contract", bn: "চুক্তি", val: p.contract },
    { Icon: Clock, en: "Duty", bn: "ডিউটি", val: p.duty },
    { Icon: Home, en: "Stay", bn: "থাকা", val: p.stay },
    { Icon: Utensils, en: "Food", bn: "খাবার", val: p.food },
    p.age && { Icon: Users, en: "Age", bn: "বয়স", val: p.age },
    p.vacancies && { Icon: Briefcase, en: "Vacancies", bn: "পদ সংখ্যা", val: p.vacancies },
  ].filter(Boolean) as { Icon: any; en: string; bn: string; val: string }[];

  return (
    <section id="positions" className="py-24 bg-secondary/30 relative overflow-hidden">
      <div className="absolute inset-0 travel-pattern opacity-30" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 text-accent text-xs font-bold tracking-[0.3em] uppercase">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            {sectionLabel}
          </span>
          <h2 className="font-heading text-3xl md:text-5xl font-extrabold mt-3 mb-4">
            {headingPart1}
            <span className="text-gradient-ocean">{headingHighlight}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{description}</p>

          {/* Stats strip */}
          <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-7">
            {[
              { Icon: Globe2, val: COUNTRIES.length.toString(), label: bn ? "দেশ" : "Countries" },
              { Icon: Briefcase, val: totalRoles.toString(), label: bn ? "পদ" : "Roles" },
              { Icon: Users, val: `${totalVacancies}+`, label: bn ? "শূন্যপদ" : "Vacancies" },
              { Icon: Sparkles, val: "RL-2902", label: bn ? "BMET অনুমোদিত" : "BMET Approved" },
            ].map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 bg-card/80 backdrop-blur border border-border rounded-full pl-2 pr-4 py-1.5 shadow-sm"
              >
                <span className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                  <s.Icon className="w-3.5 h-3.5" />
                </span>
                <span className="text-sm font-extrabold text-foreground tabular-nums">{s.val}</span>
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{s.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Sticky country tabs */}
        <div className="sticky top-16 z-20 -mx-4 px-4 py-3 mb-10 bg-secondary/60 backdrop-blur-md border-y border-border/50">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x">
            <button
              onClick={() => setActive("all")}
              className={`relative shrink-0 snap-start inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all border ${
                active === "all"
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-card text-foreground/70 border-border hover:border-primary/40 hover:text-primary"
              }`}
            >
              <Globe2 className="w-4 h-4" />
              {bn ? "সব" : "All"}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active === "all" ? "bg-white/20" : "bg-muted"}`}>
                {totalRoles}
              </span>
            </button>
            {COUNTRIES.map((c) => {
              const isActive = active === c.key;
              const ov = getOverride(c.iso);
              const displayName = ov?.name || (bn ? c.bnName : c.enName);
              return (
                <button
                  key={c.key}
                  onClick={() => setActive(c.key)}
                  className={`relative shrink-0 snap-start inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all border ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-md"
                      : "bg-card text-foreground/70 border-border hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  {flagImg(c.iso, `${c.enName} flag`, 20)}
                  {displayName}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20" : "bg-muted"}`}>
                    {c.positions.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-12">
          <AnimatePresence mode="popLayout">
          {visible.map((country, ci) => (
            <motion.div
              key={country.key}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: ci * 0.06, layout: { duration: 0.4 } }}
            >
              {/* Country banner */}
              <div className="relative overflow-hidden rounded-3xl mb-6 group">
                <img
                  src={country.image}
                  alt={`${country.enName} work permit`}
                  loading="lazy"
                  className="w-full h-44 md:h-56 object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-charcoal/85 via-charcoal/60 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-10">
                  <div className="flex items-center gap-3 mb-2">
                    {flagImg(country.iso, `${country.enName} flag`, 44)}
                    <h3 className="font-heading text-2xl md:text-4xl font-extrabold text-white">
                      {getOverride(country.iso)?.name || (bn ? country.bnName : country.enName)}
                    </h3>
                    <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-white bg-accent/90 px-2.5 py-1 rounded-full">
                      <ShieldCheck className="h-3 w-3" /> {bn ? "চলমান" : "Active"}
                    </span>
                  </div>
                  <p className="text-white/85 text-sm md:text-base max-w-xl">
                    {getOverride(country.iso)?.tagline || (bn ? country.bnTagline : country.enTagline)}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-2 text-xs text-white/80">
                    <Plane className="h-3.5 w-3.5 text-accent" />
                    <span>{bn ? "প্রসেসিং" : "Processing"}: <strong className="text-white">{getOverride(country.iso)?.processing || country.processing}</strong></span>
                  </div>
                </div>
              </div>

              {/* Positions grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {country.positions.map((p, i) => {
                  const id = `${country.key}-${p.en}`;
                  const isOpen = expanded === id;
                  return (
                    <motion.div
                      key={id}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: (i % 6) * 0.04 }}
                      whileHover={{ y: -4 }}
                      className={`group relative bg-card border rounded-2xl p-5 hover:shadow-luxury transition-all overflow-hidden ${
                        isOpen ? "border-accent/60 shadow-luxury ring-2 ring-accent/20" : "border-border hover:border-accent/40"
                      }`}
                    >
                      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-sunset transition-opacity ${isOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />

                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <h4 className="font-heading font-bold text-foreground leading-snug">
                            {bn ? p.bn : p.en}
                          </h4>
                          {bn && <p className="text-xs text-muted-foreground mt-0.5">{p.en}</p>}
                          <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {bn ? "নিয়োগ চলছে" : "Hiring Now"}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {bn ? "বেতন" : "Salary"}
                          </div>
                          <div className="text-base font-extrabold text-accent tabular-nums">
                            {p.salary}
                          </div>
                          {p.vacancies && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {p.vacancies} {bn ? "জন" : "vacancies"}
                            </div>
                          )}
                        </div>
                      </div>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-border/60 pt-3 mt-1 mb-3">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-accent mb-2">
                                {bn ? "প্যাকেজ বিবরণ" : "Package Details"}
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {detailRow(p).map((d, idx) => {
                                  const DI = d.Icon;
                                  return (
                                    <div key={idx} className="flex items-center gap-2 text-[11px] bg-muted/50 hover:bg-muted border border-border/50 hover:border-accent/30 rounded-lg px-2 py-1.5 transition">
                                      <DI className="h-3.5 w-3.5 text-accent shrink-0" />
                                      <div className="min-w-0">
                                        <div className="text-[9px] uppercase tracking-wide text-muted-foreground leading-none">
                                          {bn ? d.bn : d.en}
                                        </div>
                                        <div className="font-semibold text-foreground leading-tight">
                                          {d.val}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              {p.notes && (
                                <p className="mt-3 text-[11px] text-muted-foreground italic">
                                  ⚡ {p.notes}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => setExpanded(isOpen ? null : id)}
                          className="inline-flex items-center justify-center gap-1.5 bg-muted hover:bg-muted/70 text-foreground text-xs font-semibold px-3 py-2.5 rounded-xl transition-all"
                          aria-expanded={isOpen}
                        >
                          {isOpen ? (bn ? "কম দেখান" : "Less") : (bn ? "বিস্তারিত" : "Details")}
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                        <button
                          onClick={() => openApply(`${country.enName} — ${p.en}`)}
                          className="group/btn flex-1 inline-flex items-center justify-center gap-2 bg-gradient-ocean text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:shadow-ocean hover:scale-[1.02] transition-all"
                        >
                          <Send className="h-4 w-4" />
                          {applyText}
                          <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ))}
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-12 max-w-3xl mx-auto">
          {bn
            ? "* শর্তাবলি কোম্পানি ও দেশভেদে পরিবর্তনযোগ্য। প্রয়োজনীয় কাগজপত্র: পুলিশ ক্লিয়ারেন্স, ছবি, পাসপোর্ট। বিস্তারিত জানতে যোগাযোগ করুন: 01886-999465 / 01709-294065।"
            : "* Terms vary by employer and country. Required documents: police clearance, photo, passport. For details call 01886-999465 / 01709-294065."}
        </p>
      </div>

      <ApplyDialog open={applyOpen} onOpenChange={setApplyOpen} serviceType="work_permit" preset={presetPosition} />
    </section>
  );
};

export default OpenPositionsSection;
