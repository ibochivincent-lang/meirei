"use client";

/**
 * Meirei Multi-Wallet Connection & Channel Linkage Portal
 * Author: IboTV
 * Platform: OKX X Layer Mainnet (Chain ID 196)
 *
 * Provides non-custodial multi-wallet selection (OKX Wallet, MetaMask, Coinbase, Trust, Injected)
 * and secure channel linkage (WhatsApp / Telegram) to the isolated database user record.
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
  isValidEvmAddress,
} from "@/lib/wallet/xlayer";
import {
  getSpecificProvider,
  getAvailableWallets,
  WalletType,
  WalletOption,
} from "@/lib/wallet/xlayer_signer";

function ConnectWalletContent() {
  const searchParams = useSearchParams();
  const channel = searchParams.get("channel") || "whatsapp";
  const rawHandle = searchParams.get("handle") || "";
  const cleanHandle = rawHandle.trim() || "+234 902 827 9382";

  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const [activeWalletName, setActiveWalletName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal & Manual Link State
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const [availableWallets, setAvailableWallets] = useState<WalletOption[]>([]);

  useEffect(() => {
    setAvailableWallets(getAvailableWallets());

    // Auto-detect existing connection
    const okxProvider = getSpecificProvider("okx");
    const mmProvider = getSpecificProvider("metamask");
    const activeProvider = okxProvider || mmProvider || getSpecificProvider("injected");

    if (activeProvider) {
      activeProvider
        .request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            setConnectedAddress(accounts[0].toLowerCase());
            const name = okxProvider ? "OKX Wallet" : mmProvider ? "MetaMask" : "Web3 Wallet";
            setActiveWalletName(name);
          }
        })
        .catch(() => {});

      activeProvider
        .request({ method: "eth_chainId" })
        .then((rawId: string) => {
          const id = parseInt(rawId, 16);
          setCurrentChainId(id);
        })
        .catch(() => {});
    }
  }, []);

  const handleConnectWallet = async (type: WalletType = "okx") => {
    setIsLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const provider = getSpecificProvider(type);
      if (!provider) {
        if (type === "okx") {
          throw new Error(
            "OKX Wallet extension not detected. Please install OKX Wallet from okx.com/web3 or tap 'Open in OKX Mobile App' below."
          );
        } else if (type === "metamask") {
          throw new Error(
            "MetaMask extension not detected in your browser. Please install MetaMask from metamask.io or choose another wallet."
          );
        } else if (type === "coinbase") {
          throw new Error(
            "Coinbase Wallet extension not detected. Please install Coinbase Wallet or choose another wallet."
          );
        } else if (type === "trust") {
          throw new Error(
            "Trust Wallet extension not detected. Please install Trust Wallet or choose another wallet."
          );
        } else {
          throw new Error(
            "No Web3 wallet extension found. Please install a compatible Web3 wallet or enter your address manually."
          );
        }
      }

      // 1. Request accounts
      const accounts: string[] = await provider.request({ method: "eth_requestAccounts" });
      if (!accounts || accounts.length === 0) {
        throw new Error("No account authorized by wallet.");
      }

      const activeAddr = accounts[0].toLowerCase();
      setConnectedAddress(activeAddr);

      const walletTitle =
        type === "okx"
          ? "OKX Wallet"
          : type === "metamask"
          ? "MetaMask"
          : type === "coinbase"
          ? "Coinbase Wallet"
          : type === "trust"
          ? "Trust Wallet"
          : "Web3 Injected";
      setActiveWalletName(walletTitle);
      setShowWalletModal(false);

      // 2. Switch to OKX X Layer (Chain ID 196)
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
            console.warn("[Wallet Connect] Switch warning:", switchErr.message);
          }
        }
      }

      setCurrentChainId(chainId);
      setInfoMessage(`Connected ${walletTitle} (${formatShortAddress(activeAddr)}) on OKX X Layer.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualLink = () => {
    const addr = manualAddress.trim().toLowerCase();
    if (!isValidEvmAddress(addr)) {
      setErrorMessage("Please enter a valid 42-character 0x EVM wallet address.");
      return;
    }

    setConnectedAddress(addr);
    setActiveWalletName("Manual Address");
    setShowManualInput(false);
    setShowWalletModal(false);
    setInfoMessage(`Configured address ${formatShortAddress(addr)} for OKX X Layer.`);
  };

  const handleDisconnectWallet = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      // Unlink from channel backend database
      await fetch("/api/wallet/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          handle: cleanHandle,
          action: "unlink",
        }),
      }).catch(() => {});

      setConnectedAddress(null);
      setCurrentChainId(null);
      setActiveWalletName(null);
      setLinkSuccess(false);
      setInfoMessage("Wallet disconnected and unlinked successfully. Your channel has reverted to the default sandbox address.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Failed to disconnect: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkToChannel = async () => {
    if (!connectedAddress) {
      setErrorMessage("Please connect or enter a wallet address first.");
      return;
    }

    setIsLinking(true);
    setErrorMessage(null);
    setInfoMessage(null);

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
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to persist wallet linkage.");
      }

      setLinkSuccess(true);
      setInfoMessage(`Wallet ${formatShortAddress(connectedAddress)} successfully anchored to ${channel} account.`);
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
    : "https://wa.me/2349043580863";

  return (
    <div className="min-h-screen bg-[#07090E] text-white flex flex-col items-center justify-center p-4 selection:bg-[#FF6B4E]/30 selection:text-white relative">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="flex items-center justify-between mb-8">
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
              Connect & Manage Wallet
            </h1>
            <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">
              Connect your preferred Web3 wallet to anchor your{" "}
              <span className="text-white font-medium capitalize">{channel}</span> account (
              <span className="font-mono text-gray-300">{cleanHandle}</span>) to OKX X Layer.
            </p>
          </div>

          {infoMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300 leading-relaxed">
              {infoMessage}
            </div>
          )}

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
                  ({activeWalletName || "Web3 Wallet"}) is now securely anchored to your {channel} account in the database.
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-gray-300 space-y-1.5">
                <div className="font-medium text-white">Next Steps:</div>
                <p>1. Return to your {channel} chat.</p>
                <p>2. Send &quot;balance&quot; to inspect your on-chain assets.</p>
                <p>3. Send &quot;stocks&quot; to preview live tokenized equity prices.</p>
                <p>4. Send &quot;disconnect&quot; anytime in chat to unlink.</p>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <a
                  href={whatsappReturnUrl}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm text-center transition shadow-lg shadow-emerald-600/20"
                >
                  Return to WhatsApp
                </a>
                <button
                  type="button"
                  onClick={handleDisconnectWallet}
                  className="w-full py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-medium text-center transition border border-red-500/25 cursor-pointer"
                >
                  Disconnect & Unlink Wallet
                </button>
                <Link
                  href="/app"
                  className="w-full py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 font-medium text-xs text-center transition border border-white/[0.08]"
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
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="font-mono text-xs text-emerald-400 font-medium">
                        {activeWalletName || "Connected"} ({formatShortAddress(connectedAddress)})
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="font-mono text-xs text-amber-400">Not Connected</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {!connectedAddress ? (
                <div className="space-y-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowWalletModal(true)}
                    disabled={isLoading}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#FF6B4E] hover:bg-[#FF5B3E] disabled:opacity-50 text-white font-semibold text-sm transition shadow-lg shadow-[#FF6B4E]/25 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Connect Wallet</span>
                    <span className="text-xs opacity-80 font-normal">(OKX, MetaMask, Coinbase...)</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={`okx://wallet/dapp/url?dappUrl=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "https://meirei-rho.vercel.app/connect")}`}
                      className="py-2.5 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-gray-300 text-xs font-medium text-center transition border border-white/[0.06]"
                    >
                      Open in OKX App
                    </a>
                    <button
                      type="button"
                      onClick={() => setShowManualInput(!showManualInput)}
                      className="py-2.5 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-gray-300 text-xs font-medium text-center transition border border-white/[0.06] cursor-pointer"
                    >
                      {showManualInput ? "Hide Manual" : "Paste Address"}
                    </button>
                  </div>

                  {/* Manual Address Input Tray */}
                  {showManualInput && (
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-2.5">
                      <div className="text-[11px] text-gray-400">
                        Paste any public 0x EVM wallet address on OKX X Layer:
                      </div>
                      <input
                        type="text"
                        value={manualAddress}
                        onChange={(e) => setManualAddress(e.target.value)}
                        placeholder="0x7f17d6224e7d48606598732c3f511412b5c1e922"
                        className="w-full py-2 px-3 rounded-lg bg-black/60 border border-white/[0.1] text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#FF6B4E]"
                      />
                      <button
                        type="button"
                        onClick={handleManualLink}
                        className="w-full py-2 px-3 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-medium transition cursor-pointer"
                      >
                        Set Address
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleLinkToChannel}
                    disabled={isLinking}
                    className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm transition shadow-lg shadow-emerald-600/20 cursor-pointer"
                  >
                    {isLinking ? "Anchoring Linkage..." : `Confirm Linkage to ${channel}`}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setShowWalletModal(true)}
                      disabled={isLoading}
                      className="py-2.5 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-gray-300 text-xs font-medium text-center transition border border-white/[0.06] cursor-pointer"
                    >
                      Switch Wallet
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnectWallet}
                      disabled={isLoading}
                      className="py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-medium text-center transition border border-red-500/25 cursor-pointer"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Security Note */}
          <div className="mt-6 pt-4 border-t border-white/[0.06] text-center">
            <p className="text-[11px] text-gray-500 leading-relaxed">
              100% Non-Custodial. Your private keys never leave your device. Every user
              channel has a separate, isolated database record on OKX X Layer Mainnet.
            </p>
          </div>
        </div>

        {/* Multi-Wallet Selection Modal */}
        {showWalletModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#0D1017] border border-white/[0.1] p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div>
                  <h3 className="text-base font-bold text-white">Select Web3 Wallet</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Choose your wallet on OKX X Layer</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWalletModal(false)}
                  className="h-8 w-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Wallet Options List */}
              <div className="space-y-2 pt-1">
                {availableWallets.map((wallet) => (
                  <button
                    key={wallet.id}
                    type="button"
                    onClick={() => handleConnectWallet(wallet.id)}
                    disabled={isLoading}
                    className={`w-full p-3.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                      wallet.id === "okx"
                        ? "bg-[#FF6B4E]/10 border-[#FF6B4E]/30 hover:bg-[#FF6B4E]/20"
                        : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-9 w-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                          wallet.id === "okx"
                            ? "bg-[#FF6B4E] text-white"
                            : "bg-white/[0.08] text-gray-200"
                        }`}
                      >
                        {wallet.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-white">{wallet.name}</span>
                          {wallet.id === "okx" && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-[#FF6B4E]/20 text-[#FF6B4E]">
                              RECOMMENDED
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400">{wallet.description}</div>
                      </div>
                    </div>
                    <div>
                      {wallet.isInstalled ? (
                        <span className="text-[11px] font-medium text-emerald-400 font-mono">
                          Ready
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-gray-500 font-mono">
                          Select
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Mobile Deep Link */}
              <div className="pt-2 border-t border-white/[0.06]">
                <a
                  href={`okx://wallet/dapp/url?dappUrl=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "https://meirei-rho.vercel.app/connect")}`}
                  className="w-full block py-2.5 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-center text-xs font-medium text-gray-300 transition"
                >
                  Open in OKX Mobile App
                </a>
              </div>
            </div>
          </div>
        )}

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
