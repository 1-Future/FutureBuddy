import { View, Text, StyleSheet } from 'react-native';
import type { ActionTier } from '../types/models';
import { colors } from '../theme/tokens';

const tierConfig: Record<ActionTier, { label: string; color: string }> = {
  red: { label: 'HIGH', color: colors.tierRed },
  yellow: { label: 'MED', color: colors.tierYellow },
  green: { label: 'LOW', color: colors.tierGreen },
};

interface TierBadgeProps {
  tier: ActionTier;
}

export default function TierBadge({ tier }: TierBadgeProps) {
  const { label, color } = tierConfig[tier];

  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    opacity: 0.9,
  },
  text: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
});
