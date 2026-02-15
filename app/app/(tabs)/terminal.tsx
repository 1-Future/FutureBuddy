import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useShell } from '../../src/hooks/useShell';
import { wsManager } from '../../src/services/ws';
import { XTermView, type XTermHandle } from '../../src/components/XTermView';
import type { TerminalDataPayload } from '../../src/types/ws';
import { colors } from '../../src/theme/tokens';

export default function TerminalScreen() {
  const { tabs, activeTab, activeTabId, setActiveTabId, startSession, sendData, resize, addTab, closeTab } = useShell();
  const xtermRef = useRef<XTermHandle>(null);
  const [starting, setStarting] = useState(false);

  // Listen for terminal output from WebSocket
  useEffect(() => {
    const unsub = wsManager.on<TerminalDataPayload>('terminal:data', (payload, sessionId) => {
      if (sessionId === activeTab.sessionId) {
        xtermRef.current?.write(payload.data);
      }
    });
    return unsub;
  }, [activeTab.sessionId]);

  const handleStart = useCallback(async () => {
    setStarting(true);
    await startSession(activeTab.id);
    setStarting(false);
  }, [activeTab.id, startSession]);

  const handleData = useCallback((data: string) => {
    if (activeTab.sessionId) {
      sendData(activeTab.sessionId, data);
    }
  }, [activeTab.sessionId, sendData]);

  const handleResize = useCallback((cols: number, rows: number) => {
    if (activeTab.sessionId) {
      resize(activeTab.sessionId, cols, rows);
    }
  }, [activeTab.sessionId, resize]);

  return (
    <View style={styles.container}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            style={[styles.tab, tab.id === activeTabId && styles.tabActive]}
            onPress={() => setActiveTabId(tab.id)}
            onLongPress={() => closeTab(tab.id)}
          >
            <Text style={[styles.tabText, tab.id === activeTabId && styles.tabTextActive]}>
              {tab.title}
            </Text>
          </Pressable>
        ))}
        <Pressable style={styles.addTabBtn} onPress={addTab}>
          <Feather name="plus" size={16} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Terminal content */}
      {!activeTab.ready ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Remote Terminal</Text>
          <Text style={styles.emptyHint}>
            Open a PowerShell session on your PC from your phone.
          </Text>
          <Pressable
            style={styles.connectButton}
            onPress={handleStart}
            disabled={starting}
          >
            {starting ? (
              <ActivityIndicator color={colors.bg} />
            ) : (
              <Text style={styles.connectText}>Start Session</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <XTermView
          ref={xtermRef}
          onData={handleData}
          onResize={handleResize}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0c0c0c' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 4,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.accent,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  tabTextActive: {
    color: colors.text,
  },
  addTabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: colors.accent, marginBottom: 8 },
  emptyHint: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  connectButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  connectText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
