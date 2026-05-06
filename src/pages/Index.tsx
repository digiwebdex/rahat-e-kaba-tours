import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ServicesSection from "@/components/ServicesSection";
import OpenPositionsSection from "@/components/OpenPositionsSection";
import FacilitiesSection from "@/components/FacilitiesSection";
import ProcessTimeline from "@/components/ProcessTimeline";
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
          description="Al Rawsha International — Fiji Work Permit Visa, Student Consultancy, Air Tickets & Visa Support. BMET-approved legal recruitment from Bangladesh."
          keywords="Al Rawsha International, Fiji work permit, BMET approved, student consultancy Bangladesh, overseas jobs, work visa Fiji, study abroad, Hajj Umrah"
          jsonLd={organizationJsonLd()}
        />
        <Navbar />
        <HeroSection />
        <ServicesSection />
        <OpenPositionsSection />
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
