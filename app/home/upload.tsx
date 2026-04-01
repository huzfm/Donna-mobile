import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function UploadScreen() {
  const simulateUpload = () => {
    Alert.alert(
      "File Picker Needed", 
      "To upload documents, please install 'expo-document-picker'.\n\nRun 'npx expo install expo-document-picker' in your terminal."
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Knowledge Base</Text>
        <Text style={styles.subtitle}>Upload PDF, Word, or Excel files to Donna&apos;s memory.</Text>
      </View>

      <TouchableOpacity 
        style={styles.uploadBox} 
        onPress={simulateUpload}
      >
        <Ionicons name="cloud-upload-outline" size={64} color="#007AFF" />
        <Text style={styles.uploadText}>Tap to Select File</Text>
        <Text style={styles.uploadHint}>Max size: 5MB</Text>
      </TouchableOpacity>


      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color="#666" style={{ marginRight: 10 }} />
        <Text style={styles.infoText}>
          Donna can read documents and answer questions based on their content once they are uploaded.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    padding: 20,
    justifyContent: "center",
  },
  header: {
    marginBottom: 40,
    alignItems: "center",
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    color: "#888",
    fontSize: 16,
    textAlign: "center",
  },
  uploadBox: {
    borderWidth: 2,
    borderColor: "#222",
    borderStyle: "dashed",
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    backgroundColor: "#050505",
  },
  uploadText: {
    color: "#007AFF",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 20,
  },
  uploadHint: {
    color: "#444",
    fontSize: 14,
    marginTop: 5,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#111",
    padding: 15,
    borderRadius: 12,
    marginTop: 40,
    alignItems: "center",
  },
  infoText: {
    color: "#888",
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
});
