import { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useModels } from '../../src/hooks/useModels';
import type { OllamaModel } from '../../src/types/api';
import { colors } from '../../src/theme/tokens';

function formatSize(bytes: number): string {
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export default function ModelsScreen() {
  const { models, providers, loading, fetchModels } = useModels();

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const renderModel = useCallback(
    ({ item }: { item: OllamaModel }) => (
      <View style={styles.modelCard}>
        <View style={styles.modelHeader}>
          <Feather name="box" size={18} color={colors.accent} />
          <Text style={styles.modelName} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
        <View style={styles.detailsRow}>
          <Text style={styles.detail}>{formatSize(item.size)}</Text>
          {item.details?.family && (
            <Text style={styles.detail}>{item.details.family}</Text>
          )}
          {item.details?.parameter_size && (
            <Text style={styles.detail}>{item.details.parameter_size}</Text>
          )}
          {item.details?.quantization_level && (
            <Text style={styles.detail}>{item.details.quantization_level}</Text>
          )}
        </View>
      </View>
    ),
    [],
  );

  return (
    <View style={styles.container}>
      {/* Provider info */}
      {providers && (
        <View style={styles.providerCard}>
          <Text style={styles.providerTitle}>Active Provider</Text>
          <View style={styles.providerRow}>
            <Feather name="zap" size={16} color={colors.success} />
            <Text style={styles.providerName}>
              {providers.current} / {providers.currentModel}
            </Text>
          </View>
          <View style={styles.providersList}>
            {Object.entries(providers.providers).map(([name, info]) => (
              <View key={name} style={styles.providerItem}>
                <Feather
                  name={info.available ? 'check-circle' : 'x-circle'}
                  size={14}
                  color={info.available ? colors.success : colors.textMuted}
                />
                <Text style={[styles.providerItemName, !info.available && { color: colors.textMuted }]}>
                  {name}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Models list */}
      <Text style={styles.sectionTitle}>
        Local Models ({models.length})
      </Text>

      {models.length === 0 && !loading ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            No local models found. Make sure Ollama is running.
          </Text>
        </View>
      ) : (
        <FlatList
          data={models}
          renderItem={renderModel}
          keyExtractor={(item) => item.digest || item.name}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchModels}
              tintColor={colors.accent}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  providerCard: {
    backgroundColor: colors.bgSurface,
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  providerTitle: { color: colors.textMuted, fontSize: 12, marginBottom: 8, textTransform: 'uppercase' },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  providerName: { color: colors.text, fontSize: 16, fontWeight: '600' },
  providersList: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  providerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  providerItemName: { color: colors.text, fontSize: 13 },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  modelCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  modelName: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
  detailsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  detail: {
    color: colors.textMuted,
    fontSize: 12,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: 'hidden',
  },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
});
