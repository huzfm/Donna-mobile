import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { Doto_700Bold } from "@expo-google-fonts/doto";
import { DMMono_400Regular } from "@expo-google-fonts/dm-mono";
import AuthProvider from "../context/AuthContext";
import { AlertProvider } from "../context/AlertContext";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DotoBold: Doto_700Bold,
    MonoRegular: DMMono_400Regular,
  });

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <AlertProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </AlertProvider>
    </AuthProvider>
  );
}
