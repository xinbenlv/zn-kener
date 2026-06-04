// zn-kener fork (patch-feat-pr6-xinbenlv): functional tests for the multi-origin
// CSRF allowlist (CSRF_TRUSTED_ORIGINS) in src/hooks.server.ts. These drive the
// REAL request hook, mocking only the boundaries it touches, and exercise the
// 200/403 decision paths a browser form POST would hit across several domains.
import { describe, it, expect, vi, afterEach } from "vitest";

// Replace SvelteKit's sequence() with plain left-to-right composition (same shape
// as the rbac test): the async-local request store it uses only exists in a live
// request, and the logic under test lives in the composed handlers.
vi.mock("@sveltejs/kit/hooks", () => ({
  sequence: (...handlers: Array<(input: any) => any>) => {
    return ({ event, resolve }: any) => {
      const run = (i: number): any =>
        i >= handlers.length ? resolve(event) : handlers[i]({ event, resolve: () => run(i + 1) });
      return run(0);
    };
  },
}));
vi.mock("$lib/server/controllers/apiController", () => ({ ResolveAPIKey: vi.fn() }));
vi.mock("$lib/server/db/db", () => ({
  default: { getPageByPath: vi.fn(), getIncidentById: vi.fn(), getMaintenanceById: vi.fn() },
}));
vi.mock("$lib/server/controllers/monitorsController", () => ({ GetMonitorsParsed: vi.fn() }));

const ORIGINAL = process.env.CSRF_TRUSTED_ORIGINS;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.CSRF_TRUSTED_ORIGINS;
  else process.env.CSRF_TRUSTED_ORIGINS = ORIGINAL;
});

// CSRF_TRUSTED_HOSTS is parsed at module load, so re-import with a fresh registry
// after setting the env to exercise different allowlists.
async function loadHandle(trusted: string | undefined) {
  vi.resetModules();
  if (trusted === undefined) delete process.env.CSRF_TRUSTED_ORIGINS;
  else process.env.CSRF_TRUSTED_ORIGINS = trusted;
  return (await import("../../src/hooks.server")).handle;
}

// A form POST landing on `host`, carrying the given browser Origin header.
function formPost(host: string, origin: string | null, method = "POST") {
  const url = new URL(`https://${host}/account/signin`);
  const headers = new Headers({ "content-type": "application/x-www-form-urlencoded" });
  if (origin) headers.set("origin", origin);
  const hasBody = method !== "GET" && method !== "HEAD";
  const request = new Request(url, { method, headers, body: hasBody ? "email=a&password=b" : undefined });
  return { url, request, locals: {} } as any;
}
const passthrough = vi.fn(async () => new Response("ok", { status: 200 }));

describe("multi-origin CSRF allowlist", () => {
  it("allows a same-host form POST", async () => {
    const handle = await loadHandle(undefined);
    const res = await handle({ event: formPost("status.example.com", "https://status.example.com"), resolve: passthrough });
    expect(res.status).toBe(200);
  });

  it("blocks a cross-host POST when no allowlist is set (single-origin default unchanged)", async () => {
    const handle = await loadHandle(undefined);
    const res = await handle({ event: formPost("app.up.railway.app", "https://status.example.com"), resolve: passthrough });
    expect(res.status).toBe(403);
    const body = await res.text();
    expect(body).toContain("CSRF_TRUSTED_ORIGINS");
    expect(body).toContain("environment-variables.md#multi-origin-deployments");
    expect(body).toContain("https://status.example.com"); // names the offending origin
  });

  it("allows a cross-host POST when the origin is in CSRF_TRUSTED_ORIGINS", async () => {
    const handle = await loadHandle("https://status.example.com,https://app.up.railway.app");
    const res = await handle({ event: formPost("app.up.railway.app", "https://status.example.com"), resolve: passthrough });
    expect(res.status).toBe(200);
  });

  it("accepts a bare-host entry in the allowlist", async () => {
    const handle = await loadHandle("status.example.com");
    const res = await handle({ event: formPost("app.up.railway.app", "https://status.example.com"), resolve: passthrough });
    expect(res.status).toBe(200);
  });

  it("allows a form POST with no Origin header (SameSite cookies are the guard)", async () => {
    const handle = await loadHandle(undefined);
    const res = await handle({ event: formPost("status.example.com", null), resolve: passthrough });
    expect(res.status).toBe(200);
  });

  it("ignores safe methods (GET) regardless of origin", async () => {
    const handle = await loadHandle(undefined);
    const res = await handle({ event: formPost("app.up.railway.app", "https://evil.example.com", "GET"), resolve: passthrough });
    expect(res.status).toBe(200);
  });
});
