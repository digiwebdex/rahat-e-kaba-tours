import { motion } from "framer-motion";
import { MapPin, Navigation } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useBulkSiteContent } from "@/hooks/useSiteContentProvider";

const DEFAULT_EMBED =
  "https://www.google.com/maps?q=Dhaka,Bangladesh&output=embed";
const DEFAULT_DIRECTIONS = "https://www.google.com/maps/dir/?api=1&destination=Dhaka,Bangladesh";

const GoogleMapSection = () => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const { data: content } = useBulkSiteContent("google_map");
  const lc = content?.[language];

  const heading = lc?.heading || (bn ? "আমাদের অবস্থান" : "Find Us On The Map");
  const description =
    lc?.description ||
    (bn
      ? "আমাদের অফিসে আসুন — সরাসরি কথা বলুন আমাদের ভিসা ও ওয়ার্ক পারমিট বিশেষজ্ঞদের সাথে।"
      : "Visit our office — speak directly with our visa and work-permit specialists.");
  const address = lc?.address || (bn ? "ঢাকা, বাংলাদেশ" : "Dhaka, Bangladesh");
  const directionsText = lc?.directions_text || (bn ? "দিকনির্দেশনা পান" : "Get Directions");
  const embedUrl = content?.embed_url || DEFAULT_EMBED;
  const directionsUrl = content?.directions_url || DEFAULT_DIRECTIONS;

  return (
    <section id="map" className="py-20 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-10"
        >
          <span className="inline-flex items-center gap-1.5 text-primary text-xs font-bold tracking-[0.25em] uppercase">
            <MapPin className="w-3.5 h-3.5" />
            {bn ? "অবস্থান" : "Location"}
          </span>
          <h2 className="font-heading text-3xl md:text-5xl font-extrabold text-foreground mt-3">
            {heading}
          </h2>
          <p className="text-muted-foreground mt-3 text-base md:text-lg">{description}</p>
          <div className="h-1 w-16 bg-gradient-to-r from-primary to-accent mx-auto mt-5 rounded-full" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative max-w-6xl mx-auto rounded-2xl overflow-hidden border border-border shadow-xl bg-card"
        >
          <div className="relative aspect-[16/9] md:aspect-[21/9] w-full bg-muted">
            <iframe
              src={embedUrl}
              title="Office location map"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
              className="absolute inset-0 w-full h-full border-0"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 md:p-6 border-t border-border bg-card">
            <div className="flex items-start gap-3 min-w-0">
              <span className="w-10 h-10 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {bn ? "ঠিকানা" : "Address"}
                </div>
                <div className="font-semibold text-foreground text-sm md:text-base break-words">
                  {address}
                </div>
              </div>
            </div>
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-5 py-2.5 text-sm font-semibold shadow-md transition-all shrink-0"
            >
              <Navigation className="w-4 h-4" />
              {directionsText}
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default GoogleMapSection;