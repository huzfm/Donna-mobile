/**
 * app/api/upload+api.ts
 * Expo Router API route — replaces app/api/upload/route.ts (Next.js)
 *
 * GET    /api/upload  — list uploaded files for this user
 * POST   /api/upload  — upload + chunk + embed a document
 * DELETE /api/upload  — delete all chunks of a specific file
 */

import { getAuthenticatedUser } from "@/lib/supabase-api";
import { chunkText } from "@/lib/chunk";
import { embed } from "@/lib/embed";

// ─── GET — list files ─────────────────────────────────────────────────────────

export async function GET(req: Request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(req);
    if (!user || !supabase) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("documents")
      .select("file_name, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    // De-duplicate — each file appears once with the most recent upload time
    const seen = new Set<string>();
    const files: { file_name: string; uploaded_at: string }[] = [];
    for (const row of data ?? []) {
      if (!seen.has(row.file_name)) {
        seen.add(row.file_name);
        files.push({ file_name: row.file_name, uploaded_at: row.created_at });
      }
    }

    return Response.json({ files });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

// ─── DELETE — remove a file ───────────────────────────────────────────────────

export async function DELETE(req: Request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(req);
    if (!user || !supabase) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { file_name } = await req.json();
    if (!file_name || typeof file_name !== "string") {
      return Response.json({ error: "file_name is required" }, { status: 400 });
    }

    const { error, count } = await supabase
      .from("documents")
      .delete({ count: "exact" })
      .eq("user_id", user.id)
      .eq("file_name", file_name);

    if (error) throw new Error(error.message);

    return Response.json({ success: true, deleted: count });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

// ─── POST — upload & embed a file ────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(req);
    if (!user || !supabase) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return Response.json({ error: "No file" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name.toLowerCase();

    let text = "";

    // ── PDF ──────────────────────────────────────────────────────────────────
    if (fileName.endsWith(".pdf")) {
      const pdfParse = require("@cyber2024/pdf-parse-fixed");
      const data = await pdfParse(buffer);
      text = data.text;
    }

    // ── Word ─────────────────────────────────────────────────────────────────
    else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
      const mammoth = require("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    }

    // ── Plain text ────────────────────────────────────────────────────────────
    else if (fileName.endsWith(".txt")) {
      text = buffer.toString("utf-8");
    }

    // ── Excel / CSV ───────────────────────────────────────────────────────────
    else if (
      fileName.endsWith(".xlsx") ||
      fileName.endsWith(".xls") ||
      fileName.endsWith(".csv")
    ) {
      const XLSX = require("xlsx");
      const workbook = XLSX.read(buffer, { type: "buffer" });

      let allText = "";
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as (
          | string
          | number
          | boolean
          | null
          | undefined
        )[][];

        allText += `Sheet: ${sheetName}\n`;
        for (const row of rows) {
          const cleaned = row.filter(
            (cell) => cell !== null && cell !== undefined && cell !== ""
          );
          if (cleaned.length > 0) allText += cleaned.join(" | ") + "\n";
        }
        allText += "\n";
      }
      text = allText;
    }

    // ── Unsupported ───────────────────────────────────────────────────────────
    else {
      return Response.json({ error: "Unsupported file type" }, { status: 400 });
    }

    text = text.replace(/\s+/g, " ").trim();
    if (!text) {
      return Response.json({ error: "Could not extract text" }, { status: 400 });
    }

    // Cap size to avoid API crashes
    if (text.length > 50000) text = text.slice(0, 50000);

    const chunks = chunkText(text);
    const embeddings = await embed(chunks);

    if (!embeddings || embeddings.length === 0) {
      throw new Error("Embeddings failed");
    }

    const rows = chunks.map((chunk, i) => ({
      content: chunk,
      embedding: embeddings[i],
      file_name: file.name,
      chunk_index: i,
      user_id: user.id,
    }));

    const { error } = await supabase.from("documents").insert(rows);
    if (error) {
      console.error("SUPABASE ERROR:", error);
      throw new Error(error.message);
    }

    return Response.json({ success: true, chunks: chunks.length });
  } catch (e: any) {
    console.error("UPLOAD ERROR:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
