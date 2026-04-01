import { View, Button } from "react-native";
import { supabase } from "../../services/supabase";
import GmailButton from "../../components/GmailButton";

export default function Profile() {
  return (
    <View>
      <GmailButton />
      <Button title="Logout" onPress={() => supabase.auth.signOut()} />
    </View>
  );
}