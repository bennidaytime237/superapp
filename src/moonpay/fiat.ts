import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { BuyParams } from "./types.js";

const exec = promisify(execFile);

/**
 * MoonPay fiat on/off ramp operations via CLI.
 */
export class MoonPayFiat {
  /** Buy crypto with fiat */
  async buy(params: BuyParams): Promise<string> {
    const args = [
      "buy",
      "--token", params.token,
      "--amount", params.amount,
      "--currency", params.currency,
    ];
    if (params.chain) args.push("--chain", String(params.chain));
    args.push("--json");
    const { stdout } = await exec("mp", args);
    return JSON.parse(stdout).orderId;
  }

  /** Sell crypto to fiat */
  async sell(token: string, amount: string, currency: string): Promise<string> {
    const { stdout } = await exec("mp", [
      "sell",
      "--token", token,
      "--amount", amount,
      "--currency", currency,
      "--json",
    ]);
    return JSON.parse(stdout).orderId;
  }
}
