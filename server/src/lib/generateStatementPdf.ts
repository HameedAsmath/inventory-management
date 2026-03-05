import PDFDocument from "pdfkit";
import { ShopDetails } from "./generateInvoicePdf.js";

interface StatementBill {
  billingId: string;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: string;
  timestamp: Date | string;
}

interface StatementData {
  customer: {
    name: string;
    email?: string | null;
    address?: string | null;
  };
  bills: StatementBill[];
  totalAmount: number;
  totalPaid: number;
  outstanding: number;
}

function getShop(shop?: ShopDetails): ShopDetails {
  return {
    name: shop?.name || process.env.SHOP_NAME || "My Shop",
    address: shop?.address || process.env.SHOP_ADDRESS || "",
    pincode: shop?.pincode || process.env.SHOP_PINCODE || "",
    contact: shop?.contact || process.env.SHOP_CONTACT || "",
    gst: shop?.gst || process.env.SHOP_GST || "",
  };
}

const C = {
  brand: "#1e40af",
  dark: "#111827",
  med: "#4b5563",
  light: "#9ca3af",
  border: "#e5e7eb",
  bgLight: "#f9fafb",
  white: "#ffffff",
};

function t(
  doc: InstanceType<typeof PDFDocument>,
  text: string,
  x: number,
  y: number,
  opts: object = {},
) {
  doc.text(text, x, y, { lineBreak: false, ...opts });
}

function tw(
  doc: InstanceType<typeof PDFDocument>,
  text: string,
  x: number,
  y: number,
  width: number,
  align: "left" | "center" | "right" = "left",
) {
  doc.text(text, x, y, { width, align, lineBreak: false });
}

function line(
  doc: InstanceType<typeof PDFDocument>,
  y: number,
  x1: number,
  x2: number,
  color = C.border,
) {
  doc
    .save()
    .strokeColor(color)
    .lineWidth(0.5)
    .moveTo(x1, y)
    .lineTo(x2, y)
    .stroke()
    .restore();
}

const statusLabel = (s: string) =>
  s === "success" ? "Paid" : s === "cancelled" ? "Cancelled" : "Pending";

const statusColor = (s: string) =>
  s === "success" ? "#059669" : s === "cancelled" ? "#dc2626" : "#d97706";

