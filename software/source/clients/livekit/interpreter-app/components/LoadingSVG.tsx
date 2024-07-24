import React, { useMemo } from 'react';
import { View, Animated, Easing } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

export const LoadingSVG = ({
  diameter = 20,
  strokeWidth = 4,
  color = '#000000',
}: {
  diameter?: number;
  strokeWidth?: number;
  color?: string;
}) => {
    const spinValue = useMemo(() => new Animated.Value(0), []);

    React.useEffect(() => {
        Animated.loop(
        Animated.timing(spinValue, {
            toValue: 1,
            duration: 1000,
            easing: Easing.linear,
            useNativeDriver: true,
        })
        ).start();
    }, [spinValue]);

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View style={{ width: diameter, height: diameter }}>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Svg width={diameter} height={diameter} viewBox="0 0 24 24">
            <Circle
                cx="12"
                cy="12"
                r="10"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeOpacity={0.25}
                fill="none"
            />
            <Path
                fill={color}
                fillOpacity={0.75}
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
            </Svg>
        </Animated.View>
        </View>
    );
};
