import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

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
  const [thinkingIndex, setThinkingIndex] = useState(
    Math.floor(frequencies.length / 2)
  );
  const [thinkingDirection, setThinkingDirection] = useState('right');
  const animatedValues = useRef(frequencies.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (state !== 'thinking') {
      setThinkingIndex(Math.floor(frequencies.length / 2));
      return;
    }
    const timeout = setTimeout(() => {
      if (thinkingDirection === 'right') {
        if (thinkingIndex === frequencies.length - 1) {
          setThinkingDirection('left');
          setThinkingIndex((prev) => prev - 1);
        } else {
          setThinkingIndex((prev) => prev + 1);
        }
      } else {
        if (thinkingIndex === 0) {
          setThinkingDirection('right');
          setThinkingIndex((prev) => prev + 1);
        } else {
          setThinkingIndex((prev) => prev - 1);
        }
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [state, frequencies.length, thinkingDirection, thinkingIndex]);

  const getBarColor = (index, isCenter) => {
    if (state === 'listening' || state === 'idle') {
      return isCenter ? accentColor : '#0D0D0D';
    } else if (state === 'speaking') {
      return accentColor;
    } else if (state === 'thinking') {
      return index === thinkingIndex ? accentColor : '#0D0D0D';
    }
  };

  useEffect(() => {
    Animated.parallel(
      frequencies.map((frequency, index) =>
        Animated.spring(animatedValues[index], {
          toValue: Math.pow(frequency, 1 + index / frequencies.length),
          friction: 6,
          tension: 20,
          useNativeDriver: false,
        })
      )
    ).start();
  }, [frequencies, animatedValues]);


  const getBarStyle = (index) => {
    const isCenter = index === Math.floor(frequencies.length / 2);
    const color = getBarColor(index, isCenter);
    const height = animatedValues[index].interpolate({
      inputRange: [0, 1],
      outputRange: [minBarHeight, maxBarHeight * (1 + index / frequencies.length)], // Varied max heights
    });

    let scale = new Animated.Value(1);
    if ((state === 'listening' || state === 'idle') && isCenter) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 1000, useNativeDriver: true })
        ])
      ).start();
    } else if (state === 'thinking' && index === thinkingIndex) {
      scale.setValue(1.1);
    }

    return {
      width: barWidth,
      height,
      backgroundColor: color,
      borderRadius,
      marginHorizontal: gap / 2,
      transform: [{ scale }],
    };
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
    },
});

export default AgentMultibandAudioVisualizer;

/**
import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

const AgentMultibandAudioVisualizer = ({
  state,
  barWidth,
  minBarHeight,
  maxBarHeight,
  accentColor,
  accentShade,
  frequencies,
  borderRadius,
  gap,
}) => {
  const summedFrequencies = frequencies.map((bandFrequencies) => {
    const sum = bandFrequencies.reduce((a, b) => a + b, 0);
    return Math.sqrt(sum / bandFrequencies.length);
  });

  const [thinkingIndex, setThinkingIndex] = useState(
    Math.floor(summedFrequencies.length / 2)
  );
  const [thinkingDirection, setThinkingDirection] = useState('right');
  const animatedValues = useRef(summedFrequencies.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (state !== 'thinking') {
      setThinkingIndex(Math.floor(summedFrequencies.length / 2));
      return;
    }
    const timeout = setTimeout(() => {
      if (thinkingDirection === 'right') {
        if (thinkingIndex === summedFrequencies.length - 1) {
          setThinkingDirection('left');
          setThinkingIndex((prev) => prev - 1);
        } else {
          setThinkingIndex((prev) => prev + 1);
        }
      } else {
        if (thinkingIndex === 0) {
          setThinkingDirection('right');
          setThinkingIndex((prev) => prev + 1);
        } else {
          setThinkingIndex((prev) => prev - 1);
        }
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [state, summedFrequencies.length, thinkingDirection, thinkingIndex]);

  const getBarColor = (index, isCenter) => {
    if (state === 'listening' || state === 'idle') {
      return isCenter ? `${accentColor}${accentShade ? `-${accentShade}` : ''}` : '#0D0D0D'; // gray-950
    } else if (state === 'speaking') {
      return `${accentColor}${accentShade ? `-${accentShade}` : ''}`;
    } else if (state === 'thinking') {
      return index === thinkingIndex ? `${accentColor}${accentShade ? `-${accentShade}` : ''}` : '#0D0D0D'; // gray-950
    }
  };

  useEffect(() => {
    Animated.parallel(
      summedFrequencies.map((frequency, index) =>
        Animated.timing(animatedValues[index], {
          toValue: frequency,
          duration: 350,
          useNativeDriver: false,
        })
      )
    ).start();
  }, [summedFrequencies]);

  const getBarStyle = (index) => {
    const isCenter = index === Math.floor(summedFrequencies.length / 2);
    const color = getBarColor(index, isCenter);
    const height = animatedValues[index].interpolate({
      inputRange: [0, 1],
      outputRange: [minBarHeight, maxBarHeight],
    });

    let scale = new Animated.Value(1);
    if ((state === 'listening' || state === 'idle') && isCenter) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 1000, useNativeDriver: true })
        ])
      ).start();
    } else if (state === 'thinking' && index === thinkingIndex) {
      scale.setValue(1.1);
    }

    return {
      width: barWidth,
      height,
      backgroundColor: color,
      borderRadius,
      marginHorizontal: gap / 2,
      transform: [{ scale }],
    };
  };

  return (
    <View style={styles.container}>
      {summedFrequencies.map((_, index) => (
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
  },
});

export default AgentMultibandAudioVisualizer;

*/
