// zn-kener fork (patch-feat-pr4-xinbenlv): unit tests for the per-key RBAC
// permission resolver. These are pure functions — no DB, no network — and they
// gate every authenticated v4 API call, so they are the highest-value thing to
// cover in the fork.
import { describe, it, expect } from "vitest";
import {
  requiredPermissionFor,
  keySatisfies,
  parseKeyPermissions,
  validateRequestedPermissions,
  allPermissionIds,
} from "$lib/server/apiPermissions";

describe("requiredPermissionFor", () => {
  it("maps GET on a resource to <resource>.read", () => {
    expect(requiredPermissionFor("/api/v4/monitors", "GET")).toBe("monitors.read");
    expect(requiredPermissionFor("/api/v4/incidents", "GET")).toBe("incidents.read");
  });

  it("maps mutating methods to <resource>.write", () => {
    expect(requiredPermissionFor("/api/v4/monitors", "POST")).toBe("monitors.write");
    expect(requiredPermissionFor("/api/v4/monitors/abc/data", "DELETE")).toBe("monitors.write");
    expect(requiredPermissionFor("/api/v4/pages", "PUT")).toBe("pages.write");
    expect(requiredPermissionFor("/api/v4/maintenances", "PATCH")).toBe("maintenances.write");
  });

  it("works without a version prefix", () => {
    expect(requiredPermissionFor("/api/monitors", "GET")).toBe("monitors.read");
    expect(requiredPermissionFor("/api/monitors", "POST")).toBe("monitors.write");
  });

  it("is case-insensitive on the HTTP method", () => {
    expect(requiredPermissionFor("/api/v4/monitors", "get")).toBe("monitors.read");
    expect(requiredPermissionFor("/api/v4/monitors", "post")).toBe("monitors.write");
  });

  it("treats HEAD/OPTIONS as read", () => {
    expect(requiredPermissionFor("/api/v4/monitors", "HEAD")).toBe("monitors.read");
    expect(requiredPermissionFor("/api/v4/monitors", "OPTIONS")).toBe("monitors.read");
  });

  it("gives api_keys DELETE its own dedicated permission", () => {
    expect(requiredPermissionFor("/api/v4/api-keys/k_123", "DELETE")).toBe("api_keys.delete");
    // non-DELETE on api-keys still maps to read/write
    expect(requiredPermissionFor("/api/v4/api-keys", "GET")).toBe("api_keys.read");
    expect(requiredPermissionFor("/api/v4/api-keys", "POST")).toBe("api_keys.write");
  });

  it("falls back to <resource>.write when no read permission exists (images)", () => {
    // images only defines images.write upstream.
    expect(requiredPermissionFor("/api/v4/images", "POST")).toBe("images.write");
    expect(requiredPermissionFor("/api/v4/images", "GET")).toBe("images.write");
  });

  it("resolves segment aliases to the right resource", () => {
    expect(requiredPermissionFor("/api/v4/alert-configs", "GET")).toBe("alerts.read");
    expect(requiredPermissionFor("/api/v4/monitor-alerts", "GET")).toBe("alerts.read");
    expect(requiredPermissionFor("/api/v4/permissions", "GET")).toBe("roles.read");
    expect(requiredPermissionFor("/api/v4/subscriptions", "POST")).toBe("subscribers.write");
    expect(requiredPermissionFor("/api/v4/site", "POST")).toBe("settings.write");
    expect(requiredPermissionFor("/api/v4/site-data", "GET")).toBe("settings.read");
  });

  it("returns null for public segments (status, version)", () => {
    expect(requiredPermissionFor("/api/status", "GET")).toBeNull();
    expect(requiredPermissionFor("/api/version", "GET")).toBeNull();
    expect(requiredPermissionFor("/api/v4/version", "GET")).toBeNull();
  });

  it("returns null for unknown segments and non-api paths", () => {
    expect(requiredPermissionFor("/api/v4/totally-unknown", "GET")).toBeNull();
    expect(requiredPermissionFor("/not-api/monitors", "GET")).toBeNull();
    expect(requiredPermissionFor("/", "GET")).toBeNull();
  });
});

