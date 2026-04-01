import { ImapFlow } from "imapflow";

export interface EmailSummary {
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

export async function getRecentEmails(
  gmailUser: string,
  gmailAppPassword: string,
  maxResults = 15
): Promise<EmailSummary[]> {
  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
    logger: false,
  });

  await client.connect();

  const emails: EmailSummary[] = [];

  try {
    const mailbox = await client.mailboxOpen("INBOX");
    const total = mailbox.exists ?? 0;

    if (total === 0) return [];

    // Fetch the last maxResults messages by sequence range
    const start = Math.max(1, total - maxResults + 1);
    const range = `${start}:${total}`;

    const messages = client.fetch(range, { envelope: true });

    for await (const msg of messages) {
      if (!msg.envelope) continue;
      const envelope = msg.envelope;

      emails.push({
        subject: envelope.subject ?? "(no subject)",
        from: envelope.from?.[0]
          ? `${envelope.from[0].name ?? ""} <${envelope.from[0].address ?? ""}>`.trim()
          : "Unknown",
        date: envelope.date?.toISOString().slice(0, 10) ?? "",
        snippet: "",
      });
    }
  } finally {
    await client.logout();
  }

  // Return newest first
  return emails.reverse();
}
