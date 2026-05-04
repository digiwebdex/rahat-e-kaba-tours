import { motion } from "framer-motion";
import { FileText, Users, CheckCircle2, Stamp, Plane } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const ProcessTimeline = () => {
  const { language } = useLanguage();
  const bn = language === "bn";

  const steps = [
    {
      Icon: FileText,
      titleEn: "Submit Documents",
      titleBn: "ডকুমেন্ট জমা",
      descEn: "CV, passport, work video and a white-background photo.",
      descBn: "সিভি, পাসপোর্ট, কাজের ভিডিও ও সাদা ব্যাকগ্রাউন্ড ছবি।",
    },
    {
      Icon: Users,
      titleEn: "Delegate Interview",
      titleBn: "ডেলিগেট ইন্টারভিউ",
      descEn: "Direct interview with the Fiji employer's delegate in Dhaka.",
      descBn: "ফিজির কোম্পানি প্রতিনিধির সাথে ঢাকায় সরাসরি ইন্টারভিউ।",
    },
    {
      Icon: CheckCircle2,
      titleEn: "Selection",
      titleBn: "সিলেকশন",
      descEn: "Shortlist confirmed and contract issued by the employer.",
      descBn: "শর্টলিস্ট ও কোম্পানির পক্ষ থেকে কন্ট্রাক্ট ইস্যু।",
    },
    {
      Icon: Stamp,
      titleEn: "Visa Processing",
      titleBn: "ভিসা প্রসেসিং",
      descEn: "BMET clearance and Fiji work permit visa in 3–4 months.",
      descBn: "৩–৪ মাসে BMET ক্লিয়ারেন্স ও ফিজি ওয়ার্ক পারমিট ভিসা।",
    },
    {
      Icon: Plane,
      titleEn: "Fly to Fiji",
      titleBn: "ফিজি যাত্রা",
      descEn: "Pre-departure briefing and flight to start your new job.",
      descBn: "প্রি-ডিপারচার ব্রিফিং ও ফ্লাইটে নতুন কাজে যোগদান।",
    },
  ];

  return (
    <section id="process" className="py-24 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <span className="text-accent text-xs font-bold tracking-[0.3em] uppercase">
            {bn ? "আবেদন প্রক্রিয়া" : "How it works"}
          </span>
          <h2 className="font-heading text-3xl md:text-5xl font-extrabold mt-3 mb-4">
            {bn ? "৫টি সহজ ধাপে " : "From application to "}
            <span className="text-gradient-ocean">{bn ? "ফিজি যাত্রা" : "boarding pass"}</span>
          </h2>
          <p className="text-muted-foreground">
            {bn
              ? "আবেদন থেকে বিদেশযাত্রা — পুরো প্রক্রিয়াটি স্বচ্ছ ও বৈধ।"
              : "A transparent, BMET-approved process every step of the way."}
          </p>
        </motion.div>

        <div className="relative max-w-5xl mx-auto">
          <div className="hidden md:block absolute left-0 right-0 top-7 h-0.5 bg-gradient-to-r from-primary via-accent to-primary opacity-30" />

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-4">
            {steps.map((s, i) => {
              const Icon = s.Icon;
              return (
                <motion.div
                  key={s.titleEn}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="relative text-center"
                >
                  <div className="relative inline-flex">
                    <div className="w-14 h-14 rounded-full bg-gradient-ocean text-white flex items-center justify-center shadow-ocean mx-auto relative z-10">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center z-20">
                      {i + 1}
                    </div>
                  </div>
                  <h3 className="font-heading font-bold text-foreground mt-4 mb-1.5 text-sm md:text-base">
                    {bn ? s.titleBn : s.titleEn}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed px-2">
                    {bn ? s.descBn : s.descEn}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProcessTimeline;
