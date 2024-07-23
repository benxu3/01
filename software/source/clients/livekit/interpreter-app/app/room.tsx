import * as React from 'react';

import { useEffect } from 'react';
import {
  AudioSession,
  LiveKitRoom,
  registerGlobals,
} from '@livekit/react-native';

import Playground from '@/components/Playground';
import { ConfigProvider } from '@/hooks/useConfig';
import { useLocalSearchParams } from 'expo-router';

registerGlobals();

// !! Note !!
// This sample hardcodes a token which expires in 2 hours.

export default function App() {
  const params = useLocalSearchParams();
  console.log(params);
  const parsedData = JSON.parse(params.data as string);
  const wsURL = parsedData.server;
  const token = parsedData.token;

  // Start the audio session first.
    useEffect(() => {
      let start = async () => {
      await AudioSession.startAudioSession();
      };

      start();

      return () => {
      AudioSession.stopAudioSession();
      };
    }, []);

    return (
        <ConfigProvider>
            <LiveKitRoom
                serverUrl={wsURL}
                token={token}
                connect={true}
                options={{
                    // Use screen pixel density to handle screens with differing densities.
                    adaptiveStream: { pixelDensity: 'screen' },
                }}
                audio={true}
                video={false}
                >
                <Playground />
            </LiveKitRoom>
        </ConfigProvider>
    );
};
