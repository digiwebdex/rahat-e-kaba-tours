import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  HardHat,
  GraduationCap,
  Moon,
  Plane,
  Check,
  ChevronDown,
  Clock,
  DollarSign,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const ACCENT_BLUE = "from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-blue-dark))]";
const ACCENT_RED = "from-[hsl(var(--brand-red))] to-[hsl(var(--brand-red-dark))]";
const ACCENT_MIX = "from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-red))]";

interface Stat {
  Icon: React.ComponentType<{ className?: string }>;
  labelEn: string;
  labelBn: string;
  valueEn: string;
  valueBn: string;
}

interface Service {
  Icon: React.ComponentType<{ className?: string }>;
  badge: string;
  badgeBn: string;
  gradient: string;
  titleEn: string;
  titleBn: string;
  descEn: string;
  descBn: string;
  status?: "active" | "soon";
  href?: string;
  ctaEn: string;
  ctaBn: string;
  highlightsEn: string[];
  highlightsBn: string[];
  stats: Stat[];
}

const services: Service[] = [
  {
    Icon: HardHat,
    badge: "Active Now",
    badgeBn: "চলমান",
    gradient: ACCENT_RED,
    titleEn: "Overseas Work Permit",
    titleBn: "ওভারসিজ ওয়ার্ক পারমিট",
    descEn: "Legal work permit visas to Vietnam, Kuwait, Laos, Serbia and Russia. Company-provided stay & food. Salary $350–500 / 100–120 KWD / BDT 70–80K.",
    descBn: "ভিয়েতনাম, কুয়েত, লাওস, সার্বিয়া ও রাশিয়াতে বৈধ ওয়ার্ক পারমিট ভিসা। থাকা-খাওয়া কোম্পানির। বেতন $৩৫০–৫০০ / ১০০–১২০ দিনার / ৭০–৮০ হাজার টাকা।",
    status: "active",
    href: "#positions",
    ctaEn: "View Open Positions",
    ctaBn: "ওপেন পজিশন দেখুন",
    highlightsEn: [
      "BMET-approved legal recruitment (RL-2902)",
      "5+ destination countries",
      "Company-provided accommodation",
      "Meals included on most contracts",
      "Renewable contracts (1–3 years)",
      "Visa processing 15 days – 4 months",
    ],
    highlightsBn: [
      "BMET অনুমোদিত বৈধ নিয়োগ (RL-2902)",
      "৫+ গন্তব্য দেশ",
      "কোম্পানি প্রদত্ত আবাসন",
      "অধিকাংশ চুক্তিতে খাবার অন্তর্ভুক্ত",
      "নবায়নযোগ্য চুক্তি (১–৩ বছর)",
      "ভিসা প্রসেসিং ১৫ দিন – ৪ মাস",
    ],
    stats: [
      { Icon: DollarSign, labelEn: "Salary", labelBn: "বেতন", valueEn: "$350–500+", valueBn: "$৩৫০–৫০০+" },
      { Icon: Clock, labelEn: "Processing", labelBn: "প্রসেসিং", valueEn: "15d–4mo", valueBn: "১৫দিন–৪মাস" },
      { Icon: MapPin, labelEn: "Countries", labelBn: "দেশ", valueEn: "5+ 🌍", valueBn: "৫+ 🌍" },
    ],
  },
  {
    Icon: GraduationCap,
    badge: "New",
    badgeBn: "নতুন",
    gradient: ACCENT_BLUE,
    titleEn: "Student Consultancy",
    titleBn: "স্টুডেন্ট কনসালটেন্সি",
    descEn: "End-to-end overseas study guidance — admission, SOP, visa filing, accommodation and pre-departure briefing.",
    descBn: "বিদেশে পড়াশোনার সম্পূর্ণ গাইডেন্স — অ্যাডমিশন, SOP, ভিসা ফাইলিং, আবাসন ও প্রি-ডিপারচার।",
    status: "soon",
    ctaEn: "Notify Me",
    ctaBn: "আমাকে জানান",
    highlightsEn: [
      "UK, Canada, Australia, USA",
      "Free profile evaluation",
      "University shortlisting & SOP",
      "Scholarship & funding guidance",
      "End-to-end visa filing",
      "Pre-departure & accommodation",
    ],
    highlightsBn: [
      "UK, কানাডা, অস্ট্রেলিয়া, USA",
      "ফ্রি প্রোফাইল মূল্যায়ন",
      "ইউনিভার্সিটি সিলেকশন ও SOP",
      "স্কলারশিপ গাইডেন্স",
      "এন্ড-টু-এন্ড ভিসা ফাইলিং",
      "প্রি-ডিপারচার ও আবাসন",
    ],
    stats: [
      { Icon: MapPin, labelEn: "Countries", labelBn: "দেশ", valueEn: "10+", valueBn: "১০+" },
      { Icon: GraduationCap, labelEn: "Universities", labelBn: "বিশ্ববিদ্যালয়", valueEn: "200+", valueBn: "২০০+" },
      { Icon: ShieldCheck, labelEn: "Status", labelBn: "অবস্থা", valueEn: "Soon", valueBn: "শীঘ্রই" },
    ],
  },
  {
    Icon: Moon,
    badge: "Coming Soon",
    badgeBn: "শীঘ্রই",
    gradient: ACCENT_MIX,
    titleEn: "Hajj & Umrah",
    titleBn: "হজ্জ ও উমরাহ",
    descEn: "Premium Hajj and year-round Umrah packages with experienced moallems and hotels near the Haram.",
    descBn: "অভিজ্ঞ মোয়াল্লেম ও হারামের কাছাকাছি হোটেল সহ প্রিমিয়াম হজ্জ ও সারাবছর উমরাহ প্যাকেজ।",
    status: "soon",
    ctaEn: "Notify Me",
    ctaBn: "আমাকে জানান",
    highlightsEn: [
      "Government & private Hajj",
      "Year-round Umrah packages",
      "Hotels near Haram & Masjid Nabawi",
      "Experienced Bangla-speaking moallems",
      "Ziyarah & guided tours",
      "Visa, ticket & insurance included",
    ],
    highlightsBn: [
      "সরকারি ও বেসরকারি হজ্জ",
      "সারাবছর উমরাহ প্যাকেজ",
      "হারাম ও মসজিদে নববীর কাছাকাছি",
      "অভিজ্ঞ বাংলাভাষী মোয়াল্লেম",
      "জিয়ারাহ ও গাইডেড ট্যুর",
      "ভিসা, টিকেট ও বীমা অন্তর্ভুক্ত",
    ],
    stats: [
      { Icon: Clock, labelEn: "Launch", labelBn: "চালু", valueEn: "2026", valueBn: "২০২৬" },
      { Icon: MapPin, labelEn: "From", labelBn: "থেকে", valueEn: "Dhaka", valueBn: "ঢাকা" },
      { Icon: ShieldCheck, labelEn: "Status", labelBn: "অবস্থা", valueEn: "Soon", valueBn: "শীঘ্রই" },
    ],
  },
  {
    Icon: Plane,
    badge: "Available",
    badgeBn: "উপলব্ধ",
    gradient: ACCENT_BLUE,
    titleEn: "Air Tickets & Visa Support",
    titleBn: "এয়ার টিকেট ও ভিসা সাপোর্ট",
    descEn: "Domestic & international flight bookings, tourist/business/medical visa assistance and travel documentation.",
    descBn: "ডোমেস্টিক ও ইন্টারন্যাশনাল ফ্লাইট, ট্যুরিস্ট/বিজনেস/মেডিকেল ভিসা সহায়তা ও ডকুমেন্টেশন।",
    status: "active",
    href: "#contact",
    ctaEn: "Get a Quote",
    ctaBn: "কোটেশন নিন",
    highlightsEn: [
      "Domestic & international tickets",
      "Tourist, business, medical visa",
      "Document attestation support",
      "24/7 booking assistance",
      "IATA-affiliated airlines",
      "Best fare guarantee",
    ],
    highlightsBn: [
      "ডোমেস্টিক ও ইন্টারন্যাশনাল টিকেট",
      "ট্যুরিস্ট, বিজনেস, মেডিকেল ভিসা",
      "ডকুমেন্ট অ্যাটেস্টেশন সাপোর্ট",
      "২৪/৭ বুকিং সহায়তা",
      "IATA-অনুমোদিত এয়ারলাইন্স",
      "বেস্ট ফেয়ার গ্যারান্টি",
    ],
    stats: [
      { Icon: Plane, labelEn: "Airlines", labelBn: "এয়ারলাইন্স", valueEn: "50+", valueBn: "৫০+" },
      { Icon: Clock, labelEn: "Support", labelBn: "সাপোর্ট", valueEn: "24/7", valueBn: "২৪/৭" },
      { Icon: ShieldCheck, labelEn: "Visa", labelBn: "ভিসা", valueEn: "All Types", valueBn: "সব ধরনের" },
    ],
  },
];

