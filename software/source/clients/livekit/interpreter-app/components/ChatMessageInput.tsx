import React, { useState, useCallback, useRef} from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet } from 'react-native';

type ChatMessageInputProps = {
  placeholder: string;
  accentColor: string;
  height: number;
  onSend?: (message: string) => void;
};

export const ChatMessageInput = ({
  placeholder,
  accentColor,
  height,
  onSend,
}: ChatMessageInputProps) => {
  const [message, setMessage] = useState("");
  const [inputHasFocus, setInputHasFocus] = useState(false);
  const inputRef = useRef<TextInput>(null);


  const handleSend = useCallback(() => {
    if (!onSend || message === "") {
      return;
    }
    onSend(message);
    setMessage("");
  }, [onSend, message]);

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.inputContainer}>
        <View/>
            <TextInput
            ref={inputRef}
            style={[
                styles.input,
                {
                borderColor: inputHasFocus ? accentColor : 'transparent',
                paddingLeft: message.length > 0 ? 12 : 24,
                },
            ]}
            placeholder={placeholder}
            placeholderTextColor="#4a5568"
            value={message}
            onChangeText={setMessage}
            onFocus={() => setInputHasFocus(true)}
            onBlur={() => setInputHasFocus(false)}
            onSubmitEditing={handleSend}
            />
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: message.length > 0 ? accentColor : 'transparent',
              opacity: message.length > 0 ? 1 : 0.25,
            },
          ]}
          onPress={handleSend}
          disabled={message.length === 0 || !onSend}
        >
          <Text style={styles.sendButtonText}>SEND</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 8,
  },
  input: {
    flex: 1,
    fontSize: 12,
    color: '#d1d5db',
    padding: 8,
    paddingRight: 24,
    borderWidth: 1,
    borderRadius: 4,
  },
  sendButton: {
    padding: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  sendButtonText: {
    fontSize: 12,
    color: '#ffffff',
    textTransform: 'uppercase',
  },
});
