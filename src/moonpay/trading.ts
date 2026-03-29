import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { SwapParams, DCAParams } from "./types.js";

const exec = promisify(execFile);

/**
 * MoonPay trading operations via CLI.
 */
export class MoonPayTrading {
  /** Swap tokens (same-chain) */
  async swap(params: SwapParams): Promise<string> {
    const args = ["swap", "--from", params.from, "--to", params.to, "--amount", params.amount];
    if (params.chain) args.push("--chain", String(params.chain));
    args.push("--json");
    const { stdout } = await exec("mp", args);
    return JSON.parse(stdout).txHash;
  }

  /** Set up dollar-cost averaging */
  async createDCA(params: DCAParams): Promise<string> {
    const args = [
      "dca",
      "--token", params.token,
      "--amount", params.amount,
      "--frequency", params.frequency,
    ];
    if (params.chain) args.push("--chain", String(params.chain));
    args.push("--json");
    const { stdout } = await exec("mp", args);
    return JSON.parse(stdout).id;
  }
}
