// Copyright 2025 #1 Future — Apache 2.0 License

import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { checkConnection, getSystemStatus, setServerUrl, getServerUrl } from "../src/services/api";
import { connectWebSocket } from "../src/services/websocket";

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function SettingsScreen() {
  const [serverInput, setServerInput] = useState(getServerUrl());
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const testConnection = useCallback(async () => {
    setTesting(true);
    try {
      setServerUrl(serverInput);
      const ok = await checkConnection();
      setConnected(ok);

      if (ok) {
        connectWebSocket();
        const sysStatus = await getSystemStatus();
        setStatus(sysStatus);
        Alert.alert("Connected", `Connected to ${serverInput}`);
      } else {
        Alert.alert(
          "Failed",
          "Could not connect to server. Check the URL and make sure the server is running.",
        );
      }
    } catch (err: any) {
      setConnected(false);
      Alert.alert("Error", err.message);
    } finally {
      setTesting(false);
    }
  }, [serverInput]);

  useEffect(() => {
    checkConnection().then((ok) => {
      setConnected(ok);
      if (ok)
        getSystemStatus()
          .then(setStatus)
          .catch(() => {});
    });
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>FutureBuddy</Text>
      <Text style={styles.subtitle}>Your 24/7 IT Department</Text>
      <Text style={styles.company}>Made by #1 Future</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Server Connection</Text>
        <TextInput
          style={styles.input}
          value={serverInput}
          onChangeText={setServerInput}
          placeholder="http://192.168.1.93:3000"
          placeholderTextColor="#666"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.button, testing && styles.buttonDisabled]}
          onPress={testConnection}
          disabled={testing}
        >
          <Text style={styles.buttonText}>{testing ? "Testing..." : "Connect"}</Text>
        </TouchableOpacity>

        <View style={styles.statusRow}>
          <View style={[styles.statusDot, connected ? styles.dotGreen : styles.dotRed]} />
          <Text style={styles.statusText}>{connected ? "Connected" : "Disconnected"}</Text>
        </View>
      </View>

      {status && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Status</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Hostname</Text>
            <Text style={styles.statValue}>{status.hostname}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Platform</Text>
            <Text style={styles.statValue}>{status.platform}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>CPU</Text>
            <Text style={styles.statValue}>{status.cpu?.model}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Cores</Text>
            <Text style={styles.statValue}>{status.cpu?.cores}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Memory</Text>
            <Text style={styles.statValue}>
              {formatBytes(status.memory?.used)} / {formatBytes(status.memory?.total)}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Uptime</Text>
            <Text style={styles.statValue}>{formatUptime(status.uptime)}</Text>
          </View>

          {status.disk?.map((d: any, i: number) => (
            <View key={i} style={styles.statRow}>
              <Text style={styles.statLabel}>{d.mount}</Text>
              <Text style={styles.statValue}>
                {formatBytes(d.free)} free / {formatBytes(d.total)}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>v0.1.0 — Apache 2.0</Text>
        <Text style={styles.footerText}>futurebuddy.ai</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  content: { padding: 20 },
  title: { fontSize: 28, fontWeight: "bold", color: "#4fc3f7", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#888", textAlign: "center", marginTop: 4 },
  company: { fontSize: 12, color: "#555", textAlign: "center", marginTop: 2, marginBottom: 24 },
  section: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: { color: "#4fc3f7", fontSize: 16, fontWeight: "bold", marginBottom: 12 },
  input: {
    backgroundColor: "#111",
    borderRadius: 8,
    padding: 12,
    color: "#e0e0e0",
    fontSize: 14,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#4fc3f7",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#0a0a0a", fontWeight: "bold", fontSize: 15 },
  statusRow: { flexDirection: "row", alignItems: "center" },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  dotGreen: { backgroundColor: "#4caf50" },
  dotRed: { backgroundColor: "#f44336" },
  statusText: { color: "#888", fontSize: 14 },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  statLabel: { color: "#888", fontSize: 14 },
  statValue: { color: "#e0e0e0", fontSize: 14, maxWidth: "60%", textAlign: "right" },
  footer: { alignItems: "center", marginTop: 24, marginBottom: 40 },
  footerText: { color: "#444", fontSize: 12 },
});
