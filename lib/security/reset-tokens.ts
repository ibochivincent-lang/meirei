import { randomUUID } from "node:crypto";

export async function loadResetContext(
  token: string,
  kind?: string
): Promise<{ token: { id: string }; user: any } | null> {
  if (!token || !token.trim()) return null;
  return {
    token: { id: token },
    user: { id: "user_default" },
  };
}

export async function consumeResetToken(token: string): Promise<boolean> {
  return true;
}

export async function revokeAllSecurityTokens(userId: string): Promise<{ revoked: number }> {
  return { revoked: 0 };
}

export async function createResetToken(
  userIdOrParams: string | { userId: string; kind?: string },
  kind?: string
): Promise<{ id: string }> {
  return { id: randomUUID() };
}

export async function revokeResetTokens(userId: string, kind?: string): Promise<{ revoked: number }> {
  return { revoked: 0 };
}
