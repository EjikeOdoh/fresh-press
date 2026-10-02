import type { TimeSlotValue } from "../config";
import { SITE, getTimeSlotLabel } from "../config";
import { formatOrderDate } from "../dates";
import { formatNaira } from "../money";

/**
 * Order confirmation email: a professional HTML body plus a plain-text fallback, both
 * generated from the same order data so they can never drift apart.
 *
 * Deliberately dependency-free and server-only (it renders money and dates with the same
 * helpers as the UI).
 */

export type ConfirmationOrder = {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  pickupAddress: string;
  pickupDate: string;
  pickupTimeSlot: TimeSlotValue;
  deliveryAddress: string;
  deliveryDate: string;
  deliveryTimeSlot: TimeSlotValue;
  specialInstructions: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  createdAt?: Date;
};

export type ConfirmationItem = {
  serviceName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderConfirmationEmail = {
  subject: string;
  html: string;
  text: string;
};

export type OrderConfirmationInput = {
  order: ConfirmationOrder;
  items: readonly ConfirmationItem[];
  /** Absolute URL of the order (confirmation page). */
  orderUrl: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\n/g, "<br />");
}

export function buildOrderConfirmationEmail({
  order,
  items,
  orderUrl,
}: OrderConfirmationInput): OrderConfirmationEmail {
  const firstName = order.customerName.trim().split(/\s+/)[0] || order.customerName;

  return {
    subject: `Order confirmed — ${order.orderNumber} | ${SITE.name}`,
    text: buildTextBody({ order, items, orderUrl, firstName }),
    html: buildHtmlBody({ order, items, orderUrl, firstName }),
  };
}

