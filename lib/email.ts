import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendEmail(to: string, subject: string, body: string, userName?: string) {
  const fromEmail = process.env.RESEND_FROM_EMAIL || "no-reply@examgrid.com";
  // Trim and check name
  const name = userName?.trim();
  const from = name ? `${name} <${fromEmail}>` : fromEmail;

  console.log("SENDING EMAIL:", { from, to, subject });

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    text: body,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
