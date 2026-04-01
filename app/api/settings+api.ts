/**
 * app/api/settings+api.ts
 * Expo Router API route — replaces app/api/settings/route.ts (Next.js)
 *
 * GET   /api/settings  — load current user's Gmail settings
 * POST  /api/settings  — save / update Gmail credentials
 */

import { getAuthenticatedUser } from "@/lib/supabase-api";

export async function GET(req: Request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(req);
    if (!user || !supabase)
      return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { data } = await supabase
      .from("user_settings")
      .select("gmail_user, gmail_app_password")
      .eq("user_id", user.id)
      .single();

    return Response.json({ settings: data ?? null });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(req);
    if (!user || !supabase)
      return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { gmail_user, gmail_app_password } = await req.json();

    if (!gmail_user || !gmail_app_password) {
      return Response.json(
        { error: "gmail_user and gmail_app_password are required" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        gmail_user,
        gmail_app_password,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) throw new Error(error.message);

    return Response.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
