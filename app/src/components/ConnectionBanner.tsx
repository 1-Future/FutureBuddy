import { View, Text, StyleSheet } from 'react-native';
import { useConnectionStore } from '../stores/connection.store';
import { colors } from '../theme/tokens';

export default function ConnectionBanner() {
  const wsState = useConnectionStore((s) => s.wsState);

  if (wsState === 'connected') return null;

  const label = wsState === 'connecting' ? 'Reconnecting...' : 'No connection';
  const bg = wsState === 'connecting' ? colors.warning : colors.error;

  return (
    <View style={[styles.banner, { backgroundColor: bg }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});
