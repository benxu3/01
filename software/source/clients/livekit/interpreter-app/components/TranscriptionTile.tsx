import React, { useEffect, useCallback } from 'react';
import { ChatMessageType, ChatTile } from "./ChatTile";
import {
  TrackReferenceOrPlaceholder,
  useLocalParticipant,
  useTrackTranscription,
  useChat,
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
  transcripts,
  setTranscripts,
  messages,
  setMessages,
}: {
  agentAudioTrack: TrackReferenceOrPlaceholder;
  accentColor: string;
  transcripts: Map<string, ChatMessageType>;
  setTranscripts: React.Dispatch<React.SetStateAction<Map<string, ChatMessageType>>>;
  messages: ChatMessageType[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessageType[]>>;
}) {
  const agentMessages = useTrackTranscription(agentAudioTrack);
  const localParticipant = useLocalParticipant();
  const localMessages = useTrackTranscription({
    publication: localParticipant.microphoneTrack,
    source: Track.Source.Microphone,
    participant: localParticipant.localParticipant,
  });

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
  }, [setTranscripts]);

  useEffect(() => {
    updateTranscripts(agentMessages.segments, agentAudioTrack.participant);
  }, [agentMessages.segments, agentAudioTrack.participant, updateTranscripts]);

  useEffect(() => {
    updateTranscripts(localMessages.segments, localParticipant.localParticipant);
  }, [localMessages.segments, localParticipant.localParticipant, updateTranscripts]);

  useEffect(() => {
    console.log('TranscriptionTile: Updating messages', { transcriptsCount: transcripts.size, chatMessagesCount: chatMessages.length });
    const allMessages = Array.from(transcripts.values());
    for (const msg of chatMessages) {
      const isAgent = msg.from?.identity === agentAudioTrack.participant?.identity;
      const isSelf = msg.from?.identity === localParticipant.localParticipant.identity;
      let name;
      if (isAgent) {
        name = "Agent";
      } else if (isSelf) {
        name = "You";
      } else {
        name = msg.from?.name || "Unknown";
      }
      allMessages.push({
        name,
        message: msg.message,
        timestamp: msg.timestamp,
        isSelf: isSelf,
      });
    }
    setMessages(allMessages.sort((a, b) => a.timestamp - b.timestamp));
  }, [transcripts, chatMessages, agentAudioTrack.participant, localParticipant.localParticipant, setMessages]);

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