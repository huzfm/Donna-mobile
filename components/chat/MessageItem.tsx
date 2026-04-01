import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import Markdown from "react-native-markdown-display";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface MessageItemProps {
  item: Message;
}

export const MessageItem: React.FC<MessageItemProps> = ({ item }) => {
  const isAi = item.role === "assistant";

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(item.content);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  if (isAi) {
    return (
      <View style={[styles.messageRow, styles.aiRow]}>
        <View style={styles.aiIconContainer}>
          <View style={styles.avatar}>
            <Ionicons name="sparkles" size={14} color="#2563EB" />
          </View>
        </View>
        <View style={[styles.bubble, styles.aiBubble]}>
          <Markdown style={markdownStyles}>
             {item.content}
          </Markdown>
          <View style={styles.messageFooter}>
            <Text style={styles.timestamp}>{formatTime(item.created_at)}</Text>
            <TouchableOpacity onPress={copyToClipboard} style={styles.copyButton}>
              <Ionicons name="copy-outline" size={14} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.messageRow, styles.userRow]}>
      <View style={[styles.bubble, styles.userBubble]}>
        <Text style={styles.userText}>{item.content}</Text>
        <View style={[styles.messageFooter, { justifyContent: "flex-end", marginTop: 4 }]}>
          <Text style={[styles.timestamp, { color: "rgba(255,255,255,0.85)" }]}>
            {formatTime(item.created_at)}
          </Text>
          <TouchableOpacity onPress={copyToClipboard} style={{ marginLeft: 8 }}>
            <Ionicons name="copy-outline" size={12} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  messageRow: {
    marginVertical: 12,
    flexDirection: "row",
    paddingHorizontal: 12,
  },
  userRow: {
    justifyContent: "flex-end",
  },
  aiRow: {
    justifyContent: "flex-start",
  },
  aiIconContainer: {
    marginRight: 10,
    marginTop: 4,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  bubble: {
    maxWidth: "84%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: "#007AFF",
    borderBottomRightRadius: 4,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  aiBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  userText: {
    color: "#fff",
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "MonoRegular",
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(15,23,42,0.08)",
  },
  timestamp: {
    fontSize: 10,
    color: "#6B7280",
    fontFamily: "MonoRegular",
  },
  copyButton: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
});

const markdownStyles = {
  body: {
    color: "#111827",
    fontSize: 15,
    lineHeight: 24,
    fontFamily: "MonoRegular",
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 10,
    color: "#111827",
    fontFamily: "MonoRegular",
  },
  heading1: {
    fontSize: 20,
    marginBottom: 10,
    color: "#0F172A",
    fontWeight: "700" as const,
  },
  heading2: {
    fontSize: 18,
    marginBottom: 8,
    color: "#0F172A",
    fontWeight: "700" as const,
  },
  heading3: {
    fontSize: 16,
    marginBottom: 8,
    color: "#0F172A",
    fontWeight: "700" as const,
  },
  code_inline: {
    backgroundColor: "#EEF2FF",
    color: "#3730A3",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  code_block: {
    backgroundColor: "#F8FAFC",
    color: "#0F766E",
    padding: 12,
    borderRadius: 10,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  link: {
    color: "#2563EB",
  },
  blockquote: {
    backgroundColor: "#F8FAFC",
    borderLeftWidth: 3,
    borderLeftColor: "#93C5FD",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    color: "#334155",
  },
  bullet_list: {
    marginBottom: 8,
  },
  ordered_list: {
    marginBottom: 8,
  },
  list_item: {
    marginBottom: 6,
    color: "#111827",
    fontFamily: "MonoRegular",
  },
  strong: {
    fontWeight: "bold" as const,
    color: "#0F172A",
  },
};
