import { motion } from "framer-motion";
import { ArrowRight, Calendar } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

type Post = {
  category: string;
  categoryBn: string;
  titleEn: string;
  titleBn: string;
  excerptEn: string;
  excerptBn: string;
  date: string;
  image: string;
  href: string;
};

const POSTS: Post[] = [
  {
    category: "Visa Guide",
    categoryBn: "ভিসা গাইড",
    titleEn: "How to Apply for a Schengen Visa from Bangladesh",
    titleBn: "বাংলাদেশ থেকে শেনজেন ভিসার আবেদন কীভাবে করবেন",
    excerptEn: "Step-by-step checklist, documents required and approval tips for Bangladeshi applicants.",
    excerptBn: "বাংলাদেশী আবেদনকারীদের জন্য ধাপে ধাপে চেকলিস্ট, প্রয়োজনীয় ডকুমেন্ট ও অনুমোদনের টিপস।",
    date: "Apr 2026",
    image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=70",
    href: "#contact",
  },
  {
    category: "Visa Guide",
    categoryBn: "ভিসা গাইড",
    titleEn: "Vietnam Work Permit: Complete Process for 2026",
    titleBn: "ভিয়েতনাম ওয়ার্ক পারমিট: ২০২৬ সালের সম্পূর্ণ প্রক্রিয়া",
    excerptEn: "Eligibility, paperwork, salary expectations and the typical timeline from application to landing.",
    excerptBn: "যোগ্যতা, কাগজপত্র, বেতনের প্রত্যাশা এবং আবেদন থেকে অবতরণ পর্যন্ত সাধারণ সময়সীমা।",
    date: "Mar 2026",
    image: "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=70",
    href: "#contact",
  },
  {
    category: "Travel Tips",
    categoryBn: "ভ্রমণ টিপস",
    titleEn: "Cheapest Months to Book Air Tickets from Dhaka",
    titleBn: "ঢাকা থেকে এয়ার টিকেট বুক করার সবচেয়ে সাশ্রয়ী মাস",
    excerptEn: "Insider fare-trend data and booking-window tips to save up to 30% on your next international flight.",
    excerptBn: "আপনার পরবর্তী আন্তর্জাতিক ফ্লাইটে ৩০% পর্যন্ত সাশ্রয়ের জন্য ফেয়ার-ট্রেন্ড ডেটা ও বুকিং উইন্ডো টিপস।",
    date: "Feb 2026",
    image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=70",
    href: "#contact",
  },
];

const TravelBlogSection = () => {
  const { language } = useLanguage();
  const bn = language === "bn";

  return (
    <section id="blog" className="py-20 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <h2 className="font-heading text-3xl md:text-5xl font-extrabold text-foreground">
            {bn ? "ট্রাভেল ব্লগ" : "Travel Blog"}
          </h2>
          <p className="text-muted-foreground mt-3 text-base md:text-lg">
            {bn
              ? "আপনার পরবর্তী যাত্রার জন্য টিপস, গাইড ও অনুপ্রেরণা"
              : "Tips, guides, and inspiration for your next adventure"}
          </p>
          <div className="h-1 w-16 bg-gradient-to-r from-primary to-accent mx-auto mt-5 rounded-full" />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {POSTS.map((p, i) => (
            <motion.a
              key={p.titleEn}
              href={p.href}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-xl hover:border-primary/30 transition-all flex flex-col"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <img
                  src={p.image}
                  alt={bn ? p.titleBn : p.titleEn}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full">
                  {bn ? p.categoryBn : p.category}
                </span>
              </div>
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                  <Calendar className="w-3.5 h-3.5" />
                  {p.date}
                </div>
                <h3 className="font-heading font-bold text-foreground text-lg leading-snug mb-2 group-hover:text-primary transition-colors">
                  {bn ? p.titleBn : p.titleEn}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
                  {bn ? p.excerptBn : p.excerptEn}
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  {bn ? "আরও পড়ুন" : "Read more"}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TravelBlogSection;