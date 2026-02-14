// Copyright 2025 #1 Future — Apache 2.0 License

import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { createTerminal } from "../src/services/api";
import { sendWsMessage, onWsMessage } from "../src/services/websocket";

export default function TerminalScreen() {
  const [output, setOutput] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const unsub = onWsMessage("terminal:data", (msg) => {
      if (msg.sessionId === sessionId) {
        setOutput((prev) => [...prev, msg.payload.data]);
      }
    });
    return unsub;
  }, [sessionId]);

  const startSession = useCallback(async () => {
    setConnecting(true);
    try {
      const session = await createTerminal();
      setSessionId(session.id);
      setOutput([`Connected to terminal (PID: ${session.pid})\r\n`]);
    } catch (err: any) {
      setOutput([`Error: ${err.message}\r\n`]);
    } finally {
      setConnecting(false);
    }
  }, []);

  const handleSend = useCallback(() => {
    if (!sessionId || !input) return;
    sendWsMessage("terminal:data", { data: input + "\r" }, sessionId);
    setInput("");
  }, [sessionId, input]);

  return (
    <View style={styles.container}>
      {!sessionId ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Remote Terminal</Text>
          <Text style={styles.emptyHint}>
            Open a PowerShell session on your PC from your phone.
          </Text>
          <TouchableOpacity
            style={styles.connectButton}
            onPress={startSession}
            disabled={connecting}
          >
            {connecting ? (
              <ActivityIndicator color="#0a0a0a" />
            ) : (
              <Text style={styles.connectText}>Start Session</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            ref={scrollRef}
            style={styles.output}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd()}
          >
            <Text style={styles.outputText} selectable>
              {output.join("")}
            </Text>
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Enter command..."
              placeholderTextColor="#666"
              onSubmitEditing={handleSend}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
              <Text style={styles.sendText}>Run</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyTitle: { fontSize: 22, fontWeight: "bold", color: "#4fc3f7", marginBottom: 8 },
  emptyHint: { fontSize: 14, color: "#666", textAlign: "center", marginBottom: 24, lineHeight: 22 },
  connectButton: {
    backgroundColor: "#4fc3f7",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  connectText: { color: "#0a0a0a", fontWeight: "bold", fontSize: 16 },
  output: { flex: 1, padding: 12 },
  outputText: { color: "#00ff00", fontFamily: "monospace", fontSize: 12, lineHeight: 18 },
  inputRow: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#222",
  },
  input: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#00ff00",
    fontFamily: "monospace",
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: "#4fc3f7",
    borderRadius: 8,
    paddingHorizontal: 20,
    marginLeft: 8,
    justifyContent: "center",
  },
  sendText: { color: "#0a0a0a", fontWeight: "bold" },
});
