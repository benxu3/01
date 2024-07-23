import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { router } from 'expo-router';
import { Button, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
        <Text style={{ textAlign: 'center' }}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  function handleScan ({ data, type } : { data: string, type: string }) {
    setScanned(true);

    console.log(
      `Bar code with type ${type} and data ${data} has been scanned!`
    );

    router.navigate({
        pathname: "/room",
        params: {data}
    });
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
    flex: 1,
    alignSelf: 'flex-end',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
});
