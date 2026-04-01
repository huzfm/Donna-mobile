import React, { useState, useEffect, useRef, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { supabase } from "../../services/supabase";

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

export default function ChatScreen() {
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const loadSessions = React.useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
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
      const { data: { session } } = await supabase.auth.getSession();
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

  // ─── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user, loadSessions]);

  useEffect(() => {
    if (currentSession) {
      loadMessages(currentSession.id);
    }
  }, [currentSession, loadMessages]);

  const createNewSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
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

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setLoading(true);

    let sessionToUse = currentSession;
    if (!sessionToUse) {
      // Create a session first if none exists
      const { data: { session: authSession } } = await supabase.auth.getSession();
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
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      // 1. Save user message to database
      await fetch("/api/chat-history", {
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
      });

      // 2. Get AI Response
      const queryRes = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession?.access_token}`,
        },
        body: JSON.stringify({
          question: userMessage,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const queryData = await queryRes.json();
      const aiContent = queryData.answer || "Sorry, I encountered an error.";

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiContent,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMsg]);

      // 3. Save AI message to database
      await fetch("/api/chat-history", {
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
      });

      // 4. Update session title if it was first message
      if (messages.length === 0) {
        await fetch("/api/chat-sessions", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authSession?.access_token}`,
          },
          body: JSON.stringify({
            session_id: sessionToUse?.id,
            title: userMessage.slice(0, 40),
          }),
        });
        loadSessions();
      }

    } catch (err) {
      console.error("Chat error:", err);
      Alert.alert("Error", "Failed to get response from AI.");
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isAi = item.role === "assistant";
    return (
      <View style={[styles.messageRow, isAi ? styles.aiRow : styles.userRow]}>
        <View style={[styles.bubble, isAi ? styles.aiBubble : styles.userBubble]}>
          <Text style={[styles.messageText, isAi ? styles.aiText : styles.userText]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsSidebarOpen(!isSidebarOpen)}>
          <Ionicons name="menu" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{currentSession?.title || "Donna AI"}</Text>
        <TouchableOpacity onPress={createNewSession}>
          <Ionicons name="add-circle-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {isSidebarOpen && (
        <View style={styles.sidebar}>
          <Text style={styles.sidebarHeader}>Your Chats</Text>
          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.sessionItem, currentSession?.id === item.id && styles.activeSession]}
                onPress={() => {
                  setCurrentSession(item);
                  setIsSidebarOpen(false);
                }}
              >
                <Ionicons name="chatbubble-outline" size={18} color="#ccc" style={{ marginRight: 10 }} />
                <Text style={styles.sessionTitle} numberOfLines={1}>{item.title}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {loading && (
        <View style={styles.typingIndicator}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.typingText}>Donna is thinking...</Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="Ask Donna anything..."
            placeholderTextColor="#666"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity 
            style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]} 
            onPress={handleSend}
            disabled={!input.trim() || loading}
          >
            <Ionicons name="arrow-up" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  listContent: {
    padding: 15,
    paddingBottom: 20,
  },
  messageRow: {
    marginVertical: 8,
    flexDirection: "row",
    width: "100%",
  },
  userRow: {
    justifyContent: "flex-end",
  },
  aiRow: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "85%",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: "#007AFF",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: "#1C1C1E",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: "#fff",
  },
  aiText: {
    color: "#E5E5E7",
  },
  inputArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    backgroundColor: "#000",
    borderTopWidth: 1,
    borderTopColor: "#222",
  },
  input: {
    flex: 1,
    backgroundColor: "#1C1C1E",
    color: "#fff",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    paddingRight: 45,
    fontSize: 16,
    maxHeight: 120,
  },
  sendButton: {
    position: "absolute",
    right: 18,
    bottom: 18,
    backgroundColor: "#007AFF",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#333",
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 5,
  },
  typingText: {
    color: "#666",
    fontSize: 14,
    marginLeft: 8,
  },
  sidebar: {
    position: "absolute",
    left: 0,
    top: 60,
    bottom: 0,
    width: 250,
    backgroundColor: "#111",
    zIndex: 100,
    borderRightWidth: 1,
    borderRightColor: "#222",
    padding: 15,
  },
  sidebarHeader: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  sessionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 5,
  },
  activeSession: {
    backgroundColor: "#222",
  },
  sessionTitle: {
    color: "#ccc",
    fontSize: 15,
  },
});