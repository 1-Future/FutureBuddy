import { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useActions } from '../../src/hooks/useActions';
import ActionCard from '../../src/components/ActionCard';
import type { Action } from '../../src/types/models';
import { colors } from '../../src/theme/tokens';

export default function ActionsScreen() {
  const { actions, fetchPending, approve, deny } = useActions();

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 5000);
    return () => clearInterval(interval);
  }, [fetchPending]);

  const renderAction = useCallback(
    ({ item }: { item: Action }) => (
      <View style={styles.cardWrapper}>
        <ActionCard action={item} onApprove={approve} onDeny={deny} />
      </View>
    ),
    [approve, deny],
  );

  return (
    <View style={styles.container}>
      {actions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No Pending Actions</Text>
          <Text style={styles.emptyHint}>
            When FutureBuddy needs approval to run a command, it will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={actions}
          renderItem={renderAction}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={fetchPending}
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
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textMuted, marginBottom: 8 },
  emptyHint: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  list: { padding: 16 },
  cardWrapper: { marginBottom: 12 },
});
