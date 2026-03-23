import PDFDocument from "pdfkit";
import { ShopDetails } from "./generateInvoicePdf.js";

interface StatementBill {
  billingId: string;
  totalAmount: number;
  timestamp: Date | string;
}

interface StatementPayment {
  paymentId: string;
  amount: number;
  type: "payment" | "advance";
  timestamp: Date | string;
}

interface StatementData {
  customer: {
    name: string;
    email?: string | null;
    address?: string | null;
  };
  bills: StatementBill[];
  payments: StatementPayment[];
  totalAmount: number;
  totalPaid: number;
  outstanding: number;
  credit: number;
  openingBalance: number;
  billAmount: number;
  currentBalance: number;
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

export function generateStatementPdf(
  data: StatementData,
  shop?: ShopDetails,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const SHOP = getShop(shop);
    const rowH = 22;
    const headerH = 70;
    const customerH = 50;
    const sectionHeaderH = 24;
    const itemsH = data.bills.length * rowH;
    const balanceSectionH = 120;
    const totalsH = 50;
    const footerH = 50;
    const gaps = 100;
    const contentH =
      headerH +
      customerH +
      sectionHeaderH +
      itemsH +
      sectionHeaderH +
      balanceSectionH +
      totalsH +
      footerH +
      gaps;

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

    // ===== BILLS TABLE =====
    const cols = {
      num: m,
      billId: m + 25,
      date: m + cw * 0.48,
      total: m + cw * 0.70,
    };
    const dateW = cw * 0.16;
    const numW = cw * 0.18;

    doc.font("Helvetica-Bold").fontSize(9).fillColor(C.dark);
    t(doc, "BILLS", m, y - 2);
    y += 14;
    doc.save();
    doc.rect(m, y - 4, cw, 20).fill(C.bgLight);
    doc.restore();

    doc.font("Helvetica-Bold").fontSize(7).fillColor(C.med);
    t(doc, "#", cols.num + 4, y + 3);
    t(doc, "BILL ID", cols.billId, y + 3);
    tw(doc, "DATE", cols.date, y + 3, dateW, "center");
    tw(doc, "TOTAL", cols.total, y + 3, numW, "right");
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

      doc.font("Helvetica").fillColor(C.med);
      tw(
        doc,
        `Rs. ${bill.totalAmount.toFixed(2)}`,
        cols.total,
        y + 5,
        numW,
        "right",
      );

      y += rowH;
      line(doc, y - 1, m, pw - m);
    });

    // ===== PAYMENTS / LEDGER SUMMARY =====
    y += 16;
    doc.font("Helvetica-Bold").fontSize(9).fillColor(C.dark);
    t(doc, "PAYMENTS", m, y - 2);
    y += 14;

    doc.save();
    doc.roundedRect(m, y - 2, cw, 88, 6).fill(C.bgLight);
    doc.restore();

    const leftX = m + 14;
    const rightX = m + cw - 14;
    doc.font("Helvetica").fontSize(9).fillColor(C.med);
    t(doc, "Opening Balance", leftX, y + 12);
    doc.font("Helvetica-Bold").fillColor(C.dark);
    doc.fontSize(11);
    tw(doc, `Rs. ${data.openingBalance.toFixed(2)}`, m, y + 10, cw - 20, "right");

    doc.font("Helvetica").fontSize(9).fillColor(C.med);
    t(doc, "Bill Amount", leftX, y + 36);
    doc.font("Helvetica-Bold").fillColor(C.dark).fontSize(11);
    tw(doc, `Rs. ${data.billAmount.toFixed(2)}`, m, y + 34, cw - 20, "right");

    line(doc, y + 56, leftX, rightX, C.border);
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#92400e");
    t(doc, "Current Balance", leftX, y + 64);
    doc.fontSize(13);
    tw(doc, `Rs. ${data.currentBalance.toFixed(2)}`, m, y + 62, cw - 20, "right");
    y += 98;

    // ===== TOTALS =====
    y += 4;
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

    y += 32;
    doc.save();
    doc.roundedRect(tX - 5, y - 4, tW + 10, 26, 4).fill("#dbeafe");
    doc.restore();
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#1e40af");
    t(doc, "CREDIT", tX + 6, y + 4);
    doc.fontSize(13);
    tw(doc, `Rs. ${data.credit.toFixed(2)}`, tX, y + 2, tW, "right");

    // ===== FOOTER =====
    y += 40;
    line(doc, y, m, pw - m);

    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.med);
    tw(doc, "Thank you for your business!", m, y + 10, cw, "center");

    doc.end();
  });
}
