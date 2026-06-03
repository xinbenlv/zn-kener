// zn-kener fork (patch-feat-pr4-xinbenlv): unit tests for build provenance.
// getBuildInfo() composes the "<upstream>+cpq.<sha>" version string consumed by
// GET /api/version. The cpq sha / package version are injected at build time via
// Vite `define` (see vite.config.ts) using dynamic import.meta.env access, which
// cannot be toggled at test runtime — so here we lock the *composition rule* as
// an invariant (it holds in both the injected and the un-injected state) and
// verify the un-injected fallback exactly.
import { describe, it, expect } from "vitest";
import { getBuildInfo, buildInfoLine } from "$lib/buildInfo";

describe("getBuildInfo", () => {
  it("returns the documented shape", () => {
    const b = getBuildInfo();
    expect(b).toHaveProperty("version");
    expect(b).toHaveProperty("upstream");
    expect(b).toHaveProperty("cpq.sha");
    expect(b).toHaveProperty("builtAt");
    expect(b).toHaveProperty("branch");
    expect(typeof b.version).toBe("string");
    expect(typeof b.upstream).toBe("string");
    expect(typeof b.cpq.sha).toBe("string");
    expect(typeof b.branch).toBe("string");
  });

  it("falls back to a bare upstream version when no cpq sha is injected", () => {
    const b = getBuildInfo();
    // sha is "dev" in a non-CPQ build (e.g. tests), so version carries no +cpq.
    expect(b.cpq.sha).toBe("dev");
    expect(b.version).toBe(b.upstream);
    expect(b.version).not.toContain("+cpq.");
  });

  it("composes version per the <upstream>(+cpq.<sha>) rule", () => {
    const b = getBuildInfo();
    const expected = b.cpq.sha && b.cpq.sha !== "dev" ? `${b.upstream}+cpq.${b.cpq.sha}` : b.upstream;
    expect(b.version).toBe(expected);
  });
});

describe("buildInfoLine", () => {
  it("renders a human one-liner with the zn-kener brand and upstream linkage", () => {
    const line = buildInfoLine();
    expect(line).toContain("zn-kener v");
    expect(line).toContain("(upstream v");
    expect(line).toContain(getBuildInfo().version);
  });
});
