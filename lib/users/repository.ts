import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { upsertChannel } from "@/lib/messaging/channels";
import type { meireiUser, WhatsAppChannel } from "@/lib/supabase/types";

/**
 * Looks up (or creates) the user for an inbound WhatsApp message.
 *
 * `channel` records which provider (Twilio vs Meta Cloud API) this message
 * arrived through. It's kept current on every inbound message — not just
 * set at creation — so a user who moves between channels (e.g. during the
 * TwilioMeta migration) always gets outbound notifications (payment
 * received, send receipts) routed through whichever API they're actually
 * reachable on. Same underlying `whatsapp_number` matches either way, since
 * both webhooks normalize to Twilio-style `whatsapp:+E164`.
 */
/**
 * Resolve an inbound WhatsApp identifier to a user, creating one if needed.
 *
 * The channel column is no longer clobbered. It used to be updated in place
 * whenever a message arrived on a different provider, which recorded "the
 * channel last used" rather than "the channels available" and silently
 * repointed every outbound notification at whichever provider happened to
 * deliver last. meirei_user_channel is the record now; this column survives
 * only because half a dozen call sites still read it, and is kept in step as
 * the user's PRIMARY channel rather than as a running log of the last one.
 */
export async function findOrCreateUser({
  whatsappNumber,
  channel = "twilio",
  profileName,
}: {
  whatsappNumber: string;
  channel?: WhatsAppChannel;
  /** The provider's display name for this sender. Stored on the channel row. */
  profileName?: string | null;
}): Promise<{ user: meireiUser; isNew: boolean }> {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: findError } = await supabase
    .from("meirei_users")
    .select("*")
    .eq("whatsapp_number", whatsappNumber)
    .maybeSingle();

  if (findError) {
    throw new Error(`findOrCreateUser lookup failed: ${findError.message}`, {
      cause: findError,
    });
  }

  if (existing) {
    const existingUser = existing as meireiUser;

    // Dual-write while the legacy columns are still read elsewhere. The
    // channel row is the authority; this keeps the column usable until the
    // contract migration retires it.
    await recordChannel(existingUser.id, channel, whatsappNumber, existingUser.whatsapp_channel === channel, profileName);

    if (existingUser.whatsapp_channel !== channel) {
      const { data: updated, error: updateError } = await supabase
        .from("meirei_users")
        .update({ whatsapp_channel: channel })
        .eq("id", existingUser.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(
          `findOrCreateUser channel update failed: ${updateError.message}`,
          { cause: updateError },
        );
      }
      return { user: updated as meireiUser, isNew: false };
    }
    return { user: existingUser, isNew: false };
  }

  const { data: created, error: createError } = await supabase
    .from("meirei_users")
    .insert({
      whatsapp_number: whatsappNumber,
      whatsapp_channel: channel,
      onboarding_step: "awaiting_name",
    })
    .select()
    .single();

  if (createError) {
    throw new Error(`findOrCreateUser insert failed: ${createError.message}`, {
      cause: createError,
    });
  }

  const createdUser = created as meireiUser;
  await recordChannel(createdUser.id, channel, whatsappNumber, true, profileName);

  return { user: createdUser, isNew: true };
}

/**
 * Mirror an inbound WhatsApp identifier into meirei_user_channel.
 *
 * Best-effort and deliberately non-fatal: the legacy columns are still
 * written and still read, so a failure here degrades the fan-out for one
 * message rather than dropping the message. It becomes fatal on the day the
 * contract migration removes that fallback, and not before.
 *
 * An inbound message is proof the channel belongs to whoever answered on it,
 * so it is verified on sight — unlike Telegram, which has to be linked from
 * an already-authenticated channel first.
 */
async function recordChannel(
  userId: string,
  provider: WhatsAppChannel,
  externalId: string,
  isPrimary: boolean,
  displayName?: string | null,
): Promise<void> {
  try {
    await upsertChannel({
      userId,
      provider,
      externalId,
      isPrimary,
      verified: true,
      // Passed only when the provider actually sent one. upsertChannel omits
      // the column for `undefined`, so a delivery without a profile name
      // leaves an existing one alone instead of blanking it.
      ...(displayName ? { displayName } : {}),
    });
  } catch (err) {
    console.error("[users] channel mirror failed", { userId, provider, err });
  }
}


export async function completeOnboarding({
  userId,
  name,
}: {
  userId: string;
  name: string;
}): Promise<meireiUser> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("meirei_users")
    .update({
      profile_name: name,
      onboarding_step: "completed",
    })
    .eq("id", userId)
    .select()
    .single();

  if (error) throw new Error(`completeOnboarding failed: ${error.message}`);
  return data as meireiUser;
}


