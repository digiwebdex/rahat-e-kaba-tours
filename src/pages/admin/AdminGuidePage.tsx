import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Download, BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Section {
  id: string;
  title: string;
  titleBn: string;
  badge?: string;
  intro: string;
  steps: { title: string; detail: string }[];
  tips?: string[];
}

const SECTIONS: Section[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    titleBn: "শুরু করার পদ্ধতি",
    badge: "Basics",
    intro: "Al Rawsha International ERP — overseas worker recruitment + travel management platform। Admin Panel এ login করার পর Dashboard থেকে সব module access করা যায়। এই guide আপনাকে entry থেকে finish পর্যন্ত পুরো workflow দেখাবে।",
    steps: [
      { title: "Step 1 — Login", detail: "Browser এ /admin route এ যান। Admin Email + Password দিন। 2FA enabled থাকলে SMS OTP বা Google Authenticator code দিন।" },
      { title: "Step 2 — Dashboard Overview", detail: "Total bookings, total revenue, due amount, wallet balances, recent activity, KPI cards, monthly chart দেখা যাবে।" },
      { title: "Step 3 — Sidebar Navigation", detail: "Finance (Payments, Settlements, Accounting, Ledger, Receivables, Due Alerts, Refunds), Reports, Analytics, Calculator। Tools section এ Payment Methods, Notifications, CMS, SEO, Bulk Import, Audit Logs, Security, User Guide, Settings।" },
      { title: "Step 4 — Language Toggle", detail: "Top-right এ EN/বাংলা switch — পুরো UI bilingual। Noto Sans Bengali font auto load।" },
      { title: "Step 5 — Profile & Logout", detail: "Top-right avatar → Profile/Password Change/Logout।" },
    ],
    tips: ["Primary admin role delete করা যায় না (DB trigger protected)।", "Session timeout 30 minutes — inactivity তে auto logout।", "Public registration disabled — শুধু admin user provision করতে পারে।"],
  },
  {
    id: "bookings",
    title: "Booking Management",
    titleBn: "বুকিং ব্যবস্থাপনা",
    badge: "Core",
    intro: "Work Permit, Visa, Air Ticket — সব ধরনের overseas service booking এখানে create, edit, track করুন। প্রতিটা booking এর tracking ID auto-generate হয় (TT-XXXX)।",
    steps: [
      { title: "Step 1 — Open Bookings Module", detail: "Sidebar → Bookings। সব active booking list, filter (status/country/date), search by tracking ID/name/phone।" },
      { title: "Step 2 — Create Booking", detail: "Top-right 'Create Booking'। Service Type (Work Permit/Visa/Ticket), Country, Customer (existing search বা new add), Package দিন।" },
      { title: "Step 3 — Customer Selection", detail: "Phone/Name দিয়ে existing customer search। না থাকলে inline 'Add New Customer' — Name, Phone (unique), Email, NID, Address।" },
      { title: "Step 4 — Service Details", detail: "Country, Job Position, Salary, Contract Duration, Departure Date, Visa Type — সব fill করুন।" },
      { title: "Step 5 — Financial Setup", detail: "Total Amount, Advance/Initial Payment, Payment Method, Wallet select। Installment schedule generate করতে পারেন (3-12 months)।" },
      { title: "Step 6 — Middleman & Supplier", detail: "Middleman (group leader/agent) assign করুন। Supplier Agent (visa processor/airline) link করুন। এদের commission/due auto track হবে।" },
      { title: "Step 7 — Document Upload", detail: "Passport copy, NID, Photo, Medical, Police Clearance — সব upload। DOCUMENT_TYPE_ALIASES এ missing detect হয়।" },
      { title: "Step 8 — Save & Tracking ID", detail: "Save করলে TT-XXXX tracking ID generate হবে। Customer কে SMS/Email auto যাবে।" },
      { title: "Step 9 — Status Flow", detail: "Pending → Confirmed → In Progress → Completed। প্রতি stage এ notification trigger।" },
      { title: "Step 10 — Edit / Cancel", detail: "Edit anytime। Cancel করলে financial calculation থেকে exclude, refund flow trigger।" },
    ],
    tips: ["Soft delete only — booking 'deleted' status এ যায়, hard delete হয় না।", "Guest booking auto Middleman 'Manasik Travel Hub' এ assigned হয়।", "Cancelled bookings সব revenue/due calculation থেকে exclude।"],
  },
  {
    id: "customers",
    title: "Customer Management",
    titleBn: "কাস্টমার ব্যবস্থাপনা",
    badge: "Core",
    intro: "Customer profiles, contact info, booking history, due payments — এক জায়গায়। Phone number primary identifier।",
    steps: [
      { title: "Step 1 — Open Customers", detail: "Sidebar → Customers। সব customer list, total bookings, due amount preview।" },
      { title: "Step 2 — Add Customer", detail: "'Add Customer' → Name, Phone (unique, '880' auto prefix), Email, NID, Passport, Address, Date of Birth।" },
      { title: "Step 3 — View Profile", detail: "Customer row click → full profile, booking history, payment timeline, due summary, document downloads।" },
      { title: "Step 4 — Edit / Merge", detail: "Edit info anytime। Duplicate detected হলে merge prompt আসবে (phone match)।" },
      { title: "Step 5 — Financial Report", detail: "Profile এ Customer Financial Report → date range, all transactions, PDF export।" },
      { title: "Step 6 — Communication", detail: "Filter করে bulk SMS/Email। Individual SMS profile থেকে।" },
    ],
    tips: ["OTP login এর সময় phone দিয়ে existing guest profile auto-link হয়।", "Phone number সব জায়গায় '+880' format এ normalize হয়।"],
  },
  {
    id: "packages",
    title: "Package & Hotel Setup",
    titleBn: "প্যাকেজ ও হোটেল সেটআপ",
    badge: "Catalog",
    intro: "Country-wise work permit packages, Job categories, pricing — public website এ Now Hiring section এ এগুলোই দেখা যায়।",
    steps: [
      { title: "Step 1 — Open Packages", detail: "Sidebar → Packages। Country-wise list (Vietnam, Kuwait, Laos, Serbia, Russia, Singapore, Poland)।" },
      { title: "Step 2 — Create Package", detail: "'Create Package' → Country, Job Title, Salary Range, Contract Duration, Processing Time, Description, Inclusions, Images, Expiry date।" },
      { title: "Step 3 — Banner Image", detail: "Country-specific banner image upload (1600×640 recommended, worker-themed)।" },
      { title: "Step 4 — Requirements", detail: "Age range, Experience, Skills, Documents required — checklist add করুন।" },
      { title: "Step 5 — SEO", detail: "প্রতি package এর meta title, description, og-image, slug set করুন।" },
      { title: "Step 6 — Publish / Auto Expiry", detail: "Status Active করে publish। Expiry date পেরোলে package status auto 'inactive' হবে।" },
    ],
  },
  {
    id: "payments",
    title: "Payments & Wallets",
    titleBn: "পেমেন্ট ও ওয়ালেট",
    badge: "Finance",
    intro: "Customer payments, Middleman payments, Supplier payments, commission — সব Cash/Bank/bKash/Nagad wallet এর সাথে linked। Double-entry ledger এ auto post হয়।",
    steps: [
      { title: "Step 1 — Open Payments", detail: "Sidebar → Payments। Tabs: Customer / Middleman / Supplier — প্রতিটায় separate listing।" },
      { title: "Step 2 — Add New Payment", detail: "'Add Payment' → Payment Type select (Customer/Middleman/Supplier)।" },
      { title: "Step 3 — Customer Payment", detail: "Search by Tracking ID/Name/Phone → Booking select → Service Type → Amount, Method, Wallet (mandatory), Date।" },
      { title: "Step 4 — Middleman Payment", detail: "Middleman select → Booking (optional, FIFO advance distribution) → Amount, Method, Wallet, Date। Receipt upload।" },
      { title: "Step 5 — Supplier Payment", detail: "Supplier Agent select → Booking (any global booking) → Amount, Method, Wallet, Date।" },
      { title: "Step 6 — Receipt & Notes", detail: "Bank transfer হলে proof file upload mandatory। Notes এ reference details।" },
      { title: "Step 7 — Save & Auto Update", detail: "Save করলে wallet balance auto update, ledger entry post, customer/middleman/supplier due recalculate, SMS receipt auto যায়।" },
      { title: "Step 8 — Online Payment", detail: "Customer Dashboard / TrackBooking page থেকে SSLCommerz দিয়ে directly pay করতে পারে। IPN + val_id validation auto।" },
      { title: "Step 9 — Edit / Delete", detail: "Edit/Delete করলে wallet & ledger auto reverse + reapply।" },
      { title: "Step 10 — Refund", detail: "Refunds module → Booking select, refund amount, wallet। Booking auto-cancelled হবে।" },
    ],
    tips: ["Bank transfer এর জন্য proof file mandatory।", "Wallet balance insufficient হলে payment block হবে (DB trigger)।", "Cancelled records সব calculation থেকে exclude।"],
  },
  {
    id: "moallem",
    title: "Middleman Management",
    titleBn: "মিডলম্যান ব্যবস্থাপনা",
    badge: "Operations",
    intro: "Middleman (group leader / local agent) profiles, candidate count, advance payments, commission tracking।",
    steps: [
      { title: "Step 1 — Open Middlemen", detail: "Sidebar → Middlemen। List with total candidates, total advance, due summary।" },
      { title: "Step 2 — Add Middleman", detail: "'Add Middleman' → Name, Phone, NID, Address, Bank info (optional)।" },
      { title: "Step 3 — Profile View", detail: "Profile click → assigned candidates list, payment timeline, advance balance, commission summary।" },
      { title: "Step 4 — Assign to Booking", detail: "Booking create/edit এর সময় Middleman select করলে candidate count auto-update।" },
      { title: "Step 5 — Advance Payment", detail: "Middleman থেকে advance নিলে Payments module → Middleman tab → record করুন। FIFO basis এ booking এ auto-distribute হবে।" },
      { title: "Step 6 — Commission Settlement", detail: "Booking complete হলে commission calculate, Settlements module থেকে payout record করুন।" },
    ],
    tips: ["Candidate count dynamic — booking add/cancel এ auto recalculate।", "Guest bookings default 'Manasik Travel Hub' Middleman এ assigned।"],
  },
  {
    id: "suppliers",
    title: "Supplier Agents",
    titleBn: "সাপ্লায়ার এজেন্ট",
    badge: "Operations",
    intro: "Visa processor, Air ticket agent, Medical center, Embassy agent — supplier agents এবং তাদের payments track করুন।",
    steps: [
      { title: "Step 1 — Open Supplier Agents", detail: "Sidebar → Supplier Agents। List view with type filter।" },
      { title: "Step 2 — Add Agent", detail: "'Add Agent' → Name, Type (Visa/Air/Medical/Embassy), Contact, Address, Bank info।" },
      { title: "Step 3 — Contracts", detail: "Profile → Contracts tab। Long-term contract create — total amount, paid, due track। Items add করতে পারবেন।" },
      { title: "Step 4 — Link to Booking", detail: "Booking create এর সময় Supplier Agent assign — supplier due auto calculate।" },
      { title: "Step 5 — Payment", detail: "Payments → Supplier tab → Agent select → Booking (any) → Amount, Wallet। Wallet থেকে auto deduct।" },
      { title: "Step 6 — Profile Report", detail: "Agent profile → full transaction history, contract status, due summary, PDF export।" },
    ],
  },
  {
    id: "tickets-visa",
    title: "Tickets, Visa & Work Permit",
    titleBn: "টিকেট, ভিসা ও ওয়ার্ক পারমিট",
    badge: "Service",
    intro: "Standalone air ticket booking, visa application service, work permit processing — সব services management।",
    steps: [
      { title: "Step 1 — Ticket Booking", detail: "Tickets → New। Passenger, PNR, Route, Airline, Departure, Cost (our), Billing (customer), Profit auto-calc।" },
      { title: "Step 2 — Ticket Refund", detail: "Ticket Refunds → ticket select, refund amount, our charge vs customer charge difference = profit।" },
      { title: "Step 3 — Visa Application", detail: "Visa → New। Country, Visa Type, Customer, Cost, Billing। Status track: Applied → Processing → Approved/Rejected।" },
      { title: "Step 4 — Work Permit", detail: "Work Permit → New। Country, Job Position, Salary, Contract, Customer, Middleman, Supplier, Cost, Billing।" },
      { title: "Step 5 — Invoice & PDF", detail: "Auto invoice numbers — TKT, VS, WP, RFN prefix। PDF download with company signature।" },
      { title: "Step 6 — Customer Tracking", detail: "Customer public link থেকে status track করতে পারে (no login)।" },
    ],
  },
  {
    id: "accounting",
    title: "Accounting & Reports",
    titleBn: "একাউন্টিং ও রিপোর্ট",
    badge: "Finance",
    intro: "Double-entry master ledger, Chart of accounts, Daily cashbook, Expenses, Financial summary, P&L, Receivables, Settlements।",
    steps: [
      { title: "Step 1 — Chart of Accounts", detail: "Accounting → Chart of Accounts। Income, Expense, Asset (Cash/Bank/bKash/Nagad wallets), Liability accounts manage।" },
      { title: "Step 2 — Daily Cashbook", detail: "Accounting → Daily Cashbook। প্রতিদিনের income/expense entry → wallet & ledger auto update।" },
      { title: "Step 3 — Expense Entry", detail: "Office rent, salary, marketing, utility, fuel — category select → amount, wallet → save।" },
      { title: "Step 4 — Ledger View", detail: "Ledger module → all journal entries, debit/credit, account-wise filter, date range, PDF export।" },
      { title: "Step 5 — Receivables", detail: "Receivables module → all due customers, aging buckets (0-30, 31-60, 60+), follow-up।" },
      { title: "Step 6 — Settlements", detail: "Middleman/Supplier settlement payouts। Period select → calculate due → settle।" },
      { title: "Step 7 — Reports", detail: "Reports module → date range → Income, Expense, Profit, Customer-wise, Booking-wise, Country-wise। Excel/PDF export।" },
      { title: "Step 8 — Analytics", detail: "Analytics page → KPI charts, monthly trends, country-wise revenue, top customers।" },
      { title: "Step 9 — Wallet Recalc", detail: "Settings → Recalculate Wallet Balances (গরমিল হলে use করুন)। Manual ledger reconciliation।" },
    ],
    tips: ["Cancelled bookings সব calculation থেকে exclude।", "প্রতি transaction master ledger এ যায় — full audit trail।", "Wallet balance DB trigger maintained — direct edit নিষেধ।"],
  },
  {
    id: "cms",
    title: "Website CMS",
    titleBn: "ওয়েবসাইট কন্টেন্ট",
    badge: "Marketing",
    intro: "Homepage hero, Now Hiring section, About, Contact, Privacy, Terms, Refund policy, Blog — public site এর সব content edit।",
    steps: [
      { title: "Step 1 — Open CMS", detail: "Sidebar → CMS। Tabs: Hero / Sections / Pages / Blog / Footer।" },
      { title: "Step 2 — Hero Banners", detail: "Hero slider banners — 16:9 ratio recommended, max 3 active। Image, title, subtitle, CTA link।" },
      { title: "Step 3 — Country Cards", detail: "Now Hiring section country images update (1600×640, worker-themed)।" },
      { title: "Step 4 — Pages", detail: "About, Contact, Privacy, Terms, Refund — rich text editor + version history।" },
      { title: "Step 5 — Blog", detail: "CMS → Blog → New post। Title, slug, content, featured image, SEO meta।" },
      { title: "Step 6 — Section Visibility", detail: "Settings → Section Visibility। Homepage এর কোন section show/hide।" },
      { title: "Step 7 — Footer & SEO", detail: "Footer contact, social links। SEO page → site-wide meta, og-image, favicon, sitemap regenerate।" },
    ],
    tips: ["শুধু admin/cms_manager role এর CMS access আছে।", "Version history থেকে previous content restore করতে পারবেন।"],
  },
  {
    id: "notifications",
    title: "Notifications & Alerts",
    titleBn: "নোটিফিকেশন ও অ্যালার্ট",
    badge: "Automation",
    intro: "SMS (BulkSMSBD), Email, in-app notifications। Auto due reminder cron। Customer OTP login।",
    steps: [
      { title: "Step 1 — Notification Center", detail: "Sidebar → Notifications → সব sent SMS/Email log। Filter by type/date/recipient।" },
      { title: "Step 2 — Settings", detail: "Notification Settings → SMS template edit, sender ID, isSmsAccepted toggle।" },
      { title: "Step 3 — Due Alerts", detail: "Due Alerts → upcoming due, overdue customers list, aging। Manual SMS / Bulk SMS পাঠাতে পারবেন।" },
      { title: "Step 4 — Auto Reminder Cron", detail: "Daily 09:30 AM Asia/Dhaka — 3 days before due, on due day, 3 days late, 7 days late SMS auto যায়।" },
      { title: "Step 5 — Manual Trigger", detail: "Security page থেকে Test Run করতে পারবেন (cron simulate)।" },
      { title: "Step 6 — OTP Login", detail: "Customer phone OTP দিয়ে login → guest profile auto-link।" },
    ],
    tips: ["Phone numbers '880' prefix এ auto normalize।", "isSmsAccepted parser respect করে — opt-out customers কে SMS যাবে না।"],
  },
  {
    id: "security",
    title: "Security & 2FA",
    titleBn: "সিকিউরিটি ও টু-ফ্যাক্টর",
    badge: "Security",
    intro: "Admin account এর জন্য SMS OTP বা TOTP (Google Authenticator) 2FA enable করুন। Audit logs এ full trail।",
    steps: [
      { title: "Step 1 — Open Security", detail: "Sidebar → Security & 2FA।" },
      { title: "Step 2 — Enable SMS 2FA", detail: "SMS 2FA → Phone দিয়ে enable → OTP verify। Login এর সময় OTP automatically যাবে।" },
      { title: "Step 3 — Enable TOTP", detail: "TOTP Setup → QR code scan with Google Authenticator/Authy → 6-digit code confirm → backup codes save।" },
      { title: "Step 4 — Password Change", detail: "Profile → Change Password (bcryptjs hashed)। Strong password enforced।" },
      { title: "Step 5 — Audit Logs", detail: "Audit Logs page এ সব admin action — who, what, when, IP, before/after diff।" },
      { title: "Step 6 — Role Management", detail: "Settings → Users → Role assign (admin, accountant, cms_manager, support)। Strict RBAC।" },
    ],
    tips: ["Primary admin role delete করা যায় না (DB trigger blocked)।", "Public registration disabled — শুধু admin user provision করতে পারে।", "Session timeout 30 min inactivity।"],
  },
  {
    id: "bulk-import",
    title: "Bulk Import & Backup",
    titleBn: "বাল্ক ইম্পোর্ট ও ব্যাকআপ",
    badge: "Tools",
    intro: "Excel/CSV থেকে bulk booking/customer import এবং dual-layer database backup/restore।",
    steps: [
      { title: "Step 1 — Bulk Import", detail: "Sidebar → Bulk Import → Template download (Customer/Booking) → fill করে upload → preview validation → confirm import।" },
      { title: "Step 2 — Validation Errors", detail: "Preview page এ row-wise error highlight। Fix করে re-upload।" },
      { title: "Step 3 — Database Backup", detail: "Settings → Backup & Restore → Manual download (.sql / .json)। Auto Google Drive daily backup configured।" },
      { title: "Step 4 — Restore", detail: "Backup file upload → strict table order মেনে restore হবে (FK constraint respected)। Production এ careful।" },
      { title: "Step 5 — VPS File Backup", detail: "Server uploads /server/uploads/ directory regular backup recommended।" },
    ],
    tips: ["Restore destructive — current data overwrite হবে। আগে current backup নিয়ে রাখুন।"],
  },
  {
    id: "settings-deployment",
    title: "Settings & Deployment",
    titleBn: "সেটিংস ও ডিপ্লয়মেন্ট",
    badge: "Admin",
    intro: "Site-wide settings, payment methods, signature, PDF config, deployment standard procedure।",
    steps: [
      { title: "Step 1 — Payment Methods", detail: "Tools → Payment Methods। Cash/Bank/bKash/Nagad/SSLCommerz enable, wallet mapping mandatory।" },
      { title: "Step 2 — PDF Settings", detail: "Settings → PDF Config। Company name, address, logo, A4 sizing।" },
      { title: "Step 3 — Signature", detail: "Settings → Authorized Signatures। Upload signature image — invoice/PDF এ auto include।" },
      { title: "Step 4 — Brand & SEO", detail: "Settings → Brand Identity। Tracking ID prefix (TT-), contact info, social links।" },
      { title: "Step 5 — Deployment", detail: "VPS standard procedure: cd /var/www/alrawsha && git pull origin main && npm install && npm run build && pm2 reload all && pm2 save।" },
      { title: "Step 6 — DB Access", detail: "PSQL local PostgreSQL port 5433। Safe updates enforced (WHERE clause mandatory)।" },
    ],
    tips: [".env file git থেকে protected (skip-worktree)।", "Database URL password URL-encoded।"],
  },
];

