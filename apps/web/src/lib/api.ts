import { api } from "./officer-data";
export async function apiFetch(path: string, init: RequestInit = {}) {
  if (!path.startsWith("/api/")) throw new Error("Invalid API path");
  // Supabase SSR cookies authenticate same-origin Next.js API requests.
  // The server independently verifies the user and trusted officer role.
  return api(path, init);
}
