import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Plane, Sparkles, MessageCircle, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import heroMain from "@/assets/alrawsha-hero-1.jpg";
import heroLaos from "@/assets/alrawsha-laos.jpg";
import heroKuwait from "@/assets/alrawsha-kuwait.jpg";
import heroSerbia from "@/assets/alrawsha-serbia.jpg";
import heroRussia from "@/assets/alrawsha-russia.jpg";
import heroVietnam from "@/assets/alrawsha-vietnam.jpg";
import { useLanguage } from "@/i18n/LanguageContext";

const WHATSAPP = "8801886999465";
const WA_LINK = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
  "Hello Al Rawsha International, I'm interested in your overseas work permit programmes."
)}`;

const HeroSection = () => {
  const { language } = useLanguage();
  const bn = language === "bn";

  const slides = [
    {
      img: heroMain,
      alt: "Al Rawsha International — skilled Bangladeshi workforce abroad",
      badge: bn ? "🇧🇩 সরকার অনুমোদিত (আর.এল-২৯০২)" : "🇧🇩 Govt. Approved Recruiting Agency (RL-2902)",
      title: bn ? (
        <>আপনার <span className="text-gradient-sunset">প্রবাস যাত্রার</span> বিশ্বস্ত সঙ্গী</>
      ) : (
        <>Your Trusted Partner for a <span className="text-gradient-sunset">Better Future Abroad</span></>
      ),
      desc: bn
        ? "ভিয়েতনাম, কুয়েত, লাওস, সার্বিয়া ও রাশিয়াতে বৈধ ওয়ার্ক পারমিট ভিসা। দীর্ঘ অভিজ্ঞতা, স্বচ্ছ প্রসেস এবং নিশ্চিন্ত প্রবাস যাত্রা।"
        : "Legal work permit visas to Vietnam, Kuwait, Laos, Serbia and Russia. Years of experience, transparent processing and a worry-free journey abroad.",
    },
    {
      img: heroVietnam,
      alt: "Vietnam factory worker recruitment",
      badge: bn ? "🇻🇳 ভিয়েতনাম জরুরি নিয়োগ" : "🇻🇳 Urgent Recruitment in Vietnam",
      title: bn ? (
        <>ভিয়েতনামে <span className="text-gradient-sunset">$৩৫০–৫০০</span> বেতনে কাজ</>
      ) : (
        <>Work in Vietnam — <span className="text-gradient-sunset">$350–500/month</span></>
      ),
      desc: bn
        ? "হোয়াং সিএমএস কোম্পানি — ইটের কারখানা, প্লাইউড, সিরামিক ও হাইটেক পিগ ফার্ম। ৮ ঘন্টা + ওভারটাইম, কোম্পানি প্রদত্ত খাবার।"
        : "Hoang CMS Company — brick, plywood, ceramic & hi-tech pig farm jobs. 8 hours + overtime, company-provided meals.",
    },
    {
      img: heroKuwait,
      alt: "Kuwait bike delivery man recruitment",
      badge: bn ? "🇰🇼 কুয়েতে বাইক ডেলিভারি ম্যান" : "🇰🇼 Kuwait — Bike Delivery Man",
      title: bn ? (
        <>কুয়েতে <span className="text-gradient-sunset">১০০–১২০ দিনার</span> + টিপস</>
      ) : (
        <>Kuwait — <span className="text-gradient-sunset">100–120 KWD</span> + Tips</>
      ),
      desc: bn
        ? "ডেলিগেট কর্তৃক ইন্টারভিউ। ১২ ঘন্টা ডিউটি, কোম্পানি থেকে থাকা ও খাওয়া। ড্রাইভিং লাইসেন্স থাকতে হবে।"
        : "Interview by delegate. 12-hour shift, accommodation and meals provided by company. Driving licence required.",
    },
    {
      img: heroLaos,
      alt: "Laos construction work permit",
      badge: bn ? "🇱🇦 লাওসে কনস্ট্রাকশন কাজ" : "🇱🇦 Laos — Construction Work Permit",
      title: bn ? (
        <>লাওসে <span className="text-gradient-sunset">১৫ দিনে</span> ভিসা</>
      ) : (
        <>Laos — Visa in <span className="text-gradient-sunset">15 Days</span></>
      ),
      desc: bn
        ? "হেল্পার, মেশন, স্টিল ফিক্সার পদে। বেতন $৪০০–৫০০, ৮ ঘন্টা + ওভারটাইম, কোম্পানি বহন করবে বাসস্থান।"
        : "Helper, Mason and Steel Fixer roles. Salary $400–500, 8h + overtime, company-provided accommodation.",
    },
    {
      img: heroSerbia,
      alt: "Serbia agriculture work permit",
      badge: bn ? "🇷🇸 সার্বিয়া ওয়ার্ক পারমিট" : "🇷🇸 Serbia Work Permit Visa",
      title: bn ? (
        <>সার্বিয়াতে <span className="text-gradient-sunset">এগ্রিকালচার</span> জব</>
      ) : (
        <>Agriculture Jobs in <span className="text-gradient-sunset">Serbia</span></>
      ),
      desc: bn
        ? "প্রসেসিং সময় মাত্র ৩–৪ মাস। নিরাপদ ইউরোপীয় কর্মপরিবেশ ও প্রতিযোগিতামূলক বেতন।"
        : "Processing time only 3–4 months. Safe European workplace with competitive salary.",
    },
    {
      img: heroRussia,
      alt: "Russia RTL & LZL work visa",
      badge: bn ? "🇷🇺 রাশিয়া RTL ও LZL কোম্পানি" : "🇷🇺 Russia — RTL & LZL Companies",
      title: bn ? (
        <>রাশিয়ায় <span className="text-gradient-sunset">৭০–৮০ হাজার</span> টাকা বেতন</>
      ) : (
        <>Russia — <span className="text-gradient-sunset">BDT 70–80K</span> Monthly</>
      ),
      desc: bn
        ? "ফ্যাক্টরি ওয়ার্কার পদে নিয়োগ। বয়স ২৫–৪০, ১০ ঘন্টা ডিউটি, থাকা ও খাওয়া কোম্পানির। পাসপোর্ট জমা চলছে।"
        : "Factory worker recruitment. Age 25–40, 10-hour shift, accommodation & meals by company. Passport submission ongoing.",
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
      <div className="absolute inset-0 bg-gradient-to-r from-[hsl(178_60%_8%/0.85)] via-[hsl(178_60%_8%/0.55)] to-transparent" />

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
              bn ? "RL-২৯০২" : "License RL-2902",
              bn ? "বৈধ প্রসেস" : "Legal Processing",
              bn ? "অভিজ্ঞ টিম" : "Experienced Team",
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
              {bn ? "সব পজিশন দেখুন" : "View Open Positions"}
            </button>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-6 sm:gap-10 max-w-xl">
            {[
              { n: "5+", l: bn ? "গন্তব্য দেশ" : "Destination Countries" },
              { n: "RL-2902", l: bn ? "সরকার অনুমোদিত" : "Govt. License" },
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
