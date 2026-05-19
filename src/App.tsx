import { lazy, Suspense } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import FacebookPixelProvider from "./components/FacebookPixelProvider";
import Index from "./pages/Index";

// Lazy load all non-homepage routes
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Packages = lazy(() => import("./pages/Packages"));
const PackageDetail = lazy(() => import("./pages/PackageDetail"));
const Hotels = lazy(() => import("./pages/Hotels"));
const HotelDetail = lazy(() => import("./pages/HotelDetail"));
const Booking = lazy(() => import("./pages/Booking"));
const TrackBooking = lazy(() => import("./pages/TrackBooking"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));
const InvoicePage = lazy(() => import("./pages/InvoicePage"));
const VerifyInvoice = lazy(() => import("./pages/VerifyInvoice"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsConditions = lazy(() => import("./pages/TermsConditions"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const UmrahGuide = lazy(() => import("./pages/UmrahGuide"));
const PaymentStatus = lazy(() => import("./pages/PaymentStatus"));
const Visa = lazy(() => import("./pages/Visa"));
const ServicesListPage = lazy(() => import("./pages/ServicesListPage"));
const ApplyPage = lazy(() => import("./pages/ApplyPage"));
const MyApplicationsPage = lazy(() => import("./pages/MyApplicationsPage"));

// Lazy load admin pages (heavy: recharts, xlsx, jspdf)
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
// New recruiting-platform admin pages (Phase 1 foundation)
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardNewPage"));
const AdminApplicationsPage = lazy(() => import("./pages/admin/AdminApplicationsPage"));
const AdminCustomersPage = lazy(() => import("./pages/admin/AdminCustomersNewPage"));
const AdminAgentsPage = lazy(() => import("./pages/admin/AdminAgentsPage"));
const AdminServicesPage = lazy(() => import("./pages/admin/AdminServicesPage"));
const AdminPaymentsPage = lazy(() => import("./pages/admin/AdminPaymentsNewPage"));
const AdminWalletsPage = lazy(() => import("./pages/admin/AdminWalletsPage"));
const AdminPaymentMethodsPage = lazy(() => import("./pages/admin/AdminPaymentMethodsNewPage"));
const AdminExpensesPage = lazy(() => import("./pages/admin/AdminExpensesPage"));
const AdminChartOfAccountsPage = lazy(() => import("./pages/admin/AdminChartOfAccountsNewPage"));
const AdminCmsPage = lazy(() => import("./pages/admin/AdminCmsNewPage"));
const AdminPlaceholderPage = lazy(() => import("./pages/admin/AdminPlaceholderPage"));
const AdminSettingsPage = lazy(() => import("./pages/admin/AdminSettingsPage"));
const AdminNotificationsPage = lazy(() => import("./pages/admin/AdminNotificationsPage"));
const AdminAuditLogsPage = lazy(() => import("./pages/admin/AdminAuditLogsPage"));
const AdminSecurityPage = lazy(() => import("./pages/admin/AdminSecurityPage"));
const AdminGuidePage = lazy(() => import("./pages/admin/AdminGuidePage"));
const AdminUserManager = lazy(() => import("./components/admin/AdminUserManager"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <FacebookPixelProvider />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/packages" element={<Packages />} />
            <Route path="/packages/:id" element={<PackageDetail />} />
            <Route path="/hotels" element={<Hotels />} />
            <Route path="/hotels/:id" element={<HotelDetail />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/track" element={<TrackBooking />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/invoice" element={<InvoicePage />} />
            <Route path="/verify/:invoiceNumber" element={<VerifyInvoice />} />
            <Route path="/verify" element={<VerifyInvoice />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-conditions" element={<TermsConditions />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/umrah-guide" element={<UmrahGuide />} />
            <Route path="/payment/:status" element={<PaymentStatus />} />
            <Route path="/visa" element={<Visa />} />
            <Route path="/services" element={<ServicesListPage />} />
            <Route path="/apply/:service" element={<ApplyPage />} />
            <Route path="/my" element={<MyApplicationsPage />} />

            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="applications" element={<AdminApplicationsPage />} />
              <Route path="customers" element={<AdminCustomersPage />} />
              <Route path="agents" element={<AdminAgentsPage />} />
              <Route path="services" element={<AdminServicesPage />} />
              <Route path="payments" element={<AdminPaymentsPage />} />
              <Route path="wallets" element={<AdminWalletsPage />} />
              <Route path="payment-methods" element={<AdminPaymentMethodsPage />} />
              <Route path="expenses" element={<AdminExpensesPage />} />
              <Route path="accounting" element={<AdminPlaceholderPage title="Accounting" description="Double-entry journal, P&L and trial balance arrive in Phase 3." />} />
              <Route path="chart-of-accounts" element={<AdminChartOfAccountsPage />} />
              <Route path="reports" element={<AdminPlaceholderPage title="Reports" description="Cashbook, P&L, agent statements and pipeline reports arrive in Phase 5." />} />
              <Route path="notifications" element={<AdminNotificationsPage />} />
              <Route path="cms" element={<AdminCmsPage />} />
              <Route path="users" element={<AdminUserManager />} />
              <Route path="audit-logs" element={<AdminAuditLogsPage />} />
              <Route path="security" element={<AdminSecurityPage />} />
              <Route path="guide" element={<AdminGuidePage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;
