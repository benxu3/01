import React, { useEffect, useState, useCallback, useRef } from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { Audio } from "expo-av";
import { Animated } from "react-native";
import * as Haptics from "expo-haptics";
/// <reference lib="dom" />

import * as FileSystem from 'expo-file-system';

const CHUNK_SIZE = 480; // Multiple of 24 (20 * 24)

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

const CustomRecordingOption = {
  android: {
    extension: '.wav',
    outputFormat: Audio.AndroidOutputFormat.DEFAULT,
    audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000, // Increased for raw audio
  },
  ios: {
    extension: '.wav',
    outputFormat: Audio.IOSOutputFormat.LINEARPCM,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000, // Increased for raw audio
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/wav', // Web API doesn't directly support raw PCM
    bitsPerSecond: 256000,
  },
};

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

  /**
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
      const audioData = await response.arrayBuffer();

       // Ensure the total audio data is a multiple of 2 bytes
      const alignedTotalLength = Math.floor(audioData.byteLength / 2) * 2;
      const alignedAudioData = audioData.slice(0, alignedTotalLength);

      // Compute fileSize based on the aligned data
      const fileSize = alignedAudioData.byteLength;

      if (fileSize > lastSentSizeRef.current) {
        // Slice the ArrayBuffer to get only the new data
        const newAudioData = alignedAudioData.slice(lastSentSizeRef.current);
        console.log("New audio data size: ", newAudioData.byteLength);

        // The newAudioData is already aligned, so we can send it directly
        if (newAudioData.byteLength > 0) {
          ws?.send(newAudioData);
        }

      lastSentSizeRef.current = fileSize;
      } else {
        console.log('No new data to send');
      }
    } catch (error) {
      console.error("Error sending audio data:", error);
    }
  }, [ws]);
   */
  const sendAudioData = useCallback(async () => {
    if (!recordingRef.current) {
      console.log('RECORDING NULL');
      return;
    }

    try {
      const uri = recordingRef.current.getURI();
      console.log('recording uri: ', uri);
      if (!uri) return;

      const info = await FileSystem.getInfoAsync(uri);
      const fileSize = info.size;

      if (fileSize > lastSentSizeRef.current) {
        const newDataSize = fileSize - lastSentSizeRef.current;
        const chunksToSend = Math.floor(newDataSize / CHUNK_SIZE);

        for (let i = 0; i < chunksToSend; i++) {
          const chunk = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
            position: lastSentSizeRef.current + (i * CHUNK_SIZE),
            length: CHUNK_SIZE
          });

          // Convert Base64 to ArrayBuffer
          const binaryString = atob(chunk);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          ws?.send(bytes.buffer);
          console.log('chunk', bytes.buffer);

        }

        lastSentSizeRef.current += chunksToSend * CHUNK_SIZE;
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
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        //onRecordingStatusUpdate
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

      if (ws && uri) {
        try {
          const response = await fetch(uri);
          console.log("response: ", response);
          const blob = await response.blob();
          console.log("blob: ", blob);

          const reader = new FileReader();
          reader.readAsArrayBuffer(blob);
          reader.onloadend = () => {
            const audioBytes = reader.result;
            if (audioBytes) {
              ws.send(audioBytes);
              console.log("sent: ", audioBytes);
            }
          };
          /**
          // Create a new Sound object
          const { sound } = await Audio.Sound.createAsync(
            { uri: uri },
            { shouldPlay: true }
          );

          // Play the recorded audio
          await sound.playAsync();

          // Optionally, you can add a listener for when playback finishes
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.didJustFinish) {
              // Playback has finished
              console.log('Playback finished');
              sound.unloadAsync(); // Unload the sound to free up resources
            }
          });
           */
        } catch (error) {
          console.error('Error playing recorded audio:', error);
        }
      }

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
