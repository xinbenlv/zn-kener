// zn-kener fork (patch-feat-pr4-xinbenlv): functional tests for the API auth +
// RBAC layer. These drive the REAL request hook (src/hooks.server.ts) end to
// end, mocking only the boundaries it reaches out to (key resolution + DB), so
// we exercise the actual 401/403/404/200 decision paths a client would hit.
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks for the boundaries the hook touches --------------------------------
// Replace SvelteKit's sequence() with a plain left-to-right composition. The
// real sequence() reaches into an async-local request store that only exists
// inside a live request; the fork logic we care about lives in the auth handler
// it composes, not in that glue. Each handler receives a resolve() that advances
// to the next; the final resolve() is the test's.
vi.mock("@sveltejs/kit/hooks", () => ({
  sequence: (...handlers: Array<(input: any) => any>) => {
    return ({ event, resolve }: any) => {
      const run = (i: number): any =>
        i >= handlers.length ? resolve(event) : handlers[i]({ event, resolve: () => run(i + 1) });
      return run(0);
    };
  },
}));
vi.mock("$lib/server/controllers/apiController", () => ({
  ResolveAPIKey: vi.fn(),
}));
vi.mock("$lib/server/db/db", () => ({
  default: {
    getPageByPath: vi.fn(),
    getIncidentById: vi.fn(),
    getMaintenanceById: vi.fn(),
  },
}));
vi.mock("$lib/server/controllers/monitorsController", () => ({
  GetMonitorsParsed: vi.fn(),
}));

import { handle } from "../../src/hooks.server";
import { ResolveAPIKey } from "$lib/server/controllers/apiController";
import db from "$lib/server/db/db";

const resolveKey = ResolveAPIKey as unknown as ReturnType<typeof vi.fn>;
const getPageByPath = db.getPageByPath as unknown as ReturnType<typeof vi.fn>;

interface MakeEventOpts {
  method?: string;
  token?: string;
}

function makeEvent(pathname: string, { method = "GET", token }: MakeEventOpts = {}) {
  const url = new URL(`http://localhost${pathname}`);
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  const request = new Request(url, { method, headers });
  return { url, request, locals: {} } as any;
}

// A passthrough resolve() that stands in for SvelteKit routing the request to
// the matched endpoint. Returns 200 so we can tell "auth passed" from a short
// circuit (401/403/404) produced by the hook itself.
function makeResolve() {
  return vi.fn(async () => new Response("ok", { status: 200 }));
}

describe("API auth (src/hooks.server.ts)", () => {
  beforeEach(() => {
    resolveKey.mockReset();
    getPageByPath.mockReset();
  });

  it("returns 401 when no bearer token is supplied on a protected route", async () => {
    const resolve = makeResolve();
    const res = await handle({ event: makeEvent("/api/v4/monitors"), resolve });
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHORIZED");
    expect(resolve).not.toHaveBeenCalled();
    expect(resolveKey).not.toHaveBeenCalled();
  });

  it("returns 401 when the token does not resolve to a key", async () => {
    resolveKey.mockResolvedValue(null);
    const resolve = makeResolve();
    const res = await handle({ event: makeEvent("/api/v4/monitors", { token: "bad" }), resolve });
    expect(res.status).toBe(401);
    expect(resolve).not.toHaveBeenCalled();
  });

  it("lets public paths through with no token and never resolves a key", async () => {
    const resolve = makeResolve();
    const res = await handle({ event: makeEvent("/api/version"), resolve });
    expect(res.status).toBe(200);
    expect(resolve).toHaveBeenCalledOnce();
    expect(resolveKey).not.toHaveBeenCalled();
  });
});

describe("RBAC enforcement (src/hooks.server.ts)", () => {
  beforeEach(() => {
    resolveKey.mockReset();
    getPageByPath.mockReset();
  });

  it("allows a legacy full-access key (permissions: null) to mutate", async () => {
    resolveKey.mockResolvedValue({ id: 1, permissions: null });
    const resolve = makeResolve();
    const res = await handle({ event: makeEvent("/api/v4/monitors", { method: "POST", token: "k" }), resolve });
    expect(res.status).toBe(200);
    expect(resolve).toHaveBeenCalledOnce();
  });

  it("allows a scoped key that holds the required permission", async () => {
    resolveKey.mockResolvedValue({ id: 2, permissions: ["monitors.read"] });
    const resolve = makeResolve();
    const res = await handle({ event: makeEvent("/api/v4/monitors", { method: "GET", token: "k" }), resolve });
    expect(res.status).toBe(200);
    expect(resolve).toHaveBeenCalledOnce();
  });

  it("returns 403 when a scoped key lacks the required permission", async () => {
    resolveKey.mockResolvedValue({ id: 3, permissions: ["monitors.read"] });
    const resolve = makeResolve();
    const res = await handle({ event: makeEvent("/api/v4/monitors", { method: "POST", token: "k" }), resolve });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
    expect(body.error.message).toContain("monitors.write");
    expect(resolve).not.toHaveBeenCalled();
  });

  it("enforces the dedicated api_keys.delete permission", async () => {
    resolveKey.mockResolvedValue({ id: 4, permissions: ["api_keys.read", "api_keys.write"] });
    const resolve = makeResolve();
    const res = await handle({ event: makeEvent("/api/v4/api-keys/k_1", { method: "DELETE", token: "k" }), resolve });
    expect(res.status).toBe(403);
    expect((await res.json()).error.message).toContain("api_keys.delete");
  });
});

describe('"~home" page alias (src/hooks.server.ts)', () => {
  beforeEach(() => {
    resolveKey.mockReset();
    getPageByPath.mockReset();
    resolveKey.mockResolvedValue({ id: 1, permissions: null });
  });

  it("maps the reserved ~home token to the empty page_path of the Home page", async () => {
    getPageByPath.mockResolvedValue({ id: 10, page_path: "" });
    const resolve = makeResolve();
    const res = await handle({ event: makeEvent("/api/v4/pages/~home", { token: "k" }), resolve });
    expect(getPageByPath).toHaveBeenCalledWith("");
    expect(res.status).toBe(200);
    expect(resolve).toHaveBeenCalledOnce();
  });

  it("returns 404 when the addressed page does not exist", async () => {
    getPageByPath.mockResolvedValue(undefined);
    const resolve = makeResolve();
    const res = await handle({ event: makeEvent("/api/v4/pages/does-not-exist", { token: "k" }), resolve });
    expect(getPageByPath).toHaveBeenCalledWith("does-not-exist");
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
    expect(resolve).not.toHaveBeenCalled();
  });
});
