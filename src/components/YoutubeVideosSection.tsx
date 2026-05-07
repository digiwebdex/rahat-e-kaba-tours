import { motion } from "framer-motion";
import { Play, Youtube, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useBulkSiteContent } from "@/hooks/useSiteContentProvider";

type Video = {
  id: string;
  titleEn: string;
  titleBn: string;
};

const VIDEOS: Video[] = [
  { id: "dQw4w9WgXcQ", titleEn: "Process Your Work Permit From Al Rawsha", titleBn: "আল রওশা থেকে ওয়ার্ক পারমিট প্রসেস" },
  { id: "9bZkp7q19f0", titleEn: "Vietnam & Kuwait Job Opportunities", titleBn: "ভিয়েতনাম ও কুয়েত চাকরির সুযোগ" },
  { id: "kJQP7kiw5Fk", titleEn: "What Customers Say?", titleBn: "গ্রাহকরা কী বলেন?" },
  { id: "L_jWHffIx5E", titleEn: "Visa Application Step by Step", titleBn: "ভিসা আবেদনের ধাপ" },
];

const DEFAULT_CHANNEL_URL = "https://www.youtube.com/@alrawshaint";
const DEFAULT_CHANNEL_HANDLE = "@alrawshaint";

const YoutubeVideosSection = () => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const [playing, setPlaying] = useState<string | null>(null);
  const { data: content } = useBulkSiteContent("youtube_videos");
  const lc = content?.[language];

  const heading = lc?.heading || (bn ? "আমাদের সর্বশেষ ভিডিও" : "Watch Our Latest Videos");
  const description = lc?.description || (bn ? "ভ্রমণ টিপস, ভিসা আপডেট ও গ্রাহকদের গল্প — আমাদের ইউটিউব চ্যানেল থেকে" : "Travel tips, visa updates and customer stories from our YouTube channel");
  const channelUrl = content?.channel_url || DEFAULT_CHANNEL_URL;
  const channelHandle = content?.channel_handle || DEFAULT_CHANNEL_HANDLE;
  const channelLabel = lc?.channel_label || (bn ? "ইউটিউব চ্যানেল" : "Youtube Channel");
  const ctaText = lc?.cta_text || (bn ? "আমাদের ইউটিউব চ্যানেল ভিজিট করুন" : "Visit Our YouTube Channel");
  const videos = (lc?.videos && Array.isArray(lc.videos) && lc.videos.length > 0)
    ? lc.videos.map((v: any) => ({ id: v.id, title: v.title }))
    : VIDEOS.map((v) => ({ id: v.id, title: bn ? v.titleBn : v.titleEn }));

  return (
    <section id="videos" className="py-20 md:py-24 bg-secondary/40">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-10"
        >
          <h2 className="font-heading text-3xl md:text-5xl font-extrabold text-foreground">{heading}</h2>
          <p className="text-muted-foreground mt-3 text-base md:text-lg">{description}</p>
          <div className="h-1 w-16 bg-gradient-to-r from-primary to-accent mx-auto mt-5 rounded-full" />

          <a
            href={channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-6 bg-card border border-border rounded-full px-4 py-2 text-sm font-medium hover:border-primary/40 hover:shadow-md transition-all"
          >
            <span className="w-7 h-7 rounded-full bg-[#FF0000] text-white flex items-center justify-center">
              <Youtube className="w-4 h-4" />
            </span>
            <span className="text-left leading-tight">
              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                {channelLabel}
              </span>
              <span className="block font-semibold text-foreground">{channelHandle}</span>
            </span>
          </a>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 max-w-6xl mx-auto">
          {videos.map((v: any, i: number) => {
            const isPlaying = playing === v.id;
            return (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="bg-card rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-lg transition-all"
              >
                <div className="relative aspect-video bg-black">
                  {isPlaying ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${v.id}?autoplay=1`}
                      title={v.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPlaying(v.id)}
                      className="group absolute inset-0 w-full h-full"
                      aria-label={`Play ${v.title}`}
                    >
                      <img
                        src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`}
                        alt={v.title}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#FF0000] text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-6 h-6 md:w-7 md:h-7 fill-white ml-0.5" />
                        </span>
                      </div>
                    </button>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm text-foreground line-clamp-2">
                    {v.title}
                  </h3>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <a
            href={channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 py-3 font-semibold shadow-md transition-all"
          >
            {ctaText}
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default YoutubeVideosSection;