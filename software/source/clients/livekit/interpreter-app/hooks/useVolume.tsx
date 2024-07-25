// useAudioActivity.js
import { useEffect, useState, useRef, useCallback } from 'react';
import { Track } from 'livekit-client';

export const useAudioActivity = (track?: Track) => {
  const [audioActivity, setAudioActivity] = useState(new Array(5).fill(0));
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkAudioActivity = useCallback(() => {
    if (!track) return;

    const currentBitrate = track.currentBitrate;
    // Normalize the bitrate to a value between 0 and 1
    const normalizedActivity = Math.min(currentBitrate / 100000, 1);

    // Generate more dynamic frequency bands
    const newAudioActivity = new Array(5).fill(0).map((_, index) => {
      const randomFactor = 0.5 + Math.random() * 0.5; // Random factor between 0.5 and 1
      return Math.min(normalizedActivity * randomFactor * (index + 1) / 5, 1);
    });

    setAudioActivity(prevActivity => {
      // Only update if there's a significant change
      if (newAudioActivity.some((value, index) => Math.abs(value - prevActivity[index]) > 0.1)) {
        return newAudioActivity;
      }
      return prevActivity;
    });
  }, [track]);

  useEffect(() => {
    if (!track) return;

    intervalRef.current = setInterval(checkAudioActivity, 50); // Check every 50ms for more frequent updates

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [track, checkAudioActivity]);

  return audioActivity;
};

/**
import { useEffect, useState, useRef } from 'react';
import { Track } from 'livekit-client';

export const useAudioActivity = (track?: Track) => {
  const [audioActivity, setAudioActivity] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!track) return;

    const checkAudioActivity = () => {
      const currentBitrate = track.currentBitrate;
      // Normalize the bitrate to a value between 0 and 1
      // You might need to adjust these values based on your specific use case
      const normalizedActivity = Math.min(currentBitrate / 100000, 1);
      setAudioActivity(normalizedActivity);
    };

    intervalRef.current = setInterval(checkAudioActivity, 100); // Check every 100ms

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [track]);

  // Simulate multiple frequency bands
  const simulatedFrequencies = [
    audioActivity * 0.1,
    audioActivity * 0.9,
    audioActivity,
    audioActivity * 0.7,
    audioActivity * 0.4,
  ];

  return simulatedFrequencies;
};
 */
