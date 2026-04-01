/**
 * app/api/chat-sessions+api.ts
 * Expo Router API route — replaces app/api/chat-sessions/route.ts (Next.js)
 *
 * GET    /api/chat-sessions          — list all sessions for the user
 * POST   /api/chat-sessions          — create a new session
 * PATCH  /api/chat-sessions          — rename a session
 * DELETE /api/chat-sessions          — delete a session + its messages
 */

import { getAuthenticatedUser } from "@/lib/supabase-api";

export async function GET(req: Request) {
  const { user, supabase } = await getAuthenticatedUser(req);
  if (!user || !supabase)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("chat_sessions")
    .select("id, title, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ sessions: data ?? [] });
}

export async function POST(req: Request) {
  const { user, supabase } = await getAuthenticatedUser(req);
  if (!user || !supabase)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { title } = await req.json().catch(() => ({ title: "New Chat" }));

  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({ user_id: user.id, title: title || "New Chat" })
    .select("id, title, created_at, updated_at")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ session: data });
}

export async function PATCH(req: Request) {
  const { user, supabase } = await getAuthenticatedUser(req);
  if (!user || !supabase)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { session_id, title } = await req.json();
  if (!session_id || !title)
    return Response.json(
      { error: "session_id and title required" },
      { status: 400 }
    );

  const { error } = await supabase
    .from("chat_sessions")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", session_id)
    .eq("user_id", user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { user, supabase } = await getAuthenticatedUser(req);
  if (!user || !supabase)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { session_id } = await req.json();
  if (!session_id)
    return Response.json({ error: "session_id required" }, { status: 400 });

  // Delete messages first
  await supabase
    .from("chat_messages")
    .delete()
    .eq("session_id", session_id);

  const { error } = await supabase
    .from("chat_sessions")
    .delete()
    .eq("id", session_id)
    .eq("user_id", user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
