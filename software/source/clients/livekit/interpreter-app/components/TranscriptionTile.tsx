import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { ChatMessageType, ChatTile } from "./ChatTile";
import {
  TrackReferenceOrPlaceholder,
  useChat,
  useLocalParticipant,
  useTrackTranscription,
} from "@livekit/components-react";
import {
  LocalParticipant,
  Participant,
  Track,
  TranscriptionSegment,
} from "livekit-client";

export function TranscriptionTile({
  agentAudioTrack,
  accentColor,
}: {
  agentAudioTrack: TrackReferenceOrPlaceholder;
  accentColor: string;
}) {
  const agentMessages = useTrackTranscription(agentAudioTrack);
  const localParticipant = useLocalParticipant();
  const localMessages = useTrackTranscription({
    publication: localParticipant.microphoneTrack,
    source: Track.Source.Microphone,
    participant: localParticipant.localParticipant,
  });

  const [transcripts, setTranscripts] = useState<Map<string, ChatMessageType>>(new Map());
  const { chatMessages, send: sendChat } = useChat();

  const updateTranscripts = useCallback((segments: TranscriptionSegment[], participant: Participant) => {
    setTranscripts(prevTranscripts => {
      const newTranscripts = new Map(prevTranscripts);
      segments.forEach((s) => {
        newTranscripts.set(
          s.id,
          segmentToChatMessage(
            s,
            newTranscripts.get(s.id),
            participant
          )
        );
      });
      return newTranscripts;
    });
  }, []);

  useEffect(() => {
    updateTranscripts(agentMessages.segments, agentAudioTrack.participant);
  }, [agentMessages.segments, agentAudioTrack.participant, updateTranscripts]);

  useEffect(() => {
    updateTranscripts(localMessages.segments, localParticipant.localParticipant);
  }, [localMessages.segments, localParticipant.localParticipant, updateTranscripts]);

  const messages = useMemo(() => {
    const allMessages = Array.from(transcripts.values());
    for (const msg of chatMessages) {
      const isAgent = msg.from?.identity === agentAudioTrack.participant?.identity;
      const isSelf = msg.from?.identity === localParticipant.localParticipant.identity;
      let name = msg.from?.name;
      if (!name) {
        if (isAgent) {
          name = "Agent";
        } else if (isSelf) {
          name = "You";
        } else {
          name = "Unknown";
        }
      }
      allMessages.push({
        name,
        message: msg.message,
        timestamp: msg.timestamp,
        isSelf: isSelf,
      });
    }
    return allMessages.sort((a, b) => a.timestamp - b.timestamp);
  }, [transcripts, chatMessages, agentAudioTrack.participant, localParticipant.localParticipant]);

  return (
    <ChatTile messages={messages} accentColor={accentColor} onSend={sendChat} />
  );
}

function segmentToChatMessage(
  s: TranscriptionSegment,
  existingMessage: ChatMessageType | undefined,
  participant: Participant
): ChatMessageType {
  const msg: ChatMessageType = {
    message: s.final ? s.text : `${s.text} ...`,
    name: participant instanceof LocalParticipant ? "You" : "Agent",
    isSelf: participant instanceof LocalParticipant,
    timestamp: existingMessage?.timestamp ?? Date.now(),
  };
  return msg;
}
/**
import React, { useEffect, useState } from 'react';
import { ChatMessageType, ChatTile } from "./ChatTile";
import {
  TrackReferenceOrPlaceholder,
  useChat,
  useLocalParticipant,
  useTrackTranscription,
} from "@livekit/components-react";
import {
  LocalParticipant,
  Participant,
  Track,
  TranscriptionSegment,
} from "livekit-client";

export function TranscriptionTile({
  agentAudioTrack,
  accentColor,
}: {
  agentAudioTrack: TrackReferenceOrPlaceholder;
  accentColor: string;
}) {
  const agentMessages = useTrackTranscription(agentAudioTrack);
  const localParticipant = useLocalParticipant();
  const localMessages = useTrackTranscription({
    publication: localParticipant.microphoneTrack,
    source: Track.Source.Microphone,
    participant: localParticipant.localParticipant,
  });

  const [transcripts, setTranscripts] = useState<Map<string, ChatMessageType>>(
    new Map()
  );
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const { chatMessages, send: sendChat } = useChat();

  useEffect(() => {
    const newTranscripts = new Map(transcripts);

    agentMessages.segments.forEach((s) =>
      newTranscripts.set(
        s.id,
        segmentToChatMessage(
          s,
          newTranscripts.get(s.id),
          agentAudioTrack.participant
        )
      )
    );
    localMessages.segments.forEach((s) =>
      newTranscripts.set(
        s.id,
        segmentToChatMessage(
          s,
          newTranscripts.get(s.id),
          localParticipant.localParticipant
        )
      )
    );

    setTranscripts(newTranscripts);

    const allMessages = Array.from(newTranscripts.values());
    for (const msg of chatMessages) {
      const isAgent =
        msg.from?.identity === agentAudioTrack.participant?.identity;
      const isSelf =
        msg.from?.identity === localParticipant.localParticipant.identity;
      let name = msg.from?.name;
      if (!name) {
        if (isAgent) {
          name = "Agent";
        } else if (isSelf) {
          name = "You";
        } else {
          name = "Unknown";
        }
      }
      allMessages.push({
        name,
        message: msg.message,
        timestamp: msg.timestamp,
        isSelf: isSelf,
      });
    }
    allMessages.sort((a, b) => a.timestamp - b.timestamp);
    setMessages(allMessages);
  }, [
    chatMessages,
    localParticipant.localParticipant,
    agentAudioTrack.participant,
    agentMessages.segments,
    localMessages.segments,
  ]);

  return (
    <ChatTile messages={messages} accentColor={accentColor} onSend={sendChat} />
  );
}

function segmentToChatMessage(
  s: TranscriptionSegment,
  existingMessage: ChatMessageType | undefined,
  participant: Participant
): ChatMessageType {
  const msg: ChatMessageType = {
    message: s.final ? s.text : `${s.text} ...`,
    name: participant instanceof LocalParticipant ? "You" : "Agent",
    isSelf: participant instanceof LocalParticipant,
    timestamp: existingMessage?.timestamp ?? Date.now(),
  };
  return msg;
}
*/
