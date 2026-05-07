import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ServicesSection from "@/components/ServicesSection";
import OpenPositionsSection from "@/components/OpenPositionsSection";
import FacilitiesSection from "@/components/FacilitiesSection";
import ProcessTimeline from "@/components/ProcessTimeline";
import VisaServicesSection from "@/components/VisaServicesSection";
import StudentConsultancySection from "@/components/StudentConsultancySection";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import BackToTop from "@/components/BackToTop";
import SEOHead, { organizationJsonLd } from "@/components/SEOHead";
import { SiteContentProvider } from "@/hooks/useSiteContentProvider";

const ContactSection = lazy(() => import("@/components/ContactSection"));
const AboutSection = lazy(() => import("@/components/AboutSection"));

const SectionFallback = () => <div className="py-20" />;

const Index = () => {
  return (
    <SiteContentProvider>
      <div className="min-h-screen bg-background">
        <SEOHead
          canonicalUrl="/"
          title="Overseas Work Permit, Air Tickets & Visa"
          description="BMET-approved (RL-2902) recruiting agency. Legal overseas work permits, air tickets & visa support — Vietnam, Kuwait, Laos, Serbia, Russia."
          keywords="Al Rawsha International, RL-2902, overseas work permit, BMET approved, work visa Vietnam, Kuwait delivery man, Laos construction, Serbia agriculture, Russia work visa, air tickets Bangladesh, visa support"
          jsonLd={organizationJsonLd()}
        />
        <Navbar />
        <HeroSection />
        <ServicesSection />
        <OpenPositionsSection />
        <VisaServicesSection />
        <FacilitiesSection />
        <ProcessTimeline />
        {/* <StudentConsultancySection /> — disabled */}
        <Suspense fallback={<SectionFallback />}>
          <AboutSection />
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <ContactSection />
        </Suspense>
        <Footer />
        <WhatsAppFloat />
        <BackToTop />
      </div>
    </SiteContentProvider>
  );
};

export default Index;
