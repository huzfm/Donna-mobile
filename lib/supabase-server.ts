import { createClient as createSupabaseClient } from "@supabase/supabase-js";


export async function createClient() {
  const url =
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";
  if (!url) {
    throw new Error(
      "Supabase URL missing: set EXPO_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL"
    );
  }
  return createSupabaseClient(
    url,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

