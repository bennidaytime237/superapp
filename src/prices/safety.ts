import type { TokenSafety } from "./types.js";

const MAIAT_BASE = "https://app.maiat.io/api";

/**
 * Token safety checks via Maiat API.
 *
 * Free tier: GET /v1/token/<address>
 * Paid tier: GET /x402/token-check?address=<address> ($0.01 USDC on Base)
 * Deep forensics: POST /x402/token-forensics ($0.05 USDC on Base)
 *
 * Verdicts: trusted | proceed | caution | avoid
 * Trust score: 0-100
 *
 * Risk flags:
 *   HONEYPOT_DETECTED — cannot sell after purchase
 *   HIGH_BUY_TAX / HIGH_SELL_TAX — exceeds 25%
 *   NEAR_ZERO_LIQUIDITY — insufficient trading depth
 *   UNVERIFIED — contract simulation failure
 */
export class SafetyService {
  /** Free safety check */
  async check(contractAddress: string): Promise<TokenSafety> {
    const res = await fetch(`${MAIAT_BASE}/v1/token/${contractAddress}`);
    if (!res.ok) throw new Error(`Maiat API error: ${res.status}`);
    return res.json() as Promise<TokenSafety>;
  }

  /** Paid safety check with more detail ($0.01 USDC on Base) */
  async checkPremium(contractAddress: string): Promise<TokenSafety> {
    const res = await fetch(
      `${MAIAT_BASE}/x402/token-check?address=${contractAddress}`
    );
    if (!res.ok) throw new Error(`Maiat API error: ${res.status}`);
    return res.json() as Promise<TokenSafety>;
  }

  /** Should we proceed with this token? */
  isSafe(safety: TokenSafety): boolean {
    return safety.verdict === "trusted" || safety.verdict === "proceed";
  }

  /** Risk summary for display */
  formatRisk(safety: TokenSafety): string {
    const emoji =
      safety.verdict === "trusted" ? "[TRUSTED]" :
      safety.verdict === "proceed" ? "[OK]" :
      safety.verdict === "caution" ? "[CAUTION]" : "[AVOID]";

    const flags = safety.riskFlags.length
      ? ` Flags: ${safety.riskFlags.join(", ")}`
      : "";

    return `${emoji} Score: ${safety.trustScore}/100${flags} — ${safety.summary}`;
  }
}
