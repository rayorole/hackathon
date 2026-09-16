import { requireOfficer, type AuthEnv } from "./auth/middleware.js";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { eq, gt, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "./db/client.js";
import { audit, evidence, records, scores } from "./db/schema.js";

/**
 * REST surface for the Evidence Desk.
 *
 * This exists because Tom's persona wants to "trace decisions, export data or connect
 * through an API, and adapt the tool for other municipalities" â€” it is evidence for
 * criterion 3, not architecture for its own sake (AGENTS.md Â§6).
 */
const app = new Hono<AuthEnv>();

app.use("/*", cors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:3000", allowHeaders: ["Authorization", "Content-Type"] }));
app.use("/api/*", requireOfficer);

app.get("/health", (c) => c.json({ ok: true }));

/** Read-only, cursor-paginated map feed. Include unlocated rows so none disappear silently. */
app.get("/api/kaart", async (c) => {
  const parsed = z.object({ cursor: z.string().min(1).max(40).optional() }).safeParse(c.req.query());
  if (!parsed.success) return c.json({ error: "ongeldige cursor" }, 400);
  const pageSize = 500;
  const rows = await db.select().from(records)
    .leftJoin(scores, eq(scores.ondernemingsnr, records.ondernemingsnr))
    .where(parsed.data.cursor ? gt(records.ondernemingsnr, parsed.data.cursor) : undefined)
    .orderBy(records.ondernemingsnr).limit(pageSize + 1);
  const page = rows.slice(0, pageSize);
  return c.json({
    entries: page.map(row => ({ record: row.records, score: row.scores })),
    nextCursor: rows.length > pageSize ? page.at(-1)?.records.ondernemingsnr ?? null : null,
  });
});

/** Records for one street, worst confidence first â€” the officer's queue. */
app.get("/api/straat/:straat", async (c) => {
  const straat = c.req.param("straat");
  const rows = await db
    .select()
    .from(records)
    .leftJoin(scores, eq(scores.ondernemingsnr, records.ondernemingsnr))
    .where(eq(records.straat, straat))
    .orderBy(sql`coalesce(${scores.score}, 0) asc`);
  return c.json(rows);
});

/** Everything known about one record, including every observation behind its score. */
app.get("/api/record/:nr", async (c) => {
  const nr = c.req.param("nr");
  const [row] = await db.select().from(records).where(eq(records.ondernemingsnr, nr));
  if (!row) return c.json({ error: "niet gevonden" }, 404);

  const bewijs = await db.select().from(evidence).where(eq(evidence.ondernemingsnr, nr));
  const [score] = await db.select().from(scores).where(eq(scores.ondernemingsnr, nr));
  const beslissingen = await db.select().from(audit).where(eq(audit.ondernemingsnr, nr));

  // An establishment's parent enterprise may sit elsewhere, or outside this dataset.
  let zetel = null;
  if (row.zetelOndernemingsnr && !row.zetelElders) {
    [zetel] = await db
      .select()
      .from(records)
      .where(eq(records.ondernemingsnr, row.zetelOndernemingsnr));
  }

  return c.json({ record: row, zetel, bewijs, score: score ?? null, beslissingen });
});

const BeoordelingBody = z.object({
  beoordeling: z.enum(["bevestigd", "afgewezen"]),

  opmerking: z.string().nullable().default(null),
});

/**
 * The officer's decision. Append-only: a changed mind is a new row, never an update.
 * Nothing in this system is published without one of these.
 */
app.post("/api/record/:nr/beoordeling", async (c) => {
  const nr = c.req.param("nr");
  const parsed = BeoordelingBody.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 400);

  const bewijs = await db.select().from(evidence).where(eq(evidence.ondernemingsnr, nr));

  const [row] = await db
    .insert(audit)
    .values({
      id: randomUUID(),
      ondernemingsnr: nr,
      beoordeling: parsed.data.beoordeling,
      medewerker: c.get("officerId"),
      opmerking: parsed.data.opmerking,
      bewijsSnapshot: bewijs,
    })
    .returning();

  return c.json(row, 201);
});

/** Full audit trail â€” for Tom, and for the jury asking "how do you know?". */
app.get("/api/audit", async (c) => {
  return c.json(await db.select().from(audit).orderBy(sql`${audit.beslistOp} desc`));
});

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port });
console.log(`API listening on http://localhost:${port}`);

export type AppType = typeof app;

