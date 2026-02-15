import { useState, useRef, useEffect, useCallback } from 'react';
import { View, TextInput, StyleSheet, Pressable, Alert, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { colors } from '../theme/tokens';

interface ChatInputProps {
  onSend: (text: string, images?: string[]) => void;
  onCancel: () => void;
  isStreaming: boolean;
  serverUrl?: string;
}

export default function ChatInput({ onSend, onCancel, isStreaming, serverUrl }: ChatInputProps) {
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const animTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pulse animation when recording
  useEffect(() => {
    if (isRecording) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  useEffect(() => {
    return () => {
      if (animTimerRef.current) clearInterval(animTimerRef.current);
    };
  }, []);

  const animateText = useCallback((fullText: string) => {
    let i = 0;
    setText('');
    if (animTimerRef.current) clearInterval(animTimerRef.current);
    animTimerRef.current = setInterval(() => {
      i++;
      setText(fullText.slice(0, i));
      if (i >= fullText.length) {
        if (animTimerRef.current) clearInterval(animTimerRef.current);
        animTimerRef.current = null;
      }
    }, 20);
  }, []);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (animTimerRef.current) {
      clearInterval(animTimerRef.current);
      animTimerRef.current = null;
    }
    onSend(trimmed, images.length > 0 ? images : undefined);
    setText('');
    setImages([]);
  }

  async function handleAttach() {
    Alert.alert('Attach', 'Choose source', [
      {
        text: 'Camera',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) return;
          const result = await ImagePicker.launchCameraAsync({
            quality: 0.7,
            base64: true,
          });
          if (!result.canceled && result.assets[0]?.base64) {
            setImages((prev) => [...prev, result.assets[0].base64!]);
          }
        },
      },
      {
        text: 'Photo Library',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) return;
          const result = await ImagePicker.launchImageLibraryAsync({
            quality: 0.7,
            base64: true,
          });
          if (!result.canceled && result.assets[0]?.base64) {
            setImages((prev) => [...prev, result.assets[0].base64!]);
          }
        },
      },
      {
        text: 'File',
        onPress: async () => {
          const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
          if (!result.canceled && result.assets[0]) {
            // For files, just put the name in text
            setText((prev) => prev + (prev ? ' ' : '') + result.assets[0].name);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function handleVoicePress() {
    if (isRecording) {
      setIsRecording(false);
      try {
        const recording = recordingRef.current;
        if (!recording) return;
        recordingRef.current = null;

        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        if (!uri) {
          Alert.alert('Recording error', 'No audio was captured.');
          return;
        }

        // Read audio file as base64 and send to server for transcription
        if (serverUrl) {
          setIsTranscribing(true);
          try {
            const base64 = await FileSystem.readAsStringAsync(uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            const res = await fetch(`${serverUrl}/api/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: `[voice:${base64.slice(0, 100)}...]` }),
            });
            if (res.ok) {
              // For now, just put a placeholder — real transcription would need a server endpoint
              animateText('[Voice message sent]');
            }
          } catch (err: any) {
            Alert.alert('Transcription error', err?.message ?? 'Failed to transcribe.');
          } finally {
            setIsTranscribing(false);
          }
        }
      } catch (err: any) {
        Alert.alert('Recording error', err?.message ?? 'Failed to stop recording.');
      }
      return;
    }

    // Start recording
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission needed', 'Microphone access is required for voice input.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err: any) {
      Alert.alert('Recording error', err?.message ?? 'Could not start recording.');
    }
  }

  const showSendButton = !!text.trim() && !isStreaming;

  return (
    <View style={styles.container}>
      <Pressable onPress={handleAttach} style={styles.btn}>
        <Feather name="paperclip" size={20} color={colors.textMuted} />
      </Pressable>

      <View style={styles.inputWrapper}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={(t) => {
            if (animTimerRef.current) {
              clearInterval(animTimerRef.current);
              animTimerRef.current = null;
            }
            setText(t);
          }}
          placeholder={
            isRecording ? 'Recording... tap to stop' :
            isTranscribing ? 'Transcribing...' :
            'Message Future Buddy...'
          }
          placeholderTextColor={isRecording ? colors.error : isTranscribing ? colors.accent : colors.textMuted}
          multiline
          maxLength={10000}
          editable={!isStreaming && !isRecording}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        {images.length > 0 && (
          <View style={styles.imageCount}>
            <Feather name="image" size={12} color={colors.accent} />
          </View>
        )}
      </View>

      {isStreaming ? (
        <Pressable onPress={onCancel} style={styles.btn}>
          <Feather name="square" size={20} color={colors.error} />
        </Pressable>
      ) : showSendButton ? (
        <Pressable onPress={handleSend} style={styles.btn}>
          <Feather name="send" size={20} color={colors.accent} />
        </Pressable>
      ) : (
        <Pressable onPress={handleVoicePress} style={styles.voiceBtn} disabled={isTranscribing}>
          {isRecording ? (
            <Animated.View style={[styles.recordingCircle, { opacity: pulseAnim }]}>
              <View style={styles.recordingDot} />
            </Animated.View>
          ) : isTranscribing ? (
            <View style={[styles.voiceCircle, { backgroundColor: colors.textMuted }]}>
              <Feather name="loader" size={18} color="white" />
            </View>
          ) : (
            <View style={styles.voiceCircle}>
              <Feather name="mic" size={18} color="white" />
            </View>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.bgSurface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'flex-end',
    gap: 4,
  },
  inputWrapper: {
    flex: 1,
    position: 'relative',
  },
  input: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.bgElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageCount: {
    position: 'absolute',
    right: 8,
    top: 8,
  },
  btn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: 'white',
  },
});
