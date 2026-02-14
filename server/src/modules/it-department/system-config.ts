// Copyright 2025 #1 Future — Apache 2.0 License

import { powershell } from "./utils.js";

interface ConfigResult {
  success: boolean;
  message: string;
  details?: string;
}

const configActions: Record<
  string,
  Record<string, (params: Record<string, string>) => Promise<ConfigResult>>
> = {
  power: {
    // Get current power plan
    status: async () => {
      const output = await powershell("powercfg /GetActiveScheme");
      return { success: true, message: "Current power plan", details: output };
    },
    // Set high performance
    "high-performance": async () => {
      await powershell("powercfg /SetActive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c");
      return { success: true, message: "Power plan set to High Performance" };
    },
    // Disable sleep
    "disable-sleep": async () => {
      await powershell("powercfg /change standby-timeout-ac 0");
      await powershell("powercfg /change standby-timeout-dc 0");
      return { success: true, message: "Sleep disabled on AC and battery" };
    },
  },

  accessibility: {
    // Disable sticky keys
    "disable-sticky-keys": async () => {
      await powershell(
        'Set-ItemProperty -Path "HKCU:\\Control Panel\\Accessibility\\StickyKeys" -Name "Flags" -Value "506"',
      );
      return { success: true, message: "Sticky Keys disabled" };
    },
    // Disable filter keys
    "disable-filter-keys": async () => {
      await powershell(
        'Set-ItemProperty -Path "HKCU:\\Control Panel\\Accessibility\\Keyboard Response" -Name "Flags" -Value "122"',
      );
      return { success: true, message: "Filter Keys disabled" };
    },
  },

  network: {
    // Get network status
    status: async () => {
      const output = await powershell(
        "Get-NetAdapter | Where-Object Status -eq Up | Select-Object Name, InterfaceDescription, LinkSpeed | ConvertTo-Json",
      );
      return { success: true, message: "Active network adapters", details: output };
    },
    // Flush DNS
    "flush-dns": async () => {
      await powershell("Clear-DnsClientCache");
      return { success: true, message: "DNS cache flushed" };
    },
  },

  security: {
    // Check Windows Defender status
    "defender-status": async () => {
      const output = await powershell(
        "Get-MpComputerStatus | Select-Object AntivirusEnabled, RealTimeProtectionEnabled, AntivirusSignatureLastUpdated | ConvertTo-Json",
      );
      return { success: true, message: "Windows Defender status", details: output };
    },
    // Check firewall status
    "firewall-status": async () => {
      const output = await powershell(
        "Get-NetFirewallProfile | Select-Object Name, Enabled | ConvertTo-Json",
      );
      return { success: true, message: "Firewall status", details: output };
    },
  },

  updates: {
    // Check for Windows updates
    check: async () => {
      try {
        const output = await powershell(
          "Get-WindowsUpdate -MicrosoftUpdate | Select-Object Title, Size, IsDownloaded | ConvertTo-Json",
          60_000,
        );
        return { success: true, message: "Available updates", details: output };
      } catch {
        return {
          success: true,
          message:
            "Windows Update module may not be installed. Run: Install-Module PSWindowsUpdate",
        };
      }
    },
  },
};

export async function applySystemConfig(
  module: string,
  action: string,
  params: Record<string, string>,
): Promise<ConfigResult> {
  const moduleActions = configActions[module];
  if (!moduleActions) {
    throw new Error(
      `Unknown module: ${module}. Available: ${Object.keys(configActions).join(", ")}`,
    );
  }

  const handler = moduleActions[action];
  if (!handler) {
    throw new Error(
      `Unknown action: ${action}. Available for ${module}: ${Object.keys(moduleActions).join(", ")}`,
    );
  }

  return handler(params);
}

export function listAvailableConfigs(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [module, actions] of Object.entries(configActions)) {
    result[module] = Object.keys(actions);
  }
  return result;
}
