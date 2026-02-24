import PDFDocument from "pdfkit";

interface InvoiceItem {
  product: { name: string };
  quantity: number;
  price: number;
  discount: number;
  subtotal: number;
}

interface InvoiceCustomer {
  customerId: string;
  name: string;
  email?: string | null;
  address?: string | null;
}

export interface ShopDetails {
  name: string;
  address: string;
  pincode: string;
  contact: string;
  gst: string;
}

interface InvoiceData {
  billingId: string;
  totalAmount: number;
  pnfCharges: number;
  paidAmount: number;
  paymentStatus: string;
  timestamp: Date | string;
  customer: InvoiceCustomer;
  BillingItem: InvoiceItem[];
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

// Helper: draw text at exact position without advancing PDFKit's cursor
function t(
  doc: InstanceType<typeof PDFDocument>,
  text: string,
  x: number,
  y: number,
  opts: object = {}
) {
  doc.text(text, x, y, { lineBreak: false, ...opts });
}

// Helper: draw text with width/align without cursor side-effects
function tw(
  doc: InstanceType<typeof PDFDocument>,
  text: string,
  x: number,
  y: number,
  width: number,
  align: "left" | "center" | "right" = "left"
) {
  doc.text(text, x, y, { width, align, lineBreak: false });
}

function line(
  doc: InstanceType<typeof PDFDocument>,
  y: number,
  x1: number,
  x2: number,
  color = C.border
) {
  doc.save().strokeColor(color).lineWidth(0.5).moveTo(x1, y).lineTo(x2, y).stroke().restore();
}

export function generateInvoicePdf(billing: InvoiceData, shop?: ShopDetails): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const SHOP = getShop(shop);

    // Calculate content height first to determine if we need more space
    const headerH = 70;
    const billToH = 40;
    const tableHeaderH = 22;
    const rowH = 22;
    const itemsH = billing.BillingItem.length * rowH;
    const totalsH = 50;
    const paymentH = billing.paidAmount < billing.totalAmount ? 60 : 0;
    const footerH = 50;
    const gaps = 60;
    const contentH = headerH + billToH + tableHeaderH + itemsH + totalsH + paymentH + footerH + gaps;

    // Use A4 but ensure enough height
    const pageH = Math.max(595, contentH + 80); // min A4-ish, grow if needed
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

    // ===== BLUE HEADER BAR =====
    doc.save();
    doc.rect(0, 0, pw, 70).fill(C.brand);
    doc.restore();

    // Shop name (left)
    doc.font("Helvetica-Bold").fontSize(18).fillColor(C.white);
    t(doc, SHOP.name.toUpperCase(), m, 22);

    // Estimate Memo label (right)
    doc.font("Helvetica-Bold").fontSize(18).fillColor(C.white);
    tw(doc, "ESTIMATE MEMO", m, 22, cw, "right");

    y = 85;

    // ===== CUSTOMER =====
    doc.font("Helvetica-Bold").fontSize(11).fillColor(C.dark);
    t(doc, billing.customer.name, m, y);
    y += 15;

    if (billing.customer.address) {
      doc.font("Helvetica").fontSize(8.5).fillColor(C.med);
      t(doc, billing.customer.address, m, y);
      y += 12;
    }

    // ===== DIVIDER =====
    y += 6;
    line(doc, y, m, pw - m);
    y += 12;

    // ===== TABLE =====
    const hasAnyDiscount = billing.BillingItem.some((item) => item.discount > 0);
    const cols = {
      num: m,
      prod: m + 28,
      qty: m + cw * 0.45,
      price: m + cw * 0.57,
      disc: m + cw * 0.71,
      sub: m + cw * 0.85,
    };
    const qtyW = cw * 0.10;
    const priceW = cw * 0.12;
    const discW = cw * 0.12;
    const subW = cw * 0.15;

    // Table header bg
    doc.save();
    doc.rect(m, y - 4, cw, 20).fill(C.bgLight);
    doc.restore();

    doc.font("Helvetica-Bold").fontSize(7).fillColor(C.med);
    t(doc, "#", cols.num + 4, y + 3);
    t(doc, "PRODUCT", cols.prod, y + 3);
    tw(doc, "QTY", cols.qty, y + 3, qtyW, "center");
    tw(doc, "PRICE", cols.price, y + 3, priceW, "right");
    if (hasAnyDiscount) {
      tw(doc, "DISC.", cols.disc, y + 3, discW, "right");
    }
    tw(doc, "SUBTOTAL", cols.sub, y + 3, subW, "right");
    y += 20;

