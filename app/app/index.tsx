// Copyright 2025 #1 Future — Apache 2.0 License

import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { sendMessage } from "../src/services/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const flatListRef = useRef<FlatList>(null);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await sendMessage(text, conversationId);
      setConversationId(response.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.message.content,
          timestamp: response.message.timestamp,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${err.message}. Make sure the server is running and an AI provider is configured.`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, conversationId]);

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => (
      <View
        style={[
          styles.messageBubble,
          item.role === "user" ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text style={styles.messageText}>{item.content}</Text>
      </View>
    ),
    [],
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {messages.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>FutureBuddy</Text>
          <Text style={styles.emptySubtitle}>Your 24/7 IT Department</Text>
          <Text style={styles.emptyHint}>
            Ask me anything about your computer — setup, security, files, network, updates, or just
            {'"how do I..."'}
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask FutureBuddy..."
          placeholderTextColor="#666"
          onSubmitEditing={handleSend}
          editable={!loading}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, loading && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.sendText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyTitle: { fontSize: 28, fontWeight: "bold", color: "#4fc3f7", marginBottom: 4 },
  emptySubtitle: { fontSize: 16, color: "#aaa", marginBottom: 20 },
  emptyHint: { fontSize: 14, color: "#666", textAlign: "center", lineHeight: 22 },
  messageList: { padding: 16, paddingBottom: 8 },
  messageBubble: { padding: 12, borderRadius: 12, marginBottom: 8, maxWidth: "85%" },
  userBubble: { backgroundColor: "#1a3a4a", alignSelf: "flex-end" },
  assistantBubble: { backgroundColor: "#1a1a1a", alignSelf: "flex-start" },
  messageText: { color: "#e0e0e0", fontSize: 15, lineHeight: 22 },
  inputRow: {
    flexDirection: "row",
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
    borderTopWidth: 1,
    borderTopColor: "#222",
    backgroundColor: "#0a0a0a",
  },
  input: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "#e0e0e0",
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#4fc3f7",
    borderRadius: 20,
    paddingHorizontal: 20,
    marginLeft: 8,
    justifyContent: "center",
  },
  sendButtonDisabled: { opacity: 0.5 },
  sendText: { color: "#0a0a0a", fontWeight: "bold", fontSize: 15 },
});
