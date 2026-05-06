import { motion } from "framer-motion";
import { ShieldCheck, Home, CalendarCheck, Clock, BadgeCheck, Headphones } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const FacilitiesSection = () => {
  const { language } = useLanguage();
  const bn = language === "bn";

  const items = [
    {
      Icon: ShieldCheck,
      titleEn: "BMET-Approved Process",
      titleBn: "BMET অনুমোদিত প্রসেস",
      descEn: "100% legal recruitment under government-approved licence (RL-2902).",
      descBn: "সরকার অনুমোদিত লাইসেন্সের (RL-2902) অধীনে ১০০% বৈধ প্রসেস।",
    },
    {
      Icon: Home,
      titleEn: "Free Accommodation",
      titleBn: "ফ্রি আবাসন",
      descEn: "Company-provided housing across all destinations throughout your contract.",
      descBn: "সব দেশেই কন্ট্রাক্ট চলাকালীন কোম্পানির পক্ষ থেকে আবাসন সম্পূর্ণ ফ্রি।",
    },
    {
      Icon: CalendarCheck,
      titleEn: "Renewable Work Permit",
      titleBn: "নবায়নযোগ্য ওয়ার্ক পারমিট",
      descEn: "Long-term 1–3 year work permits with the option to renew on completion.",
      descBn: "১–৩ বছরের ওয়ার্ক পারমিট, মেয়াদ শেষে নবায়নের সুবিধা।",
    },
    {
      Icon: Clock,
      titleEn: "Fast Visa Processing",
      titleBn: "দ্রুত ভিসা প্রসেসিং",
      descEn: "Work permit visas processed within 15 days – 4 months with full transparency.",
      descBn: "১৫ দিন থেকে ৪ মাসের মধ্যে স্বচ্ছ প্রক্রিয়ায় ভিসা সম্পন্ন।",
    },
    {
      Icon: BadgeCheck,
      titleEn: "8-Hour Duty + Overtime",
      titleBn: "৮ ঘন্টা ডিউটি + ওভারটাইম",
      descEn: "Standard 8-hour shifts with attractive overtime earnings.",
      descBn: "নিয়মিত ৮ ঘন্টা ডিউটি, সাথে আকর্ষণীয় ওভারটাইম আয়।",
    },
    {
      Icon: Headphones,
      titleEn: "End-to-End Support",
      titleBn: "সম্পূর্ণ সাপোর্ট",
      descEn: "From documentation to landing abroad — our team is with you all the way.",
      descBn: "ডকুমেন্টেশন থেকে বিদেশে অবতরণ পর্যন্ত — আমরা পাশে।",
    },
  ];

  return (
    <section id="facilities" className="py-24 bg-secondary/30 relative overflow-hidden">
      <div className="absolute inset-0 travel-pattern opacity-30" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="text-accent text-xs font-bold tracking-[0.3em] uppercase">
            {bn ? "কেন আমাদের বেছে নেবেন" : "Why choose us"}
          </span>
          <h2 className="font-heading text-3xl md:text-5xl font-bold mt-3 mb-4">
            {bn ? "Al Rawsha International এর " : "The Al Rawsha International "}
            <span className="text-gradient-ocean">{bn ? "প্রতিশ্রুতি" : "promise"}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {bn
              ? "নিরাপদ, স্বচ্ছ ও সম্পূর্ণ বৈধ — আপনার বিদেশযাত্রা যেন হয় চিন্তামুক্ত।"
              : "Safe, transparent and fully legal — so your overseas journey is worry-free."}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {items.map((item, i) => {
            const Icon = item.Icon;
            return (
              <motion.div
                key={item.titleEn}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border hover:border-accent/40 hover:shadow-soft transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 group-hover:scale-105 transition-all">
                  <Icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-foreground mb-1">
                    {bn ? item.titleBn : item.titleEn}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {bn ? item.descBn : item.descEn}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FacilitiesSection;
