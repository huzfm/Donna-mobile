import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface ChatSession {
  id: string;
  title: string;
}

interface UploadedFile {
  file_name: string;
  uploaded_at: string;
}

interface SidebarProps {
  isOpen: boolean;
  activeTab: "chats" | "files" | "gmail";
  onTabChange: (tab: "chats" | "files" | "gmail") => void;
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  onSessionSelect: (session: ChatSession) => void;
  files: UploadedFile[];
  onDeleteFile: (fileName: string) => void;
  onRefreshFiles: () => void;
  onUploadPress: () => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
  gmailUser: string;
  gmailPass: string;
  setGmailUser: (val: string) => void;
  setGmailPass: (val: string) => void;
  onSaveSettings: () => void;
  onProfilePress: () => void;
  userEmail?: string;
  loadingFiles: boolean;
  loadingSettings: boolean;
  savingSettings: boolean;
  insets: { top: number; bottom: number };
}

export const Sidebar: React.FC<SidebarProps> = (props) => {
  const {
    isOpen,
    activeTab,
    onTabChange,
    sessions,
    currentSession,
    onSessionSelect,
    files,
    onDeleteFile,
    onRefreshFiles,
    onUploadPress,
    onNewChat,
    onDeleteSession,
    gmailUser,
    gmailPass,
    setGmailUser,
    setGmailPass,
    onSaveSettings,
    loadingFiles,
    loadingSettings,
    savingSettings,
    onProfilePress,
    userEmail,
    insets,
  } = props;

  if (!isOpen) return null;

  return (
    <View
      style={[styles.sidebar, { top: insets.top + 50, bottom: insets.bottom }]}
    >
      <View style={styles.tabSwitcher}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "chats" && styles.activeTab]}
          onPress={() => onTabChange("chats")}
        >
          <Ionicons
            name="chatbubbles-outline"
            size={18}
            color={activeTab === "chats" ? "#1D4ED8" : "#6B7280"}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === "chats" && styles.activeTabLabel,
            ]}
          >
            Chats
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "files" && styles.activeTab]}
          onPress={() => onTabChange("files")}
        >
          <Ionicons
            name="folder-outline"
            size={18}
            color={activeTab === "files" ? "#1D4ED8" : "#6B7280"}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === "files" && styles.activeTabLabel,
            ]}
          >
            Files
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "gmail" && styles.activeTab]}
          onPress={() => onTabChange("gmail")}
        >
          <Ionicons
            name="mail-outline"
            size={18}
            color={activeTab === "gmail" ? "#1D4ED8" : "#6B7280"}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === "gmail" && styles.activeTabLabel,
            ]}
          >
            Gmail
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "chats" && (
        <>
          <View style={styles.sidebarHeaderRow}>
            <Text style={styles.sidebarHeader}>Your Chats</Text>
            <TouchableOpacity onPress={onNewChat} style={styles.newChatButton}>
              <Ionicons name="add" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.sessionItemContainer,
                  currentSession?.id === item.id && styles.activeSession,
                ]}
              >
                <TouchableOpacity
                  style={styles.sessionItem}
                  onPress={() => onSessionSelect(item)}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={18}
                    color="#64748B"
                    style={{ marginRight: 10 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sessionTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onDeleteSession(item.id)}
                  style={styles.deleteSessionButton}
                >
                  <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            )}
          />
        </>
      )}

      {activeTab === "files" && (
        <>
          <View style={styles.sidebarHeaderRow}>
            <Text style={styles.sidebarHeader}>Knowledge</Text>
            <TouchableOpacity onPress={onUploadPress}>
              <Ionicons name="cloud-upload-outline" size={22} color="#1D4ED8" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onRefreshFiles}>
              <Ionicons name="refresh" size={18} color="#1D4ED8" />
            </TouchableOpacity>
          </View>
          {loadingFiles ? (
            <ActivityIndicator color="#007AFF" style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={files}
              keyExtractor={(item) => item.file_name}
              renderItem={({ item }) => (
                <View style={styles.fileItem}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {item.file_name}
                    </Text>
                    <Text style={styles.fileDate}>
                      {new Date(item.uploaded_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => onDeleteFile(item.file_name)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No files uploaded yet.</Text>
              }
            />
          )}
        </>
      )}

      {activeTab === "gmail" && (
        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
          <Text style={styles.sidebarHeader}>Gmail Sync</Text>
          <Text style={styles.tabSubtitle}>
            Save your Gmail and a Google App Password below. In chat, ask things like “Show my inbox”,
            “Summarize my latest emails,” or use the /email shortcut — Donna reads mail there (this tab
            only stores credentials, not your inbox list).
          </Text>

          {loadingSettings ? (
            <ActivityIndicator color="#007AFF" style={{ marginTop: 20 }} />
          ) : (
            <View style={styles.settingsForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Gmail Address</Text>
                <TextInput
                  style={styles.sidebarInput}
                  value={gmailUser}
                  onChangeText={setGmailUser}
                  placeholder="user@gmail.com"
                  placeholderTextColor="#444"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>App Password</Text>
                <TextInput
                  style={styles.sidebarInput}
                  value={gmailPass}
                  onChangeText={setGmailPass}
                  placeholder="abcd efgh ijkl mnop"
                  placeholderTextColor="#444"
                  secureTextEntry
                />
              </View>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={onSaveSettings}
                disabled={savingSettings}
              >
                {savingSettings ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Credentials</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* Unified Account Footer */}
      <View
        style={[
          styles.sidebarFooter,
          { paddingBottom: Math.max(insets.bottom, 15) },
        ]}
      >
        <TouchableOpacity style={styles.footerItem} onPress={onProfilePress}>
          <View style={styles.footerAvatar}>
            <Text style={styles.avatarText}>
              {userEmail?.[0].toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.footerLabel}>My Account</Text>
            {userEmail && (
              <Text style={styles.footerSublabel} numberOfLines={1}>
                {userEmail}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={16} color="#444" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    position: "absolute",
    left: 0,
    width: 300,
    backgroundColor: "rgba(255,255,255,0.8)",
    zIndex: 100,
    borderRightWidth: 1,
    borderRightColor: "rgba(226,232,240,0.9)",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 6, height: 0 },
    elevation: 20,
  },
  tabSwitcher: {
    flexDirection: "row",
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 6,
    padding: 4,
    borderRadius: 16,
    backgroundColor: "rgba(248,250,252,0.72)",
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.9)",
  },
  tabButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "MonoRegular",
  },
  activeTab: {
    backgroundColor: "#EFF6FF",
  },
  activeTabLabel: {
    color: "#1D4ED8",
  },
  sidebarHeader: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 15,
  },
  sidebarHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 15,
    marginTop: 14,
    marginBottom: 12,
  },
  newChatButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
  },
  tabSubtitle: {
    color: "#6B7280",
    fontSize: 13,
    fontFamily: "MonoRegular",
    marginHorizontal: 15,
    marginBottom: 18,
    lineHeight: 18,
  },
  sessionItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.95)",
    backgroundColor: "rgba(255,255,255,0.78)",
  },
  sessionItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  deleteSessionButton: {
    padding: 12,
  },
  activeSession: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  sessionTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "500",
    fontFamily: "MonoRegular",
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.95)",
  },
  fileName: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "MonoRegular",
    marginBottom: 4,
  },
  fileDate: {
    color: "#6B7280",
    fontSize: 12,
    fontFamily: "MonoRegular",
  },
  emptyText: {
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 40,
    fontSize: 14,
    fontFamily: "MonoRegular",
  },
  settingsForm: {
    paddingHorizontal: 15,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "MonoRegular",
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4,
  },
  sidebarInput: {
    backgroundColor: "rgba(255,255,255,0.86)",
    color: "#111827",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: "MonoRegular",
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.95)",
  },
  saveButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "MonoRegular",
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: "rgba(226,232,240,0.9)",
    backgroundColor: "rgba(255,255,255,0.8)",
    padding: 15,
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "rgba(248,250,252,0.72)",
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.95)",
  },
  footerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  avatarText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: "MonoRegular",
  },
  footerLabel: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "MonoRegular",
  },
  footerSublabel: {
    color: "#64748B",
    fontSize: 12,
    fontFamily: "MonoRegular",
    marginTop: 2,
  },
});
