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
  const pageH = doc.internal.pageSize.getHeight();
  const M = 16; // margin

  // ===== Clean modern header: thin accent + brand block =====
  doc.setFillColor(15, 27, 61);
  doc.rect(0, 0, pageW, 4, "F"); // thin top accent

  doc.setTextColor(15, 27, 61);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(company.company_name, M, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(110, 110, 120);
  doc.text(company.tagline, M, 23.5);
  doc.text(company.address, M, 28);
  doc.text(`${company.phone} • ${company.email}`, M, 32.5);

  // Invoice block right
  doc.setTextColor(15, 27, 61);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("INVOICE", pageW - M, 20, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(110, 110, 120);
  const invNo = String(app.tracking_id || app.id || "-");
  const invDate = new Date(app.created_at || Date.now()).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  doc.text(`No. ${invNo}`, pageW - M, 26, { align: "right" });
  doc.text(invDate, pageW - M, 30.5, { align: "right" });

  // Status pill
  const status = String(app.status || "pending").toUpperCase();
  const statusColors: Record<string, [number, number, number]> = {
    PAID: [34, 139, 87],
    APPROVED: [34, 139, 87],
    PENDING: [205, 145, 30],
    CANCELLED: [180, 60, 60],
    REJECTED: [180, 60, 60],
  };
  const [sr, sg, sb] = statusColors[status] || [90, 90, 110];
  doc.setFillColor(sr, sg, sb);
  const stW = doc.getTextWidth(status) + 6;
  doc.roundedRect(pageW - M - stW, 33.5, stW, 5.5, 1.4, 1.4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(status, pageW - M - stW / 2, 37.4, { align: "center" });

  // Divider
  doc.setDrawColor(230, 232, 238);
  doc.setLineWidth(0.3);
  doc.line(M, 44, pageW - M, 44);

  // ===== Bill To / Service info =====
  let y = 52;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(140, 140, 150);
  doc.text("BILLED TO", M, y);
  doc.text("SERVICE", pageW / 2, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 40);
  doc.text(customer.full_name || "Guest Customer", M, y + 6);
  doc.text(service.name_en || app.service_code || "Service", pageW / 2, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 100);
  let by = y + 11;
  if (customer.phone) {
    doc.text(String(customer.phone), M, by);
    by += 4.5;
  }
  if (customer.email) {
    doc.text(String(customer.email), M, by);
    by += 4.5;
  }
  if (customer.address) {
    const lines = doc.splitTextToSize(String(customer.address), pageW / 2 - M - 4);
    doc.text(lines, M, by);
  }

  let sy = y + 11;
  if (app.application_data?.destination) {
    doc.text(`Destination: ${app.application_data.destination}`, pageW / 2, sy);
    sy += 4.5;
  }
  if (app.application_data?.travel_date) {
    doc.text(`Travel Date: ${app.application_data.travel_date}`, pageW / 2, sy);
    sy += 4.5;
  }
  doc.text(`Tracking: ${invNo}`, pageW / 2, sy);

  // ===== Line items =====
  autoTable(doc, {
    startY: 86,
    head: [["DESCRIPTION", "QTY", "AMOUNT (BDT)"]],
    body: [
      [
        `${service.name_en || app.service_code || "Service"}${
          app.application_data?.destination ? `\n${app.application_data.destination}` : ""
        }`,
        "1",
        fmt(app.total_amount),
      ],
    ],
    theme: "plain",
    headStyles: {
      fillColor: [248, 249, 252],
      textColor: [110, 110, 130],
      fontStyle: "bold",
      fontSize: 8.5,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
    },
    styles: { fontSize: 10, cellPadding: 4, textColor: [40, 40, 50], lineColor: [235, 237, 242], lineWidth: 0.1 },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "center", cellWidth: 20 },
      2: { halign: "right", cellWidth: 42 },
    },
    margin: { left: M, right: M },
    didDrawCell: (data) => {
      if (data.section === "body" && data.row.index === data.table.body.length - 1) {
        const { x, y: cy, width } = data.cell;
        const rowBottom = cy + data.row.height;
        if (data.column.index === 0) {
          doc.setDrawColor(220, 224, 232);
          doc.setLineWidth(0.2);
          doc.line(x, rowBottom, x + width * 3 + 62, rowBottom);
        }
      }
    },
  });

  let afterY = (doc as any).lastAutoTable.finalY + 6;

  // ===== Totals (right aligned, no border) =====
  const totalAmt = Number(app.total_amount || 0);
  const paidAmt = Number(app.paid_amount || 0);
  const dueAmt = Number(app.due_amount ?? totalAmt - paidAmt);

  const labelX = pageW - M - 50;
  const valX = pageW - M;
  doc.setFontSize(9.5);
  doc.setTextColor(110, 110, 120);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal", labelX, afterY + 4, { align: "left" });
  doc.setTextColor(40, 40, 50);
  doc.text(fmt(totalAmt), valX, afterY + 4, { align: "right" });

  doc.setTextColor(110, 110, 120);
  doc.text("Paid", labelX, afterY + 10, { align: "left" });
  doc.setTextColor(34, 139, 87);
  doc.text(`- ${fmt(paidAmt)}`, valX, afterY + 10, { align: "right" });

  // Due highlight
  doc.setFillColor(15, 27, 61);
  doc.rect(labelX - 4, afterY + 14, pageW - M - labelX + 4, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text("AMOUNT DUE", labelX, afterY + 20.5, { align: "left" });
  doc.text(`BDT ${fmt(dueAmt)}`, valX, afterY + 20.5, { align: "right" });

  afterY += 32;

  // ===== Payment History =====
  if (payments.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(140, 140, 150);
    doc.text("PAYMENT HISTORY", M, afterY);
    autoTable(doc, {
      startY: afterY + 3,
      head: [["Date", "Method", "Reference", "Status", "Amount (BDT)"]],
      body: payments.map((p: any) => [
        new Date(p.paid_at || p.created_at).toLocaleDateString("en-GB"),
        String(p.method_code || "-").toUpperCase(),
        p.transaction_ref || "-",
        String(p.status || "-").toUpperCase(),
        fmt(p.amount),
      ]),
      theme: "plain",
      headStyles: {
        fillColor: [248, 249, 252],
        textColor: [110, 110, 130],
        fontStyle: "bold",
        fontSize: 8,
      },
      styles: { fontSize: 9, cellPadding: 3, textColor: [60, 60, 70], lineColor: [235, 237, 242], lineWidth: 0.1 },
      columnStyles: { 4: { halign: "right" } },
      margin: { left: M, right: M },
    });
    afterY = (doc as any).lastAutoTable.finalY + 6;
  }

  // ===== Footer =====
  doc.setDrawColor(230, 232, 238);
  doc.setLineWidth(0.3);
  doc.line(M, pageH - 22, pageW - M, pageH - 22);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 27, 61);
  doc.text(company.footer_text, pageW / 2, pageH - 16, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(140, 140, 150);
  doc.text(company.footer_contact, pageW / 2, pageH - 11, { align: "center" });

  doc.save(`invoice-${app.tracking_id || app.id}.pdf`);
}