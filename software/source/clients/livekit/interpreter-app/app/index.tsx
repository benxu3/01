import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { PlaygroundTile } from '@/components/PlaygroundTile';
import { Button } from '@/components/Button';

const { height } = Dimensions.get('window');

export default function Index() {
  function handleJoin() {
    router.navigate('/scan');
  }

  const data = {"data": "{\"server\": \"ws://192.168.0.170:7880\", \"token\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MjE5MTcyMjIsImlzcyI6ImRldmtleSIsIm5hbWUiOiJ0ZXN0X3VzZXIiLCJuYmYiOjE3MjE4MzA4MjIsInN1YiI6InRlc3RfdXNlciIsInZpZGVvIjp7InJvb20iOiJ0ZXN0X3Jvb20iLCJyb29tSm9pbiI6dHJ1ZX19.EwxQYgLBwDNwx4NszvibTsQmHTIv6XyJunGuWNkRCGo\"}"};

  function handleConnect() {
    router.navigate({
      pathname: 'room',
      params: data,
    });
  }

  return (
    <View style={styles.container}>
      <PlaygroundTile
        title="Connection Options"
        style={styles.tile}
        childrenStyle={styles.tileContent}
      >
        <Button accentColor='#111827' style={styles.button} onPress={handleJoin}>
          Scan QR Code
        </Button>
        <Button accentColor='#111827' style={styles.button} onPress={handleConnect}>
          Connect Manually
        </Button>
      </PlaygroundTile>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: height * 0.08,
    paddingBottom: height * 0.08,
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
    width: '50%',
    marginVertical: 10,
  },
});

/**
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";

export default function Index () {
  function handleJoin() {
    router.navigate('/scan');
  }

  const data = {"data": "{\"server\": \"ws://192.168.0.170:7880\", \"token\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MjE5MTcyMjIsImlzcyI6ImRldmtleSIsIm5hbWUiOiJ0ZXN0X3VzZXIiLCJuYmYiOjE3MjE4MzA4MjIsInN1YiI6InRlc3RfdXNlciIsInZpZGVvIjp7InJvb20iOiJ0ZXN0X3Jvb20iLCJyb29tSm9pbiI6dHJ1ZX19.EwxQYgLBwDNwx4NszvibTsQmHTIv6XyJunGuWNkRCGo\"}"};

  function handleConnect() {
    router.navigate({
      pathname: 'room',
      params: data,
    });
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={handleJoin}
      >
        <Text style={styles.buttonText}>Scan QR Code</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={handleConnect}
      >
        <Text style={styles.buttonText}>Connect Manually</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  button: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: "#000",
    fontSize: 16,
  },
});
*/
