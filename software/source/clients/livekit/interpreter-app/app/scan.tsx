import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PlaygroundTile } from '../components/PlaygroundTile';
import { Button } from '../components/Button';

export default function Scan() {
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) {
    // Camera permissions are still loading.
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.container}>
        <PlaygroundTile
          title="Camera Permission"
          style={styles.tile}
          childrenStyle={styles.tileContent}
        >
          <Text style={{ textAlign: 'center', marginBottom: 10 }}>We need your permission to show the camera</Text>
          <Button accentColor='#111827' style={styles.button} onPress={requestPermission}>
            Grant Permission
          </Button>
        </PlaygroundTile>
      </View>
    );
  }

  function handleScan ({ data, type } : { data: string, type: string }) {
    setScanned(true);

    console.log(
      `Bar code with type ${type} and data ${data} has been scanned!`
    );

    try{
      router.navigate({
        pathname: "/room",
        params: {data}
      });
    } catch (err) {
      console.log(err);
    }

  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={'back'} onBarcodeScanned={handleScan} barcodeScannerSettings={{barcodeTypes: ['qr']}}>
        <View style={styles.buttonContainer}>
          {scanned && (
              <TouchableOpacity
                onPress={() => setScanned(false)}
                style={styles.button}
              >
                <Text numberOfLines={1} style={styles.text}>
                  Scan Again
                </Text>
              </TouchableOpacity>
            )}
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  tile: {
    flex: 1,
    borderColor: '#1f2937',
  },
  tileContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    margin: 64,
  },
  button: {
    width: '50%',
    marginVertical: 10,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
});
