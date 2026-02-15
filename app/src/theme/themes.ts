import { colors } from './tokens';

export const darkTheme = {
  background: colors.bg,
  backgroundHover: colors.bgHover,
  backgroundPress: colors.bgElevated,
  backgroundFocus: colors.bgSurface,
  color: colors.text,
  colorHover: colors.text,
  colorPress: colors.textSecondary,
  colorFocus: colors.text,
  borderColor: colors.border,
  borderColorHover: colors.borderLight,
  borderColorPress: colors.border,
  borderColorFocus: colors.accent,
  shadowColor: '#000000',
  shadowColorHover: '#000000',
} as const;
