import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Wrench, HardHat, Factory, Shirt, Briefcase,
  ChevronDown, Clock, Home, Plane, ShieldCheck, Calendar, Utensils, Stethoscope,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useState } from "react";
import ApplyDialog from "./ApplyDialog";

type Cat = "mechanical" | "construction" | "industrial" | "garments" | "office";

interface Position {
  en: string;
  bn: string;
  salary: string; // "70K" or "60–90K"
  cat: Cat;
}

const POSITIONS: Position[] = [
  // Mechanical & Auto
  { en: "Diesel Mechanic", bn: "ডিজেল মেকানিক", salary: "80K", cat: "mechanical" },
  { en: "Auto Electrician", bn: "অটো ইলেকট্রিশিয়ান", salary: "80K", cat: "mechanical" },
  { en: "Denting & Painting", bn: "ডেন্টিং ও পেইন্টিং", salary: "80K", cat: "mechanical" },
  { en: "MIG / TIG Welder", bn: "MIG / TIG ওয়েল্ডার", salary: "70K", cat: "mechanical" },
  { en: "AC Technician", bn: "AC টেকনিশিয়ান", salary: "70K", cat: "mechanical" },
  { en: "Hydraulic Mechanic", bn: "হাইড্রলিক মেকানিক", salary: "70K", cat: "mechanical" },
  { en: "Heavy / Truck Driver", bn: "হেভি / ট্রাক ড্রাইভার", salary: "65–75K", cat: "mechanical" },
  { en: "Motor Coil Winder", bn: "মোটর কয়েল বাঁধাইকারী", salary: "70K", cat: "mechanical" },
  { en: "Generator Technician", bn: "জেনারেটর টেকনিশিয়ান", salary: "70K", cat: "mechanical" },

  // Construction
  { en: "Mason / Rajmistri", bn: "রাজমিস্ত্রি (মেসন)", salary: "70K", cat: "construction" },
  { en: "Construction Foreman", bn: "কনস্ট্রাকশন ফোরম্যান", salary: "70K", cat: "construction" },
  { en: "Finishing Carpenter", bn: "ফিনিশিং কার্পেন্টার", salary: "70K", cat: "construction" },
  { en: "PVC Window Installer", bn: "PVC উইন্ডো ইনস্টলার", salary: "70K", cat: "construction" },
  { en: "Car Painter", bn: "গাড়ীর রংমিস্ত্রি", salary: "65K", cat: "construction" },
  { en: "QS / Estimator / Draftsman", bn: "QS / এস্টিমেটর / ড্রাফটসম্যান", salary: "90K", cat: "construction" },

  // Industrial
  { en: "Industrial Electrician", bn: "ইন্ডাস্ট্রিয়াল ইলেকট্রিশিয়ান", salary: "80K–1L", cat: "industrial" },
  { en: "Electrical Box Welder", bn: "ইলেকট্রিক্যাল বক্স ওয়েল্ডার", salary: "80–90K", cat: "industrial" },
  { en: "Lathe Machine Operator", bn: "লেদ মেশিন অপারেটর", salary: "70K", cat: "industrial" },
  { en: "Solar Panel Salesman", bn: "সোলার প্যানেল সেলসম্যান", salary: "70–80K", cat: "industrial" },
  { en: "Plastic Bag Machine Operator", bn: "প্লাস্টিক ব্যাগ মেশিন অপারেটর", salary: "70K", cat: "industrial" },

  // Garments
  { en: "Sewing Operator", bn: "সুইং অপারেটর", salary: "55–60K", cat: "garments" },
  { en: "Sewing Machine Mechanic", bn: "সুইং মেশিন মেকানিক", salary: "65–70K", cat: "garments" },
  { en: "Sewing Supervisor", bn: "সুইং সুপারভাইজার", salary: "70K", cat: "garments" },
  { en: "Embroidery Man", bn: "এমব্রয়ডারি ম্যান", salary: "70K", cat: "garments" },

  // Office & Sales
  { en: "Senior Accountant", bn: "সিনিয়র অ্যাকাউন্টেন্ট", salary: "1L–1.2L", cat: "office" },
  { en: "Graphic Designer", bn: "গ্রাফিক্স ডিজাইনার", salary: "70–80K", cat: "office" },
  { en: "Computer Operator", bn: "কম্পিউটার অপারেটর", salary: "70K", cat: "office" },
  { en: "Office Staff (Female)", bn: "অফিস স্টাফ (মহিলা)", salary: "80K", cat: "office" },
  { en: "Warehouse Supervisor", bn: "ওয়্যারহাউস সুপারভাইজার", salary: "60–70K", cat: "office" },
  { en: "Retail / Sales & Marketing", bn: "সেলস এন্ড মার্কেটিং", salary: "65–75K", cat: "office" },
];

const CATS: { key: Cat | "all"; en: string; bn: string; Icon: any }[] = [
  { key: "all", en: "All Positions", bn: "সব পদ", Icon: Briefcase },
  { key: "mechanical", en: "Mechanical & Auto", bn: "মেকানিক্যাল ও অটো", Icon: Wrench },
  { key: "construction", en: "Construction", bn: "কনস্ট্রাকশন", Icon: HardHat },
  { key: "industrial", en: "Industrial", bn: "ইন্ডাস্ট্রিয়াল", Icon: Factory },
  { key: "garments", en: "Garments", bn: "গার্মেন্টস", Icon: Shirt },
  { key: "office", en: "Office & Sales", bn: "অফিস ও সেলস", Icon: Briefcase },
];

