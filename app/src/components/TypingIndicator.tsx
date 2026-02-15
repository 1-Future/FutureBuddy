import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors } from '../theme/tokens';

function Dot({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [delay, opacity]);

  return (
    <Animated.View
      style={{
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: colors.textMuted,
        marginHorizontal: 2,
        opacity,
      }}
    />
  );
}

export default function TypingIndicator() {
  return (
    <View style={styles.container}>
      <View style={styles.dotsRow}>
        <Dot delay={0} />
        <Dot delay={150} />
        <Dot delay={300} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    backgroundColor: colors.bgElevated,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginVertical: 3,
  },
  dotsRow: {
    flexDirection: 'row',
  },
});
