// Copyright 2025 #1 Future — Apache 2.0 License

import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { getPendingActions, resolveAction } from "../src/services/api";

interface Action {
  id: string;
  tier: "green" | "yellow" | "red";
  description: string;
  command: string;
  module: string;
  status: string;
  createdAt: string;
}

const TIER_COLORS = {
  green: "#4caf50",
  yellow: "#ff9800",
  red: "#f44336",
} as const;

const TIER_LABELS = {
  green: "Safe",
  yellow: "Caution",
  red: "Dangerous",
} as const;

export default function ActionsScreen() {
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);

  const loadActions = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getPendingActions();
      setActions(result.actions);
    } catch {
      // Server might not be running
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActions();
    const interval = setInterval(loadActions, 5000);
    return () => clearInterval(interval);
  }, [loadActions]);

  const handleResolve = useCallback(async (id: string, approved: boolean) => {
    setResolving(id);
    try {
      await resolveAction(id, approved);
      setActions((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      console.error("Failed to resolve action:", err);
    } finally {
      setResolving(null);
    }
  }, []);

  const renderAction = useCallback(
    ({ item }: { item: Action }) => (
      <View style={[styles.card, { borderLeftColor: TIER_COLORS[item.tier] }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[item.tier] }]}>
            <Text style={styles.tierText}>{TIER_LABELS[item.tier]}</Text>
          </View>
          <Text style={styles.module}>{item.module}</Text>
        </View>

        <Text style={styles.description}>{item.description}</Text>

        <View style={styles.commandBox}>
          <Text style={styles.commandText} selectable>
            {item.command}
          </Text>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.denyButton}
            onPress={() => handleResolve(item.id, false)}
            disabled={resolving === item.id}
          >
            <Text style={styles.denyText}>Deny</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.approveButton}
            onPress={() => handleResolve(item.id, true)}
            disabled={resolving === item.id}
          >
            {resolving === item.id ? (
              <ActivityIndicator color="#0a0a0a" size="small" />
            ) : (
              <Text style={styles.approveText}>Approve</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    ),
    [handleResolve, resolving],
  );

  return (
    <View style={styles.container}>
      {actions.length === 0 && !loading ? (
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
            <RefreshControl refreshing={loading} onRefresh={loadActions} tintColor="#4fc3f7" />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: "bold", color: "#666", marginBottom: 8 },
  emptyHint: { fontSize: 14, color: "#444", textAlign: "center", lineHeight: 22 },
  list: { padding: 16 },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  tierBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  tierText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  module: { color: "#888", fontSize: 12, marginLeft: 8 },
  description: { color: "#ccc", fontSize: 14, marginBottom: 8 },
  commandBox: {
    backgroundColor: "#111",
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  commandText: { color: "#00ff00", fontFamily: "monospace", fontSize: 12 },
  buttonRow: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  denyButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f44336",
  },
  denyText: { color: "#f44336", fontWeight: "bold" },
  approveButton: {
    backgroundColor: "#4caf50",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  approveText: { color: "#fff", fontWeight: "bold" },
});
