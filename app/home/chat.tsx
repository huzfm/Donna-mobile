import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useContext, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    PanResponder,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAlert } from "../../context/AlertContext";

import { AuthContext } from "../../context/AuthContext";
import { supabase } from "../../services/supabase";

// Modular Components
import { ChatHeader } from "../../components/chat/ChatHeader";
import { ChatInput } from "../../components/chat/ChatInput";
import { MessageItem } from "../../components/chat/MessageItem";
import { Sidebar } from "../../components/chat/Sidebar";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface Session {
  id: string;
  title: string;
}

interface UploadedFile {
  file_name: string;
  uploaded_at: string;
}

type SidebarTab = "chats" | "files" | "gmail";
type SlashShortcut = {
  command: string;
  title: string;
  prompt: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export default function ChatScreen() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Donna is thinking...");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("chats");

  // Knowledge Base State
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [hasLoadedFiles, setHasLoadedFiles] = useState(false);

  // Gmail State
  const [gmailUser, setGmailUser] = useState("");
  const [gmailPass, setGmailPass] = useState("");
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [enhancingEmail, setEnhancingEmail] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const sidebarPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const isHorizontalSwipe =
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          Math.abs(gestureState.dx) > 10;
        if (!isHorizontalSwipe) return false;

        // Open with right swipe from left edge
        if (!isSidebarOpen) {
          return gestureState.x0 < 35 && gestureState.dx > 12;
        }

        // Close with left swipe when sidebar is open
        return gestureState.dx < -12;
      },
      onPanResponderRelease: (_, gestureState) => {
        // Open from edge swipe
        if (!isSidebarOpen && gestureState.x0 < 35 && gestureState.dx > 45) {
          setIsSidebarOpen(true);
          return;
        }

        // Close with left swipe
        if (isSidebarOpen && gestureState.dx < -45) {
          setIsSidebarOpen(false);
        }
      },
    })
  ).current;

  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const shortcuts: SlashShortcut[] = [
    {
      command: "/email",
      title: "Read Inbox",
      prompt: "Check and summarize my latest emails.",
      description: "Read and summarize your inbox",
      icon: "mail-outline",
    },
    {
      command: "/send-email",
      title: "Send Email",
      prompt: "Open email composer",
      description: "Compose and send an email",
      icon: "mail-outline",
    },
    {
      command: "/files",
      title: "Use My Files",
      prompt: "Answer using my uploaded files:",
      description: "Summarize or search your uploads",
      icon: "folder-open-outline",
    },
    {
      command: "/draft",
      title: "Draft Reply",
      prompt: "Draft a professional reply to this email:",
      description: "Generate a polished draft reply",
      icon: "create-outline",
    },
    {
      command: "/summarize",
      title: "Summarize Files",
      prompt: "Summarize key points from my uploaded files.",
      description: "Read and summarize uploaded files",
      icon: "sparkles-outline",
    },
  ];
  const normalizedInput = input.trimStart().toLowerCase();
  const showShortcutMenu = normalizedInput.startsWith("/");
  const filteredShortcuts = showShortcutMenu
    ? shortcuts.filter(
        (item) =>
          item.command.includes(normalizedInput) ||
          item.title.toLowerCase().includes(normalizedInput.replace("/", ""))
      )
    : [];

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const loadSessions = React.useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/chat-sessions", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (data.sessions) {
        setSessions(data.sessions);
        if (data.sessions.length > 0 && !currentSession) {
          setCurrentSession(data.sessions[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
    }
  }, [currentSession]);

  const loadMessages = React.useCallback(async (sessionId: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(`/api/chat-history?session_id=${sessionId}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  }, []);

  const loadFiles = async (force = false) => {
    if (!force && hasLoadedFiles) return;

    setLoadingFiles(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/upload", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (data.files) {
        setFiles(data.files);
        setHasLoadedFiles(true);
      }
    } catch (err) {
      console.error("Failed to load files:", err);
    } finally {
      setLoadingFiles(false);
    }
  };

  const deleteFile = (fileName: string) => {
    showAlert({
      title: "Delete File",
      message: `Are you sure you want to remove "${fileName}" from Donna's memory?`,
      type: "confirm",
      confirmText: "Delete",
      onConfirm: async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const res = await fetch("/api/upload", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({ file_name: fileName }),
          });
          const data = await res.json();
          if (data.success) {
            setFiles(files.filter((f) => f.file_name !== fileName));
            showAlert({
              title: "Removed",
              message: "File has been deleted successfully.",
              type: "success",
            });
          }
        } catch (err) {
          console.error("Delete failed:", err);
          showAlert({
            title: "Error",
            message: "Failed to delete file.",
            type: "error",
          });
        }
      },
    });
  };

  const loadSettings = async (force = false) => {
    if (!force && hasLoadedSettings) return;

    setLoadingSettings(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/settings", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      if (data.settings) {
        setGmailUser(data.settings.gmail_user || "");
        setGmailPass(data.settings.gmail_app_password || "");
        setHasLoadedSettings(true);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const saveSettings = async () => {
    if (!gmailUser || !gmailPass) {
      showAlert({
        title: "Error",
        message: "Both fields are required.",
        type: "error",
      });
      return;
    }
    setSavingSettings(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          gmail_user: gmailUser,
          gmail_app_password: gmailPass,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setHasLoadedSettings(true);
        showAlert({
          title: "Success",
          message: "Gmail settings updated.",
          type: "success",
        });
      }
    } catch (err) {
      console.error("Save failed:", err);
      showAlert({
        title: "Error",
        message: "Failed to save settings.",
        type: "error",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  // ─── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (user) loadSessions();
  }, [user, loadSessions]);

  useEffect(() => {
    if (user && sidebarTab === "files" && isSidebarOpen) loadFiles();
    if (user && sidebarTab === "gmail" && isSidebarOpen) loadSettings();
  }, [user, sidebarTab, isSidebarOpen]);

  useEffect(() => {
    if (currentSession) loadMessages(currentSession.id);
  }, [currentSession, loadMessages]);

  const createNewSession = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/chat-sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ title: "New Chat" }),
      });
      const data = await res.json();
      if (data.session) {
        setSessions([data.session, ...sessions]);
        setCurrentSession(data.session);
        setMessages([]);
        setIsSidebarOpen(false);
      }
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  };

  const deleteSession = async (sessionId: string) => {
    showAlert({
      title: "Delete Chat",
      message:
        "Are you sure you want to delete this conversation and all its messages?",
      type: "confirm",
      confirmText: "Delete",
      onConfirm: async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const res = await fetch("/api/chat-sessions", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({ session_id: sessionId }),
          });
          const data = await res.json();
          if (data.ok) {
            const updatedSessions = sessions.filter((s) => s.id !== sessionId);
            setSessions(updatedSessions);
            if (currentSession?.id === sessionId) {
              if (updatedSessions.length > 0) {
                setCurrentSession(updatedSessions[0]);
              } else {
                setCurrentSession(null);
                setMessages([]);
              }
            }
          }
        } catch (err) {
          console.error("Delete session failed:", err);
          showAlert({
            title: "Error",
            message: "Failed to delete chat session.",
            type: "error",
          });
        }
      },
    });
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setLoading(true);
    setLoadingText(getLoadingText(userMessage));

    let sessionToUse = currentSession;
    if (!sessionToUse) {
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/chat-sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession?.access_token}`,
        },
        body: JSON.stringify({ title: userMessage.slice(0, 30) }),
      });
      const data = await res.json();
      if (data.session) {
        sessionToUse = data.session;
        setCurrentSession(data.session);
        setSessions([data.session, ...sessions]);
      } else {
        setLoading(false);
        return;
      }
    }

    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newUserMsg]);

    try {
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();

      // Non-blocking write for better perceived responsiveness.
      fetch("/api/chat-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession?.access_token}`,
        },
        body: JSON.stringify({
          session_id: sessionToUse?.id,
          role: "user",
          content: userMessage,
        }),
      }).catch((err) => console.error("Failed to store user message:", err));

      // Keep request payload small for faster API round trips.
      const historyForRequest = [...messages, newUserMsg]
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content }));

      const queryRes = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession?.access_token}`,
        },
        body: JSON.stringify({
          question: userMessage,
          history: historyForRequest,
        }),
      });

      const aiContent = await readApiAnswer(queryRes);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiContent,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMsg]);

      // Persist assistant message in background to avoid UI blocking.
      fetch("/api/chat-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession?.access_token}`,
        },
        body: JSON.stringify({
          session_id: sessionToUse?.id,
          role: "assistant",
          content: aiContent,
        }),
      }).catch((err) => console.error("Failed to store assistant message:", err));

      if (messages.length === 0) {
        const nextTitle = userMessage.slice(0, 40);
        setSessions((prev) =>
          prev.map((session) =>
            session.id === sessionToUse?.id ? { ...session, title: nextTitle } : session
          )
        );

        fetch("/api/chat-sessions", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authSession?.access_token}`,
          },
          body: JSON.stringify({
            session_id: sessionToUse?.id,
            title: nextTitle,
          }),
        }).catch((err) => console.error("Failed to update session title:", err));
      }
    } catch (err) {
      console.error("Chat error:", err);
    } finally {
      setLoading(false);
      setLoadingText("Donna is thinking...");
    }
  };

  const getLoadingText = (message: string) => {
    const normalized = message.toLowerCase();

    if (normalized.includes("send email") || normalized.includes("/send-email")) {
      return "Donna is preparing your email...";
    }
    if (
      normalized.includes("email") ||
      normalized.includes("inbox") ||
      normalized.includes("gmail")
    ) {
      return "Donna is checking your emails...";
    }
    if (
      normalized.includes("summarize") &&
      (normalized.includes("file") || normalized.includes("document"))
    ) {
      return "Donna is summarizing your files...";
    }
    if (
      normalized.includes("file") ||
      normalized.includes("document") ||
      normalized.includes("upload")
    ) {
      return "Donna is reading your files...";
    }

    return "Donna is thinking...";
  };

  const readApiAnswer = async (response: Response) => {
    const raw = await response.text();
    try {
      const parsed = JSON.parse(raw);
      return parsed?.answer || parsed?.error || "No response received.";
    } catch {
      if (!response.ok) return `Request failed (${response.status}). Please try again.`;
      return raw || "No response received.";
    }
  };

  const applyShortcut = (shortcut: SlashShortcut) => {
    if (shortcut.command === "/send-email") {
      setIsEmailModalOpen(true);
      return;
    }
    setInput(`${shortcut.prompt} `);
  };

  const handleSendEmailFromModal = async () => {
    if (!emailTo.trim() || !emailSubject.trim() || !emailBody.trim()) {
      showAlert({
        title: "Missing fields",
        message: "Recipient, subject, and message are required.",
        type: "error",
      });
      return;
    }

    setSendingEmail(true);
    try {
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();

      const emailPrompt = `Send email to ${emailTo.trim()} with subject "${emailSubject.trim()}" and body: ${emailBody.trim()}`;
      const queryRes = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession?.access_token}`,
        },
        body: JSON.stringify({
          question: emailPrompt,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const resultText = await readApiAnswer(queryRes);

      const composeSummary = `Send email\nTo: ${emailTo.trim()}\nSubject: ${emailSubject.trim()}\n\n${emailBody.trim()}`;
      const newUserMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: composeSummary,
        created_at: new Date().toISOString(),
      };
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: resultText,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newUserMsg, aiMsg]);
      setIsEmailModalOpen(false);
      setEmailTo("");
      setEmailSubject("");
      setEmailBody("");
    } catch (err) {
      console.error("Email send modal failed:", err);
      showAlert({
        title: "Send failed",
        message: "Unable to send email right now.",
        type: "error",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleEnhanceEmailWithAI = async () => {
    if (!emailBody.trim()) {
      showAlert({
        title: "Nothing to enhance",
        message: "Write a draft first, then use AI enhance.",
        type: "error",
      });
      return;
    }

    setEnhancingEmail(true);
    try {
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();

      const enhancePrompt = `Improve this email draft to be clear, professional, and concise. Keep intent the same.
Return in this exact format:
SUBJECT: <improved subject>
BODY:
<improved body>

Current subject: ${emailSubject || "(none)"}
Current body:
${emailBody}`;

      const queryRes = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession?.access_token}`,
        },
        body: JSON.stringify({
          question: enhancePrompt,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const answerText = await readApiAnswer(queryRes);

      const subjectMatch = answerText.match(/SUBJECT:\s*(.+)/i);
      const bodyMatch = answerText.match(/BODY:\s*([\s\S]*)/i);

      if (subjectMatch?.[1]) {
        setEmailSubject(subjectMatch[1].trim());
      }
      if (bodyMatch?.[1]) {
        setEmailBody(bodyMatch[1].trim());
      } else if (answerText.trim()) {
        setEmailBody(answerText.trim());
      }
    } catch (err) {
      console.error("Enhance email failed:", err);
      showAlert({
        title: "Enhance failed",
        message: "Unable to enhance email right now.",
        type: "error",
      });
    } finally {
      setEnhancingEmail(false);
    }
  };

  return (
    <View
      style={[styles.container, { paddingTop: insets.top }]}
      {...sidebarPanResponder.panHandlers}
    >
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ChatHeader onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageItem item={item} />}
          contentContainerStyle={[
            styles.listContent,
            messages.length === 0 && { flex: 1, justifyContent: "center" },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="sparkles" size={40} color="#007AFF" />
              </View>
              <Text style={styles.emptyTitle}>How can I help you today?</Text>
              <Text style={styles.emptySubtitle}>
                Ask about your emails, files, or just have a chat.
              </Text>

              <View style={styles.suggestionsContainer}>
                {[
                  "Search my emails",
                  "Summarize recent files",
                  "Draft a reply",
                ].map((suggestion, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.suggestionChip}
                    onPress={() => setInput(suggestion)}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                    <Ionicons name="arrow-forward" size={14} color="#666" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        {loading && (
          <View style={typingStyles.typingIndicator}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={typingStyles.typingText}>{loadingText}</Text>
          </View>
        )}

        {showShortcutMenu && (
          <View style={styles.shortcutPanel}>
            <Text style={styles.shortcutSectionLabel}>Commands</Text>
            {filteredShortcuts.length > 0 ? (
              filteredShortcuts.map((item) => (
                <TouchableOpacity
                  key={item.command}
                  style={styles.shortcutItem}
                  onPress={() => applyShortcut(item)}
                >
                  <View style={styles.shortcutIcon}>
                    <Ionicons name={item.icon} size={14} color="#8BC0FF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shortcutTitle}>{item.command}</Text>
                    <Text style={styles.shortcutPreview} numberOfLines={1}>
                      {item.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.shortcutEmpty}>No command matched.</Text>
            )}
            <View style={styles.shortcutFooterChips}>
              {shortcuts.slice(0, 5).map((item) => (
                <TouchableOpacity
                  key={item.command}
                  style={styles.shortcutFooterChip}
                  onPress={() => applyShortcut(item)}
                >
                  <Text style={styles.shortcutFooterChipText}>{item.command}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <ChatInput
          value={input}
          onChangeText={setInput}
          onSend={handleSend}
          onAttach={() => router.push("/home/upload")}
          loading={loading}
          insets={insets}
        />
      </KeyboardAvoidingView>

      <Modal
        visible={isEmailModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEmailModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Compose Email</Text>
              <TouchableOpacity onPress={() => setIsEmailModalOpen(false)}>
                <Ionicons name="close" size={20} color="#9A9AA1" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              value={emailTo}
              onChangeText={setEmailTo}
              placeholder="To (email@example.com)"
              placeholderTextColor="#777"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.modalInput}
              value={emailSubject}
              onChangeText={setEmailSubject}
              placeholder="Subject"
              placeholderTextColor="#777"
            />
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              value={emailBody}
              onChangeText={setEmailBody}
              placeholder="Write your message..."
              placeholderTextColor="#777"
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.modalEnhanceButton, enhancingEmail && { opacity: 0.7 }]}
              onPress={handleEnhanceEmailWithAI}
              disabled={enhancingEmail || sendingEmail}
            >
              {enhancingEmail ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="sparkles-outline" size={16} color="#fff" />
                  <Text style={styles.modalEnhanceText}>Enhance with AI</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalSendButton, sendingEmail && { opacity: 0.7 }]}
              onPress={handleSendEmailFromModal}
              disabled={sendingEmail || enhancingEmail}
            >
              {sendingEmail ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalSendText}>Send Email</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Sidebar
        isOpen={isSidebarOpen}
        activeTab={sidebarTab}
        onTabChange={setSidebarTab}
        sessions={sessions}
        currentSession={currentSession}
        onSessionSelect={(session) => {
          setCurrentSession(session);
          setIsSidebarOpen(false);
        }}
        files={files}
        onDeleteFile={deleteFile}
        onRefreshFiles={() => loadFiles(true)}
        onUploadPress={() => router.push("/home/upload")}
        onNewChat={createNewSession}
        onDeleteSession={deleteSession}
        onProfilePress={() => router.push("/home/profile")}
        userEmail={user?.email}
        gmailUser={gmailUser}
        gmailPass={gmailPass}
        setGmailUser={setGmailUser}
        setGmailPass={setGmailPass}
        onSaveSettings={saveSettings}
        loadingFiles={loadingFiles}
        loadingSettings={loadingSettings}
        savingSettings={savingSettings}
        insets={insets}
      />
    </View>
  );
}

const typingStyles = StyleSheet.create({
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "transparent",
  },
  typingText: {
    color: "#007AFF",
    fontSize: 14,
    marginLeft: 10,
    fontWeight: "500",
    fontFamily: "MonoRegular",
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  listContent: {
    padding: 15,
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emptyTitle: {
    color: "#0F172A",
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: "DotoBold",
    textAlign: "center",
    marginBottom: 12,
  },
  emptySubtitle: {
    color: "#64748B",
    fontSize: 15,
    fontFamily: "MonoRegular",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  suggestionsContainer: {
    width: "100%",
    gap: 12,
  },
  suggestionChip: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  suggestionText: {
    color: "#1F2937",
    fontSize: 14,
    fontWeight: "500",
    fontFamily: "MonoRegular",
  },
  shortcutPanel: {
    marginHorizontal: 14,
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.9)",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  shortcutSectionLabel: {
    color: "#64748B",
    fontSize: 11,
    fontFamily: "MonoRegular",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "700",
    marginBottom: 8,
  },
  shortcutItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 9,
    gap: 10,
    borderRadius: 10,
  },
  shortcutIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  shortcutTitle: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "MonoRegular",
  },
  shortcutPreview: {
    color: "#64748B",
    fontSize: 11,
    fontFamily: "MonoRegular",
    marginTop: 2,
  },
  shortcutEmpty: {
    color: "#94A3B8",
    fontSize: 12,
    fontFamily: "MonoRegular",
    textAlign: "left",
    paddingVertical: 8,
  },
  shortcutFooterChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 10,
    paddingBottom: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  shortcutFooterChip: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#F8FAFC",
  },
  shortcutFooterChipText: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "MonoRegular",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.35)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.95)",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "DotoBold",
  },
  modalInput: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    color: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 10,
    fontSize: 14,
    fontFamily: "MonoRegular",
  },
  modalTextarea: {
    minHeight: 120,
  },
  modalSendButton: {
    marginTop: 4,
    backgroundColor: "#0A84FF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalSendText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "MonoRegular",
  },
  modalEnhanceButton: {
    marginTop: 2,
    marginBottom: 10,
    backgroundColor: "#4B3FD6",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  modalEnhanceText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "MonoRegular",
  },
});
