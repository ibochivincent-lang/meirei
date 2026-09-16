import {
  generateWallet,
  fundTestnetAccountIfNeeded,
  establishUsdcTrustline,
} from "@/lib/wallet/stellar";
import {
  markWalletPending,
  saveWalletKeys,
  setWalletActive,
  markWalletFailed,
  findUserById,
} from "@/lib/users/repository";

/**
 * Provision a Stellar wallet for a user end-to-end.
 *
 * Status flow:
 *   none → pending → active   (happy path)
 *   none → pending → failed   (funding or trustline setup errored)
 *
 * 'failed' users are picked up by app/api/cron/retry-wallets, which also
 * sweeps up anyone left stranded in 'pending' by a crash mid-flight.
 *
 * Designed to be called from a fire-and-forget context (e.g. inside
 * `after()` in a webhook). Errors are caught and logged here rather than
 * propagated, because there's no useful response path for the caller —
 * the user already got their onboarding-complete message.
 *
 * The `pending` status is set BEFORE the network call so that a process
 * crash mid-flight leaves a clear trail: any user stuck in 'pending' for
 * longer than ~60s is recoverable by re-running this function.
 *
 * Unlike Circle's idempotencyKey, Stellar has no way to ask "give me back
 * the wallet you already made for this user" — a keypair is just generated,
 * with nothing server-side to dedupe against. So idempotency is handled
 * here instead, by persisting the generated address + encrypted secret
 * (saveWalletKeys) BEFORE funding or the trustline run: if a prior attempt
 * got that far before crashing, re-running this function resumes funding
 * the SAME account rather than generating and funding a second one, which
 * would abandon the first account's already-spent XLM reserve.
 *
 * Returns true on success, false on failure. Callers can use the return
 * value to decide whether to send an extra "your wallet is ready" message
 * or wait silently for the retry job.
 */
export async function provisionWalletForUser(
  userId: string,
): Promise<boolean> {
  try {
    await markWalletPending(userId);

    const existing = await findUserById(userId);
    let address: string;
    let secretCiphertext: string;

    if (existing?.wallet_address && existing.stellar_secret_ciphertext) {
      address = existing.wallet_address;
      secretCiphertext = existing.stellar_secret_ciphertext;
    } else {
      const generated = generateWallet();
      address = generated.address;
      secretCiphertext = generated.secretCiphertext;
      await saveWalletKeys({ userId, address, secretCiphertext });
    }

    await fundTestnetAccountIfNeeded(address);
    await establishUsdcTrustline(address, secretCiphertext);
    await setWalletActive({ userId, address });

    return true;
  } catch (err) {
    console.error("[wallet] provisioning failed", { userId, err });
    try {
      await markWalletFailed(userId);
    } catch (markErr) {
      console.error("[wallet] markWalletFailed also failed", {
        userId,
        markErr,
      });
    }
    return false;
  }
}
