
import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Dimensions, Alert, View, Text } from 'react-native';
import {
  AudioSession,
  LiveKitRoom,
  registerGlobals,
} from '@livekit/react-native';

import Playground from './Playground';
import { ConfigProvider } from '../hooks/useConfig';
import { supabase } from '../utils/supabase';
import { Button } from './Button';
import { Session } from '@supabase/supabase-js'

registerGlobals();

const { height, width } = Dimensions.get('window');

export default function Room({ session }: { session: Session }) {
  const [token, setToken] = useState<string | undefined>(undefined);
  const [url, setUrl] = useState<string | undefined>(undefined);
  const [name, setName] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const response = await fetch('http://10.0.0.148:8000/getToken');
      const data = await response.json();
      const newToken = data.accessToken;
      const newUrl = 'wss://oi-3vgs3xsr.livekit.cloud';

      setToken(newToken);
      setUrl(newUrl);

      // Log the new values immediately after setting them
      console.log('New token:', newToken);
      console.log('New URL:', newUrl);
    } catch (error) {
      console.error('Failed to get LiveKit token:', error);
      Alert.alert('Error', 'Failed to connect to the room. Please try again.');
      setIsConnecting(false);
    }
  }, []);

  // Start the audio session first.
  useEffect(() => {
    let start = async () => {
      try {
        await AudioSession.startAudioSession();
      } catch (error) {
        console.error('Failed to start audio session: ', error);
      }
    };

    start();

    return () => {
    AudioSession.stopAudioSession();
    };
  }, []);

  useEffect(() => {
    async function getUser() {
      try {
        if (!session?.user) throw new Error('No user on the session!')

        const { data, error, status } = await supabase
          .from('users')
          .select(`full_name`)
          .eq('id', session?.user.id)
          .single()
        if (error && status !== 406) {
          throw error
        }

        if (data) {
          setName(data.full_name)
        }
      } catch (error) {
        if (error instanceof Error) {
          Alert.alert(error.message)
        }
      }
    }

    if (session) {
      getUser()
    }
  }, [session]);

  return (
    <View style={styles.container}>
      <ConfigProvider>
        { !isConnecting ? (
          <Button accentColor='#111827' style={styles.button} onPress={handleConnect}>
            Connect
          </Button>
        ) : token && url ? (
          <LiveKitRoom
            serverUrl={url}
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
        ) : (
          <Text>Connecting to room...</Text>
        )}
      </ConfigProvider>
    </View>

  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: height * 0.08,
    paddingBottom: height * 0.08,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: height * 0.1,
    marginBottom: 10,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'left',
  },
  tile: {
    flex: 1,
    borderColor: '#1f2937',
  },
  tileContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    width: width * 0.3,
  },
  input: {
    height: 40,
    borderColor: '#111827',
    borderWidth: 1,
    marginBottom: 12,
    paddingLeft: 8,
  },
});
