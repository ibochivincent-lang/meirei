import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Once-only processing for inbound chat messages.
 *
 * Twilio and Meta both redeliver: a slow response, a non-2xx, or their own
 * retry policy hands us the same message again. Handling it twice sends a
 * second reply and, worse, mints a second confirm link for a send the user
 * asked for once — `createPendingSend` is a plain insert on purpose, so a
 * user can hold several at a time, which means nothing downstream can tell a
 * duplicate from a deliberate second send.
 *
 * Built with dedicated message deduplication helpers to ensure all chat
 * webhooks remain idempotent across retried delivery attempts.
 */

const TABLE = "meirei_processed_message";

/** Postgres unique_violation — the key is already claimed. */
const UNIQUE_VIOLATION = "23505";

export type MessageProvider = "twilio" | "meta" | "telegram";

/**
 * Namespaced because the providers mint ids independently and nothing says
 * they cannot collide. Cannot be retrofitted once rows exist.
 */
export function messageKey(provider: MessageProvider, messageId: string): string {
  return `${provider}:${messageId}`;
}

/**
 * Returns true if this caller now owns the message, false if it was already
 * handled.
 *
 * Fails CLOSED: an unexpected database error throws rather than returning
 * true. This does mean the table must exist before the code that calls it
 * deploys — the same ordering requirement as migrations 0007, 0008 and 0011.
 */
export async function claimMessage({
  provider,
  messageId,
}: {
  provider: MessageProvider;
  messageId: string;
}): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from(TABLE).insert({
    key: messageKey(provider, messageId),
    provider,
    message_id: messageId,
  });

  if (!error) return true;
  if (error.code === UNIQUE_VIOLATION) return false;

  throw new Error(`claimMessage failed: ${error.message}`);
}

/**
 * Give the claim back so the provider's retry can do the work.
 *
 * Without this, a claim taken immediately before a transient failure would
 * permanently swallow the user's message: they typed something, got no
 * answer, and retyping it produces the same silence because the provider is
 * sending the same id. Losing a turn is the exact failure this whole phase
 * exists to remove, so releasing on the error path is not optional.
 *
 * Never throws: it runs on a path that is already handling an error.
 */
export async function releaseMessage({
  provider,
  messageId,
}: {
  provider: MessageProvider;
  messageId: string;
}): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq("key", messageKey(provider, messageId));
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error("[messaging] claim release failed", { provider, messageId, err });
  }
}
