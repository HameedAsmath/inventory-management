import nodemailer from "nodemailer";

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

interface SendInvoiceEmailOptions {
  to: string;
  customerName: string;
  billingId: string;
  totalAmount: number;
  pdfBuffer: Buffer;
}

export async function sendInvoiceEmail(options: SendInvoiceEmailOptions) {
  const shopName = process.env.SHOP_NAME || "Roshan Note Books";

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e40af; padding: 30px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">${shopName}</h1>
        <p style="color: #93c5fd; margin: 5px 0 0; font-size: 13px;">Estimate Memo</p>
      </div>
      <div style="padding: 30px; background: #ffffff; border: 1px solid #e5e7eb; border-top: none;">
        <p style="color: #374151; font-size: 15px; line-height: 1.6;">
          Dear <strong>${options.customerName}</strong>,
        </p>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
          Thank you for your purchase. Please find your estimate memo attached to this email.
        </p>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; font-size: 14px; color: #374151;">
            <tr>
              <td style="padding: 6px 0; color: #9ca3af;">Estimate #</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600;">${options.billingId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #9ca3af;">Amount</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 700; font-size: 18px; color: #1e40af;">
                Rs. ${options.totalAmount.toFixed(2)}
              </td>
            </tr>
          </table>
        </div>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; text-align: center;">
          This is an automated email from ${shopName}. Please do not reply.
        </p>
      </div>
      <div style="background: #f9fafb; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="color: #9ca3af; font-size: 11px; margin: 0;">
          ${shopName} | ${process.env.SHOP_ADDRESS || "West Naalaya Street, Madurai"}, ${process.env.SHOP_PINCODE || "625001"}
        </p>
      </div>
    </div>
  `;

  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"${shopName}" <${process.env.SMTP_USER}>`,
    to: options.to,
    subject: `Estimate Memo ${options.billingId} - ${shopName}`,
    html,
    attachments: [
      {
        filename: `${options.billingId}.pdf`,
        content: options.pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

interface SendStatementEmailOptions {
  to: string;
  customerName: string;
  totalAmount: number;
  totalPaid: number;
  outstanding: number;
  billCount: number;
  pdfBuffer: Buffer;
}

export async function sendStatementEmail(options: SendStatementEmailOptions) {
  const shopName = process.env.SHOP_NAME || "Roshan Note Books";

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e40af; padding: 30px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">${shopName}</h1>
        <p style="color: #93c5fd; margin: 5px 0 0; font-size: 13px;">Account Statement</p>
      </div>
      <div style="padding: 30px; background: #ffffff; border: 1px solid #e5e7eb; border-top: none;">
        <p style="color: #374151; font-size: 15px; line-height: 1.6;">
          Dear <strong>${options.customerName}</strong>,
        </p>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
          Please find your account statement attached to this email.
        </p>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; font-size: 14px; color: #374151;">
            <tr>
              <td style="padding: 6px 0; color: #9ca3af;">Total Bills</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600;">${options.billCount}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #9ca3af;">Total Amount</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600;">Rs. ${options.totalAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #9ca3af;">Paid</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #059669;">Rs. ${options.totalPaid.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #9ca3af;">Outstanding</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 700; font-size: 18px; color: ${options.outstanding > 0 ? "#d97706" : "#059669"};">
                Rs. ${options.outstanding.toFixed(2)}
              </td>
            </tr>
          </table>
        </div>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; text-align: center;">
          This is an automated email from ${shopName}. Please do not reply.
        </p>
      </div>
      <div style="background: #f9fafb; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="color: #9ca3af; font-size: 11px; margin: 0;">
          ${shopName} | ${process.env.SHOP_ADDRESS || "West Naalaya Street, Madurai"}, ${process.env.SHOP_PINCODE || "625001"}
        </p>
      </div>
    </div>
  `;

  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"${shopName}" <${process.env.SMTP_USER}>`,
    to: options.to,
    subject: `Account Statement - ${options.customerName} - ${shopName}`,
    html,
    attachments: [
      {
        filename: `statement-${options.customerName.replace(/\s+/g, "_")}.pdf`,
        content: options.pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

interface SendSupplierStatementEmailOptions {
  to: string;
  supplierName: string;
  totalAmount: number;
  totalPaid: number;
  outstanding: number;
  purchaseCount: number;
  pdfBuffer: Buffer;
}

export async function sendSupplierStatementEmail(
  options: SendSupplierStatementEmailOptions,
) {
  const shopName = process.env.SHOP_NAME || "Roshan Note Books";

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e40af; padding: 30px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">${shopName}</h1>
        <p style="color: #93c5fd; margin: 5px 0 0; font-size: 13px;">Supplier Statement</p>
      </div>
      <div style="padding: 30px; background: #ffffff; border: 1px solid #e5e7eb; border-top: none;">
        <p style="color: #374151; font-size: 15px; line-height: 1.6;">
          Dear <strong>${options.supplierName}</strong>,
        </p>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
          Please find the attached account statement summarising our recent
          purchases and payments.
        </p>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; font-size: 14px; color: #374151;">
            <tr>
              <td style="padding: 6px 0; color: #9ca3af;">Total Purchases</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600;">${options.purchaseCount}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #9ca3af;">Total Amount</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600;">Rs. ${options.totalAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #9ca3af;">Paid</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #059669;">Rs. ${options.totalPaid.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #9ca3af;">Payable</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 700; font-size: 18px; color: ${options.outstanding > 0 ? "#d97706" : "#059669"};">
                Rs. ${options.outstanding.toFixed(2)}
              </td>
            </tr>
          </table>
        </div>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; text-align: center;">
          This is an automated email from ${shopName}. Please do not reply.
        </p>
      </div>
      <div style="background: #f9fafb; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="color: #9ca3af; font-size: 11px; margin: 0;">
          ${shopName} | ${process.env.SHOP_ADDRESS || "West Naalaya Street, Madurai"}, ${process.env.SHOP_PINCODE || "625001"}
        </p>
      </div>
    </div>
  `;

  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"${shopName}" <${process.env.SMTP_USER}>`,
    to: options.to,
    subject: `Supplier Statement - ${options.supplierName} - ${shopName}`,
    html,
    attachments: [
      {
        filename: `supplier-statement-${options.supplierName.replace(/\s+/g, "_")}.pdf`,
        content: options.pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}
