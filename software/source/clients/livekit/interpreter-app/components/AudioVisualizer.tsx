import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const AgentMultibandAudioVisualizer = ({
  state,
  barWidth,
  minBarHeight,
  maxBarHeight,
  accentColor,
  frequencies,
  borderRadius,
  gap,
}) => {
  const animatedValues = frequencies.map(() => useSharedValue(0));

  useEffect(() => {
    if (state === 'speaking') {
      frequencies.forEach((frequency, index) => {
        animatedValues[index].value = withSpring(frequency, {
          mass: 1,
          stiffness: 100,
          damping: 10,
        });
      });
    } else {
      animatedValues.forEach((value) => {
        value.value = withSpring(0, {
          mass: 1,
          stiffness: 100,
          damping: 10,
        });
      });
    }
  }, [state, frequencies, animatedValues]);

  const getBarStyle = (index) => {
    const animatedStyle = useAnimatedStyle(() => {
      const height = animatedValues[index].value * (maxBarHeight - minBarHeight) + minBarHeight;
      return {
        height,
        backgroundColor: state === 'speaking' ? accentColor : '#0D0D0D',
      };
    });

    return [
      styles.bar,
      {
        width: barWidth,
        borderRadius,
        marginHorizontal: gap / 2,
      },
      animatedStyle,
    ];
  };

  return (
    <View style={styles.container}>
      {frequencies.map((_, index) => (
        <Animated.View
          key={`frequency-${index}`}
          style={getBarStyle(index)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    width: 4,
    borderRadius: 2,
  },
});

export default AgentMultibandAudioVisualizer;