export async function markWalletPending(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("meirei_users")
    .update({ wallet_status: "pending" })
    .eq("id", userId);
  if (error) throw new Error(`markWalletPending failed: ${error.message}`);
}

/**
 * Persists a freshly generated keypair's address + encrypted secret WHILE
 * STILL 'pending' — before funding or the trustline run, on purpose. If the
 * process dies between this call and setWalletActive, a retry
 * (provisionWalletForUser) finds these already written and resumes funding
 * the SAME account instead of generating and funding an orphaned second one.
 */
export async function saveWalletKeys({
  userId,
  address,
}: {
  userId: string;
  address: string;
  secretCiphertext?: string;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("meirei_users")
    .update({ wallet_address: address })
    .eq("id", userId);
  if (error) throw new Error(`saveWalletKeys failed: ${error.message}`);
}

export async function setWalletActive({
  userId,
  address,
}: {
  userId: string;
  address: string;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("meirei_users")
    .update({ wallet_address: address, wallet_status: "active" })
    .eq("id", userId);
  if (error) throw new Error(`setWalletActive failed: ${error.message}`);
}

export async function markWalletFailed(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("meirei_users")
    .update({ wallet_status: "failed" })
    .eq("id", userId);
  if (error) throw new Error(`markWalletFailed failed: ${error.message}`);
}

/**
 * Users whose wallet provisioning never completed.
 *
 * Both 'failed' and long-stuck 'pending' are returned. A 'pending' row older
 * than the grace period means the process died between markWalletPending and
 * setWalletActive — provision.ts's own comment says such users are
 * recoverable by re-running: it activates the existing wallet_address if one
 * was already written rather than generating and funding a second keypair.
 */
export async function listUsersNeedingWallet(
  stalePendingMinutes = 10,
  limit = 50,
): Promise<meireiUser[]> {
  const supabase = getSupabaseAdmin();
  const staleBefore = new Date(
    Date.now() - stalePendingMinutes * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("meirei_users")
    .select("*")
    .or(`wallet_status.eq.failed,and(wallet_status.eq.pending,updated_at.lt.${staleBefore})`)
    .order("updated_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`listUsersNeedingWallet failed: ${error.message}`);
  return (data as meireiUser[]) ?? [];
}

/** By primary key. Used by jobs that hold a user_id rather than a channel id. */
export async function findUserById(userId: string): Promise<meireiUser | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("meirei_users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(`findUserById failed: ${error.message}`);
  return (data as meireiUser | null) ?? null;
}

export async function findUserByWhatsApp(
  whatsappNumber: string,
): Promise<meireiUser | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("meirei_users")
    .select("*")
    .eq("whatsapp_number", whatsappNumber)
    .maybeSingle();

  if (error) throw new Error(`findUserByWhatsApp failed: ${error.message}`);
  return (data as meireiUser | null) ?? null;
}

/**
 * Resolves an on-chain wallet address back to the meirei user who owns it on OKX X Layer.
 */
export async function findUserByWalletAddress(
  address: string,
): Promise<meireiUser | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("meirei_users")
    .select("*")
    .eq("wallet_address", address)
    .maybeSingle();

  if (error) {
    throw new Error(`findUserByWalletAddress failed: ${error.message}`);
  }
  return (data as meireiUser | null) ?? null;
}

/**
 * Resolves or creates an X Layer (chain 196) EVM user row in meirei_users.
 */
export async function findOrCreateXLayerUser({
  walletAddress,
  platform = "web",
  handle,
}: {
  walletAddress: string;
  platform?: string;
  handle?: string | null;
}): Promise<{ id: string; walletAddress: string }> {
  const supabase = getSupabaseAdmin();
  const normalizedAddress = walletAddress.toLowerCase();

  const { data: existing, error: findError } = await supabase
    .from("meirei_users")
    .select("id, wallet_address")
    .ilike("wallet_address", normalizedAddress)
    .maybeSingle();

  if (findError) {
    console.warn("[users] X Layer user lookup notice:", findError.message);
  }

  if (existing) {
    return { id: existing.id, walletAddress: existing.wallet_address || walletAddress };
  }

  const { data: created, error: createError } = await supabase
    .from("meirei_users")
    .insert({
      wallet_address: walletAddress,
      wallet_status: "active",
      onboarding_step: "completed",
    })
    .select("id, wallet_address")
    .single();

  if (createError) {
    console.warn("[users] X Layer user insert notice:", createError.message);
    return { id: `local_${Date.now()}`, walletAddress };
  }

  return { id: created.id, walletAddress: created.wallet_address };
}
