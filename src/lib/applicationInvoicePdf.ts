import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { apiClient } from "@/lib/api";

const fmt = (n: any) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const DEFAULT_COMPANY = {
  company_name: "Al Rawsha International",
  tagline: "Govt. Approved Recruiting Agency (RL-2902)",
  phone: "+880 1886-999465",
  phone2: "+880 1709-294065",
  email: "alrawshainternational@gmail.com",
  address: "Rupayan FPAB (Lift-07), Purana Paltan, Dhaka-1000, Bangladesh",
  website: "https://alrawshaintl.com",
  footer_text: "Thank you for choosing Al Rawsha International!",
  footer_contact:
    "This is a computer-generated invoice. For queries: +880 1886-999465 | alrawshainternational@gmail.com",
};

export async function downloadApplicationInvoice(idOrTracking: string) {
  const data = await apiClient.get(`/applications/${idOrTracking}/invoice`);
  const app = data.application || {};
  const customer = app.customer || {};
  const service = app.service || {};
  const payments = data.payments || [];
  const company = { ...DEFAULT_COMPANY, ...(data.company || {}) };

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(15, 27, 61); // navy
  doc.rect(0, 0, pageW, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(company.company_name, 14, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(company.tagline, 14, 20);
  doc.text(company.address, 14, 25.5);
  doc.text(`${company.phone} • ${company.email}`, 14, 30);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("INVOICE", pageW - 14, 18, { align: "right" });

  // Meta block
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(10);
  let y = 42;
  doc.setFont("helvetica", "bold");
  doc.text("Invoice #:", pageW - 60, y);
  doc.text("Date:", pageW - 60, y + 5);
  doc.text("Status:", pageW - 60, y + 10);
  doc.setFont("helvetica", "normal");
  doc.text(String(app.tracking_id || app.id || "-"), pageW - 14, y, { align: "right" });
  doc.text(new Date(app.created_at || Date.now()).toLocaleDateString(), pageW - 14, y + 5, {
    align: "right",
  });
  doc.text(String(app.status || "pending").toUpperCase(), pageW - 14, y + 10, { align: "right" });

  // Bill to
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(customer.full_name || "Guest", 14, y + 5);
  if (customer.phone) doc.text(String(customer.phone), 14, y + 10);
  if (customer.email) doc.text(String(customer.email), 14, y + 15);
  if (customer.address) doc.text(String(customer.address), 14, y + 20);

  // Service line items
  autoTable(doc, {
    startY: 72,
    head: [["Description", "Amount (BDT)"]],
    body: [
      [
        `${service.name_en || app.service_code || "Service"}${
          app.application_data?.destination ? ` — ${app.application_data.destination}` : ""
        }`,
        fmt(app.total_amount),
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [15, 27, 61], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 1: { halign: "right", cellWidth: 50 } },
  });

  let afterY = (doc as any).lastAutoTable.finalY + 6;

  // Totals
  const totalsRows: [string, string][] = [
    ["Total", fmt(app.total_amount)],
    ["Paid", fmt(app.paid_amount)],
    ["Due", fmt(app.due_amount ?? Number(app.total_amount || 0) - Number(app.paid_amount || 0))],
  ];
  autoTable(doc, {
    startY: afterY,
    body: totalsRows,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 1.5 },
    columnStyles: {
      0: { halign: "right", fontStyle: "bold", cellWidth: pageW - 14 - 50 - 14 },
      1: { halign: "right", cellWidth: 50, fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
  });
  afterY = (doc as any).lastAutoTable.finalY + 8;

  // Payments table
  if (payments.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Payment History", 14, afterY);
    autoTable(doc, {
      startY: afterY + 3,
      head: [["Date", "Method", "Ref", "Status", "Amount (BDT)"]],
      body: payments.map((p: any) => [
        new Date(p.paid_at || p.created_at).toLocaleDateString(),
        String(p.method_code || "-").toUpperCase(),
        p.transaction_ref || "-",
        String(p.status || "-").toUpperCase(),
        fmt(p.amount),
      ]),
      theme: "striped",
      headStyles: { fillColor: [15, 27, 61], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 2.5 },
      columnStyles: { 4: { halign: "right" } },
    });
    afterY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Footer
  const ph = doc.internal.pageSize.getHeight();
  doc.setDrawColor(200);
  doc.line(14, ph - 22, pageW - 14, ph - 22);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(company.footer_text, pageW / 2, ph - 16, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(company.footer_contact, pageW / 2, ph - 11, { align: "center" });

  doc.save(`invoice-${app.tracking_id || app.id}.pdf`);
}