import type { MessageProvider } from "@/lib/messaging/processed-messages";

export type OnboardingStep = "awaiting_name" | "completed";
export type WalletStatus = "none" | "pending" | "active" | "failed";
export type WhatsAppChannel = "twilio" | "meta";

export interface meireiUser {
  id: string;
  whatsapp_number: string;
  whatsapp_channel: WhatsAppChannel;
  profile_name: string | null;
  onboarding_step: OnboardingStep;
  /** An OKX X Layer (Chain ID 196) public address. */
  wallet_address: string | null;
  wallet_status: WalletStatus;
  pin_hash: string | null;
  pin_salt: string | null;
  /**
   * When the current PIN was set or last reset.
   *
   * Unfreezing requires a factor that predates the freeze, and without this
   * a PIN could not prove that. See migrations/0019_pin_set_at.sql.
   */
  pin_set_at: string | null;
  /**
   * Set when the account is frozen, cleared when it is lifted. Deliberately
   * NOT a wallet_status value — see migrations/0012_account_freeze.sql for
   * why, and lib/users/wallet-gate.ts for who is allowed to care.
   */
  frozen_at: string | null;
  frozen_reason: string | null;
  frozen_source: FreezeSource | null;
  /** scrypt hash of the freeze-only panic code. Never authorizes anything. */
  panic_code_hash: string | null;
  created_at: string;
  updated_at: string;
}

export type FreezeSource =
  | "whatsapp"
  | "telegram"
  | "panic_code"
  | "web"
  | "operator"
  | "auto";

export type PendingActionKind = "flow" | "confirm" | "send" | "save_beneficiary";

/**
 * Backend-initiated multi-turn conversation state — one active conversation
 * per user, upserted on user_id. Runs entirely through sendam-ai's stateless
 * POST /flow/start + POST /decode {token} mechanism (see
 * lib/sendam-ai/client.ts): this row just stores the opaque token between
 * messages and forwards it back, it never parses the token's contents.
 * Pending sends live in their own table (`PendingSend` below) so that
 * starting a new send never collides with this or with another still-
 * pending send.
 */
export interface PendingAction {
  id: string;
  user_id: string;
  kind: PendingActionKind;
  payload: PendingActionPayload;
  expires_at: string;
  created_at: string;
}

/**
 * A destructive action proposed in one message and carried out in the next.
 *
 * Shares the table with `flow` because it shares the property that matters:
 * one per user, upserted, short TTL. It does NOT share the mechanism —
 * nothing about resolving one of these touches sendam-ai, and that is the
 * entire point. The freeze confirmation has to work when the decoder is the
 * thing that is down. See lib/agent/confirm-action.ts.
 */
export interface ConfirmPendingPayload {
  action: "freeze";
  source: FreezeSource;
  reason: string;
}

/**
 * The guided send, held one question at a time.
 *
 * Shares the table with `flow` and `confirm` for the same reason they share it
 * with each other: one per user, upserted, short TTL. Like `confirm` and
 * unlike `flow`, it touches sendam-ai at NO point — the recipient and the
 * amount are parsed locally by lib/agent/send-flow.ts.
 *
 * That is not a performance choice. This is the composition half of a
 * transfer, and the file that decides how much money moves is the last one
 * that should ask a language model to interpret a number. The decoder still
 * handles free-form sends ("send 5 to chidi"), where a wrong reading produces
 * a confirm prompt the user can read and reject; here the user is answering a
 * question we asked, so the answer is parsed with an anchored pattern or not
 * accepted at all.
 *
 * `kind: "send"` was already permitted by the CHECK constraint that migration
 * 0021 rewrote, so this needs no migration.
 */
export interface SendFlowPendingPayload {
  action: "send";
  step: "recipient" | "amount";
  /**
   * Exactly what the user picked or typed at the recipient step, unresolved.
   *
   * Stored raw on purpose. Resolving it to an address here would freeze a
   * lookup for the length of the conversation, and startSendFlow already does
   * that resolution immediately before the limits check — so a beneficiary
   * deleted, or a recipient whose wallet finished provisioning, in the seconds
   * between the two questions is read correctly rather than from a snapshot.
   */
  recipient?: string;
  /**
   * Set when the amount arrived before the recipient — "send 5", or a bare
   * "5" answered to "who are you sending to?". Held so the next question is
   * "5 USDC to who?" rather than starting the pair over.
   */
  amount?: string;
}

export type PendingActionPayload =
  | FlowPendingPayload
  | ConfirmPendingPayload
  | SendFlowPendingPayload
  | BeneficiaryPendingPayload;

