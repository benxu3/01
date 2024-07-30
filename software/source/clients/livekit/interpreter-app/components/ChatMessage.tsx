import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type ChatMessageProps = {
  message: string;
  accentColor: string;
  name: string;
  isSelf: boolean;
  hideName?: boolean;
};

export const ChatMessage = ({
  name,
  message,
  accentColor,
  isSelf,
  hideName,
}: ChatMessageProps) => {
  return (
    <View style={[styles.container, hideName ? styles.noNamePadding : styles.withNamePadding]}>
      {!hideName && (
        <Text style={[
          styles.name,
          isSelf ? styles.selfName : { color: accentColor },
        ]}>
          {name.toUpperCase()}
        </Text>
      )}
      <Text style={[
        styles.message,
        isSelf ? styles.selfMessage : { color: accentColor },
        !isSelf && { textShadowColor: accentColor, textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 1 },
      ]}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: 4,
  },
  noNamePadding: {
    paddingTop: 0,
  },
  withNamePadding: {
    paddingTop: 24,
  },
  name: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  selfName: {
    color: '#4a5568', // gray-700
  },
  message: {
    fontSize: 14,
    paddingRight: 16,
  },
  selfMessage: {
    color: '#6b7280', // gray-500
  },
});