function buildTextBody({
  order,
  items,
  orderUrl,
  firstName,
}: OrderConfirmationInput & { firstName: string }): string {
  const lines = items
    .map(
      (item) =>
        `  - ${item.serviceName} x${item.quantity} @ ${formatNaira(item.unitPrice)} = ${formatNaira(item.lineTotal)}`,
    )
    .join("\n");

  return [
    SITE.name,
    SITE.tagline,
    "",
    `Hi ${firstName},`,
    "",
    `Thank you for booking with ${SITE.name}. Order ${order.orderNumber} has been received and our team will confirm your pickup shortly.`,
    "",
    "ORDER SUMMARY",
    "----------------------------------------",
    `Order number : ${order.orderNumber}`,
    lines,
    "----------------------------------------",
    `Subtotal     : ${formatNaira(order.subtotal)}`,
    `Delivery fee : ${formatNaira(order.deliveryFee)}`,
    `Total        : ${formatNaira(order.total)}`,
    "",
    "PICKUP",
    `Address : ${order.pickupAddress}`,
    `Date    : ${formatOrderDate(order.pickupDate)}`,
    `Time    : ${getTimeSlotLabel(order.pickupTimeSlot)}`,
    "",
    "DELIVERY",
    `Address : ${order.deliveryAddress}`,
    `Date    : ${formatOrderDate(order.deliveryDate)}`,
    `Time    : ${getTimeSlotLabel(order.deliveryTimeSlot)}`,
    "",
    `Special instructions: ${order.specialInstructions?.trim() || "None"}`,
    "",
    `View your order: ${orderUrl}`,
    "",
    "Need to change something? Just reply to this email.",
    "",
    SITE.name,
    SITE.address,
    `${SITE.email} | ${SITE.phone}`,
    SITE.hours,
  ].join("\n");
}
function buildHtmlBody({
  order,
  items,
  orderUrl,
  firstName,
}: OrderConfirmationInput & { firstName: string }): string {
  const rows = items
    .map(
      (item, index) => `
              <tr style="background-color:${index % 2 === 0 ? "#ffffff" : "#f8fafc"};">
                <td style="padding:12px 16px;font-size:15px;color:#0f172a;border-bottom:1px solid #e2e8f0;">${escapeHtml(item.serviceName)}</td>
                <td style="padding:12px 16px;font-size:15px;color:#0f172a;text-align:center;border-bottom:1px solid #e2e8f0;">${item.quantity}</td>
                <td style="padding:12px 16px;font-size:15px;color:#0f172a;text-align:right;border-bottom:1px solid #e2e8f0;">${formatNaira(item.unitPrice)}</td>
                <td style="padding:12px 16px;font-size:15px;color:#0f172a;text-align:right;border-bottom:1px solid #e2e8f0;">${formatNaira(item.lineTotal)}</td>
              </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(order.orderNumber)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.08);">
            <tr>
              <td style="background-color:#0f766e;padding:28px 32px;">
                <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">${escapeHtml(SITE.name)}</p>
                <p style="margin:6px 0 0;font-size:14px;color:#ccfbf1;">${escapeHtml(SITE.tagline)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;font-size:18px;font-weight:600;color:#0f172a;">Hi ${escapeHtml(firstName)}, your order is confirmed</p>
                <p style="margin:0 0 8px;font-size:15px;line-height:24px;color:#334155;">
                  Thank you for booking with ${escapeHtml(SITE.name)}. We have received order
                  <strong style="color:#0f172a;">${escapeHtml(order.orderNumber)}</strong> and our team will confirm your pickup shortly.
                </p>
                <p style="margin:0 0 24px;font-size:13px;color:#64748b;">Placed on ${escapeHtml(formatOrderDate(order.createdAt ?? new Date()))}</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                  <tr style="background-color:#0f172a;">
                    <th align="left" style="padding:12px 16px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#e2e8f0;">Item</th>
                    <th align="center" style="padding:12px 16px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#e2e8f0;">Qty</th>
                    <th align="right" style="padding:12px 16px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#e2e8f0;">Unit</th>
                    <th align="right" style="padding:12px 16px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#e2e8f0;">Total</th>
                  </tr>${rows}
                </table>
                ${renderTotalsTable(order)}
                ${renderScheduleTable(order)}
                ${renderInstructions(order)}
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                  <tr>
                    <td style="border-radius:10px;background-color:#0f766e;">
                      <a href="${orderUrl}" style="display:inline-block;padding:14px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">View your order</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;font-size:14px;line-height:22px;color:#64748b;">
                  Need to change something? Simply reply to this email and our team will help.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background-color:#f8fafc;padding:24px 32px;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:14px;font-weight:600;color:#0f172a;">${escapeHtml(SITE.name)}</p>
                <p style="margin:6px 0 0;font-size:13px;line-height:20px;color:#64748b;">
                  ${escapeHtml(SITE.address)}<br />
                  ${escapeHtml(SITE.email)} &middot; ${escapeHtml(SITE.phone)}<br />
                  ${escapeHtml(SITE.hours)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
function renderTotalsTable(order: ConfirmationOrder): string {
  return `
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                  <tr>
                    <td align="right" style="padding:4px 0;font-size:14px;color:#475569;">Subtotal</td>
                    <td align="right" width="120" style="padding:4px 0;font-size:14px;color:#0f172a;">${formatNaira(order.subtotal)}</td>
                  </tr>
                  <tr>
                    <td align="right" style="padding:4px 0;font-size:14px;color:#475569;">Delivery fee</td>
                    <td align="right" width="120" style="padding:4px 0;font-size:14px;color:#0f172a;">${formatNaira(order.deliveryFee)}</td>
                  </tr>
                  <tr>
                    <td align="right" style="padding:8px 0;font-size:16px;font-weight:700;color:#0f172a;border-top:1px solid #e2e8f0;">Total</td>
                    <td align="right" width="120" style="padding:8px 0;font-size:16px;font-weight:700;color:#0f766e;border-top:1px solid #e2e8f0;">${formatNaira(order.total)}</td>
                  </tr>
                </table>`;
}

function renderScheduleTable(order: ConfirmationOrder): string {
  const cell = (label: string, value: string) => `
                    <td valign="top" width="50%" style="padding:0 12px 16px 0;">
                      <p style="margin:0;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">${escapeHtml(label)}</p>
                      <p style="margin:6px 0 0;font-size:15px;line-height:22px;color:#0f172a;">${escapeHtml(value)}</p>
                    </td>`;

  return `
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                  <tr>
                    ${cell("Pickup", `${order.pickupAddress}\n${formatOrderDate(order.pickupDate)} · ${getTimeSlotLabel(order.pickupTimeSlot)}`)}
                    ${cell("Delivery", `${order.deliveryAddress}\n${formatOrderDate(order.deliveryDate)} · ${getTimeSlotLabel(order.deliveryTimeSlot)}`)}
                  </tr>
                </table>`;
}

function renderInstructions(order: ConfirmationOrder): string {
  const instructions = order.specialInstructions?.trim();

  if (!instructions) {
    return "";
  }

  return `
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;background-color:#f8fafc;border-radius:12px;">
                  <tr>
                    <td style="padding:16px;">
                      <p style="margin:0;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">Special instructions</p>
                      <p style="margin:6px 0 0;font-size:14px;line-height:22px;color:#0f172a;">${escapeHtml(instructions)}</p>
                    </td>
                  </tr>
                </table>`;
}