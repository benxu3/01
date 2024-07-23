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
/*
import { useEffect, useState } from 'react';
import { Track } from 'livekit-client';


export const useTrackVolume = (track?: Track) => {
    const [volume, setVolume] = useState(0);
    useEffect(() => {
      if (!track || !track.mediaStream) {
        return;
      }

      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(track.mediaStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 32;
      analyser.smoothingTimeConstant = 0;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const a = dataArray[i];
          sum += a * a;
        }
        setVolume(Math.sqrt(sum / dataArray.length) / 255);
      };

      const interval = setInterval(updateVolume, 1000 / 30);

      return () => {
        source.disconnect();
        clearInterval(interval);
      };
    }, [track, track?.mediaStream]);

    return volume;
  };


const normalizeFrequencies = (frequencies: Float32Array) => {
    const normalizeDb = (value: number) => {
        const minDb = -100;
        const maxDb = -10;
        let db = 1 - (Math.max(minDb, Math.min(maxDb, value)) * -1) / 100;
        db = Math.sqrt(db);

        return db;
      };

      // Normalize all frequency values
      return frequencies.map((value) => {
        if (value === -Infinity) {
          return 0;
        }
        return normalizeDb(value);
      });
};

export const useMultibandTrackVolume = (
    track?: Track,
    bands: number = 5,
    loPass: number = 100,
    hiPass: number = 600,
) => {
    const [frequencyBands, setFrequencyBands] = useState<Float32Array[]>([]);

    useEffect(() => {
      if (!track || !track.mediaStream) {
        return;
      }

    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(track.mediaStream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);

    const updateVolume = () => {
      analyser.getFloatFrequencyData(dataArray);
      let frequencies: Float32Array = new Float32Array(dataArray.length);
      for (let i = 0; i < dataArray.length; i++) {
        frequencies[i] = dataArray[i];
      }
      frequencies = frequencies.slice(loPass, hiPass);

      const normalizedFrequencies = normalizeFrequencies(frequencies);
      const chunkSize = Math.ceil(normalizedFrequencies.length / bands);
      const chunks: Float32Array[] = [];
      for (let i = 0; i < bands; i++) {
        chunks.push(
          normalizedFrequencies.slice(i * chunkSize, (i + 1) * chunkSize)
        );
      }

      setFrequencyBands(chunks);
    };

    const interval = setInterval(updateVolume, 10);

    return () => {
      source.disconnect();
      clearInterval(interval);
    };
  }, [track, track?.mediaStream, loPass, hiPass, bands]);

  return frequencyBands;
};
*/
