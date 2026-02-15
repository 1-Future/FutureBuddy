import { Pressable, Text, StyleSheet, type ViewStyle } from 'react-native';
import { colors } from '../theme/tokens';

interface BtnProps {
  children: string;
  onPress: () => void;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  disabled?: boolean;
  opacity?: number;
  style?: ViewStyle;
}

const sizeConfig = {
  sm: { paddingVertical: 6, paddingHorizontal: 12, fontSize: 13 },
  md: { paddingVertical: 10, paddingHorizontal: 18, fontSize: 15 },
  lg: { paddingVertical: 14, paddingHorizontal: 24, fontSize: 17 },
};

export default function Btn({
  children,
  onPress,
  color = colors.text,
  backgroundColor = colors.bgElevated,
  borderColor,
  borderWidth,
  size = 'md',
  icon,
  disabled = false,
  opacity = 1,
  style,
}: BtnProps) {
  const sizeStyle = sizeConfig[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor,
          paddingVertical: sizeStyle.paddingVertical,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          opacity: pressed ? opacity * 0.7 : opacity,
          ...(borderColor ? { borderColor, borderWidth: borderWidth ?? 1 } : {}),
        },
        style,
      ]}
    >
      {icon && <>{icon}</>}
      <Text
        style={[
          styles.text,
          { color, fontSize: sizeStyle.fontSize },
          icon ? { marginLeft: 6 } : undefined,
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  text: {
    fontWeight: '600',
  },
});
