import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { ChatMessageType } from "./ChatTile";
import { TranscriptionTile } from "./TranscriptionTile";
import { useConfig } from "../hooks/useConfig";
import { useAudioActivity } from "../hooks/useVolume";
import AgentMultibandAudioVisualizer from "./AudioVisualizer";
import { LoadingSVG } from "./LoadingSVG";
import {
  PlaygroundTab,
  PlaygroundTabbedTile,
  PlaygroundTile,
} from "./PlaygroundTile";
import {
  TrackReferenceOrPlaceholder,
  useConnectionState,
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
} from "@livekit/react-native";
import {
  useDataChannel,
} from "@livekit/components-react";
import {
  ConnectionState,
  RoomEvent,
  Track,
} from "livekit-client";
import TypeformEmbed from "./Typeform";

// Custom hook for responsive dimensions
const useResponsiveDimensions = () => {
  const [dimensions, setDimensions] = useState(() => Dimensions.get('window'));

  React.useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  return {
    ...dimensions,
    isLargeScreen: dimensions.width >= 1024,
  };
};


export default function Playground() {
  const { isLargeScreen } = useResponsiveDimensions();
  const { config } = useConfig();
  const { localParticipant } = useLocalParticipant();
  const [isMuted, setIsMuted] = useState(true);
  const isMutedRef = useRef(isMuted);
  const participants = useRemoteParticipants({
    updateOnlyOn: [RoomEvent.ParticipantMetadataChanged],
  });
  const agentParticipant = participants.find((p) => p.isAgent);
  const roomState = useConnectionState();
  const tracks = useTracks();

  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [transcripts, setTranscripts] = useState<Map<string, ChatMessageType>>(new Map());

  const responsiveStyles = useMemo(() => {
    return StyleSheet.create({
      container: {
        flexDirection: isLargeScreen ? 'row' : 'column',
      },
      mobileView: {
        display: isLargeScreen ? 'none' : 'flex',
        flex: 1,
      },
      desktopView: {
        display: isLargeScreen ? 'flex' : 'none',
        flex: isLargeScreen ? 3 : 1,
      },
      chatContainer: {
        display: isLargeScreen ? 'flex' : 'none',
        flex: isLargeScreen ? 1 : 0,
      },
    });
  }, [isLargeScreen]);

  useEffect(() => {
    if (roomState === ConnectionState.Connected) {
      localParticipant.setCameraEnabled(config.settings.inputs.camera);
      localParticipant.setMicrophoneEnabled(config.settings.inputs.mic);
      // Ensure the microphone starts muted
      const audioTrack = localParticipant.getTrackPublication(Track.Source.Microphone)?.track;
      if (audioTrack) {
        audioTrack.mute();
        setIsMuted(true);
        isMutedRef.current = true;
      }
    }
  }, [config, localParticipant, roomState]);

  let agentAudioTrack: TrackReferenceOrPlaceholder | undefined;
  const aat = tracks.find(
    (trackRef) =>
      trackRef.publication.kind === Track.Kind.Audio &&
      trackRef.participant.isAgent
  );
  if (aat) {
    agentAudioTrack = aat;
  } else if (agentParticipant) {
    agentAudioTrack = {
      participant: agentParticipant,
      source: Track.Source.Microphone,
    };
  }

  const subscribedVolumes = useAudioActivity(
    agentAudioTrack?.publication?.track,
  );

  const onDataReceived = useCallback(
    (msg: any) => {
      if (msg.topic === "transcription") {
        const decoded = JSON.parse(
          new TextDecoder("utf-8").decode(msg.payload)
        );
        let timestamp = new Date().getTime();
        if ("timestamp" in decoded && decoded.timestamp > 0) {
          timestamp = decoded.timestamp;
        }
        setTranscripts(prevTranscripts => {
          const newTranscripts = new Map(prevTranscripts);
          const id = `local-${timestamp}`; // Create a unique ID for this transcript
          newTranscripts.set(id, {
            name: "You",
            message: decoded.text,
            timestamp: timestamp,
            isSelf: true,
          });
          return newTranscripts;
        });
      }
    },
    []
  );

  useDataChannel(onDataReceived);

  const isSpeaking = subscribedVolumes.some(value => value > 0.1);

  const audioTileContent = useMemo(() => {
    const DisconnectedContent = () => (
      <View style={styles.centeredContent}>
        <Text style={styles.text}>No audio track. Connect to get started.</Text>
      </View>
    );

    const WaitingContent = () => (
      <View style={styles.centeredContent}>
        <LoadingSVG />
        <Text style={styles.text}>Waiting for audio track</Text>
      </View>
    );

    const VisualizerContent = () => (
      <View style={styles.centeredContent}>
        <AgentMultibandAudioVisualizer
          state={isSpeaking ? 'speaking' : 'idle'}
          barWidth={10}
          minBarHeight={20}
          maxBarHeight={100}
          accentColor={"#00FFFF"}
          frequencies={subscribedVolumes}
          borderRadius={5}
          gap={5}
        />
      </View>
    );

    if (roomState === ConnectionState.Disconnected) {
      return <DisconnectedContent />;
    }

    if (!agentAudioTrack) {
      return <WaitingContent />;
    }

    return <VisualizerContent />;
  }, [
    agentAudioTrack,
    subscribedVolumes,
    roomState,
    isSpeaking
  ]);

  const chatTileContent = useMemo(() => {
    if (agentAudioTrack) {
      return (
        <TranscriptionTile
          agentAudioTrack={agentAudioTrack}
          accentColor={'#111827'}
          transcripts={transcripts}
          setTranscripts={setTranscripts}
          messages={messages}
          setMessages={setMessages}
        />
      );
    }
    return <></>;
  }, [agentAudioTrack, transcripts, messages]);

  let mobileTabs: PlaygroundTab[] = [];

  if (config.settings.outputs.audio) {
    mobileTabs.push({
      title: "Audio",
      content: (
        <PlaygroundTile
          style={styles.fullSize}
          childrenStyle={styles.centerContent}
        >
          {audioTileContent}
        </PlaygroundTile>
      ),
    });
  }

  if (config.settings.chat) {
    mobileTabs.push({
      title: "Chat",
      content: chatTileContent,
    });
  }

  mobileTabs.push({
    title: "Contact",
    content: (
      <View style={styles.typeformContainer}>
        <TypeformEmbed />
      </View>
    ),
  });

  const unmute = () => {
    if (localParticipant) {
      const audioTrack = localParticipant.getTrackPublication(Track.Source.Microphone)?.track;
      if (audioTrack) {
        audioTrack.unmute();
        setIsMuted(false);
        isMutedRef.current = false;
      }
    }
  };

  const mute = () => {
    if (localParticipant) {
      const audioTrack = localParticipant.getTrackPublication(Track.Source.Microphone)?.track;
      if (audioTrack) {
        audioTrack.mute();
        setIsMuted(true);
        isMutedRef.current = true;
      }
    }
  };

  return (
    <View style={[styles.container, responsiveStyles.container]}>
      <View style={[styles.mobileView, responsiveStyles.mobileView]}>
        <PlaygroundTabbedTile
          style={styles.fullSize}
          tabs={mobileTabs}
          initialTab={0}
        />
      </View>
      {config.settings.outputs.audio && (
        <View style={[styles.desktopView, styles.audioContainer, responsiveStyles.desktopView]}>
          <PlaygroundTile
            title="Audio"
            style={styles.fullSize}
            childrenStyle={styles.centerContent}
          >
            {audioTileContent}
          </PlaygroundTile>
        </View>
      )}
      {config.settings.chat && (
        <View style={[styles.chatContainer, responsiveStyles.chatContainer]}>
          <PlaygroundTile
            title="Chat"
            style={styles.chatTile}
          >
            {chatTileContent}
          </PlaygroundTile>
        </View>
      )}
      <View style={[styles.contactContainer, responsiveStyles.desktopView]}>
        <TypeformEmbed />
      </View>
      <TouchableOpacity
        onPressIn={unmute}
        onPressOut={mute}
        style={[styles.muteButton, isMutedRef.current ? styles.mutedButton : styles.unmutedButton]}
      >
        <Text style={styles.muteButtonText}>
          {isMutedRef.current ? "Press and hold to talk" : "Releasing will mute"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  mobileView: {
    flex: 1,
  },
  desktopView: {
    flex: 1,
  },
  audioContainer: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
  },
  fullSize: {
    width: '100%',
    height: '100%',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#6b7280',
    textAlign: 'center',
  },
  muteButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  mutedButton: {
    backgroundColor: '#4a5568',
  },
  unmutedButton: {
    backgroundColor: '#48bb78',
  },
  muteButtonText: {
    color: 'white',
    fontSize: 16,
  },
  chatTile: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  typeformContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  contactContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
