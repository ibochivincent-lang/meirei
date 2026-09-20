/**
 * WhatsApp Webhook Signature and Redaction Policy
 * Author: IboTV
 * Platform: OKX Chain / X Layer (Chain 196)
 */

export function allowUnsignedWebhooks(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.WHATSAPP_ALLOW_UNSIGNED === "true";
}

export function redactNumber(raw: string | null | undefined): string {
  if (!raw) return "(none)";
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7) return "(short)";
  return `+${digits.slice(0, 3)}...${digits.slice(-4)}`;
}