/**
 * "Want to save this recipient?", held between messages.
 *
 * Shares the table with `flow`, `confirm` and `send` for the reason they all
 * share it: one per user, upserted, short TTL. Like `confirm` and `send`, and
 * UNLIKE `flow`, it touches sendam-ai at no point — and that is the whole
 * reason this shape exists.
 *
 * It used to be a `flow` row: the recipient lived inside an opaque sendam-ai
 * token and the only way to read a reply was to send it back to /decode. That
 * made a courtesy question depend on a network call twice over. Minting the
 * token happened BEFORE the question was sent, inside one try/catch, so a
 * single /flow/start timeout — or, far more often, a circuit breaker that
 * /decode had already tripped — meant the user was simply never asked, with
 * nothing but a log line to say so and no second chance, because by then the
 * send was finished and its row was gone.
 *
 * So the recipient is stored here in the clear and the answer is read by
 * lib/agent/beneficiary-flow.ts, which is anchored patterns and nothing else.
 * The decoder was never doing the part that needed judgement: an unrecognised
 * reply is offered back as a proposed name ("Did you mean to save them as
 * X?"), which is self-correcting in a way a model's guess is not.
 */
export interface BeneficiaryPendingPayload {
  action: "save_beneficiary";
  /**
   * Which question is outstanding.
   *
   * `confirm` — "save them?", answered yes/no, or with a name the user
   * assumed we were asking for.
   * `name` — "what should we call them?", answered with the label itself.
   */
  step: "confirm" | "name";
  /**
   * The recipient, captured at send time rather than looked up later. The
   * send is already complete when this row is written, so there is nothing
   * left to re-resolve — and a name the user gives ten minutes from now must
   * attach to the address the money actually went to.
   */
  recipientAddress: string;
  recipientUserId: string | null;
  recipientWhatsappNumber: string | null;
  /** How the recipient was described in the receipt, for the question text. */
  suggestedLabel: string;
  /**
   * A name read out of an unrecognised reply at the `confirm` step, waiting
   * for a yes. Set only alongside `step: "confirm"`; a yes then saves under
   * it directly instead of asking for a name that was already given.
   */
  proposedLabel?: string;
}


/**
 * A pending send. No per-user uniqueness — a user can have several of
 * these at once, each with its own confirm link (the link token IS the
 * row id). Deleted on execution or cancellation, or left to expire (5 min
 * TTL) if the user never confirms.
 */
export interface PendingSend {
  id: string;
  user_id: string;
  payload: SendPayload;
  expires_at: string;
  created_at: string;
  /** Set when a confirm won the race and the transfer was handed to Circle. */
  claimed_at: string | null;
  /** How a claimed send resolved. 'unknown' means it may or may not have landed. */
  outcome: "sent" | "failed" | "unknown" | null;
}

export type HeldSendState =
  | "holding"
  | "executing"
  | "sent"
  | "failed"
  | "unknown"
  | "cancelled";

/**
 * A send that was authorized on a normal confirm link and then embargoed.
 *
 * Not an unconfirmed send: the user already proved their factor. Only
 * execution is delayed, which is what makes it safe for a cron job to carry
 * out later without a further gesture. See migrations/0015_held_sends.sql.
 */
export interface HeldSend {
  id: string;
  user_id: string;
  payload: SendPayload;
  authorized_at: string;
  release_at: string;
  state: HeldSendState;
  cancelled_at: string | null;
  cancelled_by: string | null;
  created_at: string;
}

export interface SendPayload {
  /** The USDC amount the user typed and what's transferred on-chain. */
  amount: string;
  token: "USDC";
  recipientUserId: string | null;
  recipientName: string | null;
  recipientAddress: string;
  recipientWhatsappNumber: string | null;
  /**
   * Which channel this send was started from.
   *
   * Recorded so the confirm page can return the user to the chat they came
   * from. Without it the page falls back to `user.whatsapp_channel`, which
   * is where a Telegram sender used to be thrown — into an app that may hold
   * no meirei conversation at all, with the receipt sitting somewhere else.
   *
   * Optional because rows created before this existed do not have it, and
   * a five-minute TTL means "before this existed" stops mattering quickly.
   */
  origin?: MessageProvider;
}

/** Payload for a pending flow conversation: the flow name (backend-defined,
 *  opaque to sendam-ai) and the signed continuation token to forward on the
 *  user's next reply. */
export interface FlowPendingPayload {
  flow: string;
  token: string;
  /**
   * Consecutive decodeFollowUp failures against this token.
   *
   * The row is deliberately kept when a decode fails, so the user's retry
   * hits the same token rather than the flow fabricating progress. But an
   * expired-server-side token throws forever, and while it does, EVERY
   * message the user sends is captured by the flow handler and answered with
   * the same error — for up to the full 15-minute TTL, whatever they
   * actually typed. Counting the failures is what lets the flow give up and
   * hand the conversation back.
   */
  failures?: number;
}

