import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import Btn from '../../src/components/Btn';
import StatusCard from '../../src/components/StatusCard';
import { useConnectionStore } from '../../src/stores/connection.store';
import { useStatus } from '../../src/hooks/useStatus';
import { checkConnection } from '../../src/services/api';
import { saveServerUrl, getServerUrl } from '../../src/services/storage';
import { wsManager } from '../../src/services/ws';
import { colors } from '../../src/theme/tokens';

export default function SettingsScreen() {
  const serverUrl = useConnectionStore((s) => s.serverUrl);
  const setServerUrl = useConnectionStore((s) => s.setServerUrl);
  const wsState = useConnectionStore((s) => s.wsState);
  const [serverInput, setServerInput] = useState(serverUrl);
  const [testing, setTesting] = useState(false);
  const { status } = useStatus();

  // Load saved server URL on mount
  useEffect(() => {
    getServerUrl().then((saved) => {
      if (saved) {
        setServerInput(saved);
        setServerUrl(saved);
      }
    });
  }, [setServerUrl]);

  const testConnection = useCallback(async () => {
    setTesting(true);
    try {
      setServerUrl(serverInput);
      await saveServerUrl(serverInput);

      await checkConnection();
      wsManager.disconnect();
      wsManager.connect();
      Alert.alert('Connected', `Connected to ${serverInput}`);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setTesting(false);
    }
  }, [serverInput, setServerUrl]);

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
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Btn
          backgroundColor={colors.accent}
          color="white"
          onPress={testConnection}
          disabled={testing}
          opacity={testing ? 0.6 : 1}
        >
          {testing ? 'Testing...' : 'Connect'}
        </Btn>

        <View style={styles.statusRow}>
          <View style={[
            styles.statusDot,
            wsState === 'connected' ? styles.dotGreen :
            wsState === 'connecting' ? styles.dotYellow :
            styles.dotRed,
          ]} />
          <Text style={styles.statusText}>
            {wsState === 'connected' ? 'Connected' :
             wsState === 'connecting' ? 'Connecting...' :
             'Disconnected'}
          </Text>
        </View>
      </View>

      {status && (
        <StatusCard status={status} />
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>v0.1.0 — Apache 2.0</Text>
        <Text style={styles.footerText}>futurebuddy.ai</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.accent, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 4 },
  company: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 2, marginBottom: 24 },
  section: {
    backgroundColor: colors.bgSurface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { color: colors.accent, fontSize: 16, fontWeight: 'bold' },
  input: {
    backgroundColor: colors.bgElevated,
    borderRadius: 8,
    padding: 12,
    color: colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  dotGreen: { backgroundColor: colors.success },
  dotYellow: { backgroundColor: colors.warning },
  dotRed: { backgroundColor: colors.error },
  statusText: { color: colors.textSecondary, fontSize: 14 },
  footer: { alignItems: 'center', marginTop: 24, marginBottom: 40 },
  footerText: { color: colors.textMuted, fontSize: 12 },
});
