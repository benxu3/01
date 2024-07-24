import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

type ButtonProps = {
  accentColor: string;
  children: React.ReactNode;
  style?: object;
  disabled?: boolean;
  onPress?: () => void;
};

export const Button: React.FC<ButtonProps> = ({
  accentColor,
  children,
  style,
  disabled,
  onPress,
  ...allProps
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: disabled ? '#ccc' : accentColor },
        style
      ]}
      disabled={disabled}
      onPress={onPress}
      {...allProps}
    >
      <Text style={styles.buttonText}>
        {children}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    borderRadius: 5,
    marginVertical: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
  },
});
