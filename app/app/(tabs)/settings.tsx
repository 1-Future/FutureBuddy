import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  Pressable,
  Switch,
  Platform,
  AppState,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Btn from '../../src/components/Btn';
import StatusCard from '../../src/components/StatusCard';
import { useConnectionStore } from '../../src/stores/connection.store';
import { useGridStore } from '../../src/stores/grid.store';
import { useStatus } from '../../src/hooks/useStatus';
import { checkConnection } from '../../src/services/api';
import { saveServerUrl, getServerUrl, saveGridSettings, getGridSettings } from '../../src/services/storage';
import { wsManager } from '../../src/services/ws';
import { colors } from '../../src/theme/tokens';
import TapService from '../../src/native/TapService';

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.settingControl}>{children}</View>
    </View>
  );
}

function Stepper({ value, onIncrement, onDecrement, min, max }: {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  min: number;
  max: number;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={onDecrement}
        style={[styles.stepperBtn, value <= min && styles.stepperBtnDisabled]}
        disabled={value <= min}
      >
        <Feather name="minus" size={16} color={value <= min ? colors.textMuted : colors.text} />
      </Pressable>
      <Text style={styles.stepperValue}>{value}</Text>
      <Pressable
        onPress={onIncrement}
        style={[styles.stepperBtn, value >= max && styles.stepperBtnDisabled]}
        disabled={value >= max}
      >
        <Feather name="plus" size={16} color={value >= max ? colors.textMuted : colors.text} />
      </Pressable>
    </View>
  );
}

export default function SettingsScreen() {
  const serverUrl = useConnectionStore((s) => s.serverUrl);
  const setServerUrl = useConnectionStore((s) => s.setServerUrl);
  const wsState = useConnectionStore((s) => s.wsState);
  const [serverInput, setServerInput] = useState(serverUrl);
  const [testing, setTesting] = useState(false);
  const [tapServiceActive, setTapServiceActive] = useState(false);
  const appStateRef = useRef(AppState.currentState);
  const { status } = useStatus();

  // Grid store
  const gridActive = useGridStore((s) => s.gridActive);
  const gridRows = useGridStore((s) => s.gridRows);
  const gridCols = useGridStore((s) => s.gridCols);
  const setGridSize = useGridStore((s) => s.setGridSize);
  const showGrid = useGridStore((s) => s.showGrid);
  const hideGridFn = useGridStore((s) => s.hideGrid);

  // Check tap service status on mount and when app returns to foreground
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const checkStatus = () => {
      TapService.isEnabled().then(setTapServiceActive);
    };
    checkStatus();

    const sub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        checkStatus();
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, []);

  // Load saved settings on mount
  useEffect(() => {
    getServerUrl().then((saved) => {
      if (saved) {
        setServerInput(saved);
        setServerUrl(saved);
      }
    });
    getGridSettings().then((saved) => {
      if (saved) {
        if (saved.gridRows != null && saved.gridCols != null) setGridSize(saved.gridRows, saved.gridCols);
      }
    });
  }, [setServerUrl, setGridSize]);

  // Persist grid settings on change
  useEffect(() => {
    saveGridSettings({ gridRows, gridCols });
  }, [gridRows, gridCols]);

  const toggleGrid = useCallback(() => {
    if (gridActive) {
      hideGridFn();
    } else {
      showGrid();
    }
  }, [gridActive, hideGridFn, showGrid]);

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

      {/* Voice Access Grid Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Voice Access Grid</Text>

        <SettingRow label="Enable Grid">
          <Switch
            value={gridActive}
            onValueChange={toggleGrid}
            trackColor={{ false: colors.bgElevated, true: colors.accentDark }}
            thumbColor={gridActive ? colors.accent : colors.textMuted}
          />
        </SettingRow>

        <SettingRow label="Grid Size">
          <View style={styles.gridSizeRow}>
            <Stepper
              value={gridRows}
              onIncrement={() => setGridSize(gridRows + 1, gridCols)}
              onDecrement={() => setGridSize(gridRows - 1, gridCols)}
              min={1}
              max={10}
            />
            <Text style={styles.gridSizeX}>x</Text>
            <Stepper
              value={gridCols}
              onIncrement={() => setGridSize(gridRows, gridCols + 1)}
              onDecrement={() => setGridSize(gridRows, gridCols - 1)}
              min={1}
              max={10}
            />
          </View>
        </SettingRow>

        <Text style={styles.hint}>
          Say "show grid" to overlay numbered cells. Say a number to zoom in, then a letter (a-f) to tap. Example: "3" then "a", or "3a" directly. Sub-grid is always 6 cells (a-f).
        </Text>
      </View>

      {/* Tap Simulation — Android only */}
      {Platform.OS === 'android' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tap Simulation</Text>

          <View style={styles.statusRow}>
            <View style={[
              styles.statusDot,
              tapServiceActive ? styles.dotGreen : styles.dotRed,
            ]} />
            <Text style={styles.statusText}>
              {tapServiceActive ? 'Accessibility service active' : 'Accessibility service not enabled'}
            </Text>
          </View>

          {!tapServiceActive && (
            <>
              <Text style={styles.hint}>
                Enable "FutureBuddy Tap Service" in Android Accessibility Settings to allow real screen taps via voice commands.
              </Text>
              <Btn
                backgroundColor={colors.accent}
                color="white"
                onPress={() => TapService.openAccessibilitySettings()}
              >
                Open Accessibility Settings
              </Btn>
            </>
          )}

          {tapServiceActive && (
            <Text style={styles.hint}>
              Grid taps will be dispatched as real touches on the screen.
            </Text>
          )}
        </View>
      )}

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
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  settingLabel: { color: colors.text, fontSize: 14, flex: 1 },
  settingControl: { flexShrink: 0 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepperBtn: {
    width: 36,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: { opacity: 0.3 },
  stepperValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  gridSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gridSizeX: {
    color: colors.textMuted,
    fontSize: 14,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
  },
  footer: { alignItems: 'center', marginTop: 24, marginBottom: 40 },
  footerText: { color: colors.textMuted, fontSize: 12 },
});
