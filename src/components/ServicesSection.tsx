import { motion } from "framer-motion";
import { ArrowUpRight, HardHat, GraduationCap, Moon, Plane } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const ACCENT_BLUE = "from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-blue-dark))]";
const ACCENT_RED = "from-[hsl(var(--brand-red))] to-[hsl(var(--brand-red-dark))]";
const ACCENT_MIX = "from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-red))]";

interface Service {
  Icon: React.ComponentType<{ className?: string }>;
  badge: string;
  gradient: string;
  titleEn: string;
  titleBn: string;
  descEn: string;
  descBn: string;
  status?: "active" | "soon";
  href?: string;
}

const services: Service[] = [
  {
    Icon: HardHat,
    badge: "Active Now",
    gradient: ACCENT_RED,
    titleEn: "Fiji Work Permit",
    titleBn: "ফিজি ওয়ার্ক পারমিট",
    descEn: "BMET-approved 3-year work permit visa with company accommodation. 20+ open positions, salary 60K–1.2L BDT + OT.",
    descBn: "BMET অনুমোদিত ৩ বছরের ওয়ার্ক পারমিট, কোম্পানি আবাসন। ২০+ পদ, বেতন ৬০K–১.২L টাকা + OT।",
    status: "active",
    href: "#positions",
  },
  {
    Icon: GraduationCap,
    badge: "New",
    gradient: ACCENT_BLUE,
    titleEn: "Student Consultancy",
    titleBn: "স্টুডেন্ট কনসালটেন্সি",
    descEn: "End-to-end overseas study guidance — admission, SOP, visa filing, accommodation and pre-departure briefing.",
    descBn: "বিদেশে পড়াশোনার সম্পূর্ণ গাইডেন্স — অ্যাডমিশন, SOP, ভিসা ফাইলিং, আবাসন ও প্রি-ডিপারচার।",
    status: "active",
    href: "#student-consultancy",
  },
  {
    Icon: Moon,
    badge: "Coming Soon",
    gradient: ACCENT_MIX,
    titleEn: "Hajj & Umrah",
    titleBn: "হজ্জ ও উমরাহ",
    descEn: "Premium Hajj and year-round Umrah packages with experienced moallems and hotels near the Haram.",
    descBn: "অভিজ্ঞ মোয়াল্লেম ও হারামের কাছাকাছি হোটেল সহ প্রিমিয়াম হজ্জ ও সারাবছর উমরাহ প্যাকেজ।",
    status: "soon",
  },
  {
    Icon: Plane,
    badge: "Available",
    gradient: ACCENT_BLUE,
    titleEn: "Air Tickets & Visa Support",
    titleBn: "এয়ার টিকেট ও ভিসা সাপোর্ট",
    descEn: "Domestic & international flight bookings, tourist/business/medical visa assistance and travel documentation.",
    descBn: "ডোমেস্টিক ও ইন্টারন্যাশনাল ফ্লাইট, ট্যুরিস্ট/বিজনেস/মেডিকেল ভিসা সহায়তা ও ডকুমেন্টেশন।",
    status: "active",
    href: "#contact",
  },
];

const ServicesSection = () => {
  const { language } = useLanguage();
  const bn = language === "bn";

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
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          {services.map((s, i) => {
            const Icon = s.Icon;
            const Inner = (
              <>
                <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${s.gradient} opacity-10 group-hover:opacity-25 blur-2xl transition-opacity`} />

                <div className="flex items-start justify-between mb-5 relative">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  {s.status === "soon" ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                      {bn ? "শীঘ্রই" : "Soon"}
                    </span>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-accent group-hover:text-accent-foreground group-hover:rotate-45 transition-all">
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                  )}
                </div>

                <span className={`inline-block bg-gradient-to-r ${s.gradient} bg-clip-text text-transparent text-[10px] font-bold tracking-[0.2em] uppercase mb-2`}>
                  {s.badge}
                </span>

                <h3 className="font-heading text-lg md:text-xl font-bold text-foreground mb-2 leading-snug">
                  {bn ? s.titleBn : s.titleEn}
                </h3>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {bn ? s.descBn : s.descEn}
                </p>

                <div className={`absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r ${s.gradient} group-hover:w-full transition-all duration-500`} />
              </>
            );

            return (
              <motion.article
                key={s.titleEn}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.45 }}
                whileHover={{ y: -6 }}
                className={`group relative bg-card border border-border rounded-2xl p-6 md:p-7 transition-all hover:shadow-luxury hover:border-accent/30 overflow-hidden ${s.href ? "cursor-pointer" : ""}`}
                onClick={() => {
                  if (s.href?.startsWith("#")) {
                    document.getElementById(s.href.slice(1))?.scrollIntoView({ behavior: "smooth" });
                  }
                }}
              >
                {Inner}
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