export interface Beneficiary {
  id: string;
  user_id: string;
  label: string;
  recipient_user_id: string | null;
  recipient_address: string;
  recipient_whatsapp_number: string | null;
  created_at: string;
}

export type TransactionDirection = "sent" | "received";
export type TransactionStatus = "submitted" | "complete";

export interface meireiTransaction {
  id: string;
  user_id: string;
  direction: TransactionDirection;
  amount_usdc: string;
  token: string;
  counterparty_label: string | null;
  counterparty_address: string | null;
  tx_hash: string | null;
  status: TransactionStatus;
  created_at: string;
}

// -------------------------------------------------------------------------
// Meirei X Layer (Chain 196) Types
// -------------------------------------------------------------------------

export interface MeireiXLayerUser {
  id: string;
  wallet_address: string;
  platform: string;
  handle: string | null;
  created_at: string;
  updated_at: string;
}

export type MandateStatus = "active" | "paused" | "completed" | "cancelled";

export interface MeireiMandateRecord {
  id: string;
  user_id: string | null;
  wallet_address: string;
  rule_text: string;
  targets: Array<{ symbol: string; weight: number }>;
  cash_symbol: "USDG" | "USDC";
  rebalance_band: number;
  frequency: string;
  status: MandateStatus;
  last_rebalanced_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ExecutionStatus = "preview" | "success" | "failed";

export interface MeireiExecutionRecord {
  id: string;
  mandate_id: string | null;
  wallet_address: string;
  legs: unknown[];
  tx_hashes: string[];
  total_notional_usd: number;
  fee_amount: number;
  fee_asset: string;
  status: ExecutionStatus;
  error_message: string | null;
  executed_at: string;
}

export interface MeireiPortfolioSnapshot {
  id: string;
  wallet_address: string;
  total_usd: number;
  holdings: Array<{ symbol: string; amount: number; valueUsd: number }>;
  captured_at: string;
}

export type KycTier = "tier_0_basic" | "tier_1_verified" | "tier_2_accredited" | "tier_3_institutional";
export type AmlStatus = "clean" | "flagged" | "under_review";
export type TwoFactorMethod = "email" | "passkey" | "both";
export type UserPrimaryChannel = "whatsapp" | "telegram" | "instagram" | "web" | "okx_wallet";

/**
 * System-specific non-custodial user profile.
 * STRICT SECURITY PRINCIPLE: Private keys are NEVER stored in the database.
 * The primary universal identity signature across devices is the user's verified email,
 * cryptographically linked to their non-custodial OKX Layer wallet and WebAuthn Passkeys.
 */
export interface MeireiIdentityUser {
  id: string;
  email: string;
  is_email_verified: boolean;
  wallet_address: string;
  primary_channel: UserPrimaryChannel;
  whatsapp_number: string | null;
  telegram_id: string | null;
  instagram_handle: string | null;
  is_bot_active: boolean;
  two_factor_method: TwoFactorMethod;
  passkey_credential_id: string | null;
  passkey_public_key: string | null;
  kyc_tier: KycTier;
  aml_status: AmlStatus;
  is_sanction_screened: boolean;
  daily_spending_cap_usd: number;
  created_at: string;
  updated_at: string;
  last_login_at: string;
}

export interface MeireiUserDevice {
  id: string;
  user_id: string;
  channel: "whatsapp" | "telegram" | "instagram" | "web" | "mobile_browser";
  device_fingerprint: string;
  user_agent: string | null;
  ip_address: string | null;
  is_trusted: boolean;
  last_active_at: string;
  created_at: string;
}

export interface MeireiAuthChallengeRecord {
  id: string;
  user_id: string | null;
  email: string;
  challenge_type: "email_otp" | "passkey" | "bot_pairing";
  code_hash: string;
  purpose: "login" | "device_recovery" | "trade_authorization" | "bot_activation";
  is_used: boolean;
  attempts: number;
  max_attempts: number;
  expires_at: string;
  created_at: string;
}

export interface MeireiComplianceLog {
  id: string;
  user_id: string | null;
  wallet_address: string;
  event_type:
    | "kyc_verification"
    | "sanction_screen_cleared"
    | "sanction_screen_flagged"
    | "otp_auth_success"
    | "otp_auth_failed"
    | "passkey_registered"
    | "spending_cap_exceeded"
    | "bot_channel_linked";
  metadata: Record<string, unknown>;
  recorded_at: string;
}

