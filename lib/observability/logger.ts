import { randomUUID } from "node:crypto";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface LogPayload {
  level: LogLevel;
  action: string;
  correlationId?: string;
  profileId?: string;
  walletAddress?: string;
  channel?: "telegram" | "whatsapp" | "web" | "mcp" | "internal";
  durationMs?: number;
  error?: string;
  details?: Record<string, unknown>;
}

/**
 * Sanitizes potentially sensitive keys from log payloads
 */
function sanitizeDetails(details?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!details) return undefined;
  const sensitiveKeys = ["otp", "code", "secret", "token", "password", "privatekey", "key"];
  const clean: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(details)) {
    if (sensitiveKeys.some((s) => k.toLowerCase().includes(s))) {
      clean[k] = "[REDACTED]";
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      clean[k] = sanitizeDetails(v as Record<string, unknown>);
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

/**
 * Generates a standard correlation ID for request tracing
 */
export function generateCorrelationId(prefix = "corr"): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

/**
 * Structured logger for institutional-grade auditability across Vercel / serverless logs
 */
export function logEvent(payload: LogPayload): void {
  const entry = {
    timestamp: new Date().toISOString(),
    service: "meirei",
    level: payload.level,
    action: payload.action,
    correlationId: payload.correlationId || generateCorrelationId(),
    ...(payload.profileId ? { profileId: payload.profileId } : {}),
    ...(payload.walletAddress ? { walletAddress: payload.walletAddress.toLowerCase() } : {}),
    ...(payload.channel ? { channel: payload.channel } : {}),
    ...(typeof payload.durationMs === "number" ? { durationMs: Math.round(payload.durationMs) } : {}),
    ...(payload.error ? { error: payload.error } : {}),
    ...(payload.details ? { details: sanitizeDetails(payload.details) } : {}),
  };

  const line = JSON.stringify(entry);

  switch (payload.level) {
    case "ERROR":
      console.error(line);
      break;
    case "WARN":
      console.warn(line);
      break;
    case "DEBUG":
      console.debug(line);
      break;
    case "INFO":
    default:
      console.log(line);
      break;
  }
}

export const logger = {
  info: (
    action: string,
    messageOrDetails?: string | Record<string, unknown>,
    extraOrDetails?: Partial<LogPayload> | Record<string, unknown>
  ) => {
    const isMsg = typeof messageOrDetails === "string";
    const details = isMsg
      ? { message: messageOrDetails, ...(extraOrDetails as Record<string, unknown>) }
      : messageOrDetails;
    logEvent({ level: "INFO", action, details, ...(isMsg ? {} : (extraOrDetails as Partial<LogPayload>)) });
  },
  warn: (
    action: string,
    messageOrDetails?: string | Record<string, unknown>,
    extraOrDetails?: Partial<LogPayload> | Record<string, unknown>
  ) => {
    const isMsg = typeof messageOrDetails === "string";
    const details = isMsg
      ? { message: messageOrDetails, ...(extraOrDetails as Record<string, unknown>) }
      : messageOrDetails;
    logEvent({ level: "WARN", action, details, ...(isMsg ? {} : (extraOrDetails as Partial<LogPayload>)) });
  },
  error: (action: string, error?: string | unknown, extra?: Partial<LogPayload>) =>
    logEvent({
      level: "ERROR",
      action,
      error: typeof error === "string" ? error : error instanceof Error ? error.message : JSON.stringify(error),
      ...extra,
    }),
  debug: (
    action: string,
    messageOrDetails?: string | Record<string, unknown>,
    extraOrDetails?: Partial<LogPayload> | Record<string, unknown>
  ) => {
    const isMsg = typeof messageOrDetails === "string";
    const details = isMsg
      ? { message: messageOrDetails, ...(extraOrDetails as Record<string, unknown>) }
      : messageOrDetails;
    logEvent({ level: "DEBUG", action, details, ...(isMsg ? {} : (extraOrDetails as Partial<LogPayload>)) });
  },
};

