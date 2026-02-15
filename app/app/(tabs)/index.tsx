import { useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useChat } from '../../src/hooks/useChat';
import { useChatStore } from '../../src/stores/chat.store';
import ChatInput from '../../src/components/ChatInput';
import MessageBubble from '../../src/components/MessageBubble';
import StreamingText from '../../src/components/StreamingText';
import TypingIndicator from '../../src/components/TypingIndicator';
import ToolStatusBar from '../../src/components/ToolStatusBar';
import { colors } from '../../src/theme/tokens';
import type { ChatMessage } from '../../src/types/models';

export default function ChatScreen() {
  const {
    messages,
    streamingContent,
    isStreaming,
    toolActivities,
    sendMessage,
    cancelStream,
  } = useChat();
  const newConversation = useChatStore((s) => s.newConversation);
  const flatListRef = useRef<FlatList>(null);

  const handleSend = useCallback(
    (text: string, images?: string[]) => {
      sendMessage(text, images);
    },
    [sendMessage],
  );

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => <MessageBubble message={item} />,
    [],
  );

  const ListFooter = useCallback(() => (
    <View>
      <ToolStatusBar activities={toolActivities} />
      {isStreaming && streamingContent ? (
        <StreamingText content={streamingContent} />
      ) : isStreaming ? (
        <TypingIndicator />
      ) : null}
    </View>
  ), [isStreaming, streamingContent, toolActivities]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {messages.length === 0 && !isStreaming ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>FutureBuddy</Text>
          <Text style={styles.emptySubtitle}>Your 24/7 IT Department</Text>
          <Text style={styles.emptyHint}>
            Ask me anything about your computer — setup, security, files, network, updates, or just "how do I..."
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
          ListFooterComponent={ListFooter}
        />
      )}

      <ChatInput
        onSend={handleSend}
        onCancel={cancelStream}
        isStreaming={isStreaming}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 28, fontWeight: 'bold', color: colors.accent, marginBottom: 4 },
  emptySubtitle: { fontSize: 16, color: colors.textSecondary, marginBottom: 20 },
  emptyHint: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  messageList: { padding: 16, paddingBottom: 8 },
});
