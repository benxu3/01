import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as Linking from "expo-linking";
import { supabase } from "../utils/supabase";
import { PlaygroundTile } from './PlaygroundTile';


const redirectTo = makeRedirectUri();

const createSessionFromUrl = async (url: string) => {
  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) throw new Error(errorCode);
  const { access_token, refresh_token } = params;

  if (!access_token) return;

  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });
  if (error) throw error;
  return data.session;
};

const Auth = () => {
  const [email, setEmail] = useState('');

  const sendMagicLink = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) throw error;
    // Email sent.
    Alert.alert('Magic link sent! Check your email to sign-in');
  };

  // Handle linking into app from email app.
  const url = Linking.useURL();
  if (url) createSessionFromUrl(url);

  return (
    <View style={styles.container}>
        <PlaygroundTile
          title="Authentication"
          style={styles.tile}
          childrenStyle={styles.tileContent}
        >
          <View style={styles.content}>
            <TextInput
              style={styles.input}
              onChangeText={setEmail}
              value={email}
              placeholder="Enter your email"
              placeholderTextColor="#6b7280"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.button} onPress={sendMagicLink}>
              <Text style={styles.buttonText}>Send Magic Link</Text>
            </TouchableOpacity>
          </View>
        </PlaygroundTile>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    marginTop: '12%',
    marginBottom: '5%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tile: {
    width: '95%',
  },
  tileContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    padding: 16,
    alignItems:'center',
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: '#4b5563',
    borderWidth: 1,
    borderRadius: 4,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  button: {
    backgroundColor: '#111827',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 4,
    alignItems: 'center',
    width: '60%',
  },
  buttonText: {
    color: '#d1d5db',
    fontWeight: 'medium',
  },
});

export default Auth;
