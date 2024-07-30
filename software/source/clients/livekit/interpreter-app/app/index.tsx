import{ useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Auth from '../components/Auth';
import Room from '../components/Room';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { registerGlobals } from '@livekit/react-native';
import '../utils/cryptoPolyfill';

registerGlobals();

const App = () => {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  return (
    <View style={styles.container}>
      {session && session.user ? <Room key={session.user.id} session={session} /> : <Auth />}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
});

export default App;
