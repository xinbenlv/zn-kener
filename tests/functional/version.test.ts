// zn-kener fork (patch-feat-pr4-xinbenlv): functional test for the public
// build-provenance endpoint. Drives the real GET handler of
// src/routes/(api)/api/v4/version/+server.ts and asserts the response contract
// that monitoring/deploy tooling relies on.
import { describe, it, expect } from "vitest";
import { GET } from "../../src/routes/(api)/api/v4/version/+server";

describe("GET /api/v4/version", () => {
  it("returns a JSON build-provenance payload", async () => {
    const res = await (GET as any)({} as any);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");

    const body = await res.json();
    expect(body).toHaveProperty("version");
    expect(body).toHaveProperty("upstream");
    expect(body).toHaveProperty("cpq");
    expect(body.cpq).toHaveProperty("sha");
    expect(body).toHaveProperty("builtAt");
    expect(body).toHaveProperty("branch");
    expect(typeof body.version).toBe("string");
    expect(typeof body.cpq.sha).toBe("string");
  });
});