const OpenPositionsSection = () => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const [active, setActive] = useState<Cat | "all">("all");
  const [applyOpen, setApplyOpen] = useState(false);
  const [presetPosition, setPresetPosition] = useState<string>("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = active === "all" ? POSITIONS : POSITIONS.filter((p) => p.cat === active);
  const openApply = (pos: string) => { setPresetPosition(pos); setApplyOpen(true); };

  const packageDetails = (p: Position) => [
    { Icon: Calendar, en: "Contract", bn: "চুক্তি", val: bn ? "৩ বছর (নবায়নযোগ্য)" : "3 years (renewable)" },
    { Icon: Clock, en: "Work hours", bn: "কর্মঘণ্টা", val: bn ? "৮ ঘন্টা + OT" : "8 hours + OT" },
    { Icon: Home, en: "Accommodation", bn: "আবাসন", val: bn ? "ফ্রি (কোম্পানি)" : "Free (company)" },
    { Icon: Utensils, en: "Meals", bn: "খাবার", val: bn ? "সরবরাহ" : "Provided" },
    { Icon: Stethoscope, en: "Insurance", bn: "বীমা", val: bn ? "মেডিকেল কভার" : "Medical cover" },
    { Icon: Plane, en: "Air Ticket", bn: "এয়ার টিকেট", val: bn ? "কোম্পানি বহন" : "Company-paid" },
    { Icon: ShieldCheck, en: "Approval", bn: "অনুমোদন", val: bn ? "BMET ক্লিয়ারেন্স" : "BMET clearance" },
    { Icon: Briefcase, en: "Experience", bn: "অভিজ্ঞতা", val: bn ? "ন্যূনতম ২ বছর" : "Min. 2 years" },
  ];

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
            {bn ? "নিয়োগ চলছে" : "Now Hiring"}
          </span>
          <h2 className="font-heading text-3xl md:text-5xl font-extrabold mt-3 mb-4">
            {bn ? "ফিজিতে " : "Open positions in "}
            <span className="text-gradient-ocean">{bn ? "ওপেন পজিশন" : "Fiji"}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {bn
              ? "৩০+ পদে অভিজ্ঞ ও দক্ষ প্রার্থী নিয়োগ চলছে। বেতন ৬০,০০০ – ১,২০,০০০ টাকা + ওভারটাইম। বয়সসীমা ২১–৪৮ বছর।"
              : "Hiring 30+ skilled positions. Salary BDT 60,000 – 1,20,000 + overtime. Age 21–48. Hindi/English speakers preferred."}
          </p>
        </motion.div>

        {/* Category filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {CATS.map((c) => {
            const Icon = c.Icon;
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
                <Icon className="h-4 w-4" />
                {bn ? c.bn : c.en}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
          {filtered.map((p, i) => {
            const isOpen = expanded === p.en;
            return (
            <motion.div
              key={p.en}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (i % 9) * 0.04 }}
              whileHover={{ y: -4 }}
              className={`group relative bg-card border rounded-2xl p-5 hover:shadow-luxury transition-all overflow-hidden ${
                isOpen ? "border-accent/60 shadow-luxury ring-2 ring-accent/20" : "border-border hover:border-accent/40"
              }`}
            >
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-sunset transition-opacity ${isOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-heading font-bold text-foreground leading-snug">
                    {bn ? p.bn : p.en}
                  </h3>
                  {bn && <p className="text-xs text-muted-foreground mt-0.5">{p.en}</p>}
                  <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {bn ? "নিয়োগ চলছে" : "Hiring Now"}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {bn ? "বেতন/মাস" : "Salary/mo"}
                  </div>
                  <div className="text-base font-extrabold text-accent tabular-nums">
                    ৳{p.salary}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">+ OT</div>
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
                        {packageDetails(p).map((d) => {
                          const DI = d.Icon;
                          return (
                            <div key={d.en} className="flex items-center gap-2 text-[11px] bg-muted/50 hover:bg-muted border border-border/50 hover:border-accent/30 rounded-lg px-2 py-1.5 transition">
                              <DI className="h-3.5 w-3.5 text-accent shrink-0" />
                              <div className="min-w-0">
                                <div className="text-[9px] uppercase tracking-wide text-muted-foreground leading-none">
                                  {bn ? d.bn : d.en}
                                </div>
                                <div className="font-semibold text-foreground leading-tight truncate">
                                  {d.val}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setExpanded(isOpen ? null : p.en)}
                  className="inline-flex items-center justify-center gap-1.5 bg-muted hover:bg-muted/70 text-foreground text-xs font-semibold px-3 py-2.5 rounded-xl transition-all"
                  aria-expanded={isOpen}
                >
                  {isOpen ? (bn ? "কম দেখান" : "Less") : (bn ? "বিস্তারিত" : "Details")}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                <button
                  onClick={() => openApply(p.en)}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-ocean text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:shadow-ocean hover:scale-[1.02] transition-all"
                >
                  <Send className="h-4 w-4" />
                  {bn ? "আবেদন করুন" : "Apply Now"}
                </button>
              </div>
            </motion.div>
          );})}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-10">
          {bn
            ? "* বেতন (BDT) — অভিজ্ঞতা অনুযায়ী পরিবর্তনযোগ্য। ইন্টারভিউতে CV, পাসপোর্ট, কাজের ভিডিও ও সাদা ব্যাকগ্রাউন্ড ছবি আনতে হবে।"
            : "* Salary in BDT — varies with experience. Bring CV, passport, work video and white-background photo for the interview."}
        </p>
      </div>

      <ApplyDialog open={applyOpen} onOpenChange={setApplyOpen} serviceType="work_permit" preset={presetPosition} />
    </section>
  );
};

export default OpenPositionsSection;
