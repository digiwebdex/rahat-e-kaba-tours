import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Plane, Sparkles, MessageCircle, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import heroFiji from "@/assets/hero-fiji-work.jpg";
import heroFijiWorkers from "@/assets/hero-fiji-workers.jpg";
import heroFijiVisa from "@/assets/hero-fiji-visa.jpg";
import { useLanguage } from "@/i18n/LanguageContext";

const WHATSAPP = "8801322181500";
const WA_LINK = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
  "Hello Hasan Travels, I'm interested in the Fiji Work Permit programme."
)}`;

const HeroSection = () => {
  const { language } = useLanguage();
  const bn = language === "bn";

  const slides = [
    {
      img: heroFiji,
      alt: "Fiji work permit opportunity — tropical island and skilled worker",
      badge: bn ? "🇫🇯 ফিজি ওয়ার্ক পারমিট ভিসা" : "🇫🇯 Fiji Work Permit Visa Programme",
      title: bn ? (
        <>ফিজিতে কাজ করুন,{" "}<span className="text-gradient-sunset">উপার্জন করুন</span></>
      ) : (
        <>Work in Fiji.{" "}<span className="text-gradient-sunset">Earn. Explore.</span></>
      ),
      desc: bn
        ? "BMET অনুমোদিত বৈধ প্রসেস। ৩ বছরের ওয়ার্ক পারমিট, কোম্পানি প্রদত্ত আবাসন, মাসিক বেতন ৬০,০০০ – ১,২০,০০০ টাকা + ওভারটাইম। মাত্র ৩–৪ মাসে ভিসা প্রসেসিং।"
        : "BMET-approved legal recruitment. 3-year renewable work permit, company-provided accommodation, monthly salary BDT 60,000 – 1,20,000 + overtime. Visa processing in just 3–4 months.",
    },
    {
      img: heroFijiWorkers,
      alt: "Bangladeshi skilled workers at Fiji construction site",
      badge: bn ? "👷 দক্ষ জনশক্তি নিয়োগ" : "👷 Skilled Workforce Recruitment",
      title: bn ? (
        <>আপনার দক্ষতা,{" "}<span className="text-gradient-sunset">বৈশ্বিক সুযোগ</span></>
      ) : (
        <>Your Skills,{" "}<span className="text-gradient-sunset">Global Opportunity</span></>
      ),
      desc: bn
        ? "কনস্ট্রাকশন, মেকানিক্যাল, ইলেকট্রিক্যাল, প্লাম্বিং সহ ৩০+ ক্যাটাগরিতে নিয়োগ। নিরাপদ কর্মপরিবেশ, ফ্রি আবাসন ও খাবার, বীমা সুবিধা।"
        : "30+ job categories — construction, mechanical, electrical, plumbing & more. Safe workplace, free accommodation & meals, insurance coverage included.",
    },
    {
      img: heroFijiVisa,
      alt: "Happy worker holding Fiji work permit visa and passport",
      badge: bn ? "✈️ ৩–৪ মাসে ভিসা প্রসেসিং" : "✈️ Visa Processed in 3–4 Months",
      title: bn ? (
        <>পাসপোর্ট থেকে{" "}<span className="text-gradient-sunset">ফ্লাইট পর্যন্ত</span></>
      ) : (
        <>From Passport to{" "}<span className="text-gradient-sunset">Boarding Pass</span></>
      ),
      desc: bn
        ? "এন্ড-টু-এন্ড ভিসা সাপোর্ট — ডকুমেন্টেশন, মেডিকেল, BMET ক্লিয়ারেন্স, ফ্লাইট বুকিং। আমরা আপনাকে নিরাপদে গন্তব্যে পৌঁছে দেব।"
        : "End-to-end visa support — documentation, medical, BMET clearance, flight booking. We get you safely to your destination.",
    },
  ];

  const [index, setIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  const current = slides[index];
  const next = () => setIndex((i) => (i + 1) % slides.length);
  const prev = () => setIndex((i) => (i - 1 + slides.length) % slides.length);

  return (
    <section
      id="hero"
      className="relative w-full min-h-[100vh] flex items-center overflow-hidden pt-20"
    >
      <AnimatePresence mode="sync">
        <motion.img
          key={current.img}
          src={current.img}
          alt={current.alt}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </AnimatePresence>

      <div className="absolute inset-0 bg-gradient-hero-overlay" />
      <div className="absolute inset-0 bg-gradient-to-r from-[hsl(222_60%_8%/0.85)] via-[hsl(222_60%_8%/0.55)] to-transparent" />

      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-accent/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary/40 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10 py-20">
        <div className="max-w-3xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/25 rounded-full px-4 py-2 mb-6">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="text-white text-xs sm:text-sm font-semibold tracking-wide">
                  {current.badge}
                </span>
              </div>

              <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.05] mb-6">
                {current.title}
              </h1>

              <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl leading-relaxed mb-8">
                {current.desc}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="flex flex-wrap gap-2 mb-8">
            {[
              bn ? "BMET অনুমোদিত" : "BMET Approved",
              bn ? "৩ বছরের পারমিট" : "3-Year Permit",
              bn ? "ফ্রি আবাসন" : "Free Accommodation",
              bn ? "৮ ঘন্টা + OT" : "8h + Overtime",
            ].map((p) => (
              <span
                key={p}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/10 border border-white/20 rounded-full px-3 py-1.5 backdrop-blur-md"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                {p}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 bg-gradient-sunset text-white font-semibold px-7 py-4 rounded-full shadow-gold hover:shadow-glow transition-all hover:scale-105"
            >
              <MessageCircle className="h-5 w-5" />
              {bn ? "WhatsApp এ আবেদন করুন" : "Apply via WhatsApp"}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <button
              onClick={() => document.getElementById("positions")?.scrollIntoView({ behavior: "smooth" })}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/30 text-white font-semibold px-7 py-4 rounded-full hover:bg-white/20 transition-all"
            >
              <Plane className="h-4 w-4" />
              {bn ? "ওপেন পজিশন দেখুন" : "View Open Positions"}
            </button>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-6 sm:gap-10 max-w-xl">
            {[
              { n: "60K–1.2L", l: bn ? "মাসিক বেতন (৳)" : "Monthly Salary (BDT)" },
              { n: "3 yr", l: bn ? "ওয়ার্ক পারমিট" : "Work Permit" },
              { n: "3–4 mo", l: bn ? "ভিসা প্রসেসিং" : "Visa Processing" },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-2xl sm:text-3xl font-extrabold text-white tabular-nums">{s.n}</div>
                <div className="text-xs sm:text-sm text-white/75 mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Carousel controls */}
      <button
        onClick={prev}
        aria-label="Previous slide"
        className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={next}
        aria-label="Next slide"
        className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-8 bg-accent" : "w-3 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-background pointer-events-none" />
    </section>
  );
};

export default HeroSection;
