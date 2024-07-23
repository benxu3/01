import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
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
  ConnectionState,
  RoomEvent,
  Track,
} from "livekit-client";

export default function Playground() {
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
          state="speaking"
          barWidth={45}
          minBarHeight={30}
          maxBarHeight={300}
          accentColor={"#00FFFF"}
          frequencies={subscribedVolumes}
          borderRadius={20}
          gap={20}
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
  ]);

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
    <View style={styles.container}>
      <View style={styles.mobileView}>
        <PlaygroundTabbedTile
          style={styles.fullSize}
          tabs={mobileTabs}
          initialTab={mobileTabs.length - 1}
        />
      </View>
      {config.settings.outputs.audio && (
        <View style={[styles.desktopView, styles.audioContainer]}>
          <PlaygroundTile
            title="Audio"
            style={styles.fullSize}
            childrenStyle={styles.centerContent}
          >
            {audioTileContent}
          </PlaygroundTile>
        </View>
      )}
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

const { height } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: height * 0.08,
    paddingBottom: height * 0.08
  },
  mobileView: {
    flex: 1,
    display: 'flex',
  },
  desktopView: {
    display: 'none',
  },
  audioContainer: {
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
});
