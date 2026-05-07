export type VisaCountryInfo = {
  code: string;
  name: string;
  nameBn: string;
  duration: string;
  durationBn: string;
  price: string;
  validity: string;
  maxStay: string;
  entry: string;
  entryBn: string;
  type: string;
  typeBn: string;
};

export const VISA_COUNTRIES: VisaCountryInfo[] = [
  { code: "ph", name: "Philippines", nameBn: "ফিলিপাইন", duration: "7-10 days", durationBn: "৭-১০ দিন", price: "৳8,500", validity: "59 days", maxStay: "30 days", entry: "Single", entryBn: "একক", type: "Tourist", typeBn: "পর্যটন" },
  { code: "my", name: "Malaysia", nameBn: "মালয়েশিয়া", duration: "5-7 days", durationBn: "৫-৭ দিন", price: "৳5,500", validity: "90 days", maxStay: "30 days", entry: "Single", entryBn: "একক", type: "Tourist", typeBn: "পর্যটন" },
  { code: "th", name: "Thailand", nameBn: "থাইল্যান্ড", duration: "5-7 days", durationBn: "৫-৭ দিন", price: "৳6,500", validity: "90 days", maxStay: "60 days", entry: "Single", entryBn: "একক", type: "Tourist", typeBn: "পর্যটন" },
  { code: "jp", name: "Japan", nameBn: "জাপান", duration: "7-10 days", durationBn: "৭-১০ দিন", price: "৳9,500", validity: "90 days", maxStay: "30 days", entry: "Single", entryBn: "একক", type: "Tourist", typeBn: "পর্যটন" },
  { code: "kr", name: "South Korea", nameBn: "দক্ষিণ কোরিয়া", duration: "10-15 days", durationBn: "১০-১৫ দিন", price: "৳10,000", validity: "90 days", maxStay: "30 days", entry: "Single", entryBn: "একক", type: "Tourist", typeBn: "পর্যটন" },
  { code: "cn", name: "China", nameBn: "চীন", duration: "10-15 days", durationBn: "১০-১৫ দিন", price: "৳12,500", validity: "90 days", maxStay: "30 days", entry: "Single", entryBn: "একক", type: "Tourist", typeBn: "পর্যটন" },
  { code: "sg", name: "Singapore", nameBn: "সিঙ্গাপুর", duration: "3-5 days", durationBn: "৩-৫ দিন", price: "৳5,500", validity: "60 days", maxStay: "30 days", entry: "Single", entryBn: "একক", type: "Tourist", typeBn: "পর্যটন" },
  { code: "id", name: "Indonesia", nameBn: "ইন্দোনেশিয়া", duration: "3-5 days", durationBn: "৩-৫ দিন", price: "৳4,500", validity: "60 days", maxStay: "30 days", entry: "Single", entryBn: "একক", type: "Tourist", typeBn: "পর্যটন" },
  { code: "tr", name: "Turkey", nameBn: "তুরস্ক", duration: "10-15 days", durationBn: "১০-১৫ দিন", price: "৳8,000", validity: "180 days", maxStay: "30 days", entry: "Single", entryBn: "একক", type: "Tourist", typeBn: "পর্যটন" },
  { code: "gb", name: "United Kingdom", nameBn: "যুক্তরাজ্য", duration: "2-3 weeks", durationBn: "২-৩ সপ্তাহ", price: "৳10,000", validity: "6 months", maxStay: "180 days", entry: "Multiple", entryBn: "একাধিক", type: "Visitor", typeBn: "ভিজিটর" },
  { code: "ca", name: "Canada", nameBn: "কানাডা", duration: "20-30 days", durationBn: "২০-৩০ দিন", price: "৳20,000", validity: "10 years", maxStay: "180 days", entry: "Multiple", entryBn: "একাধিক", type: "Visitor", typeBn: "ভিজিটর" },
  { code: "us", name: "USA", nameBn: "যুক্তরাষ্ট্র", duration: "Interview based", durationBn: "ইন্টারভিউ ভিত্তিক", price: "৳10,000", validity: "10 years", maxStay: "180 days", entry: "Multiple", entryBn: "একাধিক", type: "B1/B2", typeBn: "বি১/বি২" },
  { code: "de", name: "Germany", nameBn: "জার্মানি", duration: "15-21 days", durationBn: "১৫-২১ দিন", price: "৳15,000", validity: "90 days", maxStay: "90 days", entry: "Single", entryBn: "একক", type: "Schengen", typeBn: "শেনজেন" },
  { code: "es", name: "Spain", nameBn: "স্পেন", duration: "15-21 days", durationBn: "১৫-২১ দিন", price: "৳14,000", validity: "90 days", maxStay: "90 days", entry: "Single", entryBn: "একক", type: "Schengen", typeBn: "শেনজেন" },
  { code: "nl", name: "Netherlands", nameBn: "নেদারল্যান্ডস", duration: "15-21 days", durationBn: "১৫-২১ দিন", price: "৳15,000", validity: "90 days", maxStay: "90 days", entry: "Single", entryBn: "একক", type: "Schengen", typeBn: "শেনজেন" },
  { code: "hk", name: "Hong Kong", nameBn: "হংকং", duration: "5-7 days", durationBn: "৫-৭ দিন", price: "৳6,000", validity: "90 days", maxStay: "30 days", entry: "Single", entryBn: "একক", type: "Tourist", typeBn: "পর্যটন" },
  { code: "lk", name: "Sri Lanka", nameBn: "শ্রীলঙ্কা", duration: "3-5 days", durationBn: "৩-৫ দিন", price: "৳4,000", validity: "30 days", maxStay: "30 days", entry: "Double", entryBn: "ডাবল", type: "ETA", typeBn: "ইটিএ" },
  { code: "au", name: "Australia", nameBn: "অস্ট্রেলিয়া", duration: "20-30 days", durationBn: "২০-৩০ দিন", price: "৳25,000", validity: "12 months", maxStay: "90 days", entry: "Multiple", entryBn: "একাধিক", type: "Visitor", typeBn: "ভিজিটর" },
];

export const findVisaCountry = (code: string | null | undefined) =>
  VISA_COUNTRIES.find((c) => c.code.toLowerCase() === (code || "").toLowerCase());