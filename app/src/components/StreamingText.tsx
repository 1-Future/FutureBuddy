import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/tokens';

interface StreamingTextProps {
  content: string;
}

export default function StreamingText({ content }: StreamingTextProps) {
  if (!content) return null;

  return (
    <View style={styles.bubble}>
      <Text selectable style={styles.content}>
        {content}
        <Text style={styles.cursor}>|</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.bgElevated,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '85%',
    marginVertical: 3,
  },
  content: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  cursor: {
    color: colors.accent,
  },
});
