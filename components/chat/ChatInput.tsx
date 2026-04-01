import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAttach: () => void;
  loading: boolean;
  insets: { top: number; bottom: number };
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChangeText,
  onSend,
  onAttach,
  loading,
  insets,
}) => {
  const disabled = !value.trim() || loading;

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingBottom: Math.max(insets.bottom - 40, 8),
        },
      ]}
    >
      <View style={styles.container}>
        {/* Attach */}
        <TouchableOpacity style={styles.iconButton} onPress={onAttach}>
          <Ionicons name="add" size={22} color="#6B7280" />
        </TouchableOpacity>

        {/* Input */}
        <TextInput
          style={styles.input}
          placeholder="Message Donna..."
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          multiline
          maxLength={1000}
        />

        {/* Send */}
        <TouchableOpacity
          style={[styles.sendButton, disabled && styles.sendDisabled]}
          onPress={onSend}
          disabled={disabled}
        >
          <Ionicons
            name="arrow-up"
            size={18}
            color={disabled ? "#777" : "#fff"}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingTop: 8,
  },

  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "rgba(255,255,255,0.74)",
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.95)",
    shadowColor: "#64748B",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },

  input: {
    flex: 1,
    color: "#111827",
    fontSize: 15,
    fontFamily: "MonoRegular",
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    maxHeight: 110,
  },

  iconButton: {
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
  },

  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0A84FF",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },

  sendDisabled: {
    backgroundColor: "#BFDBFE",
  },
});
