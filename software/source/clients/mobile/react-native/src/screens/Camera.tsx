import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Camera, CameraView, useCameraPermissions } from "expo-camera";
import { useNavigation } from "@react-navigation/native";
// import useSoundEffect from "../lib/useSoundEffect";

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const navigation = useNavigation();

  if (!permission) {
    // Camera permissions still loading.
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions not granted yet.
    return (
      <View style={styles.container}>
        <Text>No access to camera</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text style={styles.text}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ type, data }: { type: string, data: string }) => {
    setScanned(true);
    console.log(`Bar code with type ${type} and data ${data} has been scanned!`);

    //@ts-ignore
    navigation.navigate("Main", { scannedData: data })
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing={"back"}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />
        <View style={styles.buttonContainer}>
          {/* <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
            <Text style={styles.text}>Flip Camera</Text>
          </TouchableOpacity> */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "flex-end",
    position: "relative",
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    backgroundColor: "transparent",
    flexDirection: "row",
    margin: 2,
  },
  button: {
    position: "absolute",
    top: 44,
    left: 4,
    flex: 0.1,
    alignSelf: "flex-end",
    alignItems: "center",
    backgroundColor: "#000",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  text: {
    fontSize: 14,
    color: "white",
  },
});
