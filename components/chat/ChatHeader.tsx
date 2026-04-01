import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ChatHeaderProps {
  onToggleSidebar: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ onToggleSidebar }) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onToggleSidebar} style={styles.menuButton}>
        <Ionicons name="menu" size={22} color="#1F2937" />
      </TouchableOpacity>
      <View style={styles.centerContent}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Donna AI
        </Text>
      </View>
      <View style={styles.menuButtonSpacer} />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(226,232,240,0.9)",
    backgroundColor: "rgba(255,255,255,0.72)",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  menuButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(248,250,252,0.75)",
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.9)",
  },
  menuButtonSpacer: {
    width: 38,
    height: 38,
  },
  centerContent: {
    alignItems: "center",
  },
  headerTitle: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "DotoBold",
  },
  headerSubtitle: {
    color: "#888",
    fontSize: 11,
    marginTop: 2,
  },
});
