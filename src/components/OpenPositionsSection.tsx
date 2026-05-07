import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Briefcase, Clock, Home, Plane, ShieldCheck,
  Calendar, Utensils, Users, Sparkles, Globe2, ArrowRight,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useState } from "react";
import ApplyDialog from "./ApplyDialog";

import imgVietnam from "@/assets/alrawsha-vietnam.jpg";
import imgKuwait from "@/assets/alrawsha-kuwait.jpg";
import imgLaos from "@/assets/alrawsha-laos.jpg";
import imgSerbia from "@/assets/alrawsha-serbia.jpg";
import imgRussia from "@/assets/alrawsha-russia.jpg";

type CountryKey = "vietnam" | "kuwait" | "laos" | "serbia" | "russia";

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
];

const OpenPositionsSection = () => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const [active, setActive] = useState<CountryKey | "all">("all");
  const [applyOpen, setApplyOpen] = useState(false);
  const [presetPosition, setPresetPosition] = useState<string>("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const visible = active === "all" ? COUNTRIES : COUNTRIES.filter((c) => c.key === active);
  const openApply = (pos: string) => { setPresetPosition(pos); setApplyOpen(true); };

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
          <span className="text-accent text-xs font-bold tracking-[0.3em] uppercase">
            {bn ? "চলমান নিয়োগ" : "Now Hiring"}
          </span>
          <h2 className="font-heading text-3xl md:text-5xl font-extrabold mt-3 mb-4">
            {bn ? "আমাদের " : "Open positions in "}
            <span className="text-gradient-ocean">{bn ? "চলমান পজিশনসমূহ" : "5 Countries"}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {bn
              ? "ভিয়েতনাম, কুয়েত, লাওস, সার্বিয়া ও রাশিয়াতে বৈধ ওয়ার্ক পারমিট ভিসায় নিয়োগ চলছে। বিস্তারিত জানতে কোম্পানির কার্ডে ক্লিক করুন।"
              : "Hiring across Vietnam, Kuwait, Laos, Serbia and Russia. Click any country card to see role-by-role details."}
          </p>
        </motion.div>

        {/* Country filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          <button
            onClick={() => setActive("all")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
              active === "all"
                ? "bg-primary text-primary-foreground border-primary shadow-ocean"
                : "bg-card text-foreground/70 border-border hover:border-primary/40 hover:text-primary"
            }`}
          >
            🌍 {bn ? "সব দেশ" : "All Countries"}
          </button>
          {COUNTRIES.map((c) => {
            const isActive = active === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setActive(c.key)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-ocean"
                    : "bg-card text-foreground/70 border-border hover:border-primary/40 hover:text-primary"
                }`}
              >
                <span>{c.flag}</span>
                {bn ? c.bnName : c.enName}
              </button>
            );
          })}
        </div>

        <div className="space-y-12">
          {visible.map((country, ci) => (
            <motion.div
              key={country.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: ci * 0.06 }}
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
                    <span className="text-3xl md:text-4xl">{country.flag}</span>
                    <h3 className="font-heading text-2xl md:text-4xl font-extrabold text-white">
                      {bn ? country.bnName : country.enName}
                    </h3>
                    <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-white bg-accent/90 px-2.5 py-1 rounded-full">
                      <ShieldCheck className="h-3 w-3" /> {bn ? "চলমান" : "Active"}
                    </span>
                  </div>
                  <p className="text-white/85 text-sm md:text-base max-w-xl">
                    {bn ? country.bnTagline : country.enTagline}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-2 text-xs text-white/80">
                    <Plane className="h-3.5 w-3.5 text-accent" />
                    <span>{bn ? "প্রসেসিং" : "Processing"}: <strong className="text-white">{country.processing}</strong></span>
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
                          className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-ocean text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:shadow-ocean hover:scale-[1.02] transition-all"
                        >
                          <Send className="h-4 w-4" />
                          {bn ? "আবেদন করুন" : "Apply Now"}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-12 max-w-3xl mx-auto">
          {bn
            ? "* শর্তাবলি কোম্পানি ও দেশভেদে পরিবর্তনযোগ্য। প্রয়োজনীয় কাগজপত্র: পুলিশ ক্লিয়ারেন্স, ছবি, পাসপোর্ট। বিস্তারিত জানতে যোগাযোগ করুন: 01894-840375 / 01894-840371।"
            : "* Terms vary by employer and country. Required documents: police clearance, photo, passport. For details call 01894-840375 / 01894-840371."}
        </p>
      </div>

      <ApplyDialog open={applyOpen} onOpenChange={setApplyOpen} serviceType="work_permit" preset={presetPosition} />
    </section>
  );
};

export default OpenPositionsSection;
