import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { TokenPrice, TrendingToken } from "./types.js";

const exec = promisify(execFile);

const SUPPORTED_CHAINS = [
  "solana", "ethereum", "base", "polygon", "arbitrum", "optimism",
] as const;

export type SupportedChain = (typeof SUPPORTED_CHAINS)[number];

/**
 * Token price discovery via MoonPay CLI.
 *
 * Commands used:
 *   mp --json token search --query <symbol> --chain <chain>
 *   mp --json token retrieve --token <address> --chain <chain>
 *   mp --json token trending list --chain <chain>
 */
export class PriceService {
  /** Search for a token and get its current price */
  async getPrice(symbol: string, chain: SupportedChain): Promise<TokenPrice | null> {
    const { stdout } = await exec("mp", [
      "--json", "token", "search", "--query", symbol, "--chain", chain,
    ]);
    const results = JSON.parse(stdout);
    if (!results?.length) return null;

    const token = results[0];
    return {
      symbol: token.symbol,
      address: token.address,
      chain,
      priceUsd: token.priceUsd,
      change1h: token.change1h,
      change24h: token.change24h,
      change7d: token.change7d,
      volume24h: token.volume24h,
      marketCap: token.marketCap,
      liquidity: token.liquidity,
    };
  }

  /** Get detailed token data by contract address */
  async getTokenDetails(address: string, chain: SupportedChain): Promise<TokenPrice | null> {
    const { stdout } = await exec("mp", [
      "--json", "token", "retrieve", "--token", address, "--chain", chain,
    ]);
    const token = JSON.parse(stdout);
    if (!token) return null;

    return {
      symbol: token.symbol,
      address: token.address,
      chain,
      priceUsd: token.priceUsd,
      change1h: token.change1h,
      change24h: token.change24h,
      change7d: token.change7d,
      volume24h: token.volume24h,
      marketCap: token.marketCap,
      liquidity: token.liquidity,
    };
  }

  /** Get trending tokens on a chain */
  async getTrending(chain: SupportedChain): Promise<TrendingToken[]> {
    const { stdout } = await exec("mp", [
      "--json", "token", "trending", "list", "--chain", chain,
    ]);
    return JSON.parse(stdout);
  }

  /** Get prices across multiple chains for the same symbol */
  async getPriceMultiChain(symbol: string): Promise<TokenPrice[]> {
    const results = await Promise.allSettled(
      SUPPORTED_CHAINS.map((chain) => this.getPrice(symbol, chain))
    );
    return results
      .filter((r): r is PromiseFulfilledResult<TokenPrice | null> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter((v): v is TokenPrice => v !== null);
  }
}
