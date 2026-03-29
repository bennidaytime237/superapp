import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Wallet } from "./types.js";

const exec = promisify(execFile);

/**
 * MoonPay wallet operations via CLI.
 * Keys are stored encrypted in the OS keychain — they never leave the machine.
 */
export class MoonPayWallet {
  /** Create a new non-custodial wallet */
  async create(name: string): Promise<Wallet> {
    const { stdout } = await exec("mp", ["wallet", "create", "--name", name, "--json"]);
    return JSON.parse(stdout);
  }

  /** List all wallets */
  async list(): Promise<Wallet[]> {
    const { stdout } = await exec("mp", ["wallet", "list", "--json"]);
    return JSON.parse(stdout);
  }

  /** Get balance for a wallet */
  async getBalance(name: string): Promise<Record<string, string>> {
    const { stdout } = await exec("mp", ["balance", "--wallet", name, "--json"]);
    return JSON.parse(stdout);
  }

  /** Send tokens from a wallet */
  async send(wallet: string, token: string, amount: string, to: string): Promise<string> {
    const { stdout } = await exec("mp", [
      "send",
      "--wallet", wallet,
      "--token", token,
      "--amount", amount,
      "--to", to,
      "--json",
    ]);
    return JSON.parse(stdout).txHash;
  }
}
