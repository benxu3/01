import React, { useEffect, useCallback } from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { Audio } from "expo-av";
import { Animated } from "react-native";
import * as Haptics from "expo-haptics";

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

  useEffect(() => {
    if (permissionResponse?.status !== "granted") {
      requestPermission();
    }
  }, []);

  async function startRecording() {
    if (recording) {
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

      console.log('Starting recording...');
      const { recording } = await Audio.Recording.createAsync( Audio.RecordingOptionsPresets.HIGH_QUALITY );
      setRecording(recording);
      console.log('Recording started');
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  async function stopRecording() {
    if (recording) {
      console.log('Stopping recording...');
      setRecording(null);

      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();
      console.log('Recording stopped and stored at: ', uri);

      if (ws && uri) {
        const response = await fetch(uri);
        console.log('Fetch uri is: ', response);

        const blob = await response.blob();
        console.log('Blob is: ', blob);

        const audioBytes = await blob.bytes();
        console.log('Bytes: ', audioBytes);

        if (audioBytes) {
          ws.send(audioBytes);
          console.log("sent recording to ws!!!!", audioBytes);
        }
        /**
        try {
          const reader = new FileReader();
          await reader.readAsArrayBuffer(blob);


          reader.onloadend = () => {
            const audioBytes = reader.result;
            console.log('Audiobytes are: ', reader.result);

            if (audioBytes) {
              ws.send(audioBytes);
              console.log("sent recording to ws!!!!", audioBytes);
            }
          };

        } catch(e) {
          console.log("Exception!!!! ", e);
        }
         */




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
