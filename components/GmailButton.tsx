import { Button } from "react-native";
import { supabase } from "../services/supabase";

export default function GmailButton() {
  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
    });
  };

  return <Button title="Continue with Google" onPress={loginWithGoogle} />;
}