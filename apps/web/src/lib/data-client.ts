"use client";
import {
  DataError,
  detailSchema,
  listResponseSchema,
  reviewSchema,
  refreshResponseSchema,
  errorSchema,
  type DataClient,
  type Detail,
  matches,
} from "@straatbeeld/contracts";
import {
  createFixtures,
  fixtureCoverage,
} from "@straatbeeld/contracts/fixtures";
import { applyReview, approvedCsv } from "@straatbeeld/contracts/demo";
const KEY = "straatbeeld-fixtures-v1";
function load(): Detail[] {
  const raw = localStorage.getItem(KEY);
  return raw
    ? JSON.parse(raw).map((d: unknown) => detailSchema.parse(d))
    : createFixtures();
}
function save(details: Detail[]) {
  localStorage.setItem(KEY, JSON.stringify(details));
}
async function json(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok) {
    const result = errorSchema.safeParse(body);
    throw new DataError(
      result.success ? result.data.error.code : "HTTP_ERROR",
      result.success ? result.data.error.message : "Aanvraag mislukt.",
      response.status,
    );
  }
  return body;
}
const fixtures: DataClient = {
  async list(filters) {
    return {
      items: load()
        .map((d) => d.establishment)
        .filter((e) => matches(e, filters)),
      coverage: fixtureCoverage(),
    };
  },
  async detail(id) {
    const d = load().find((d) => d.establishment.id === id);
    if (!d) throw new DataError("NOT_FOUND", "Vestiging niet gevonden.", 404);
    return d;
  },
  async review(request) {
    const all = load(),
      i = all.findIndex((d) =>
        d.establishment.proposals.some((p) => p.id === request.proposalId),
      );
    if (i < 0) throw new DataError("NOT_FOUND", "Voorstel niet gevonden.", 404);
    const result = applyReview(
      all[i],
      request,
      crypto.randomUUID(),
      new Date().toISOString(),
    );
    all[i] = result.detail;
    save(all);
    return result.review;
  },
  async refresh(id) {
    return {
      detail: await fixtures.detail(id),
      refreshed: false,
      messageNl: "Oefenmodus: er is geen externe bron opgehaald.",
    };
  },
  async exportCsv(filters) {
    return approvedCsv(load(), filters);
  },
};
const api: DataClient = {
  async list(filters = {}) {
    return listResponseSchema.parse(
      await json("/api/establishments?" + new URLSearchParams(filters)),
    );
  },
  async detail(id) {
    return detailSchema.parse(
      await json("/api/establishments/" + encodeURIComponent(id)),
    );
  },
  async review(request) {
    return reviewSchema.parse(
      await json("/api/reviews", {
        method: "POST",
        body: JSON.stringify(request),
      }),
    );
  },
  async refresh(id) {
    return refreshResponseSchema.parse(
      await json("/api/establishments/" + encodeURIComponent(id) + "/refresh", {
        method: "POST",
      }),
    );
  },
  async exportCsv(filters = {}) {
    const r = await fetch("/api/export?" + new URLSearchParams(filters), {
      cache: "no-store",
    });
    if (!r.ok) {
      const body = errorSchema.parse(await r.json());
      throw new DataError(body.error.code, body.error.message, r.status);
    }
    return r.text();
  },
};
export const dataClient: DataClient =
  process.env.NEXT_PUBLIC_DATA_MODE === "api" ? api : fixtures;
export function resetDemo() {
  localStorage.removeItem(KEY);
}
