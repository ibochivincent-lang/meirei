"use client";

/**
 * Meirei OKX X Layer Wallet Connection & Channel Linkage Portal
 * Author: IboTV
 * Platform: OKX X Layer Mainnet (Chain ID 196)
 */

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BrandMark } from "@/components/ui/brand-mark";
import {
  XLAYER_CHAIN_ID_DECIMAL,
  XLAYER_CHAIN_ID_HEX,
  XLAYER_NETWORK_PARAMS,
  formatShortAddress,
} from "@/lib/wallet/xlayer";
import { getInjectedProvider } from "@/lib/wallet/xlayer_signer";

function ConnectWalletContent() {
  const searchParams = useSearchParams();
  const channel = searchParams.get("channel") || "whatsapp";
  const rawHandle = searchParams.get("handle") || "";
  const cleanHandle = rawHandle.trim() || "+234 902 827 9382";

  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const [providerName, setProviderName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check initial provider and accounts
  useEffect(() => {
    const provider = getInjectedProvider();
    if (provider) {
      const win = window as any;
      const name = win.okxwallet || provider.isOkxWallet ? "OKX Wallet" : provider.isMetaMask ? "MetaMask" : "Web3 Injected";
      setProviderName(name);

      provider
        .request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            setConnectedAddress(accounts[0].toLowerCase());
          }
        })
        .catch(() => {});

      provider
        .request({ method: "eth_chainId" })
        .then((rawId: string) => {
          const id = parseInt(rawId, 16);
          setCurrentChainId(id);
        })
        .catch(() => {});
    }
  }, []);

  const handleConnectWallet = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const provider = getInjectedProvider();
      if (!provider) {
        throw new Error(
          "No Web3 wallet extension detected. Please install OKX Wallet or open this page inside the OKX App browser."
        );
      }

      // 1. Request account connection
      const accounts: string[] = await provider.request({ method: "eth_requestAccounts" });
      if (!accounts || accounts.length === 0) {
        throw new Error("No account authorized by wallet.");
      }

      const activeAddr = accounts[0].toLowerCase();
      setConnectedAddress(activeAddr);

      // 2. Verify or switch network to OKX X Layer (Chain ID 196)
      const rawChainId: string = await provider.request({ method: "eth_chainId" });
      let chainId = parseInt(rawChainId, 16);

      if (chainId !== XLAYER_CHAIN_ID_DECIMAL) {
        try {
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: XLAYER_CHAIN_ID_HEX }],
          });
          chainId = XLAYER_CHAIN_ID_DECIMAL;
        } catch (switchErr: any) {
          if (switchErr.code === 4902) {
            await provider.request({
              method: "wallet_addEthereumChain",
              params: [XLAYER_NETWORK_PARAMS],
            });
            chainId = XLAYER_CHAIN_ID_DECIMAL;
          } else {
            throw new Error(`Failed to switch to OKX X Layer: ${switchErr.message}`);
          }
        }
      }

      setCurrentChainId(chainId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkToChannel = async () => {
    if (!connectedAddress) {
      setErrorMessage("Please connect your OKX Wallet first.");
      return;
    }

    setIsLinking(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/wallet/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          handle: cleanHandle,
          walletAddress: connectedAddress,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to link wallet to channel.");
      }

      setLinkSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsLinking(false);
    }
  };

  const cleanDigits = cleanHandle.replace(/[^0-9]/g, "");
  const whatsappReturnUrl = cleanDigits
    ? `https://wa.me/${cleanDigits}`
    : "https://web.whatsapp.com";

  return (
    <div className="min-h-screen bg-[#07090E] text-white flex flex-col items-center justify-center p-4 selection:bg-[#FF6B4E]/30 selection:text-white">
      {/* Background glow styling */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-[#FF6B4E]/10 blur-[130px] rounded-full" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-[460px] h-[460px] bg-[#0052FF]/10 blur-[140px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Navigation / Header Brand */}
        <div className="flex items-center justify-between mb-6 px-1">
          <Link href="/" className="transition hover:opacity-90">
            <BrandMark />
          </Link>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-gray-400 font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            OKX X Layer (196)
          </div>
        </div>

        {/* Main Connect Card */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-6 backdrop-blur-xl shadow-2xl">
          <div className="mb-6">
            <h1 className="text-xl font-bold tracking-tight text-white">
              Connect OKX Wallet
            </h1>
            <p className="text-sm text-gray-400 mt-1.5">
              Link your non-custodial Web3 wallet to your{" "}
              <span className="text-white font-medium capitalize">{channel}</span> account (
              <span className="font-mono text-gray-300">{cleanHandle}</span>).
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-300 leading-relaxed">
              {errorMessage}
            </div>
          )}

          {linkSuccess ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
                <div className="text-sm font-semibold mb-1">
                  Wallet Successfully Linked
                </div>
                <div className="text-xs text-emerald-400/90 leading-relaxed">
                  Your address{" "}
                  <span className="font-mono font-bold text-white">
                    {formatShortAddress(connectedAddress || "")}
                  </span>{" "}
                  is now securely anchored to your {channel} account.
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-gray-300 space-y-1.5">
                <div className="font-medium text-white">Next Steps:</div>
                <p>1. Return to your {channel} chat.</p>
                <p>2. Send &quot;balance&quot; to inspect your on-chain assets.</p>
                <p>3. Send &quot;stocks&quot; to preview live tokenized equity prices.</p>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <a
                  href={whatsappReturnUrl}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm text-center transition shadow-lg shadow-emerald-600/20"
                >
                  Return to WhatsApp
                </a>
                <Link
                  href="/app"
                  className="w-full py-3 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 font-medium text-sm text-center transition border border-white/[0.08]"
                >
                  Open Web Terminal
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Account State Card */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Target Channel:</span>
                  <span className="font-semibold text-white capitalize">{channel}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Account Handle:</span>
                  <span className="font-mono text-gray-200">{cleanHandle}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Target Network:</span>
                  <span className="font-mono text-emerald-400">OKX X Layer (Chain 196)</span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-white/[0.06] pt-3">
                  <span className="text-gray-400">Wallet Status:</span>
                  {connectedAddress ? (
                    <span className="font-mono text-xs text-emerald-400 font-medium">
                      Connected ({formatShortAddress(connectedAddress)})
                    </span>
                  ) : (
                    <span className="font-mono text-xs text-amber-400">Not Connected</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {!connectedAddress ? (
                <div className="space-y-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleConnectWallet}
                    disabled={isLoading}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#FF6B4E] hover:bg-[#FF5B3E] disabled:opacity-50 text-white font-semibold text-sm transition shadow-lg shadow-[#FF6B4E]/25"
                  >
                    {isLoading ? "Connecting OKX Wallet..." : "Connect OKX Wallet"}
                  </button>

                  <a
                    href={`okx://wallet/dapp/url?dappUrl=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "https://meirei-rho.vercel.app/connect")}`}
                    className="w-full block py-2.5 px-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-gray-400 hover:text-gray-200 text-xs font-medium text-center transition border border-white/[0.06]"
                  >
                    Open in OKX Mobile App
                  </a>
                </div>
              ) : (
                <div className="space-y-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleLinkToChannel}
                    disabled={isLinking}
                    className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm transition shadow-lg shadow-emerald-600/20"
                  >
                    {isLinking ? "Anchoring Linkage..." : "Confirm Linkage to WhatsApp"}
                  </button>

                  <button
                    type="button"
                    onClick={handleConnectWallet}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-gray-400 hover:text-gray-200 text-xs font-medium text-center transition border border-white/[0.06]"
                  >
                    Switch Wallet Account
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Footer Security Note */}
          <div className="mt-6 pt-4 border-t border-white/[0.06] text-center">
            <p className="text-[11px] text-gray-500 leading-relaxed">
              100% Non-Custodial. Your private keys never leave your device. All mandate
              trades require your explicit Web3 confirmation on OKX X Layer.
            </p>
          </div>
        </div>

        {/* Bottom helper */}
        <div className="mt-6 text-center text-xs text-gray-500">
          Project Meirei | Author: IboTV | OKX X Layer Mainnet
        </div>
      </div>
    </div>
  );
}

export default function ConnectWalletPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07090E] text-white flex items-center justify-center">
          <div className="font-mono text-xs text-gray-400">Loading connection portal...</div>
        </div>
      }
    >
      <ConnectWalletContent />
    </Suspense>
  );
}
