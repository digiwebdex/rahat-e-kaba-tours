import { motion } from "framer-motion";
import { GraduationCap, BookOpen, FileCheck2, Plane, Send, ArrowRight } from "lucide-react";
import studentImg from "@/assets/student-consultancy.jpg";
import { useLanguage } from "@/i18n/LanguageContext";
import { useState } from "react";
import ApplyDialog from "./ApplyDialog";

const COUNTRIES = [
  { flag: "🇬🇧", en: "United Kingdom", bn: "যুক্তরাজ্য" },
  { flag: "🇨🇦", en: "Canada", bn: "কানাডা" },
  { flag: "🇦🇺", en: "Australia", bn: "অস্ট্রেলিয়া" },
  { flag: "🇺🇸", en: "United States", bn: "যুক্তরাষ্ট্র" },
  { flag: "🇩🇪", en: "Germany", bn: "জার্মানি" },
  { flag: "🇲🇾", en: "Malaysia", bn: "মালয়েশিয়া" },
];

const StudentConsultancySection = () => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const [applyOpen, setApplyOpen] = useState(false);

  const services = [
    { Icon: BookOpen, en: "Course & University Selection", bn: "কোর্স ও ইউনিভার্সিটি নির্বাচন" },
    { Icon: FileCheck2, en: "SOP, LOR & Application Filing", bn: "SOP, LOR ও আবেদন প্রস্তুতি" },
    { Icon: GraduationCap, en: "Student Visa Processing", bn: "স্টুডেন্ট ভিসা প্রসেসিং" },
    { Icon: Plane, en: "Pre-Departure Briefing", bn: "প্রি-ডিপারচার ব্রিফিং" },
  ];

  return (
    <section id="student-consultancy" className="py-24 bg-background relative overflow-hidden">
      <div className="absolute -top-32 right-0 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="relative rounded-3xl overflow-hidden shadow-luxury">
              <img
                src={studentImg}
                alt="International student studying abroad"
                className="w-full h-auto object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/40 to-transparent" />
            </div>
            <div className="absolute -bottom-6 -right-6 bg-card border border-border rounded-2xl p-5 shadow-elevated max-w-[200px]">
              <GraduationCap className="h-8 w-8 text-accent mb-2" />
              <div className="text-2xl font-extrabold text-foreground">6+</div>
              <div className="text-xs text-muted-foreground">
                {bn ? "জনপ্রিয় গন্তব্য" : "Popular destinations"}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-accent text-xs font-bold tracking-[0.3em] uppercase">
              {bn ? "স্টুডেন্ট কনসালটেন্সি" : "Student Consultancy"}
            </span>
            <h2 className="font-heading text-3xl md:text-5xl font-extrabold mt-3 mb-5">
              {bn ? "বিদেশে পড়াশোনার " : "Your gateway to "}
              <span className="text-gradient-sunset">{bn ? "স্বপ্নপূরণ" : "global education"}</span>
            </h2>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-7">
              {bn
                ? "অভিজ্ঞ কনসালট্যান্টদের সাথে বিনামূল্যে পরামর্শ। সঠিক ইউনিভার্সিটি বাছাই থেকে শুরু করে ভিসা পর্যন্ত — আমরা আপনার পাশে।"
                : "Free guidance from experienced consultants. From choosing the right university to landing your visa — we're with you at every step."}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-7">
              {services.map((s) => {
                const Icon = s.Icon;
                return (
                  <div
                    key={s.en}
                    className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50 border border-border"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gradient-ocean text-white flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-medium text-foreground leading-snug pt-1.5">
                      {bn ? s.bn : s.en}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mb-7">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                {bn ? "জনপ্রিয় গন্তব্য" : "Popular Destinations"}
              </p>
              <div className="flex flex-wrap gap-2">
                {COUNTRIES.map((c) => (
                  <span
                    key={c.en}
                    className="inline-flex items-center gap-1.5 text-sm font-medium bg-card border border-border rounded-full px-3 py-1.5"
                  >
                    <span className="text-base">{c.flag}</span>
                    {bn ? c.bn : c.en}
                  </span>
                ))}
              </div>
            </div>

            <a
              href={WA}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 bg-gradient-ocean text-white font-semibold px-6 py-3.5 rounded-full shadow-ocean hover:shadow-glow transition-all hover:scale-105"
            >
              <MessageCircle className="h-5 w-5" />
              {bn ? "ফ্রি কনসালটেশন বুক করুন" : "Book a Free Consultation"}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default StudentConsultancySection;
