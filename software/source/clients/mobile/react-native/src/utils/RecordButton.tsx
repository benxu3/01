import React, { useEffect, useState, useCallback, useRef } from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { Audio } from "expo-av";
import { Animated } from "react-native";
import * as Haptics from "expo-haptics";
/// <reference lib="dom" />

interface RecordButtonProps {
  playPip: () => void;
  playPop: () => void;
  recording: Audio.Recording | null;
  setRecording: (recording: Audio.Recording | null) => void;
  ws: WebSocket | null;
  buttonBackgroundColorAnim: Animated.Value;
  backgroundColorAnim: Animated.Value;
  backgroundColor: Animated.AnimatedInterpolation<string | number>;
  buttonBackgroundColor: Animated.AnimatedInterpolation<string | number>;
  setIsPressed: (isPressed: boolean) => void;
}

const styles = StyleSheet.create({
  circle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
});

const RecordButton: React.FC<RecordButtonProps> = ({
  playPip,
  playPop,
  recording,
  setRecording,
  ws,
  backgroundColorAnim,
  buttonBackgroundColorAnim,
  backgroundColor,
  buttonBackgroundColor,
  setIsPressed,
}: RecordButtonProps) => {
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [lastSentSize, setLastSentSize] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const lastSentSizeRef = useRef<number>(0);

  useEffect(() => {
    if (permissionResponse?.status !== "granted") {
      requestPermission();
    }
  }, []);

  const onRecordingStatusUpdate = useCallback((status: Audio.RecordingStatus) => {
    if (status.isRecording && ws && ws.readyState === WebSocket.OPEN) {
      // Send the audio data as it's being recorded
      sendAudioData();
    }
  }, [ws, recording]);

  const sendAudioData = useCallback(async () => {
    if (!recordingRef.current) {
      console.log('RECORDING NULL');
      return;
    }

    try {
      const uri = recordingRef.current.getURI();
      console.log('recording uri: ', uri);
      if (!uri) return;

      const response = await fetch(uri);
      const blob = await response.blob();

      const fileSize = blob.size;

      if (fileSize > lastSentSizeRef.current) {
        // Slice the blob to get only the new data
        const newDataBlob = blob.slice(lastSentSizeRef.current, fileSize);
        console.log("chunk blob: ", newDataBlob);

        const reader = new FileReader();
        reader.readAsArrayBuffer(newDataBlob);
        reader.onloadend = () => {
          const audioBytes = reader.result;
          if (audioBytes) {
            ws?.send(audioBytes);
          }
        };

        lastSentSizeRef.current = fileSize;
      } else {
        console.log('No new data to send');
      }
    } catch (error) {
      console.error("Error sending audio data:", error);
    }
  }, [ws]);

  async function startRecording() {
    if (recordingRef.current) {
      console.log("A recording is already in progress.");
      return;
    }

    try {
      if (permissionResponse !== null && permissionResponse.status !== `granted`) {
        console.log('Requesting permission...');
        await requestPermission();
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ role: 'user', type: 'audio', start: true }));
      }

      console.log('Starting recording...');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.LOW_QUALITY,
        onRecordingStatusUpdate
      );

      recordingRef.current = recording;
      setRecording(recording);

      console.log('Recording started');
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  async function stopRecording() {
    if (recordingRef.current) {
      console.log('Stopping recording...');

      // Stop the recording
      await recordingRef.current.stopAndUnloadAsync();

      // Reset the audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recordingRef.current.getURI();
      console.log('Recording stopped and stored at: ', uri);

      // Reset the recording state
      recordingRef.current = null;
      setRecording(null);

      // Reset the lastSentSize
      lastSentSizeRef.current = 0;
      setLastSentSize(0);

      // You might want to send a message to the server indicating that the recording has ended
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ role: 'user', type: 'audio', end: true }));
      }
    }
  };

  const toggleRecording = (shouldPress: boolean) => {
    Animated.timing(backgroundColorAnim, {
      toValue: shouldPress ? 1 : 0,
      duration: 400,
      useNativeDriver: false,
    }).start();
    Animated.timing(buttonBackgroundColorAnim, {
      toValue: shouldPress ? 1 : 0,
      duration: 400,
      useNativeDriver: false,
    }).start();
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPressIn={() => {
        playPip();
        setIsPressed(true);
        toggleRecording(true);
        startRecording();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }}
      onPressOut={() => {
        playPop();
        setIsPressed(false);
        toggleRecording(false);
        stopRecording();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }}
    >
      <Animated.View
        style={[styles.circle, { backgroundColor: buttonBackgroundColor }]}
      />
    </TouchableOpacity>
  );
};

export default RecordButton;
