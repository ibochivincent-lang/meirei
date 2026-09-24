import { getRedisClient } from "@/lib/redis/client";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { FreezeSource } from "@/lib/supabase/types";
import { revokeAllSecurityTokens } from "@/lib/security/reset-tokens";
import { deletePending, getActivePending } from "@/lib/pending_actions/repository";
import { raiseAlert } from "@/lib/observability/alerts";

export interface FreezeResult {
  cancelledSends: number;
  cancelledHolds: number;
  changed: boolean;
}

const inMemoryFrozen = new Map<string, { source: FreezeSource; reason?: string; frozenAt: string }>();

/**
 * Checks whether an account/profile is frozen across Upstash Redis (primary ephemeral store),
 * Supabase (durable record), or in-memory fallback.
 */
export async function isAccountFrozen(userId: string): Promise<boolean> {
  const id = userId.trim().toLowerCase();
  const redis = getRedisClient();
  if (redis) {
    try {
      const val = await redis.get(`freeze:${id}`);
      if (val) return true;
    } catch {
      // fallback
    }
  }

  if (inMemoryFrozen.has(id)) {
    return true;
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from("meirei_users")
        .select("frozen_at")
        .eq("id", userId)
        .single();
      return Boolean(data?.frozen_at);
    } catch {
      // ignore
    }
  }

  return false;
}

export function isAccountFrozenInMemory(userId: string): boolean {
  return inMemoryFrozen.has(userId.trim().toLowerCase());
}

/**
 * Freezes an account across Upstash Redis and Supabase.
 * Redis key: `SET freeze:{profileId} 1` with no expiry, cleared only on successful /unfreeze.
 */
export async function freezeAccount({
  userId,
  source,
  reason,
}: {
  userId: string;
  source: FreezeSource;
  reason?: string;
}): Promise<FreezeResult> {
  const id = userId.trim().toLowerCase();
  const redis = getRedisClient();

  let changed = false;
  const wasInMemory = inMemoryFrozen.has(id);
  inMemoryFrozen.set(id, {
    source,
    reason,
    frozenAt: new Date().toISOString(),
  });
  if (!wasInMemory) changed = true;

  // Primary: Upstash Redis with no expiry
  if (redis) {
    try {
      const previous = await redis.get(`freeze:${id}`);
      if (!previous) {
        await redis.set(`freeze:${id}`, "1");
        changed = true;
      }
    } catch (err) {
      console.warn("[freeze] Redis write notice:", err);
    }
  }

  // Durable mirror: Supabase if configured
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from("meirei_users")
        .update({
          frozen_at: new Date().toISOString(),
          frozen_source: source,
          frozen_reason: reason ?? null,
        })
        .eq("id", userId)
        .is("frozen_at", null)
        .select("id");

      if (data && data.length > 0) changed = true;
    } catch (err) {
      console.warn("[freeze] Supabase mirror notice:", err);
    }
  }

  // Revoke security tokens and clean pending actions
  try {
    await revokeAllSecurityTokens(userId);
  } catch (err) {
    console.warn("[freeze] Revoking security tokens notice:", err);
  }

  try {
    const pendingFlow = await getActivePending(userId);
    if (pendingFlow) await deletePending(pendingFlow.id);
  } catch (err) {
    console.warn("[freeze] Clearing pending actions notice:", err);
  }

  if (changed) {
    raiseAlert({
      kind: "account_frozen",
      message: `Account [${userId}] was frozen via ${source} on OKX X Layer. All actions halted.`,
      context: { source },
      force: true,
    });
  }

  console.log("[freeze] Account frozen successfully", { userId: id, source, changed });
  return { cancelledSends: 0, cancelledHolds: 0, changed };
}

/**
 * Lifts an account freeze by deleting the Redis key `freeze:{profileId}`
 * and clearing the Supabase/in-memory records upon successful verification.
 */
export async function unfreezeAccount({
  userId,
  source,
}: {
  userId: string;
  source: FreezeSource;
}): Promise<boolean> {
  const id = userId.trim().toLowerCase();
  const redis = getRedisClient();

  let changed = false;
  if (inMemoryFrozen.has(id)) {
    inMemoryFrozen.delete(id);
    changed = true;
  }

  // Primary: delete key from Upstash Redis
  if (redis) {
    try {
      const deleted = await redis.del(`freeze:${id}`);
      if (deleted > 0) changed = true;
    } catch (err) {
      console.warn("[unfreeze] Redis delete notice:", err);
    }
  }

  // Durable mirror: Supabase if configured
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from("meirei_users")
        .update({ frozen_at: null, frozen_reason: null, frozen_source: null })
        .eq("id", userId)
        .not("frozen_at", "is", null)
        .select("id");

      if (data && data.length > 0) changed = true;
    } catch (err) {
      console.warn("[unfreeze] Supabase mirror notice:", err);
    }
  }

  if (changed) {
    raiseAlert({
      kind: "account_unfrozen",
      message: `Account [${userId}] was unfrozen via ${source}. Normal operations restored.`,
      context: { source },
      force: true,
    });
  }

  console.log("[unfreeze] Account unfrozen successfully", { userId: id, source, changed });
  return changed;
}
