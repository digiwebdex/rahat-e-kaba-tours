import { motion } from "framer-motion";
import { Clock, Search, FileText, Send, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useBulkSiteContent } from "@/hooks/useSiteContentProvider";

const ICON_MAP: Record<string, any> = { Search, FileText, Send, CheckCircle2 };

type Country = {
  name: string;
  nameBn: string;
  code: string;
  duration: string;
  durationBn: string;
  price: string;
};

const COUNTRIES: Country[] = [
  { name: "Philippines", nameBn: "ফিলিপাইন", code: "ph", duration: "7-10 days", durationBn: "৭-১০ দিন", price: "৳8,500" },
  { name: "Malaysia", nameBn: "মালয়েশিয়া", code: "my", duration: "5-7 days", durationBn: "৫-৭ দিন", price: "৳5,500" },
  { name: "Thailand", nameBn: "থাইল্যান্ড", code: "th", duration: "5-7 days", durationBn: "৫-৭ দিন", price: "৳6,500" },
  { name: "Japan", nameBn: "জাপান", code: "jp", duration: "7-10 days", durationBn: "৭-১০ দিন", price: "৳9,500" },
  { name: "South Korea", nameBn: "দক্ষিণ কোরিয়া", code: "kr", duration: "10-15 days", durationBn: "১০-১৫ দিন", price: "৳10,000" },
  { name: "China", nameBn: "চীন", code: "cn", duration: "10-15 days", durationBn: "১০-১৫ দিন", price: "৳12,500" },
  { name: "Singapore", nameBn: "সিঙ্গাপুর", code: "sg", duration: "3-5 days", durationBn: "৩-৫ দিন", price: "৳5,500" },
  { name: "Indonesia", nameBn: "ইন্দোনেশিয়া", code: "id", duration: "3-5 days", durationBn: "৩-৫ দিন", price: "৳4,500" },
  { name: "Turkey", nameBn: "তুরস্ক", code: "tr", duration: "10-15 days", durationBn: "১০-১৫ দিন", price: "৳8,000" },
  { name: "United Kingdom", nameBn: "যুক্তরাজ্য", code: "gb", duration: "2-3 days", durationBn: "২-৩ দিন", price: "৳10,000" },
  { name: "Canada", nameBn: "কানাডা", code: "ca", duration: "20-30 days", durationBn: "২০-৩০ দিন", price: "৳20,000" },
  { name: "USA", nameBn: "যুক্তরাষ্ট্র", code: "us", duration: "Interview based", durationBn: "ইন্টারভিউ ভিত্তিক", price: "৳10,000" },
  { name: "Germany", nameBn: "জার্মানি", code: "de", duration: "15-21 days", durationBn: "১৫-২১ দিন", price: "৳15,000" },
  { name: "Spain", nameBn: "স্পেন", code: "es", duration: "15-21 days", durationBn: "১৫-২১ দিন", price: "৳14,000" },
  { name: "Netherlands", nameBn: "নেদারল্যান্ডস", code: "nl", duration: "15-21 days", durationBn: "১৫-২১ দিন", price: "৳15,000" },
  { name: "Hong Kong", nameBn: "হংকং", code: "hk", duration: "5-7 days", durationBn: "৫-৭ দিন", price: "৳6,000" },
  { name: "Sri Lanka", nameBn: "শ্রীলঙ্কা", code: "lk", duration: "3-5 days", durationBn: "৩-৫ দিন", price: "৳4,000" },
  { name: "Australia", nameBn: "অস্ট্রেলিয়া", code: "au", duration: "20-30 days", durationBn: "২০-৩০ দিন", price: "৳25,000" },
];

