import React, { useEffect, useRef} from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { ChatMessage } from './ChatMessage';
import { ChatMessage as ComponentsChatMessage } from '@livekit/components-react';

const inputHeight = 48;

export type ChatMessageType = {
  name: string;
  message: string;
  isSelf: boolean;
  timestamp: number;
};

type ChatTileProps = {
  messages: ChatMessageType[];
  accentColor: string;
  onSend?: (message: string) => Promise<ComponentsChatMessage>;
};

export const ChatTile = ({ messages, accentColor, onSend }: ChatTileProps) => {
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={[styles.messagesContainer, { height: Dimensions.get('window').height - inputHeight }]}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map((message, index, allMsg) => {
          const hideName = index >= 1 && allMsg[index - 1].name === message.name;

          return (
            <ChatMessage
              key={index}
              hideName={hideName}
              name={message.name}
              message={message.message}
              isSelf={message.isSelf}
              accentColor={accentColor}
            />
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
});