const ServicesSection = () => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <section id="services" className="py-24 relative overflow-hidden bg-background">
      <div className="absolute top-20 -left-32 w-80 h-80 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 -right-32 w-80 h-80 rounded-full bg-accent/5 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <span className="inline-block text-accent text-xs font-bold tracking-[0.3em] uppercase mb-3">
            {bn ? "আমাদের সার্ভিস" : "What We Offer"}
          </span>
          <h2 className="font-heading text-3xl md:text-5xl font-extrabold mb-4">
            {bn ? "আপনার বিদেশ যাত্রার " : "Your trusted partner for "}
            <span className="text-gradient-sunset">
              {bn ? "নির্ভরযোগ্য সঙ্গী" : "going abroad"}
            </span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg">
            {bn
              ? "ওয়ার্ক পারমিট, স্টুডেন্ট কনসালটেন্সি ও ভ্রমণ — এক জায়গায়।"
              : "Work permits, student consultancy and travel — all under one roof."}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-3">
            {bn ? "↓ বিস্তারিত দেখতে কার্ডে ক্লিক করুন" : "↓ Tap any card to see full details"}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          {services.map((s, i) => {
            const Icon = s.Icon;
            const isOpen = expanded === s.titleEn;
            const highlights = bn ? s.highlightsBn : s.highlightsEn;

            return (
              <motion.article
                key={s.titleEn}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.45 }}
                whileHover={{ y: -6 }}
                className={`group relative bg-card border border-border rounded-2xl p-6 md:p-7 transition-all hover:shadow-luxury hover:border-accent/30 overflow-hidden flex flex-col ${
                  isOpen ? "ring-2 ring-accent/40 shadow-luxury" : ""
                }`}
              >
                <div
                  className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${s.gradient} opacity-10 group-hover:opacity-25 blur-2xl transition-opacity`}
                />

                {s.status === "soon" && (
                  <div className="absolute top-4 -right-10 rotate-45 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[10px] font-extrabold uppercase tracking-[0.2em] px-12 py-1 shadow-md z-10 animate-pulse">
                    {bn ? "শীঘ্রই" : "Soon"}
                  </div>
                )}


                <div className="flex items-start justify-between mb-5 relative">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}
                  >
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  {s.status === "soon" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                      {bn ? "শীঘ্রই আসছে" : "Coming Soon"}
                    </span>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-accent group-hover:text-accent-foreground group-hover:rotate-45 transition-all">
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                  )}
                </div>

                <span
                  className={`inline-block bg-gradient-to-r ${s.gradient} bg-clip-text text-transparent text-[10px] font-bold tracking-[0.2em] uppercase mb-2`}
                >
                  {bn ? s.badgeBn : s.badge}
                </span>

                <h3 className="font-heading text-lg md:text-xl font-bold text-foreground mb-2 leading-snug">
                  {bn ? s.titleBn : s.titleEn}
                </h3>

                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {bn ? s.descBn : s.descEn}
                </p>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {s.stats.map((st) => {
                    const SIcon = st.Icon;
                    return (
                      <div
                        key={st.labelEn}
                        className="rounded-lg bg-muted/50 border border-border/50 px-2 py-2 text-center hover:bg-muted hover:border-accent/30 transition"
                      >
                        <SIcon className="h-3.5 w-3.5 mx-auto mb-1 text-accent" />
                        <div className="text-[11px] font-bold text-foreground tabular-nums leading-tight">
                          {bn ? st.valueBn : st.valueEn}
                        </div>
                        <div className="text-[9px] uppercase tracking-wide text-muted-foreground mt-0.5">
                          {bn ? st.labelBn : st.labelEn}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Expandable details */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border/60 pt-3 mt-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-accent mb-2">
                          {bn ? "যা যা পাবেন" : "What's Included"}
                        </div>
                        <ul className="space-y-1.5 mb-4">
                          {highlights.map((h) => (
                            <motion.li
                              key={h}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2 }}
                              className="flex items-start gap-2 text-xs text-foreground/85"
                            >
                              <span
                                className={`flex-shrink-0 w-4 h-4 rounded-full bg-gradient-to-br ${s.gradient} flex items-center justify-center mt-0.5`}
                              >
                                <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                              </span>
                              <span className="leading-snug">{h}</span>
                            </motion.li>
                          ))}
                        </ul>

                        {s.href && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (s.href?.startsWith("#")) {
                                document
                                  .getElementById(s.href.slice(1))
                                  ?.scrollIntoView({ behavior: "smooth" });
                              }
                            }}
                            className={`w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r ${s.gradient} text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-md hover:shadow-glow hover:scale-[1.02] transition-all`}
                          >
                            {bn ? s.ctaBn : s.ctaEn}
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Toggle */}
                <button
                  onClick={() => setExpanded(isOpen ? null : s.titleEn)}
                  className="mt-auto pt-3 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-accent transition-colors group/toggle"
                  aria-expanded={isOpen}
                >
                  {isOpen
                    ? bn ? "কম দেখান" : "Show less"
                    : bn ? "বিস্তারিত দেখুন" : "View details"}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-300 ${
                      isOpen ? "rotate-180" : ""
                    } group-hover/toggle:translate-y-0.5`}
                  />
                </button>

                <div
                  className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${s.gradient} transition-all duration-500 ${
                    isOpen ? "w-full" : "w-0 group-hover:w-full"
                  }`}
                />
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
