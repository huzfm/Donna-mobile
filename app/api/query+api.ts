/**
 * app/api/query+api.ts
 * Expo Router API route — replaces the old Next.js query+route.ts
 *
 * Handles the main RAG / AI query pipeline:
 *   POST /api/query  { question, history? }
 */

import { getAuthenticatedUser } from "@/lib/supabase-api";
import { embed } from "@/lib/embed";
import { askGroq } from "@/lib/groq";
import { sendEmail } from "@/lib/email";
import { getRecentEmails } from "@/lib/gmail";

// ─── Intent Regexes ──────────────────────────────────────────────────────────

const EMAIL_INTENT = /^(send\s+(an?\s+)?e?mail\s+|email\s+|mail\s+to\s+)/i;
const GMAIL_SLASH = /^\/email\b/i;
/** Allows text between the verb and "emails" (e.g. "summarize my latest emails"). */
const GMAIL_INBOX_PHRASE =
  /\b(check|read|show|summarize|view|list|see|open|fetch|pull)\b[\w\s,.'"-]{0,65}\b(inbox|emails?|mails?|gmail)\b/i;
const GMAIL_WHAT_IN =
  /what[\w\s']{0,24}\bin\b[\w\s,.'-]{0,35}\b(inbox|emails?|mails?|gmail)\b/i;

function wantsGmailRead(question: string): boolean {
  const q = question.trim();
  return (
    GMAIL_SLASH.test(q) ||
    GMAIL_INBOX_PHRASE.test(q) ||
    GMAIL_WHAT_IN.test(q)
  );
}

const DIAGRAM_INTENT =
  /\b(draw|generate|create|make|show|visualize|diagram|flowchart|flow\s+chart|sequence\s+diagram|er\s+diagram|mindmap|mind\s+map|class\s+diagram|gantt|pie\s+chart|graph|chart)\b/i;
const FILE_DIAGRAM_INTENT =
  /(diagram|flowchart|chart|visualize|graph).{0,40}(file|upload|document|data|my\s+data|personal|stored|excel|xlsx|csv|pdf|doc)/i;

// ─── Types ───────────────────────────────────────────────────────────────────

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { user, supabase } = await getAuthenticatedUser(req);
    if (!user || !supabase) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { question, history = [] }: { question: string; history?: HistoryMessage[] } =
      await req.json();

    if (!question) {
      return Response.json({ error: "No question provided" }, { status: 400 });
    }

    // Build conversation context (last 10 turns)
    const recentHistory: HistoryMessage[] = history.slice(-10);
    const historyBlock =
      recentHistory.length > 0
        ? recentHistory
            .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
            .join("\n")
        : "";

    // ==============================
    // 📬 GMAIL READ (before diagram — "show my inbox" must not hit DIAGRAM's "show")
    // ==============================
    if (wantsGmailRead(question)) {
      try {
        const { data: settings } = await supabase
          .from("user_settings")
          .select("gmail_user, gmail_app_password")
          .eq("user_id", user.id)
          .single();

        if (!settings?.gmail_user || !settings?.gmail_app_password) {
          return Response.json({
            answer:
              "⚙️ Gmail isn’t configured. Open the sidebar → **Gmail** tab, save your Gmail address and [Google App Password](https://support.google.com/accounts/answer/185833), then ask again.",
          });
        }

        const emails = await getRecentEmails(settings.gmail_user, settings.gmail_app_password, 15);

        if (emails.length === 0) {
          return Response.json({ answer: "📭 Your inbox appears to be empty." });
        }

        const emailList = emails
          .map((e, i) => `${i + 1}. From: ${e.from}\n   Subject: ${e.subject}\n   Date: ${e.date}`)
          .join("\n\n");

        const prompt = `
You are a smart email assistant. Here are the user's latest Gmail messages:

${emailList}

${historyBlock ? `Conversation so far:\n${historyBlock}\n` : ""}
User question: ${question}

Give a concise, helpful summary:
- 🔴 Any urgent or important emails (meetings, deadlines, action items)
- 📬 Key senders and what they want
- 📋 Quick summary of overall inbox state

Be clear and structured. Use bullet points where helpful.
`;

        const answer = await askGroq(prompt);
        return Response.json({ answer });
      } catch (gmailErr: unknown) {
        const msg = gmailErr instanceof Error ? gmailErr.message : "Unknown error";
        console.error("GMAIL IMAP ERROR:", msg);
        return Response.json({ answer: `❌ Couldn't read Gmail: ${msg}` });
      }
    }

    // ==============================
    // 📊 DIAGRAM / MERMAID INTENT
    // ==============================
    if (DIAGRAM_INTENT.test(question)) {
      let ragContext = "";
      try {
        if (FILE_DIAGRAM_INTENT.test(question)) {
          const { data: allChunks } = await supabase
            .from("documents")
            .select("content, file_name, chunk_index")
            .eq("user_id", user.id)
            .order("file_name", { ascending: true })
            .order("chunk_index", { ascending: true })
            .limit(60);

          if (allChunks && allChunks.length > 0) {
            ragContext = allChunks
              .map(
                (d: { content: string; file_name: string }) =>
                  `[Source: ${d.file_name}]\n${d.content}`
              )
              .join("\n\n---\n\n");
          }
        } else {
          const embeddings = await embed([question]);
          let queryEmbedding = embeddings[0];
          if (Array.isArray(queryEmbedding[0])) queryEmbedding = queryEmbedding[0];

          const { data: ragData } = await supabase.rpc("match_documents", {
            query_embedding: queryEmbedding,
            match_count: 12,
            filter_user_id: user.id,
          });

          if (ragData && ragData.length > 0) {
            ragContext = ragData
              .map(
                (d: { content: string; file_name: string }) =>
                  `[Source: ${d.file_name}]\n${d.content}`
              )
              .join("\n\n---\n\n");
          }
        }
      } catch {
        // RAG failure is non-fatal — diagram can still be generated from general knowledge
      }

      const diagramPrompt = `
You are an expert in Mermaid.js diagram syntax (v11). The user wants a diagram.
${ragContext ? `Use the following data extracted from their uploaded file(s) to build the diagram:\n\n${ragContext}\n\n` : ""}
Generate a valid Mermaid.js diagram that accurately represents what the user asked for.

${historyBlock ? `Conversation history:\n${historyBlock}\n` : ""}
User request: ${question}

=== STRICT SYNTAX RULES — violating these WILL cause a parse error ===

1. FLOWCHART ARROWS — use ONLY these in flowchart/graph diagrams:
   ✅  A --> B           (solid arrow)
   ✅  A -- label --> B  (labeled arrow)
   ✅  A -.-> B          (dotted arrow)
   ✅  A ==> B           (thick arrow)
   ❌  A ->> B           FORBIDDEN in flowcharts
   ❌  A -->> B          FORBIDDEN in flowcharts

2. RESERVED KEYWORDS — NEVER use these as bare node identifiers:
   ❌  --> end            FORBIDDEN
   ❌  --> start          FORBIDDEN
   ✅  --> EndNode[End]   Use a labelled node instead

3. NODE LABEL TEXT rules:
   ❌  A[**Bold text**]              FORBIDDEN
   ❌  A[India Refunds (site.com)]  FORBIDDEN — parentheses inside [ ] break parsing
   ✅  A[India Refunds site.com]    Replace ( ) with spaces
   ❌  A[Very long label text that goes on and on]  Keep labels SHORT (under 40 chars)

4. UNIQUE NODE IDs — every node identifier must be unique.

5. OUTPUT FORMAT — return ONLY:
\`\`\`mermaid
<your mermaid code here>
\`\`\`
Then 1-2 sentences explaining the diagram. No other text before the code block.

6. SUPPORTED TYPES: flowchart, sequenceDiagram, erDiagram, mindmap, classDiagram, gantt, pie, gitGraph

CORRECT flowchart example:
\`\`\`mermaid
flowchart TD
    StartNode[Start] --> B{Valid?}
    B -- Yes --> C[Dashboard]
    B -- No --> D[Retry]
    C --> EndNode[End]
\`\`\`
`;

      const answer = await askGroq(diagramPrompt);
      return Response.json({ answer });
    }

    // ==============================
    // 📧 EMAIL SEND INTENT
    // ==============================
    if (EMAIL_INTENT.test(question)) {
      const extractionPrompt = `
You are a helpful assistant. The user wants to send an email.
Extract the email details from their message using the conversation history for context if needed.

Return ONLY valid JSON in this exact format:
{
  "to": "recipient@example.com",
  "subject": "Subject line here",
  "body": "Email body here",
  "can_extract": true,
  "reason": ""
}

If you cannot extract a recipient email address, set "can_extract" to false and provide a helpful "reason".
If subject or body is missing, use a sensible default.

Recent history:
${historyBlock || "No history"}

User message: "${question}"

JSON:`;

      const raw = await askGroq(extractionPrompt, { temperature: 0 });
      let to = "",
        subject = "",
        body = "";

      try {
        const jsonMatch = raw?.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found");
        const parsed = JSON.parse(jsonMatch[0]);

        if (parsed.can_extract === false) {
          return Response.json({
            answer: `I couldn't send that email: ${parsed.reason || "Missing details"}. You can type \`/email\` to open the manual compose form.`,
          });
        }

        to = parsed.to;
        subject = parsed.subject;
        body = parsed.body;

        if (!to || !to.includes("@")) throw new Error("Invalid or missing recipient email");
        if (!subject) subject = "Hello";
        if (!body) body = question;
      } catch (parseErr) {
        console.error("Email extraction failed:", parseErr, "Raw:", raw);

        const emailMatch = question.match(
          /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i
        );
        if (emailMatch) {
          to = emailMatch[0];
          subject = "Hello";
          body = question;
        } else {
          return Response.json({
            answer:
              'I couldn\'t understand the email details. Please specify a recipient (e.g., "Send an email to name@email.com") or type `/email` to use the manual form.',
          });
        }
      }

      try {
        const metadata = user?.user_metadata;
        const userName = (
          metadata?.full_name ||
          metadata?.name ||
          metadata?.display_name ||
          ""
        )?.trim();
        await sendEmail(to, subject, body, userName || undefined);
        return Response.json({ answer: `✅ Email sent to **${to}**.` });
      } catch (emailErr: unknown) {
        const msg = emailErr instanceof Error ? emailErr.message : "Unknown error";
        console.error("Email send failed:", msg);
        return Response.json({ answer: `Failed to send email: ${msg}` });
      }
    }

    // ==============================
    // 🔍 RAG PIPELINE
    // ==============================

    const embeddings = await embed([question]);
    let queryEmbedding = embeddings[0];
    if (Array.isArray(queryEmbedding[0])) {
      queryEmbedding = queryEmbedding[0];
    }

    const { data, error } = await supabase.rpc("match_documents", {
      query_embedding: queryEmbedding,
      match_count: 12,
      filter_user_id: user.id,
    });

    if (error) {
      console.error("Supabase RPC error:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      const generalPrompt = `
You are Donna, a helpful AI workspace assistant. The user hasn't uploaded any documents relevant to this question.

Answer based on your general knowledge. Be helpful, concise, and accurate.
If the question seems to be about a specific document, let them know they can upload files for better answers.

${historyBlock ? `Conversation history:\n${historyBlock}\n` : ""}
User: ${question}

Answer:`;
      const answer = await askGroq(generalPrompt);
      return Response.json({ answer });
    }

    const context = data
      .map((d: { content: string; file_name: string }) => `[Source: ${d.file_name}]\n${d.content}`)
      .join("\n\n---\n\n");

    const prompt = `Answer the user's question using the document context below. Prioritize information from the documents, but you may supplement with general knowledge when helpful.

Rules:
- Include every relevant fact from the context that answers the question
- Mention source file names when citing specific information
- Don't repeat the same point — be concise
- Use markdown formatting when it improves readability
- If the specific answer isn't in the documents, say so and offer what you can from general knowledge
- Maintain conversation continuity using the history below

${historyBlock ? `## Conversation History\n${historyBlock}\n` : ""}
## Document Context
${context}

## Question
${question}

## Answer:`;

    const answer = await askGroq(prompt);
    return Response.json({ answer });
  } catch (e: unknown) {
    console.error("QUERY ERROR:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
