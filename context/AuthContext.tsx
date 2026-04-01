import { createContext, useEffect, useState, ReactNode, useContext } from "react";
import { supabase } from "../services/supabase";
import { AuthContextType } from "../types";

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthReady: false,
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setIsAuthReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthReady }}>
      {children}
    </AuthContext.Provider>
  );
}