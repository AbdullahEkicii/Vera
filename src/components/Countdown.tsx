import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing } from '../utils/theme';
import Animated, {
  FadeInDown,
  FadeOutUp,
} from 'react-native-reanimated';

interface CountdownProps {
  targetDate: Date;
}

export const Countdown: React.FC<CountdownProps> = ({ targetDate }) => {
  const { theme } = useTheme();
  
  // Provide an initial positive string avoiding initial render glitch
  const [timeLeftStr, setTimeLeftStr] = useState('00:00:00');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();
      
      if (difference <= 0) {
        setTimeLeftStr('00:00:00');
        return;
      }
      
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);
      
      const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      setTimeLeftStr(formatted);
    };

    updateCountdown(); // Initial call
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <View style={styles.container}>
      <Animated.Text
        key={timeLeftStr} // Changing key triggers enter/exit animations smoothly
        entering={FadeInDown.duration(200)}
        exiting={FadeOutUp.duration(200)}
        style={[styles.text, { color: theme.colors.primary }]}
      >
        {timeLeftStr}
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 60, // Fixed height avoids layout jumps
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  text: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 48,
    letterSpacing: 2,
    position: 'absolute',
  },
});
