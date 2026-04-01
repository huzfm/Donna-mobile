
import { getAuthenticatedUser } from "@/lib/supabase-api";

export async function GET(req: Request) {
  const { user, supabase } = await getAuthenticatedUser(req);
  if (!user || !supabase)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId)
    return Response.json({ error: "session_id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, role, content, status, created_at")
    .eq("user_id", user.id)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ messages: data ?? [] });
}

export async function POST(req: Request) {
  const { user, supabase } = await getAuthenticatedUser(req);
  if (!user || !supabase)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { session_id, role, content, status } = await req.json();
  if (!session_id || !role || !content)
    return Response.json(
      { error: "session_id, role, and content required" },
      { status: 400 }
    );

  const { error } = await supabase
    .from("chat_messages")
    .insert({
      user_id: user.id,
      session_id,
      role,
      content,
      status: status ?? "done",
    });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Bump session updated_at
  await supabase
    .from("chat_sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", session_id)
    .eq("user_id", user.id);

  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { user, supabase } = await getAuthenticatedUser(req);
  if (!user || !supabase)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { session_id } = await req.json();
  if (!session_id)
    return Response.json({ error: "session_id required" }, { status: 400 });

  const { error } = await supabase
    .from("chat_messages")
    .delete()
    .eq("user_id", user.id)
    .eq("session_id", session_id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
