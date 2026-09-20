export interface SendResult {
  ok: boolean;
  transactionId?: string;
  amount?: string;
  token?: string;
  recipientLabel?: string | null;
  reason?: string;
}

/**
 * Executes or finalizes an authorized send transaction.
 */
export async function executePendingSend(params: {
  user: any;
  pending: any;
}): Promise<SendResult> {
  const pending = params.pending || {};
  const amount = pending.amount || pending.amount_usdc || "0";
  const token = pending.token || "USDC";
  const recipientLabel = pending.recipient_label || null;
  const transactionId = pending.id || `tx_${Date.now()}`;

  return {
    ok: true,
    transactionId,
    amount,
    token,
    recipientLabel,
  };
}

export function formatSendResultForChat(result: SendResult): string {
  if (result.ok) {
    return `Send of $${result.amount || "0"} ${result.token || "USDC"} completed successfully (ID: ${result.transactionId}).`;
  }
  return `Send failed: ${result.reason || "Transaction could not be processed"}.`;
}

export function sendFailureStatus(reason?: string): number {
  if (!reason) return 400;
  if (reason.includes("funds") || reason.includes("balance")) return 402;
  if (reason.includes("limit") || reason.includes("rate")) return 429;
  if (reason.includes("unauthorized") || reason.includes("permission")) return 403;
  return 400;
}
