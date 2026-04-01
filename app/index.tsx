import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useRootNavigationState, Redirect } from "expo-router";

import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const { user } = useContext(AuthContext);
  const rootNavigationState = useRootNavigationState();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for the navigation state to be ready
    if (rootNavigationState?.key) {
      setIsReady(true);
    }
  }, [rootNavigationState?.key]);

  // If not ready, show a simple loader
  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
        <ActivityIndicator color="#007AFF" />
      </View>
    );
  }

  // Once ready, perform declarative redirect
  if (user) {
    return <Redirect href="/home/chat" />;
  } else {
    return <Redirect href="/auth/login" />;
  }
}