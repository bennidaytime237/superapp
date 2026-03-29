import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { PriceAlert } from "./types.js";

const exec = promisify(execFile);

/**
 * Price alerts via MoonPay CLI + OS scheduling.
 *
 * Uses:
 *   mp --json token search --query <symbol> --chain <chain>
 *   + cron (Linux) or launchd (macOS) for recurring checks
 *   + notify-send (Linux) or osascript (macOS) for desktop notifications
 *
 * Alerts fire when a token crosses a price threshold.
 * One-shot alerts auto-disable after firing.
 * Recurring alerts continue until manually removed.
 *
 * Logs: ~/.config/moonpay/logs/alerts.log
 * Scripts: ~/.config/moonpay/scripts/
 */
export class AlertService {
  private platform: "darwin" | "linux";

  constructor() {
    this.platform = process.platform === "darwin" ? "darwin" : "linux";
  }

  /** Create a price alert script and schedule it */
  async create(alert: Omit<PriceAlert, "id" | "enabled">): Promise<PriceAlert> {
    const id = `alert_${alert.token}_${Date.now()}`;

    const script = this.buildScript({
      id,
      token: alert.token,
      chain: alert.chain,
      condition: alert.condition,
      threshold: alert.threshold,
      recurring: alert.recurring,
    });

    // Write script
    const scriptPath = `${process.env.HOME}/.config/moonpay/scripts/${id}.sh`;
    await exec("mkdir", ["-p", `${process.env.HOME}/.config/moonpay/scripts`]);
    await exec("bash", ["-c", `cat > "${scriptPath}" << 'SCRIPT'\n${script}\nSCRIPT`]);
    await exec("chmod", ["+x", scriptPath]);

    // Schedule (every 5 minutes)
    if (this.platform === "linux") {
      const cronEntry = `*/5 * * * * ${scriptPath} # moonpay:${id}`;
      await exec("bash", ["-c", `(crontab -l 2>/dev/null; echo '${cronEntry}') | crontab -`]);
    }

    return { id, ...alert, enabled: true };
  }

  /** List active alerts */
  async list(): Promise<string[]> {
    if (this.platform === "linux") {
      const { stdout } = await exec("bash", ["-c", "crontab -l 2>/dev/null | grep 'moonpay:' || true"]);
      return stdout.trim().split("\n").filter(Boolean);
    }
    const { stdout } = await exec("bash", ["-c", "launchctl list 2>/dev/null | grep moonpay || true"]);
    return stdout.trim().split("\n").filter(Boolean);
  }

  /** Remove an alert by ID */
  async remove(id: string): Promise<void> {
    if (this.platform === "linux") {
      await exec("bash", ["-c", `crontab -l 2>/dev/null | grep -v 'moonpay:${id}' | crontab -`]);
    }
    const scriptPath = `${process.env.HOME}/.config/moonpay/scripts/${id}.sh`;
    await exec("rm", ["-f", scriptPath]);
  }

  private buildScript(alert: {
    id: string;
    token: string;
    chain: string;
    condition: "above" | "below";
    threshold: number;
    recurring: boolean;
  }): string {
    const mpPath = "$(which mp)";
    const logFile = "$HOME/.config/moonpay/logs/alerts.log";
    const op = alert.condition === "above" ? "-gt" : "-lt";
    const notify = this.platform === "darwin"
      ? `osascript -e 'display notification "\\${alert.token} is ${alert.condition} $${alert.threshold}" with title "SuperApp Price Alert" sound name "Glass"'`
      : `notify-send "SuperApp Price Alert" "${alert.token} is ${alert.condition} $${alert.threshold}"`;
    const selfDisable = alert.recurring
      ? ""
      : this.platform === "darwin"
        ? `launchctl unload ~/Library/LaunchAgents/moonpay.${alert.id}.plist`
        : `crontab -l | grep -v 'moonpay:${alert.id}' | crontab -`;

    return `#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$(dirname "${logFile}")"
PRICE=$(${mpPath} --json token search --query "${alert.token}" --chain "${alert.chain}" | jq -r '.[0].priceUsd // 0')
THRESHOLD=${alert.threshold}
if echo "$PRICE ${op === "-gt" ? ">" : "<"} $THRESHOLD" | bc -l | grep -q 1; then
  echo "$(date -Iseconds) ALERT ${alert.id}: ${alert.token} price $PRICE ${alert.condition} $THRESHOLD" >> "${logFile}"
  ${notify}
  ${selfDisable}
fi`;
  }
}
