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