export function generateStatementPdf(
  data: StatementData,
  shop?: ShopDetails,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const SHOP = getShop(shop);
    const rowH = 22;
    const headerH = 70;
    const customerH = 50;
    const tableHeaderH = 22;
    const itemsH = data.bills.length * rowH;
    const totalsH = 80;
    const footerH = 50;
    const gaps = 80;
    const contentH =
      headerH + customerH + tableHeaderH + itemsH + totalsH + footerH + gaps;

    const pageH = Math.max(595, contentH + 80);
    const doc = new PDFDocument({
      size: [595.28, pageH],
      margin: 40,
      autoFirstPage: true,
      bufferPages: false,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pw = 595.28;
    const m = 40;
    const cw = pw - m * 2;
    let y = 0;

    // ===== HEADER BAR =====
    doc.save();
    doc.rect(0, 0, pw, 70).fill(C.brand);
    doc.restore();

    doc.font("Helvetica-Bold").fontSize(18).fillColor(C.white);
    t(doc, SHOP.name.toUpperCase(), m, 22);

    doc.font("Helvetica-Bold").fontSize(16).fillColor(C.white);
    tw(doc, "ACCOUNT STATEMENT", m, 24, cw, "right");

    y = 85;

    // ===== CUSTOMER =====
    doc.font("Helvetica-Bold").fontSize(11).fillColor(C.dark);
    t(doc, data.customer.name, m, y);
    y += 15;

    if (data.customer.address) {
      doc.font("Helvetica").fontSize(8.5).fillColor(C.med);
      t(doc, data.customer.address, m, y);
      y += 12;
    }

    if (data.customer.email) {
      doc.font("Helvetica").fontSize(8.5).fillColor(C.med);
      t(doc, data.customer.email, m, y);
      y += 12;
    }

    // Date generated
    doc.font("Helvetica").fontSize(8).fillColor(C.light);
    tw(
      doc,
      `Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`,
      m,
      85,
      cw,
      "right",
    );

    y += 6;
    line(doc, y, m, pw - m);
    y += 12;

    // ===== TABLE =====
    const cols = {
      num: m,
      billId: m + 25,
      date: m + cw * 0.35,
      status: m + cw * 0.5,
      total: m + cw * 0.62,
      paid: m + cw * 0.77,
      due: m + cw * 0.88,
    };
    const dateW = cw * 0.13;
    const statusW = cw * 0.1;
    const numW = cw * 0.12;
    const dueW = cw * 0.12;

    doc.save();
    doc.rect(m, y - 4, cw, 20).fill(C.bgLight);
    doc.restore();

    doc.font("Helvetica-Bold").fontSize(7).fillColor(C.med);
    t(doc, "#", cols.num + 4, y + 3);
    t(doc, "BILL ID", cols.billId, y + 3);
    tw(doc, "DATE", cols.date, y + 3, dateW, "center");
    tw(doc, "STATUS", cols.status, y + 3, statusW, "center");
    tw(doc, "TOTAL", cols.total, y + 3, numW, "right");
    tw(doc, "PAID", cols.paid, y + 3, numW, "right");
    tw(doc, "DUE", cols.due, y + 3, dueW, "right");
    y += 20;

    // Table rows
    doc.fontSize(8.5);
    data.bills.forEach((bill, i) => {
      if (i % 2 !== 0) {
        doc.save();
        doc.rect(m, y - 2, cw, rowH).fill("#f3f4f6");
        doc.restore();
      }

      doc.font("Helvetica").fillColor(C.light);
      t(doc, String(i + 1), cols.num + 4, y + 5);

      doc.font("Helvetica-Bold").fillColor(C.dark);
      t(doc, bill.billingId, cols.billId, y + 5);

      const d = new Date(bill.timestamp);
      doc.font("Helvetica").fillColor(C.med);
      tw(
        doc,
        d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "2-digit",
        }),
        cols.date,
        y + 5,
        dateW,
        "center",
      );

      doc
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .fillColor(statusColor(bill.paymentStatus));
      tw(
        doc,
        statusLabel(bill.paymentStatus).toUpperCase(),
        cols.status,
        y + 5,
        statusW,
        "center",
      );
      doc.fontSize(8.5);

      doc.font("Helvetica").fillColor(C.med);
      tw(
        doc,
        `Rs. ${bill.totalAmount.toFixed(2)}`,
        cols.total,
        y + 5,
        numW,
        "right",
      );

      doc.fillColor("#059669");
      tw(
        doc,
        `Rs. ${bill.paidAmount.toFixed(2)}`,
        cols.paid,
        y + 5,
        numW,
        "right",
      );

      const due = bill.totalAmount - bill.paidAmount;
      doc.fillColor(due > 0 ? "#d97706" : C.med);
      tw(doc, `Rs. ${due.toFixed(2)}`, cols.due, y + 5, dueW, "right");

      y += rowH;
      line(doc, y - 1, m, pw - m);
    });

    // ===== TOTALS =====
    y += 12;
    const tX = m + cw * 0.5;
    const tW = cw * 0.5;

    doc.font("Helvetica").fontSize(9).fillColor(C.med);
    tw(doc, "Total Billed", tX, y, tW * 0.5, "right");
    doc.font("Helvetica-Bold").fillColor(C.dark);
    tw(
      doc,
      `Rs. ${data.totalAmount.toFixed(2)}`,
      tX + tW * 0.55,
      y,
      tW * 0.45,
      "right",
    );
    y += 16;

    doc.font("Helvetica").fontSize(9).fillColor("#059669");
    tw(doc, "Total Paid", tX, y, tW * 0.5, "right");
    doc.font("Helvetica-Bold");
    tw(
      doc,
      `Rs. ${data.totalPaid.toFixed(2)}`,
      tX + tW * 0.55,
      y,
      tW * 0.45,
      "right",
    );
    y += 16;

    // Outstanding bar
    y += 4;
    const barColor = data.outstanding > 0 ? "#fef3c7" : "#d1fae5";
    const textColor = data.outstanding > 0 ? "#92400e" : "#065f46";

    doc.save();
    doc.roundedRect(tX - 5, y - 4, tW + 10, 26, 4).fill(barColor);
    doc.restore();

    doc.font("Helvetica-Bold").fontSize(10).fillColor(textColor);
    t(doc, data.outstanding > 0 ? "OUTSTANDING" : "ALL CLEAR", tX + 6, y + 4);
    doc.fontSize(13);
    tw(doc, `Rs. ${data.outstanding.toFixed(2)}`, tX, y + 2, tW, "right");

    // ===== FOOTER =====
    y += 40;
    line(doc, y, m, pw - m);

    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.med);
    tw(doc, "Thank you for your business!", m, y + 10, cw, "center");

    doc.end();
  });
}