    // Table rows
    doc.fontSize(8.5);
    billing.BillingItem.forEach((item, i) => {
      // Zebra stripe
      if (i % 2 !== 0) {
        doc.save();
        doc.rect(m, y - 2, cw, rowH).fill("#f3f4f6");
        doc.restore();
      }

      doc.font("Helvetica").fillColor(C.light);
      t(doc, String(i + 1), cols.num + 4, y + 5);

      doc.font("Helvetica-Bold").fillColor(C.dark);
      t(doc, item.product.name, cols.prod, y + 5);

      doc.font("Helvetica").fillColor(C.med);
      tw(doc, String(item.quantity), cols.qty, y + 5, qtyW, "center");
      tw(doc, `Rs. ${item.price.toFixed(2)}`, cols.price, y + 5, priceW, "right");

      if (hasAnyDiscount) {
        if (item.discount > 0) {
          doc.fillColor("#dc2626");
          tw(doc, `-Rs. ${item.discount.toFixed(2)}`, cols.disc, y + 5, discW, "right");
          doc.fillColor(C.med);
        } else {
          tw(doc, "—", cols.disc, y + 5, discW, "right");
        }
      }

      doc.font("Helvetica-Bold").fillColor(C.dark);
      tw(doc, `Rs. ${item.subtotal.toFixed(2)}`, cols.sub, y + 5, subW, "right");

      y += rowH;
      line(doc, y - 1, m, pw - m);
    });

    // ===== TOTAL =====
    y += 8;
    const tX = m + cw * 0.55;
    const tW = cw * 0.45;

    const totalDiscount = billing.BillingItem.reduce((s, item) => s + (item.discount || 0), 0);
    const grossTotal = billing.BillingItem.reduce((s, item) => s + item.quantity * item.price, 0);

    if (totalDiscount > 0) {
      doc.font("Helvetica").fontSize(9).fillColor(C.med);
      tw(doc, "Gross Total", tX, y, tW * 0.5, "right");
      doc.fillColor(C.dark);
      tw(doc, `Rs. ${grossTotal.toFixed(2)}`, tX + tW * 0.55, y, tW * 0.45, "right");
      y += 14;

      doc.font("Helvetica").fontSize(9).fillColor("#dc2626");
      tw(doc, "Total Discount", tX, y, tW * 0.5, "right");
      tw(doc, `-Rs. ${totalDiscount.toFixed(2)}`, tX + tW * 0.55, y, tW * 0.45, "right");
      y += 14;
    }

    const pnf = billing.pnfCharges || 0;
    const netBeforePnf = billing.totalAmount - pnf;

    doc.font("Helvetica").fontSize(9).fillColor(C.med);
    tw(doc, pnf > 0 ? "Net Items" : "Net Total", tX, y, tW * 0.5, "right");
    doc.fillColor(C.dark);
    tw(doc, `Rs. ${netBeforePnf.toFixed(2)}`, tX + tW * 0.55, y, tW * 0.45, "right");
    y += 14;

    if (pnf > 0) {
      doc.font("Helvetica").fontSize(9).fillColor(C.med);
      tw(doc, "P&F Charges", tX, y, tW * 0.5, "right");
      doc.fillColor(C.dark);
      tw(doc, `Rs. ${pnf.toFixed(2)}`, tX + tW * 0.55, y, tW * 0.45, "right");
      y += 14;
    }

    y += 4;

    // Grand total bar
    doc.save();
    doc.roundedRect(tX - 5, y - 4, tW + 10, 26, 4).fill(C.brand);
    doc.restore();

    doc.font("Helvetica-Bold").fontSize(10).fillColor(C.white);
    t(doc, "GRAND TOTAL", tX + 6, y + 4);
    doc.fontSize(13);
    tw(doc, `Rs. ${billing.totalAmount.toFixed(2)}`, tX, y + 2, tW, "right");

    // ===== PAYMENT SUMMARY =====
    const balanceDue = Math.max(0, billing.totalAmount - (billing.paidAmount || 0));
    const paid = billing.paidAmount || 0;

    if (paid > 0 || billing.paymentStatus === "pending") {
      y += 32;
      line(doc, y, tX - 5, pw - m, C.border);
      y += 10;

      doc.font("Helvetica").fontSize(9).fillColor(C.med);
      tw(doc, "Amount Paid", tX, y, tW * 0.5, "right");
      doc.font("Helvetica-Bold").fillColor("#059669");
      tw(doc, `Rs. ${paid.toFixed(2)}`, tX + tW * 0.55, y, tW * 0.45, "right");
      y += 16;

      if (balanceDue > 0) {
        doc.save();
        doc.roundedRect(tX - 5, y - 4, tW + 10, 24, 4).fill("#fef3c7");
        doc.restore();

        doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#92400e");
        t(doc, "BALANCE DUE", tX + 6, y + 3);
        doc.fontSize(12);
        tw(doc, `Rs. ${balanceDue.toFixed(2)}`, tX, y + 1, tW, "right");
        y += 24;
      } else {
        doc.save();
        doc.roundedRect(tX - 5, y - 4, tW + 10, 24, 4).fill("#d1fae5");
        doc.restore();

        doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#065f46");
        tw(doc, "PAID IN FULL", tX - 5, y + 3, tW + 10, "center");
        y += 24;
      }
    }

    // ===== FOOTER =====
    y += 40;
    line(doc, y, m, pw - m);

    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.med);
    tw(doc, "Thank you for your business!", m, y + 10, cw, "center");

    doc.end();
  });
}
