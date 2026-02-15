import { useState, useRef } from 'react';
import { View, TextInput, StyleSheet, Pressable, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/tokens';

interface TerminalInputProps {
  onSubmit: (text: string) => void;
}

export default function TerminalInput({ onSubmit }: TerminalInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setText('');
  }

  const showSendButton = !!text.trim();

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a command..."
          placeholderTextColor={colors.textMuted}
          maxLength={5000}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          blurOnSubmit={false}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
        />
      </View>

      {showSendButton && (
        <Pressable onPress={handleSend} style={styles.btn}>
          <Feather name="send" size={20} color={colors.accent} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'flex-end',
    gap: 4,
  },
  inputWrapper: {
    flex: 1,
  },
  input: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 18,
    maxHeight: 80,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  btn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
