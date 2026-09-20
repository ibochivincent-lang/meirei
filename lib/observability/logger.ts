type LogLevel = "INFO" | "WARN" | "ERROR" | "FATAL";

interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  walletPrefix?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
  };
}

/**
 * Sanitizes metadata to prevent logging sensitive keys, secrets, or full tokens.
 */
function sanitizeMetadata(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const sanitized: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(meta)) {
    const lowerKey = k.toLowerCase();
    if (
      lowerKey.includes("key") ||
      lowerKey.includes("secret") ||
      lowerKey.includes("token") ||
      lowerKey.includes("code") ||
      lowerKey.includes("auth")
    ) {
      sanitized[k] = "[REDACTED]";
    } else if (typeof v === "string" && v.startsWith("0x") && v.length === 42) {
      sanitized[k] = `${v.slice(0, 6)}...${v.slice(-4)}`;
    } else {
      sanitized[k] = v;
    }
  }

  return sanitized;
}

export const logger = {
  info(context: string, message: string, metadata?: Record<string, unknown>, wallet?: string): void {
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level: "INFO",
      context,
      message,
      walletPrefix: wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : undefined,
      metadata: sanitizeMetadata(metadata),
    };
    console.log(JSON.stringify(entry));
  },

  warn(context: string, message: string, metadata?: Record<string, unknown>, wallet?: string): void {
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level: "WARN",
      context,
      message,
      walletPrefix: wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : undefined,
      metadata: sanitizeMetadata(metadata),
    };
    console.warn(JSON.stringify(entry));
  },

  error(context: string, message: string, err?: unknown, metadata?: Record<string, unknown>, wallet?: string): void {
    const errorDetails =
      err instanceof Error
        ? { name: err.name, message: err.message, stack: err.stack }
        : err
        ? { message: String(err) }
        : undefined;

    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level: "ERROR",
      context,
      message,
      walletPrefix: wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : undefined,
      metadata: sanitizeMetadata(metadata),
      error: errorDetails,
    };
    console.error(JSON.stringify(entry));
  },
};
