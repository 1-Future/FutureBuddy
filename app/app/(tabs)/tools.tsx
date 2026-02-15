import { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTools } from '../../src/hooks/useTools';
import TierBadge from '../../src/components/TierBadge';
import type { ToolInfo } from '../../src/types/models';
import { colors } from '../../src/theme/tokens';

const DOMAIN_LABELS: Record<string, string> = {
  drivers: 'Drivers',
  debloat: 'Debloat',
  packages: 'Package Management',
  'file-ops': 'File Operations',
  'system-tools': 'System Tools',
};

export default function ToolsScreen() {
  const { tools, byDomain, loading, fetchTools, scan } = useTools();

  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  const sections = Object.entries(byDomain).map(([domain, domainTools]) => ({
    title: DOMAIN_LABELS[domain] ?? domain,
    data: domainTools,
  }));

  const renderTool = useCallback(
    ({ item }: { item: ToolInfo }) => (
      <View style={styles.toolCard}>
        <View style={styles.toolHeader}>
          <Feather
            name={item.installed ? 'check-circle' : 'circle'}
            size={16}
            color={item.installed ? colors.success : colors.textMuted}
          />
          <Text style={styles.toolName}>{item.name}</Text>
          {item.version && (
            <Text style={styles.toolVersion}>v{item.version}</Text>
          )}
        </View>
        <Text style={styles.toolDesc} numberOfLines={2}>
          {item.description}
        </Text>
        {item.capabilities.length > 0 && (
          <View style={styles.capsRow}>
            {item.capabilities.slice(0, 3).map((cap) => (
              <View key={cap} style={styles.capBadge}>
                <Text style={styles.capText}>{cap}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    ),
    [],
  );

  const renderSectionHeader = useCallback(
    ({ section: { title } }: { section: { title: string } }) => (
      <Text style={styles.sectionTitle}>{title}</Text>
    ),
    [],
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Tools ({tools.length})</Text>
        <Pressable onPress={scan} disabled={loading} style={styles.scanBtn}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Feather name="refresh-cw" size={18} color={colors.accent} />
          )}
        </Pressable>
      </View>

      {sections.length === 0 && !loading ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No tools detected. Tap refresh to scan.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          renderItem={renderTool}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { color: colors.text, fontSize: 17, fontWeight: '600' },
  scanBtn: { padding: 8 },
  list: { padding: 16 },
  sectionTitle: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toolCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  toolName: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
  toolVersion: { color: colors.textMuted, fontSize: 12 },
  toolDesc: { color: colors.textSecondary, fontSize: 13, marginBottom: 8 },
  capsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  capBadge: {
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  capText: { color: colors.textMuted, fontSize: 11 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});
