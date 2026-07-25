import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface ScalePressableProps extends PressableProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  activeScale?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const ScalePressable: React.FC<ScalePressableProps> = ({
  children,
  style,
  activeScale = 0.95,
  ...props
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <AnimatedPressable
      style={[style, animatedStyle]}
      onPressIn={(e) => {
        scale.value = withSpring(activeScale, { damping: 15, stiffness: 200, mass: 0.5 });
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 12, stiffness: 200, mass: 0.5 });
        props.onPressOut?.(e);
      }}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
};