const VisaServicesSection = () => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const { data: content } = useBulkSiteContent("visa_services");
  const lc = content?.[language];

  const defaultSteps = [
    {
      icon: Search,
      title: bn ? "পরামর্শ" : "Consultation",
      desc: bn
        ? "আপনার ভ্রমণের প্রয়োজন ও ভিসা শর্ত বোঝার জন্য বিনামূল্যে পরামর্শ"
        : "Free consultation to understand your travel needs and visa requirements",
    },
    {
      icon: FileText,
      title: bn ? "ডকুমেন্টেশন" : "Documentation",
      desc: bn
        ? "প্রয়োজনীয় সব কাগজপত্রসহ সম্পূর্ণ ভিসা ফাইল প্রস্তুত করা"
        : "We prepare your complete visa file with all required documents",
    },
    {
      icon: Send,
      title: bn ? "জমাদান" : "Submission",
      desc: bn
        ? "দূতাবাসে আবেদন জমা ও ফলো-আপ ট্র্যাকিং"
        : "Application submitted to the embassy with follow-up tracking",
    },
    {
      icon: CheckCircle2,
      title: bn ? "অনুমোদন" : "Approval",
      desc: bn
        ? "ভিসা অনুমোদন ও পাসপোর্ট ফেরত। আপনি ভ্রমণের জন্য প্রস্তুত!"
        : "Visa approved and passport returned. You're ready to travel!",
    },
  ];

  const steps = (lc?.steps && Array.isArray(lc.steps) && lc.steps.length > 0)
    ? lc.steps.map((s: any) => ({ icon: ICON_MAP[s.icon] || Search, title: s.title, desc: s.desc }))
    : defaultSteps;

  const countries = (lc?.countries && Array.isArray(lc.countries) && lc.countries.length > 0)
    ? lc.countries.map((c: any) => ({ name: c.name, code: c.code, duration: c.duration, price: c.price }))
    : COUNTRIES.map((c) => ({ name: bn ? c.nameBn : c.name, code: c.code, duration: bn ? c.durationBn : c.duration, price: c.price }));

  const sectionLabel = lc?.section_label || (bn ? "ভিসা সেবা" : "Visa Services");
  const heading = lc?.heading || (bn ? "ভিসা সেবা" : "Visa Services");
  const description = lc?.description || (bn ? "১৮+ দেশের জন্য উচ্চ অনুমোদনের হারসহ বিশেষজ্ঞ ভিসা প্রসেসিং" : "Expert visa processing for 18+ countries with high approval rates");
  const footerNote = lc?.footer_note || (bn ? "* মূল্য শুরুর ফি এবং পরিবর্তনশীল। সঠিক মূল্যের জন্য যোগাযোগ করুন।" : "* Prices are starting fees and may vary. Contact us for exact pricing.");

  return (
    <section id="visa" className="py-20 md:py-28 bg-secondary/40">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <span className="inline-block bg-primary/10 text-primary text-xs font-bold tracking-[0.25em] uppercase px-4 py-1.5 rounded-full mb-4">
            {sectionLabel}
          </span>
          <h2 className="font-heading text-3xl md:text-5xl font-extrabold text-foreground">
            {heading}
          </h2>
          <p className="text-muted-foreground mt-4 text-base md:text-lg">
            {description}
          </p>
          <div className="h-1 w-16 bg-gradient-to-r from-primary to-accent mx-auto mt-5 rounded-full" />
        </motion.div>

        {/* 4-step process */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-5xl mx-auto mb-16">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="text-center"
              >
                <div className="relative inline-flex items-center justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                    <Icon className="w-7 h-7" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center border-2 border-background">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-heading font-bold text-foreground text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Country grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 max-w-6xl mx-auto">
          {countries.map((c: any, i: number) => (
            <motion.a
              key={c.name}
              href={`/visa?country=${c.code}`}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
              className="group bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between hover:border-primary/50 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={`https://flagcdn.com/w80/${c.code}.png`}
                  srcSet={`https://flagcdn.com/w160/${c.code}.png 2x`}
                  width={32}
                  height={24}
                  alt={`${c.name} flag`}
                  loading="lazy"
                  className="w-8 h-6 object-cover rounded-sm shrink-0 ring-1 ring-border"
                />
                <div className="min-w-0">
                  <div className="font-semibold text-foreground text-sm truncate">
                    {c.name}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {c.duration}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {bn ? "শুরু" : "From"}
                </div>
                <div className="font-bold text-primary tabular-nums">{c.price}</div>
              </div>
            </motion.a>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          {footerNote}
        </p>
      </div>
    </section>
  );
};

export default VisaServicesSection;