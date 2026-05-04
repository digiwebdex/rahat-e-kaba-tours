import { motion } from "framer-motion";
import { ArrowRight, Plane, Sparkles, MessageCircle, ShieldCheck } from "lucide-react";
import heroFiji from "@/assets/hero-fiji-work.jpg";
import { useLanguage } from "@/i18n/LanguageContext";

const WHATSAPP = "8801322181500";
const WA_LINK = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
  "Hello Hasan Travels, I'm interested in the Fiji Work Permit programme."
)}`;

const HeroSection = () => {
  const { language } = useLanguage();
  const bn = language === "bn";

  return (
    <section
      id="hero"
      className="relative w-full min-h-[100vh] flex items-center overflow-hidden pt-20"
    >
      <img
        src={heroFiji}
        alt="Fiji work permit opportunity — tropical island and skilled worker"
        className="absolute inset-0 w-full h-full object-cover"
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />

      <div className="absolute inset-0 bg-gradient-hero-overlay" />
      <div className="absolute inset-0 bg-gradient-to-r from-[hsl(222_60%_8%/0.85)] via-[hsl(222_60%_8%/0.55)] to-transparent" />

      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-accent/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary/40 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10 py-20">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/25 rounded-full px-4 py-2 mb-6"
          >
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-white text-xs sm:text-sm font-semibold tracking-wide">
              {bn ? "🇫🇯 ফিজি ওয়ার্ক পারমিট ভিসা" : "🇫🇯 Fiji Work Permit Visa Programme"}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.05] mb-6"
          >
            {bn ? (
              <>
                ফিজিতে কাজ করুন,{" "}
                <span className="text-gradient-sunset">উপার্জন করুন</span>
              </>
            ) : (
              <>
                Work in Fiji.{" "}
                <span className="text-gradient-sunset">Earn. Explore.</span>
              </>
            )}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl leading-relaxed mb-8"
          >
            {bn
              ? "BMET অনুমোদিত বৈধ প্রসেস। ৩ বছরের ওয়ার্ক পারমিট, কোম্পানি প্রদত্ত আবাসন, মাসিক বেতন ৬০,০০০ – ১,২০,০০০ টাকা + ওভারটাইম। মাত্র ৩–৪ মাসে ভিসা প্রসেসিং।"
              : "BMET-approved legal recruitment. 3-year renewable work permit, company-provided accommodation, monthly salary BDT 60,000 – 1,20,000 + overtime. Visa processing in just 3–4 months."}
          </motion.p>

          {/* Trust pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="flex flex-wrap gap-2 mb-8"
          >
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
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex flex-wrap items-center gap-4"
          >
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
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-12 grid grid-cols-3 gap-6 sm:gap-10 max-w-xl"
          >
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
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-background pointer-events-none" />
    </section>
  );
};

export default HeroSection;
