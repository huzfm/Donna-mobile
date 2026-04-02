import { apiUrl } from "@/lib/api-url";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAlert } from "../../context/AlertContext";
import { supabase } from "../../services/supabase";

export default function UploadScreen() {
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const { showAlert } = useAlert();

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setUploading(true);

      const { data: { session } } = await supabase.auth.getSession();
      
      const formData = new FormData();
      // @ts-ignore - FormData expects a specific structure for native files
      formData.append("file", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || "application/octet-stream",
      });

      const res = await fetch(apiUrl("/api/upload"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        showAlert({
          title: "Success",
          message: `${file.name} has been added to Donna's memory!`,
          type: "success"
        });
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (err: any) {
      console.error("Upload Error:", err);
      showAlert({
        title: "Upload Failed",
        message: err.message || "An unknown error occurred.",
        type: "error"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Knowledge Base</Text>
        <Text style={styles.subtitle}>Upload PDF, Word, or Excel files to Donna&apos;s memory.</Text>
      </View>

      <TouchableOpacity 
        style={[styles.uploadBox, uploading && { opacity: 0.5 }]} 
        onPress={handleUpload}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <>
            <Ionicons name="cloud-upload-outline" size={64} color="#007AFF" />
            <Text style={styles.uploadText}>Tap to Select File</Text>
            <Text style={styles.uploadHint}>Max size: 5MB</Text>
          </>
        )}
      </TouchableOpacity>



      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color="#64748B" style={{ marginRight: 10 }} />
        <Text style={styles.infoText}>
          Donna can read documents and answer questions based on their content once they are uploaded.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  header: {
    marginBottom: 30,
    alignItems: "center",
  },
  title: {
    color: "#0F172A",
    fontSize: 28,
    fontWeight: "bold",
    fontFamily: "DotoBold",
    marginBottom: 10,
  },
  subtitle: {
    color: "#64748B",
    fontSize: 16,
    textAlign: "center",
  },
  uploadBox: {
    borderWidth: 2,
    borderColor: "#BFDBFE",
    borderStyle: "dashed",
    borderRadius: 20,
    paddingVertical: 52,
    paddingHorizontal: 28,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  uploadText: {
    color: "#007AFF",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 20,
  },
  uploadHint: {
    color: "#64748B",
    fontSize: 14,
    marginTop: 5,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 12,
    marginTop: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  infoText: {
    color: "#475569",
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
});
