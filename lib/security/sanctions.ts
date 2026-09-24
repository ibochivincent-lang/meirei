/**
 * Chainalysis Sanctions Screening Integration
 * Author: IboTV
 * 
 * Verifies EVM wallet addresses against known OFAC Specially Designated Nationals (SDN)
 * and sanctions lists via Chainalysis oracle patterns and API screening prior to quote generation.
 */

import { isValidEvmAddress } from "../wallet/xlayer";

// Well-known OFAC SDN / sanctioned sample addresses for local verification & testing
const KNOWN_SANCTIONED_ADDRESSES = new Set([
  // OFAC Tornado Cash & Lazarus Group sanctioned addresses
  "0x8576acc5c05d6ce88f4e49bf65bdf0c62f91353c",
  "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b",
  "0xd96f2b1c14db8458374d9aca76e26c3d18364307",
  "0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936",
  "0x23773e65ed146a459791799d01336db287f25334",
  "0xd224ca0c819e8e97ba0136b3b95ce235bcdc4b99",
  "0xb38608e731e6f6f19495133597c742941269dc63",
]);

export interface SanctionsCheckResult {
  isSanctioned: boolean;
  address: string;
  provider: "chainalysis_oracle" | "local_ofac_cache";
  reason?: string;
}

/**
 * Checks whether an EVM address is sanctioned.
 * Rejects any transactions or quotes for sanctioned addresses.
 */
export async function checkSanctions(address: string): Promise<SanctionsCheckResult> {
  const cleanAddr = (address || "").trim().toLowerCase();

  if (!isValidEvmAddress(cleanAddr)) {
    return {
      isSanctioned: false,
      address: cleanAddr,
      provider: "local_ofac_cache",
    };
  }

  // 1. Check local fast OFAC SDN cache
  if (KNOWN_SANCTIONED_ADDRESSES.has(cleanAddr)) {
    return {
      isSanctioned: true,
      address: cleanAddr,
      provider: "local_ofac_cache",
      reason: "Address matched active OFAC Specially Designated Nationals (SDN) sanctions list.",
    };
  }

  // 2. Chainalysis free sanctions API check if CHAINALYSIS_API_KEY is configured
  const apiKey = process.env.CHAINALYSIS_API_KEY;
  if (apiKey && apiKey !== "CHANGE_ME_CHAINALYSIS_KEY") {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`https://public.chainalysis.com/api/v1/address/${cleanAddr}`, {
        headers: {
          "X-API-Key": apiKey,
          Accept: "application/json",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = (await res.json()) as { identifications?: Array<{ category: string }> };
        if (data.identifications && data.identifications.length > 0) {
          return {
            isSanctioned: true,
            address: cleanAddr,
            provider: "chainalysis_oracle",
            reason: "Address identified on Chainalysis sanctions registry.",
          };
        }
      }
    } catch {
      // Fallback gracefully to local checks if external network timeout occurs
    }
  }

  return {
    isSanctioned: false,
    address: cleanAddr,
    provider: "local_ofac_cache",
  };
}
