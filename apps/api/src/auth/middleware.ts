import { createClient } from "@supabase/supabase-js";
import { createMiddleware } from "hono/factory";
export type AuthEnv = { Variables: { officerId: string } };
export const requireOfficer = createMiddleware<AuthEnv>(async (c, next) => {
  const token = /^Bearer (\S+)$/i.exec(c.req.header("Authorization") ?? "")?.[1];
  if (!token) return c.json({ error: "Niet aangemeld" }, 401);
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return c.json({ error: "Authenticatie niet geconfigureerd" }, 503);
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return c.json({ error: "Ongeldige sessie" }, 401);
  if (user.is_anonymous || user.app_metadata.role !== "officer") {
    return c.json({ error: "Geen toegang als medewerker" }, 403);
  }
  c.set("officerId", user.id);
  await next();
});
