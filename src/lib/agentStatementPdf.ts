import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const fmt = (n: any) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const COMPANY = {
  name: "Al Rawsha International",
  tagline: "Govt. Approved Recruiting Agency (RL-2902)",
  address: "Rupayan FPAB (Lift-07), Purana Paltan, Dhaka-1000, Bangladesh",
  contact: "+880 1886-999465 • alrawshainternational@gmail.com",
};

export interface AgentStatementInput {
  agent: { name?: string; company_name?: string; phone?: string; email?: string; kind?: string };
  pending: any[];
  paid: any[];
}

export function downloadAgentStatement({ agent, pending, paid }: AgentStatementInput) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(15, 27, 61);
  doc.rect(0, 0, pageW, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(COMPANY.name, 14, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(COMPANY.tagline, 14, 20);
  doc.text(COMPANY.address, 14, 25.5);
  doc.text(COMPANY.contact, 14, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("COMMISSION STATEMENT", pageW - 14, 18, { align: "right" });

  // Agent block
  doc.setTextColor(40, 40, 40);
  let y = 42;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("AGENT", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(agent.name || "—", 14, y + 5);
  if (agent.company_name) doc.text(agent.company_name, 14, y + 10);
  if (agent.phone) doc.text(String(agent.phone), 14, y + 15);
  if (agent.email) doc.text(String(agent.email), 14, y + 20);

  doc.setFont("helvetica", "bold");
  doc.text("Date:", pageW - 60, y);
  doc.text("Type:", pageW - 60, y + 5);
  doc.setFont("helvetica", "normal");
  doc.text(new Date().toLocaleDateString(), pageW - 14, y, { align: "right" });
  doc.text(String(agent.kind || "referral").toUpperCase(), pageW - 14, y + 5, { align: "right" });

  const totalPending = pending.reduce((s, c) => s + Number(c.amount || 0), 0);
  const totalPaid = paid.reduce((s, c) => s + Number(c.amount || 0), 0);

  // Summary
  autoTable(doc, {
    startY: 70,
    body: [
      ["Pending Commissions", `${pending.length}`, `${fmt(totalPending)} BDT`],
      ["Paid Commissions", `${paid.length}`, `${fmt(totalPaid)} BDT`],
      ["Lifetime Earnings", `${pending.length + paid.length}`, `${fmt(totalPending + totalPaid)} BDT`],
    ],
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: "bold" },
      1: { halign: "center", cellWidth: 30 },
      2: { halign: "right", cellWidth: 50, fontStyle: "bold" },
    },
  });
  let afterY = (doc as any).lastAutoTable.finalY + 8;

  // Pending
  if (pending.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Pending (Accrued)", 14, afterY);
    autoTable(doc, {
      startY: afterY + 3,
      head: [["Date", "Tracking", "Service", "Customer", "Amount (BDT)"]],
      body: pending.map((c: any) => [
        new Date(c.created_at).toLocaleDateString(),
        c.tracking_id || "—",
        String(c.service_code || "—").toUpperCase(),
        c.customer_name || "—",
        fmt(c.amount),
      ]),
      theme: "striped",
      headStyles: { fillColor: [15, 27, 61], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 2.5 },
      columnStyles: { 4: { halign: "right" } },
    });
    afterY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Paid
  if (paid.length) {
    if (afterY > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      afterY = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Payout History", 14, afterY);
    autoTable(doc, {
      startY: afterY + 3,
      head: [["Paid Date", "Tracking", "Notes", "Amount (BDT)"]],
      body: paid.map((c: any) => [
        c.paid_at ? new Date(c.paid_at).toLocaleDateString() : "—",
        c.tracking_id || "—",
        c.notes || "—",
        fmt(c.amount),
      ]),
      theme: "striped",
      headStyles: { fillColor: [15, 27, 61], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 2.5 },
      columnStyles: { 3: { halign: "right" } },
    });
  }

  // Footer
  const ph = doc.internal.pageSize.getHeight();
  doc.setDrawColor(200);
  doc.line(14, ph - 18, pageW - 14, ph - 18);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(
    "Computer-generated statement. Reconcile with internal records before settlement.",
    pageW / 2,
    ph - 12,
    { align: "center" },
  );

  const safe = (agent.name || "agent").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`commission-statement-${safe}-${new Date().toISOString().slice(0, 10)}.pdf`);
}