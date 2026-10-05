import React, { useEffect, useState } from 'react';
import {
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ct } from '../localization/content';

const BAR_HEIGHT = 64;
const BAR_PADDING_H = 8;
const PILL_HEIGHT = 42;
const ICON_SIZE = 20;

const TIMING_CONFIG = {
  duration: 220,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Apple fluid ease-out
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
  isLangTR: boolean;
  isDark?: boolean;
  heroGradient: readonly [string, string];
  activeIconColor?: string;
  inactiveColor: string;
  glowColor: string;
  borderColor?: string;
  backgroundColor?: string;
}

interface TabButtonProps {
  tab: TabBarTab;
  isActive: boolean;
  onPress: () => void;
  isLangTR: boolean;
  activeIconColor: string;
  inactiveColor: string;
  glowColor: string;
}

const TabButton: React.FC<TabButtonProps> = React.memo(({
  tab,
  isActive,
  onPress,
  isLangTR,
  activeIconColor,
  inactiveColor,
  glowColor,
}) => {
  const pressScale = useSharedValue(1);

  const handlePressIn = () => {
    pressScale.value = withTiming(0.88, { duration: 100 });
  };

  const handlePressOut = () => {
    pressScale.value = withTiming(1, { duration: 150 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pressScale.value * (isActive ? 1.12 : 1) },
      { translateY: isActive ? -1 : 0 },
    ],
  }));

  return (
    <Pressable
      style={styles.tabItem}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="tab"
      accessibilityLabel={ct(`content.tabs.${tab.id}.label`, tab.labelTR, tab.labelEN)}
      accessibilityState={{ selected: isActive }}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      android_ripple={{ color: glowColor, radius: 24, borderless: true }}
    >
      <Animated.View style={[styles.tabContent, animatedStyle]}>
        <Feather
          name={tab.icon as any}
          size={ICON_SIZE}
          color={isActive ? activeIconColor : inactiveColor}
          style={{ opacity: isActive ? 1 : 0.8 }}
        />
        {isActive && (
          <View style={[styles.activeDot, { backgroundColor: activeIconColor }]} />
        )}
      </Animated.View>
    </Pressable>
  );
});

TabButton.displayName = 'TabButton';

export const AnimatedTabBar: React.FC<AnimatedTabBarProps> = ({
  tabs,
  activeTab,
  onTabPress,
  bottom,
  isLangTR,
  isDark = true,
  heroGradient,
  activeIconColor = '#FFFFFF',
  inactiveColor,
  glowColor,
  borderColor,
  backgroundColor,
}) => {
  const [barWidth, setBarWidth] = useState(0);
  const animatedIndex = useSharedValue(activeTab);

  // Buttery-smooth single GPU-thread transition
  useEffect(() => {
    animatedIndex.value = withTiming(activeTab, TIMING_CONFIG);
  }, [activeTab]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== barWidth) {
      setBarWidth(width);
    }
  };

  const tabWidth = barWidth > 0 ? (barWidth - BAR_PADDING_H * 2) / tabs.length : 0;
  // Sleek horizontal capsule: fits icons naturally without stretching
  const pillWidth = Math.max(tabWidth - 6, 38);
  const pillInsetX = (tabWidth - pillWidth) / 2;

  const pillAnimatedStyle = useAnimatedStyle(() => {
    if (tabWidth === 0) return { opacity: 0 };
    const currentX = animatedIndex.value * tabWidth + BAR_PADDING_H + pillInsetX;
    return {
      opacity: 1,
      width: pillWidth,
      transform: [{ translateX: currentX }],
    };
  });

  const handleTabPress = (index: number) => {
    if (index !== activeTab) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    onTabPress(index);
  };

  const defaultBorder = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.07)';
  const defaultBg = isDark ? 'rgba(18, 18, 24, 0.72)' : 'rgba(255, 255, 255, 0.78)';

  return (
    <View
      style={[
        styles.wrapper,
        {
          bottom,
          shadowColor: isDark ? '#000' : glowColor,
        },
      ]}
      pointerEvents="box-none"
    >
      <BlurView
        intensity={Platform.OS === 'ios' ? 70 : 85}
        tint={isDark ? 'dark' : 'light'}
        style={[
          styles.dockBar,
          {
            borderColor: borderColor || defaultBorder,
            backgroundColor: backgroundColor || defaultBg,
          },
        ]}
        onLayout={handleLayout}
      >
        {/* Fast Fluid Sliding Gradient Pill */}
        <Animated.View
          style={[
            styles.pill,
            pillAnimatedStyle,
            { shadowColor: glowColor },
          ]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={heroGradient as [string, string]}
            style={styles.pillGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Subtle top sheen */}
            <View style={styles.pillGlassHighlight} />
          </LinearGradient>
        </Animated.View>

        {/* Tab Items */}
        {tabs.map((tab, index) => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={index === activeTab}
            onPress={() => handleTabPress(index)}
            isLangTR={isLangTR}
            activeIconColor={activeIconColor}
            inactiveColor={inactiveColor}
            glowColor={glowColor}
          />
        ))}
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: BAR_HEIGHT,
    zIndex: 9999,
    elevation: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.20,
    shadowRadius: 18,
  },
  dockBar: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 36,
    borderWidth: 1.2,
    overflow: 'hidden',
    alignItems: 'center',
    paddingHorizontal: BAR_PADDING_H,
  },
  pill: {
    position: 'absolute',
    top: (BAR_HEIGHT - PILL_HEIGHT) / 2,
    left: 0,
    height: PILL_HEIGHT,
    borderRadius: 21,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.40,
    shadowRadius: 8,
    elevation: 6,
  },
  pillGradient: {
    flex: 1,
    borderRadius: 21,
    overflow: 'hidden',
  },
  pillGlassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '42%',
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    borderTopLeftRadius: 21,
    borderTopRightRadius: 21,
  },
  tabItem: {
    flex: 1,
    height: BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    position: 'absolute',
    bottom: 3,
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
  },
});
