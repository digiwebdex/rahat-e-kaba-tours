import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, CalendarDays, MapPin, Repeat, FileCheck2, ShieldCheck, AlertCircle, Phone, MessageCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import { VISA_COUNTRIES, findVisaCountry } from "@/data/visaCountries";

const Visa = () => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const [params] = useSearchParams();
  const code = (params.get("country") || "cn").toLowerCase();
  const country = useMemo(() => findVisaCountry(code) || VISA_COUNTRIES[0], [code]);

  const name = bn ? country.nameBn : country.name;

  const stats = [
    { icon: Clock, label: bn ? "প্রসেসিং" : "Processing", value: bn ? country.durationBn : country.duration },
    { icon: CalendarDays, label: bn ? "ভ্যালিডিটি" : "Validity", value: country.validity },
    { icon: MapPin, label: bn ? "সর্বোচ্চ অবস্থান" : "Max Stay", value: country.maxStay },
    { icon: Repeat, label: bn ? "এন্ট্রি" : "Entry", value: bn ? country.entryBn : country.entry },
  ];

  const documents = bn
    ? [
        "বৈধ পাসপোর্ট (ন্যূনতম ৬ মাস মেয়াদ, ২টি খালি পৃষ্ঠা)",
        "সাম্প্রতিক পাসপোর্ট সাইজের ছবি (সাদা ব্যাকগ্রাউন্ড)",
        "ব্যাংক স্টেটমেন্ট (গত ৬ মাসের)",
        "এনআইডি / জন্ম সনদের কপি",
        "ট্রেড লাইসেন্স / জব লেটার / স্টুডেন্ট আইডি",
        "হোটেল বুকিং ও রিটার্ন এয়ার টিকিট",
      ]
    : [
        "Valid passport (min 6 months validity, 2 blank pages)",
        "Recent passport-size photographs (white background)",
        "Bank statement (last 6 months)",
        "NID / birth certificate copy",
        "Trade license / job letter / student ID",
        "Hotel booking & return air ticket",
      ];

  const eligibility = bn
    ? [
        "বাংলাদেশি পাসপোর্টধারী",
        "অবস্থানের জন্য পর্যাপ্ত আর্থিক সক্ষমতা",
        "নিশ্চিত ভ্রমণ পরিকল্পনা",
        "পূর্বে ভিসা প্রত্যাখ্যান নেই (অগ্রাধিকার)",
      ]
    : [
        "Bangladeshi passport holder",
        "Sufficient funds for the duration of stay",
        "Confirmed travel itinerary",
        "No prior visa rejections (preferred)",
      ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{`${country.name} Visa Application | Manasik Travel Hub`}</title>
        <meta name="description" content={`Apply for ${country.name} visa from Bangladesh. Processing ${country.duration}, starting from ${country.price}.`} />
        <link rel="canonical" href={`/visa?country=${country.code}`} />
      </Helmet>

      <Navbar />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <Link to="/#visa" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            {bn ? "হোমে ফিরে যান" : "Back to Home"}
          </Link>

          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-primary/10 via-card to-accent/5 border border-border rounded-2xl p-6 md:p-10 mb-10"
          >
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <img
                src={`https://flagcdn.com/w160/${country.code}.png`}
                srcSet={`https://flagcdn.com/w320/${country.code}.png 2x`}
                alt={`${country.name} flag`}
                className="w-28 h-20 object-cover rounded-md ring-1 ring-border shadow-md shrink-0"
              />
              <div className="flex-1">
                <span className="inline-block bg-primary/10 text-primary text-xs font-bold tracking-[0.25em] uppercase px-3 py-1 rounded-full mb-3">
                  {bn ? "ভিসা আবেদন" : "Visa Application"}
                </span>
                <h1 className="font-heading text-3xl md:text-5xl font-extrabold text-foreground">
                  {name}
                </h1>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4" />{bn ? country.durationBn : country.duration}</span>
                  <span>{bn ? "শুরু" : "From"} <span className="font-bold text-primary">{country.price}</span></span>
                  <span className="inline-flex items-center gap-1.5">{bn ? country.typeBn : country.type}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 md:w-56">
                <Button asChild size="lg" className="w-full">
                  <a href="#contact-cta">{bn ? "এখনই আবেদন করুন" : "Apply Now"}</a>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full">
                  <a href="tel:+8801711925400"><Phone className="w-4 h-4 mr-1.5" />{bn ? "কল করুন" : "Call Us"}</a>
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-10">
            {stats.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="p-4 md:p-5 h-full border-border/70">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                      <Icon className="w-4 h-4 text-primary" />
                      {s.label}
                    </div>
                    <div className="mt-2 font-bold text-foreground text-base md:text-lg">{s.value}</div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* About + Documents + Eligibility */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6 md:p-8">
                <h2 className="font-heading text-2xl font-bold text-foreground mb-3">
                  {bn ? `${name} ভিসা সম্পর্কে` : `About ${name} Visa`}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {bn
                    ? `${name} ভিসার জন্য আবেদন করুন Manasik Travel Hub-এর সাথে — বাংলাদেশের বিশ্বস্ত ভ্রমণ পার্টনার। আমাদের বিশেষজ্ঞ দল সম্পূর্ণ ডকুমেন্টেশন, দূতাবাসের অ্যাপয়েন্টমেন্ট এবং ফলো-আপ পরিচালনা করে যাতে আপনার অনুমোদনের সম্ভাবনা সর্বাধিক হয়।`
                    : `Apply for your ${name} visa with Manasik Travel Hub — Bangladesh's trusted travel partner. Our experts handle complete documentation, embassy bookings and follow-up to maximise your approval chances.`}
                </p>
              </Card>

              <Card className="p-6 md:p-8">
                <h2 className="font-heading text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <FileCheck2 className="w-6 h-6 text-primary" />
                  {bn ? "প্রয়োজনীয় কাগজপত্র" : "Required Documents"}
                </h2>
                <ul className="space-y-2.5">
                  {documents.map((d) => (
                    <li key={d} className="flex items-start gap-2.5 text-sm md:text-base text-foreground">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      {d}
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="p-6 md:p-8">
                <h2 className="font-heading text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                  {bn ? "যোগ্যতা ও শর্তাবলী" : "Eligibility & Requirements"}
                </h2>
                <ul className="space-y-2.5">
                  {eligibility.map((d) => (
                    <li key={d} className="flex items-start gap-2.5 text-sm md:text-base text-foreground">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                      {d}
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="p-5 md:p-6 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50">
                <h3 className="font-bold text-foreground mb-1.5 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  {bn ? "গুরুত্বপূর্ণ নোট" : "Important Notes"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {bn
                    ? "ভিসা ফি প্রারম্ভিক মূল্য এবং ভিসার ধরন ও দূতাবাসের চার্জ অনুযায়ী পরিবর্তনশীল। চূড়ান্ত অনুমোদন সংশ্লিষ্ট দূতাবাসের সিদ্ধান্তের উপর নির্ভরশীল। Manasik Travel Hub বিশেষজ্ঞ ডকুমেন্ট প্রস্তুতি নিশ্চিত করলেও অনুমোদনের নিশ্চয়তা দিতে পারে না।"
                    : "Visa fees are starting prices and may vary based on visa type and embassy charges. Final approval is at the discretion of the issuing embassy. Manasik Travel Hub ensures expert document preparation but cannot guarantee approval."}
                </p>
              </Card>
            </div>

            {/* Sidebar: pricing + other countries */}
            <aside className="space-y-6">
              <Card id="contact-cta" className="p-6 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                <div className="text-xs uppercase tracking-wider opacity-80">{bn ? "শুরু থেকে" : "Starting From"}</div>
                <div className="text-4xl font-extrabold mt-1 tabular-nums">{country.price}</div>
                <div className="text-sm opacity-90 mt-1">{bn ? country.typeBn : country.type} • {bn ? country.durationBn : country.duration}</div>
                <div className="mt-5 space-y-2">
                  <Button asChild size="lg" variant="secondary" className="w-full">
                    <Link to="/contact">{bn ? "আবেদন শুরু করুন" : "Start Application"}</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="w-full bg-transparent border-white/40 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
                    <a href="https://wa.me/8801711925400" target="_blank" rel="noreferrer">
                      <MessageCircle className="w-4 h-4 mr-1.5" />WhatsApp
                    </a>
                  </Button>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="font-heading font-bold text-foreground mb-3">
                  {bn ? "অন্যান্য দেশ" : "Other Countries"}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {VISA_COUNTRIES.filter((c) => c.code !== country.code).slice(0, 12).map((c) => (
                    <Link
                      key={c.code}
                      to={`/visa?country=${c.code}`}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/60 transition-colors group"
                    >
                      <img
                        src={`https://flagcdn.com/w40/${c.code}.png`}
                        alt={`${c.name} flag`}
                        className="w-6 h-4 object-cover rounded-sm ring-1 ring-border shrink-0"
                        loading="lazy"
                      />
                      <span className="text-xs font-medium text-foreground group-hover:text-primary truncate">
                        {bn ? c.nameBn : c.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </Card>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Visa;