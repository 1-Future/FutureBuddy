// Copyright 2025 #1 Future — Apache 2.0 License

import type { SecurityScanResult, SecurityIssue } from "@futurebuddy/shared";
import { powershell } from "./utils.js";

export async function runSecurityScan(): Promise<SecurityScanResult> {
  const issues: SecurityIssue[] = [];
  let score = 100;

  // Check Windows Defender
  try {
    const defender = JSON.parse(
      await powershell(
        "Get-MpComputerStatus | Select-Object AntivirusEnabled, RealTimeProtectionEnabled, AntivirusSignatureLastUpdated | ConvertTo-Json",
      ),
    );

    if (!defender.AntivirusEnabled) {
      issues.push({
        severity: "critical",
        category: "antivirus",
        description: "Windows Defender antivirus is disabled",
        recommendation: "Enable Windows Defender in Windows Security settings",
      });
      score -= 25;
    }

    if (!defender.RealTimeProtectionEnabled) {
      issues.push({
        severity: "high",
        category: "antivirus",
        description: "Real-time protection is disabled",
        recommendation:
          "Enable real-time protection in Windows Security > Virus & threat protection",
      });
      score -= 15;
    }

    // Check if signatures are older than 7 days
    const lastUpdate = new Date(defender.AntivirusSignatureLastUpdated);
    const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate > 7) {
      issues.push({
        severity: "medium",
        category: "antivirus",
        description: `Antivirus signatures are ${Math.floor(daysSinceUpdate)} days old`,
        recommendation: "Update Windows Defender signatures",
      });
      score -= 10;
    }
  } catch {
    issues.push({
      severity: "medium",
      category: "antivirus",
      description: "Could not check Windows Defender status",
      recommendation: "Verify Windows Defender is installed and running",
    });
    score -= 5;
  }

  // Check firewall
  try {
    const firewallRaw = await powershell(
      "Get-NetFirewallProfile | Select-Object Name, Enabled | ConvertTo-Json",
    );
    const firewall = JSON.parse(firewallRaw);
    const profiles = Array.isArray(firewall) ? firewall : [firewall];

    for (const profile of profiles) {
      if (!profile.Enabled) {
        issues.push({
          severity: "high",
          category: "firewall",
          description: `${profile.Name} firewall profile is disabled`,
          recommendation: `Enable the ${profile.Name} firewall profile`,
        });
        score -= 10;
      }
    }
  } catch {
    issues.push({
      severity: "medium",
      category: "firewall",
      description: "Could not check firewall status",
      recommendation: "Verify Windows Firewall is enabled",
    });
    score -= 5;
  }

  // Check for password-less accounts
  try {
    const accounts = await powershell(
      "Get-LocalUser | Where-Object {$_.Enabled -eq $true} | Select-Object Name, PasswordRequired | ConvertTo-Json",
    );
    const parsed = JSON.parse(accounts);
    const users = Array.isArray(parsed) ? parsed : [parsed];

    for (const user of users) {
      if (!user.PasswordRequired) {
        issues.push({
          severity: "medium",
          category: "accounts",
          description: `User "${user.Name}" does not require a password`,
          recommendation: `Set a password for the "${user.Name}" account`,
        });
        score -= 5;
      }
    }
  } catch {
    // Non-critical
  }

  // Check if auto-updates are enabled
  try {
    const auOutput = await powershell(
      '(Get-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate\\Auto Update" -Name "AUOptions" -ErrorAction SilentlyContinue).AUOptions',
    );
    const auOption = parseInt(auOutput, 10);
    if (auOption === 1) {
      issues.push({
        severity: "medium",
        category: "updates",
        description: "Automatic Windows Updates are disabled",
        recommendation: "Enable automatic updates in Windows Update settings",
      });
      score -= 10;
    }
  } catch {
    // Non-critical
  }

  return {
    score: Math.max(0, score),
    issues,
    scannedAt: new Date().toISOString(),
  };
}
