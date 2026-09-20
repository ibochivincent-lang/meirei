import { NextRequest, NextResponse } from "next/server";

export const MAX_PAYLOAD_BYTES = 1024 * 1024; // 1 MB payload limit
export const DEFAULT_API_TIMEOUT_MS = 10_000; // 10s timeout

/**
 * Validates request payload size against hard ceiling.
 */
export function validatePayloadSize(req: NextRequest): { valid: boolean; error?: string } {
  const contentLength = req.headers.get("content-length");
  if (contentLength) {
    const bytes = parseInt(contentLength, 10);
    if (bytes > MAX_PAYLOAD_BYTES) {
      return {
        valid: false,
        error: `Payload too large. Maximum permitted request size is 1MB. Received: ${(bytes / (1024 * 1024)).toFixed(2)}MB.`,
      };
    }
  }
  return { valid: true };
}

/**
 * Wraps an async operation with a hard timeout guarantee.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = DEFAULT_API_TIMEOUT_MS,
  operationName = "Operation"
): Promise<T> {
  let timerId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms. Network or RPC node was unresponsive.`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result;
  } finally {
    if (timerId) clearTimeout(timerId);
  }
}