const AdminGuidePage = () => {
  const [generating, setGenerating] = useState(false);

  const downloadPdf = async () => {
    setGenerating(true);
    try {
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      let y = 20;

      // Cover
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, pageW, 60, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(26).setFont("helvetica", "bold");
      pdf.text("Admin User Guide", pageW / 2, 30, { align: "center" });
      pdf.setFontSize(13).setFont("helvetica", "normal");
      pdf.text("Al Rawsha International — Travel Management ERP", pageW / 2, 42, { align: "center" });
      pdf.setFontSize(9);
      pdf.text(`Generated: ${new Date().toLocaleDateString("en-GB")}`, pageW / 2, 50, { align: "center" });

      pdf.setTextColor(30, 30, 30);
      y = 75;
      pdf.setFontSize(14).setFont("helvetica", "bold");
      pdf.text("Table of Contents", 15, y);
      y += 8;
      pdf.setFontSize(10).setFont("helvetica", "normal");
      SECTIONS.forEach((s, i) => {
        pdf.text(`${i + 1}. ${s.title}`, 18, y);
        y += 6;
      });

      // Sections
      SECTIONS.forEach((s, idx) => {
        pdf.addPage();
        y = 20;
        // Header bar
        pdf.setFillColor(15, 23, 42);
        pdf.rect(0, 0, pageW, 14, "F");
        pdf.setTextColor(255, 255, 255).setFontSize(10).setFont("helvetica", "bold");
        pdf.text(`Section ${idx + 1}`, 15, 9);
        pdf.text("Al Rawsha International Admin Guide", pageW - 15, 9, { align: "right" });

        pdf.setTextColor(15, 23, 42);
        pdf.setFontSize(18).setFont("helvetica", "bold");
        pdf.text(`${idx + 1}. ${s.title}`, 15, y + 5);
        pdf.setFontSize(11).setFont("helvetica", "italic").setTextColor(100, 100, 100);
        pdf.text(s.titleBn, 15, y + 12);
        y += 22;

        pdf.setFontSize(10).setFont("helvetica", "normal").setTextColor(40, 40, 40);
        const introLines = pdf.splitTextToSize(s.intro, pageW - 30);
        pdf.text(introLines, 15, y);
        y += introLines.length * 5 + 4;

        autoTable(pdf, {
          startY: y,
          head: [["#", "Step", "Details"]],
          body: s.steps.map((st, i) => [i + 1, st.title, st.detail]),
          theme: "striped",
          headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 10 },
          bodyStyles: { fontSize: 9, cellPadding: 3 },
          columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 40, fontStyle: "bold" }, 2: { cellWidth: "auto" } },
          margin: { left: 15, right: 15 },
        });

        y = (pdf as any).lastAutoTable.finalY + 6;

        if (s.tips?.length) {
          if (y > pageH - 40) { pdf.addPage(); y = 20; }
          pdf.setFillColor(254, 243, 199);
          pdf.setDrawColor(251, 191, 36);
          const tipsHeight = s.tips.length * 5 + 10;
          pdf.roundedRect(15, y, pageW - 30, tipsHeight, 2, 2, "FD");
          pdf.setFontSize(10).setFont("helvetica", "bold").setTextColor(120, 53, 15);
          pdf.text("💡 Tips", 20, y + 6);
          pdf.setFontSize(9).setFont("helvetica", "normal").setTextColor(80, 50, 10);
          s.tips.forEach((t, i) => {
            pdf.text(`• ${t}`, 20, y + 12 + i * 5);
          });
        }
      });

      // Footer page numbers
      const total = pdf.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8).setTextColor(120, 120, 120);
        pdf.text(`Page ${i} of ${total}`, pageW / 2, pageH - 8, { align: "center" });
      }

      pdf.save(`TripTastic-Admin-Guide-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("PDF downloaded");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" /> Admin User Guide
          </h1>
          <p className="text-muted-foreground mt-1">
            Al Rawsha International ERP — সম্পূর্ণ admin manual। প্রতিটা module কীভাবে use করবেন step-by-step।
          </p>
        </div>
        <Button onClick={downloadPdf} disabled={generating} size="lg">
          {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Download PDF
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Table of Contents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {SECTIONS.map((s, i) => (
              <a key={s.id} href={`#${s.id}`} className="text-sm hover:text-primary hover:underline">
                {i + 1}. {s.title} <span className="text-muted-foreground text-xs">— {s.titleBn}</span>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      <Accordion type="multiple" defaultValue={SECTIONS.map((s) => s.id)} className="space-y-3">
        {SECTIONS.map((s, idx) => (
          <AccordionItem key={s.id} value={s.id} id={s.id} className="border rounded-lg bg-card px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 text-left">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {idx + 1}
                </span>
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {s.title}
                    {s.badge && <Badge variant="secondary" className="text-[10px]">{s.badge}</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground font-normal">{s.titleBn}</div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{s.intro}</p>
              <div className="space-y-2">
                {s.steps.map((st, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-md bg-muted/40">
                    <span className="flex-shrink-0 h-6 w-6 rounded bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div className="text-sm">
                      <div className="font-semibold">{st.title}</div>
                      <div className="text-muted-foreground mt-0.5">{st.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
              {s.tips?.length ? (
                <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3">
                  <div className="text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">💡 Tips</div>
                  <ul className="space-y-1">
                    {s.tips.map((t, i) => (
                      <li key={i} className="text-xs text-amber-900 dark:text-amber-200">• {t}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default AdminGuidePage;
