import React, { useEffect, useState } from 'react';
import {
  I18nManager,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

// Glass dock height is exported so the screen can reserve the same space for its content.
export const TAB_BAR_HEIGHT = 64;
const DOCK_MAX_WIDTH = 440; // Keeps the dock from stretching on tablets.
const DOCK_PADDING_H = 6;
const CAPSULE_HEIGHT = 44;
const CAPSULE_PAD_H = 10;
const CAPSULE_MIN_WIDTH = 104; // Active slot width range; holds an icon plus a short label.
const CAPSULE_MAX_WIDTH = 150;
const CAPSULE_SHARE = 0.35; // Active slot as a share of the dock's inner width.
const ICON_SIZE = 22;
const ICON_GAP = 6;
const HIT_SLOP_H = 8; // Inactive slots are ~34dp on 360dp phones; the touch area is widened to 44dp.
const LENS_OPACITY = 0.14; // Low-opacity tint of the active colour, never a solid fill.
const LABEL_FONT = 'Outfit_600SemiBold';
const LABEL_CHAR_WIDTH = 7.6; // Rough advance of one 13px label glyph; labels that cannot fit fall back to icon-only.
const BLUR_INTENSITY = 70;
const SPRING = { damping: 18, stiffness: 180, mass: 1 }; // Gentle, slightly bouncy.

// Distinct glyphs per tab id (the caller's icons for quran/daily/library read as near-duplicates).
const TAB_ICONS: Record<string, string> = {
  quran: 'book',
  daily: 'sun',
  home: 'home',
  dhikr: 'heart',
  library: 'message-circle',
  qibla: 'compass',
};

export interface TabBarTab {
  id: string;
  icon: string;
  labelTR: string;
  labelEN: string;
}

interface AnimatedTabBarProps {
  tabs: readonly TabBarTab[];
  activeTab: number;
  onTabPress: (index: number) => void;
  bottom: number;
  /** @deprecated unused; kept so existing callers still type-check. */
  isLangTR?: boolean;
  isDark?: boolean;
  /** @deprecated unused since the icon-first dock; kept so existing callers still type-check. */
  heroGradient?: readonly [string, string];
  /** Colour of the active icon and label. Pass theme.colors.primary. */
  activeIconColor?: string;
  inactiveColor: string;
  glowColor: string;
  /** Colour of the hairline on the dock's top edge. */
  borderColor?: string;
  /** Translucent glass tint over the blur. */
  backgroundColor?: string;
  /** Colour of the soft drop shadow. Defaults to inactiveColor. */
  shadowColor?: string;
}

interface TabButtonProps {
  tab: TabBarTab;
  index: number;
  lastIndex: number;
  isActive: boolean;
  /** Shared position in tab units; drives each tab's width, lens, icon and label. */
  position: SharedValue<number>;
  slotBase: number;
  slotActive: number;
  labelWidth: number;
  onPress: () => void;
  activeColor: string;
  inactiveColor: string;
  glowColor: string;
}

const TabButton: React.FC<TabButtonProps> = React.memo(({
  tab,
  index,
  lastIndex,
  isActive,
  position,
  slotBase,
  slotActive,
  labelWidth,
  onPress,
  activeColor,
  inactiveColor,
  glowColor,
}) => {
  const pressScale = useSharedValue(1);
  // The label must come from the hook's `t`: react-i18next hands out a NEW `t` whenever the
  // language changes. The React Compiler memoizes a render by its inputs and treats an imperative
  // call such as `ct(...)` (which reads global i18n state) as a pure function of `tab`, so the
  // label stayed in the old language after a switch.
  const { t, i18n } = useTranslation();

  const fallbackLabel = (i18n.language || '').startsWith('tr') ? tab.labelTR : tab.labelEN;
  const label = t(`content.tabs.${tab.id}.label`, { defaultValue: fallbackLabel });
  const iconName = (TAB_ICONS[tab.id] ?? tab.icon) as any;
  // Room for the label inside the lens is labelWidth; a label that would overflow drops out.
  const showLabel = label.length * LABEL_CHAR_WIDTH <= labelWidth;

  const handlePressIn = () => {
    pressScale.value = withSpring(0.92, { damping: 20, stiffness: 400 });
  };

  const handlePressOut = () => {
    pressScale.value = withSpring(1, { damping: 18, stiffness: 300 });
  };

  // 1 when this tab is under the active position, 0 when it is one or more tabs away.
  // The position is clamped to the tab range so a spring overshoot past the first or last tab
  // cannot push the summed slot widths off the dock width.
  const progressOf = (value: number) => {
    'worklet';
    const clamped = Math.max(0, Math.min(lastIndex, value));
    return Math.max(0, Math.min(1, 1 - Math.abs(clamped - index)));
  };

  // Width sums to a constant across all tabs at any fractional position, so the row never reflows.
  const slotStyle = useAnimatedStyle(() => ({
    width: slotBase + (slotActive - slotBase) * progressOf(position.value),
  }), [slotBase, slotActive, index, lastIndex]);

  const capsuleStyle = useAnimatedStyle(() => ({
    opacity: LENS_OPACITY * progressOf(position.value),
  }), [index, lastIndex]);

  const inactiveIconStyle = useAnimatedStyle(() => ({
    opacity: 1 - progressOf(position.value),
  }), [index, lastIndex]);

  const activeIconStyle = useAnimatedStyle(() => ({
    opacity: progressOf(position.value),
  }), [index, lastIndex]);

  const labelBoxStyle = useAnimatedStyle(() => {
    const p = progressOf(position.value);
    return {
      opacity: p,
      width: showLabel ? (labelWidth + ICON_GAP) * p : 0,
    };
  }, [labelWidth, showLabel, index, lastIndex]);

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  return (
    <Animated.View style={[styles.slot, slotStyle]}>
      <Pressable
        style={styles.touch}
        hitSlop={{ left: HIT_SLOP_H, right: HIT_SLOP_H }}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: isActive }}
        android_ripple={{ color: glowColor, radius: 22, borderless: true }}
      >
        <Animated.View style={[styles.lens, { backgroundColor: activeColor }, capsuleStyle]} pointerEvents="none" />
        <Animated.View style={[styles.content, contentStyle]} pointerEvents="none">
          <View style={styles.iconBox}>
            <Animated.View style={[styles.iconLayer, inactiveIconStyle]}>
              <Feather name={iconName} size={ICON_SIZE} color={inactiveColor} />
            </Animated.View>
            <Animated.View style={[styles.iconLayer, activeIconStyle]}>
              <Feather name={iconName} size={ICON_SIZE} color={activeColor} />
            </Animated.View>
          </View>
          <Animated.View style={[styles.labelBox, labelBoxStyle]}>
            <Text
              style={[
                styles.label,
                {
                  color: activeColor,
                  width: labelWidth + ICON_GAP,
                  textAlign: I18nManager.isRTL ? 'right' : 'left',
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              maxFontSizeMultiplier={1.2}
            >
              {label}
            </Text>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
});

TabButton.displayName = 'TabButton';

export const AnimatedTabBar: React.FC<AnimatedTabBarProps> = ({
  tabs,
  activeTab,
  onTabPress,
  bottom,
  isDark = true,
  activeIconColor,
  inactiveColor,
  glowColor,
  borderColor,
  backgroundColor,
  shadowColor,
}) => {
  const [barWidth, setBarWidth] = useState(0);
  const animatedIndex = useSharedValue(activeTab);
  const reduceMotion = useReducedMotion();

  // One shared position drives every tab's width, lens and label.
  useEffect(() => {
    animatedIndex.value = reduceMotion ? activeTab : withSpring(activeTab, SPRING);
  }, [activeTab, reduceMotion]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== barWidth) {
      setBarWidth(width);
    }
  };

  // Widths come from the measured dock, so the row fits 360dp phones and capped tablets alike.
  const lastIndex = Math.max(0, tabs.length - 1);
  const inner = Math.max(0, barWidth - 2 * DOCK_PADDING_H);
  const slotActive = barWidth > 0
    ? Math.min(CAPSULE_MAX_WIDTH, Math.max(CAPSULE_MIN_WIDTH, inner * CAPSULE_SHARE))
    : 0;
  const slotBase = barWidth > 0 && lastIndex > 0
    ? Math.max(0, (inner - slotActive) / lastIndex)
    : 0;
  const labelWidth = Math.max(0, slotActive - CAPSULE_PAD_H * 2 - ICON_SIZE - ICON_GAP);

  const handleTabPress = (index: number) => {
    if (index !== activeTab) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    onTabPress(index);
  };

  const activeColor = activeIconColor ?? inactiveColor;

  // Soft fade behind the dock: content dissolves into a neutral tint as it nears the bottom
  // edge, instead of a hard cut. Tinted, never white.
  const fadeTint = isDark ? 'rgba(8, 8, 12, ' : 'rgba(246, 244, 240, ';

  return (
    <>
      <View pointerEvents="none" style={[styles.fade, { bottom: Math.max(0, bottom - 18) }]}>
        {/* The edge fade is a gradient only: a second blur band would add a glass layer beside the dock. */}
        <LinearGradient
          colors={[fadeTint + '0)', fadeTint + '0.55)']}
          locations={[0, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>
    <View style={[styles.wrapper, { bottom }]} pointerEvents="box-none">
      <View
        style={[
          styles.dock,
          {
            shadowColor: shadowColor ?? inactiveColor,
            borderTopColor: borderColor ?? 'transparent',
            backgroundColor: backgroundColor ?? 'transparent',
          },
        ]}
        onLayout={handleLayout}
      >
        <BlurView
          intensity={BLUR_INTENSITY}
          tint={isDark ? 'dark' : 'light'}
          style={[StyleSheet.absoluteFill, styles.clip]}
        />
        <View style={[styles.row, { opacity: barWidth > 0 ? 1 : 0 }]}>
          {tabs.map((tab, index) => (
            <TabButton
              key={tab.id}
              tab={tab}
              index={index}
              lastIndex={lastIndex}
              isActive={index === activeTab}
              position={animatedIndex}
              slotBase={slotBase}
              slotActive={slotActive}
              labelWidth={labelWidth}
              onPress={() => handleTabPress(index)}
              activeColor={activeColor}
              inactiveColor={inactiveColor}
              glowColor={glowColor}
            />
          ))}
        </View>
      </View>
    </View>
    </>
  );
};

const styles = StyleSheet.create({
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: TAB_BAR_HEIGHT + 40,
    overflow: 'hidden',
    zIndex: 9998,
  },
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: TAB_BAR_HEIGHT,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 20,
  },
  dock: {
    width: '100%',
    maxWidth: DOCK_MAX_WIDTH,
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2,
    // Only the top edge gets a hairline highlight; the rest of the glass has no outline.
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 10,
  },
  clip: {
    borderRadius: TAB_BAR_HEIGHT / 2,
    overflow: 'hidden',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: DOCK_PADDING_H,
  },
  slot: {
    alignSelf: 'stretch',
  },
  touch: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lens: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    marginTop: -CAPSULE_HEIGHT / 2,
    height: CAPSULE_HEIGHT,
    borderRadius: CAPSULE_HEIGHT / 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  iconLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelBox: {
    overflow: 'hidden',
    height: CAPSULE_HEIGHT,
    justifyContent: 'center',
  },
  label: {
    fontFamily: LABEL_FONT,
    fontSize: 13,
    lineHeight: 16,
    paddingStart: ICON_GAP,
  },
});
