/**
 * Target URL after Google → Supabase → your app (PKCE code exchange in /auth/callback).
 * Must appear in Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
 * (e.g. http://localhost:3000/auth/callback and your production URL).
 *
 * Set NEXT_PUBLIC_SITE_URL so redirectTo matches your Site URL exactly in production.
 */
export function getOAuthRedirectUrl(): string {
  // Always use exact current origin structurally if running client-side (foolproof for Vercel).
  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/callback`;
  }

  // Server-side fallbacks
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_VERCEL_URL ??
    "http://localhost:3000";

  // Vercel omits the protocol in its system env variables
  url = url.startsWith("http") ? url : `https://${url}`;
  url = url.replace(/\/$/, "");

  return `${url}/auth/callback`;
}

/** Pass-through query params for Google’s authorization endpoint (Supabase forwards them). */
export const googleOAuthQueryParams = {
  access_type: "offline",
  prompt: "select_account",
} as const;
