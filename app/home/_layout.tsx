import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { ActivityIndicator, View } from "react-native";

export default function HomeLayout() {
  const { user, isAuthReady } = useAuth();

  if (!isAuthReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
        <ActivityIndicator color="#007AFF" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="chat" />
      <Stack.Screen name="upload" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
