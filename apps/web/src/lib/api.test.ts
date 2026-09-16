import assert from "node:assert/strict";
import test from "node:test";
import { apiFetch } from "./api";

test("map requests remain same-origin despite an obsolete API URL", async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.NEXT_PUBLIC_API_URL;
  const controller = new AbortController();
  process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001";
  let requested = false;
  globalThis.fetch = async (url, init) => {
    requested = true;
    assert.equal(url, "/api/locations");
    assert.equal(init?.signal, controller.signal);
    assert.equal(init?.cache, "no-store");
    assert.equal(new Headers(init?.headers).has("Authorization"), false);
    return Response.json({ "000123": [4.5, 51.25] });
  };
  try {
    assert.deepEqual(
      await (
        await apiFetch("/api/locations", { signal: controller.signal })
      ).json(),
      { "000123": [4.5, 51.25] },
    );
    assert.ok(requested);
    await assert.rejects(
      apiFetch("https://example.com/api/locations"),
      /Invalid API path/,
    );
    await assert.rejects(
      apiFetch("//example.com/api/locations"),
      /Invalid API path/,
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = originalUrl;
  }
});

test("map requests preserve canonical error messages", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Uw account heeft nog geen toegang als medewerker.",
        },
      },
      { status: 403 },
    );
  try {
    await assert.rejects(
      apiFetch("/api/locations"),
      /Uw account heeft nog geen toegang/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
