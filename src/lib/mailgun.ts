/**
 * Mailgun transport (server only).
 *
 * Implemented with the platform `fetch` + `FormData` against Mailgun's HTTP API, so no
 * extra dependency is required and the same code runs locally and on Vercel.
 *
 * IMPORTANT: sending is always optional. If Mailgun is not configured, or the API call
 * fails, the *caller* must keep the order. See `src/actions/checkout.ts`.
 */

export type SendEmailInput = {
  to: string;
  subject: string;
  /** HTML body (always provided together with a plain-text fallback). */
  html: string;
  /** Plain-text fallback. */
  text: string;
  replyTo?: string;
};

export type SendEmailResult =
  | { status: "sent" }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

function readConfig() {
  const apiKey = process.env.MAILGUN_API_KEY?.trim();
  const domain = process.env.MAILGUN_DOMAIN?.trim();
  const from = process.env.MAILGUN_FROM?.trim();
  // EU-hosted Mailgun domains live behind a different base URL.
  const apiBase = (
    process.env.MAILGUN_API_BASE?.trim() ?? "https://api.mailgun.net"
  ).replace(/\/+$/, "");

  return { apiKey, domain, from, apiBase };
}

export function isMailgunConfigured(): boolean {
  const { apiKey, domain, from } = readConfig();
  return Boolean(apiKey && domain && from);
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const { apiKey, domain, from, apiBase } = readConfig();

  if (!apiKey || !domain || !from) {
    const reason =
      "Mailgun is not configured (MAILGUN_API_KEY / MAILGUN_DOMAIN / MAILGUN_FROM)";
    console.warn(`[freshpress] skipping email: ${reason}`);
    return { status: "skipped", reason };
  }

  const form = new FormData();
  form.set("from", from);
  form.set("to", input.to);
  form.set("subject", input.subject);
  form.set("text", input.text);
  form.set("html", input.html);

  if (input.replyTo) {
    form.set("h:Reply-To", input.replyTo);
  }

  const authorization = `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`;

  try {
    const response = await fetch(`${apiBase}/v3/${domain}/messages`, {
      method: "POST",
      headers: { Authorization: authorization },
      body: form,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(
        `[freshpress] Mailgun rejected the message (${response.status}): ${detail.slice(0, 500)}`,
      );
      return {
        status: "failed",
        error: `Mailgun responded with ${response.status}`,
      };
    }

    return { status: "sent" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[freshpress] Mailgun request failed: ${message}`);
    return { status: "failed", error: message };
  }
}