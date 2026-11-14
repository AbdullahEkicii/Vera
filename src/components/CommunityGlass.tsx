import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

/**
 * Frosted-glass look for the community cards: a translucent surface over the app background, a bright
 * hairline edge and a soft sheen from the top. It is a tinted layer, not a live blur, so a long list of
 * cards stays cheap to scroll.
 */
export const glassTokens = (isDark: boolean) => ({
  bg: isDark ? 'rgba(20, 24, 32, 0.66)' : 'rgba(255, 255, 255, 0.76)',
  border: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.95)',
  sheen: (isDark ? ['rgba(255, 255, 255, 0.10)', 'rgba(255, 255, 255, 0)'] : ['rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0)']) as [string, string],
  shadow: isDark ? '#000000' : '#1B2A41',
});

export const GLASS_RADIUS = 22;

export function useGlass() {
  const { isDark } = useTheme();
  const g = glassTokens(isDark);
  const style: ViewStyle = {
    backgroundColor: g.bg,
    borderColor: g.border,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: GLASS_RADIUS,
    overflow: 'hidden',
    // A soft lift on iOS only: Android draws elevation shadows through a translucent surface.
    ...Platform.select<ViewStyle>({
      ios: { shadowColor: g.shadow, shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
      default: {},
    }),
  };
  return { style, sheen: g.sheen, isDark };
}

/** The top highlight. Put it first inside a glass container that clips its children. */
export function GlassSheen() {
  const { sheen } = useGlass();
  return <LinearGradient pointerEvents="none" colors={sheen} style={styles.sheen} />;
}

export function GlassCard({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const glass = useGlass();
  return (
    <View style={[glass.style, style]}>
      <LinearGradient pointerEvents="none" colors={glass.sheen} style={styles.sheen} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 56 },
});