describe("keySatisfies", () => {
  it("always allows a public/ungated route (required === null)", () => {
    expect(keySatisfies(["monitors.read"], null)).toBe(true);
    expect(keySatisfies([], null)).toBe(true);
    expect(keySatisfies(null, null)).toBe(true);
  });

  it("treats null/undefined permission set as full-access (legacy key)", () => {
    expect(keySatisfies(null, "monitors.write")).toBe(true);
    expect(keySatisfies(undefined, "api_keys.delete")).toBe(true);
  });

  it("allows a scoped key only when it holds the required permission", () => {
    expect(keySatisfies(["monitors.write"], "monitors.write")).toBe(true);
    expect(keySatisfies(["monitors.read", "monitors.write"], "monitors.write")).toBe(true);
  });

  it("denies a scoped key that lacks the required permission", () => {
    expect(keySatisfies(["monitors.read"], "monitors.write")).toBe(false);
    expect(keySatisfies([], "monitors.read")).toBe(false);
    expect(keySatisfies(["incidents.write"], "monitors.write")).toBe(false);
  });
});

describe("parseKeyPermissions", () => {
  it("returns null (full access) for null/undefined/empty-string", () => {
    expect(parseKeyPermissions(null)).toBeNull();
    expect(parseKeyPermissions(undefined)).toBeNull();
    expect(parseKeyPermissions("")).toBeNull();
  });

  it("parses a JSON string array and keeps only known ids", () => {
    expect(parseKeyPermissions('["monitors.read","bogus.perm","incidents.write"]')).toEqual([
      "monitors.read",
      "incidents.write",
    ]);
  });

  it("accepts an already-parsed array", () => {
    expect(parseKeyPermissions(["monitors.read"])).toEqual(["monitors.read"]);
  });

  it("drops non-string entries", () => {
    expect(parseKeyPermissions([1, 2, "monitors.read", null])).toEqual(["monitors.read"]);
  });

  it("returns null for unparseable JSON (fail-open to full access, not lock-out)", () => {
    expect(parseKeyPermissions("not json at all")).toBeNull();
  });

  it("returns null when JSON parses to a non-array", () => {
    expect(parseKeyPermissions('{"a":1}')).toBeNull();
  });
});

describe("validateRequestedPermissions", () => {
  it("returns null (full access) for null/undefined/empty-array", () => {
    expect(validateRequestedPermissions(null)).toBeNull();
    expect(validateRequestedPermissions(undefined)).toBeNull();
    expect(validateRequestedPermissions([])).toBeNull();
  });

  it("returns a de-duplicated list of valid ids", () => {
    expect(validateRequestedPermissions(["monitors.read", "monitors.read", "monitors.write"])).toEqual([
      "monitors.read",
      "monitors.write",
    ]);
  });

  it("throws on a non-array", () => {
    expect(() => validateRequestedPermissions("monitors.read")).toThrow(/array/);
  });

  it("throws on a non-string entry", () => {
    expect(() => validateRequestedPermissions([123])).toThrow(/unknown permission id/);
  });

  it("throws on an unknown permission id", () => {
    expect(() => validateRequestedPermissions(["monitors.read", "made.up"])).toThrow(/unknown permission id: made.up/);
  });
});

describe("allPermissionIds", () => {
  it("exposes the canonical permission ids used elsewhere", () => {
    expect(allPermissionIds).toContain("monitors.read");
    expect(allPermissionIds).toContain("monitors.write");
    expect(allPermissionIds).toContain("api_keys.delete");
    expect(allPermissionIds).toContain("roles.assign_permissions");
    // every id is a non-empty string
    expect(allPermissionIds.every((id) => typeof id === "string" && id.length > 0)).toBe(true);
  });
});
