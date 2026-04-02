const baseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "";

/**
 * In dev you can use relative URLs like `/api/query`.
 * In a standalone EAS build there is no Metro server at localhost,
 * so you must set `EXPO_PUBLIC_API_BASE_URL` to your deployed API host.
 */
export function apiUrl(path: string): string {
  if (!baseUrl) return path;

  const trimmedBase = baseUrl.replace(/\/+$/, "");
  const trimmedPath = path.startsWith("/") ? path : `/${path}`;
  return `${trimmedBase}${trimmedPath}`;
}

