import { createClient } from "./supabase/client";
export async function apiFetch(path: string, init: RequestInit = {}) {
  if (!path.startsWith("/api/")) throw new Error("Invalid API path");
  const { data: { session } } = await createClient().auth.getSession();
  if (!session) throw new Error("Niet aangemeld");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}${path}`, { ...init, headers });
  if (!response.ok) throw new Error(`API: ${response.status}`);
  return response;
}
