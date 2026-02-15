import { View, Text, StyleSheet } from 'react-native';
import type { SystemStatus } from '../types/models';
import { colors } from '../theme/tokens';

interface BarProps {
  label: string;
  value: number;
  suffix?: string;
}

function UsageBar({ label, value, suffix }: BarProps) {
  const barColor =
    value > 90 ? colors.error : value > 70 ? colors.warning : colors.success;

  return (
    <View style={barStyles.container}>
      <View style={barStyles.labelRow}>
        <Text style={barStyles.label}>{label}</Text>
        <Text style={barStyles.label}>
          {value.toFixed(1)}%{suffix ? ` ${suffix}` : ''}
        </Text>
      </View>
      <View style={barStyles.track}>
        <View
          style={[
            barStyles.fill,
            { width: `${Math.min(value, 100)}%`, backgroundColor: barColor },
          ]}
        />
      </View>
    </View>
  );
}

const barStyles = StyleSheet.create({
  container: { gap: 4 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: colors.textSecondary, fontSize: 12 },
  track: { height: 6, backgroundColor: colors.bgHover, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});

function formatBytes(bytes: number): string {
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface StatusCardProps {
  status: SystemStatus;
}

export default function StatusCard({ status }: StatusCardProps) {
  const memUsage = status.memory.total > 0
    ? ((status.memory.used / status.memory.total) * 100)
    : 0;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>System Status</Text>
        <Text style={styles.subtitle}>up {formatUptime(status.uptime)}</Text>
      </View>

      <UsageBar label="CPU" value={status.cpu.usage} />
      <UsageBar
        label={`RAM (${formatBytes(status.memory.used)} / ${formatBytes(status.memory.total)})`}
        value={memUsage}
      />

      {status.disk.map((d) => {
        const diskUsage = d.total > 0 ? ((d.used / d.total) * 100) : 0;
        return (
          <UsageBar
            key={d.mount}
            label={`${d.mount} (${formatBytes(d.used)} / ${formatBytes(d.total)})`}
            value={diskUsage}
          />
        );
      })}

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>
          {status.hostname} ({status.platform})
        </Text>
        {status.network.length > 0 && (
          <Text style={styles.footerText}>{status.network[0].ip}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: 12,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
