// zn-kener carried patch (cpq-cornerstone-2): per-key RBAC resolver.
//
// Maps an authenticated API route (path + HTTP method) to the permission id it
// requires, and decides whether a given key's permission set satisfies it.
//
// Resource is derived from the first path segment after the optional version
// prefix; action is derived from the HTTP method (read for GET/HEAD, write for
// mutations, with api_keys DELETE -> api_keys.delete). This mirrors the
// resource.action ids in src/lib/allPerms.ts.

import { permissions } from "../allPerms.js";

// Canonical set of permission ids, derived from the upstream permissions table
// so this fork file stays in sync without editing the upstream module.
export const allPermissionIds: string[] = permissions.map((p) => p.id);

// First path segment (or alias) -> permission resource prefix used in allPerms.
const SEGMENT_TO_RESOURCE: Record<string, string> = {
  monitors: "monitors",
  incidents: "incidents",
  maintenances: "maintenances",
  pages: "pages",
  triggers: "triggers",
  alerts: "alerts",
  "monitor-alerts": "alerts",
  "alert-configs": "alerts",
  users: "users",
  roles: "roles",
  permissions: "roles",
  "api-keys": "api_keys",
  site: "settings",
  "site-data": "settings",
  settings: "settings",
  subscribers: "subscribers",
  subscriptions: "subscribers",
  "email-templates": "email_templates",
  images: "images",
};

// Public API paths require no permission (and are not key-gated upstream either).
const PUBLIC_SEGMENTS = new Set(["status", "version"]);

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Resolve the permission id required to call an API route.
 * Returns:
 *   - a permission id string (e.g. "monitors.write") when one is required
 *   - null when the route is public / has no matching permission gate
 */
export function requiredPermissionFor(pathname: string, method: string): string | null {
  // Strip leading /api and an optional /vN segment, capture the first segment.
  const match = pathname.match(/^\/api\/(?:v\d+\/)?([^/?]+)/);
  if (!match) return null;
  const segment = match[1].toLowerCase();

  if (PUBLIC_SEGMENTS.has(segment)) return null;

  const resource = SEGMENT_TO_RESOURCE[segment];
  if (!resource) return null; // unknown segment -> no extra gate (auth still applies)

  const m = method.toUpperCase();
  // api_keys has a dedicated delete permission upstream.
  if (resource === "api_keys" && m === "DELETE" && allPermissionIds.includes("api_keys.delete")) {
    return "api_keys.delete";
  }

  const action = READ_METHODS.has(m) ? "read" : "write";
  const primary = `${resource}.${action}`;
  if (allPermissionIds.includes(primary)) return primary;

  // Fallback: some resources (e.g. images) only define a write permission.
  const writeId = `${resource}.write`;
  if (allPermissionIds.includes(writeId)) return writeId;

  return null;
}

/**
 * Does a key with the given permission set satisfy `required`?
 * A null/undefined permission set means a legacy / full-access key.
 */
export function keySatisfies(keyPermissions: string[] | null | undefined, required: string | null): boolean {
  if (required === null) return true; // public / ungated route
  if (keyPermissions === null || keyPermissions === undefined) return true; // full-access key
  return keyPermissions.includes(required);
}

/**
 * Parse the raw `permissions` column value (JSON string | null) into a
 * validated permission-id array, or null for a full-access key.
 */
export function parseKeyPermissions(raw: unknown): string[] | null {
  if (raw === null || raw === undefined || raw === "") return null;
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null; // unparseable -> treat as full access rather than lock out
    }
  }
  if (!Array.isArray(parsed)) return null;
  return parsed.filter((p): p is string => typeof p === "string" && allPermissionIds.includes(p));
}

/**
 * Validate a requested permission list for a NEW key. Throws on any unknown id.
 * Returns a de-duplicated array, or null when no scope was requested
 * (full-access key, preserving upstream behavior).
 */
export function validateRequestedPermissions(requested: unknown): string[] | null {
  if (requested === null || requested === undefined) return null;
  if (!Array.isArray(requested)) {
    throw new Error("permissions must be an array of permission ids");
  }
  if (requested.length === 0) return null; // empty -> full access (explicit opt-out of scoping)
  const out = new Set<string>();
  for (const p of requested) {
    if (typeof p !== "string" || !allPermissionIds.includes(p)) {
      throw new Error(`unknown permission id: ${String(p)}`);
    }
    out.add(p);
  }
  return [...out];
}
