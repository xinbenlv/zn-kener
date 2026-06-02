import { json, type Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { ResolveAPIKey } from "$lib/server/controllers/apiController";
import db from "$lib/server/db/db";
import type { UnauthorizedResponse, NotFoundResponse } from "$lib/types/api";
import { GetMonitorsParsed } from "$lib/server/controllers/monitorsController";
import { requiredPermissionFor, keySatisfies } from "$lib/server/apiPermissions";

const API_PATH_PREFIX = "/api/";

// Paths that don't require authentication. /api/version (and the versioned
// alias) is public so build provenance can be probed without a key — zn-kener.
const PUBLIC_API_PATHS = ["/api/status", "/api/version", "/api/v4/version"];

// Regex to match routes with monitor_tag parameter
const MONITOR_TAG_ROUTE_REGEX = /^\/api\/(?:v\d+\/)?monitors\/([^/]+)/;

// Regex to match routes with incident_id parameter
const INCIDENT_ID_ROUTE_REGEX = /^\/api\/(?:v\d+\/)?incidents\/(\d+)/;

// Regex to match routes with maintenance_id parameter
const MAINTENANCE_ID_ROUTE_REGEX = /^\/api\/(?:v\d+\/)?maintenances\/(\d+)/;

// Regex to match routes with page_path parameter
const PAGE_PATH_ROUTE_REGEX = /^\/api\/(?:v\d+\/)?pages\/([^/]+)/;

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith(API_PATH_PREFIX);
}

function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PATHS.some((path) => pathname === path || pathname === path + "/");
}

function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
    return parts[1];
  }
  return null;
}

function extractMonitorTag(pathname: string): string | null {
  const match = pathname.match(MONITOR_TAG_ROUTE_REGEX);
  return match ? match[1] : null;
}

function extractIncidentId(pathname: string): number | null {
  const match = pathname.match(INCIDENT_ID_ROUTE_REGEX);
  return match ? parseInt(match[1], 10) : null;
}

function extractMaintenanceId(pathname: string): number | null {
  const match = pathname.match(MAINTENANCE_ID_ROUTE_REGEX);
  return match ? parseInt(match[1], 10) : null;
}

function extractPagePath(pathname: string): string | null {
  const match = pathname.match(PAGE_PATH_ROUTE_REGEX);
  return match ? decodeURIComponent(match[1]) : null;
}

// Content types that indicate a form submission (mirrors SvelteKit's internal CSRF check scope)
const FORM_CONTENT_TYPES = ["application/x-www-form-urlencoded", "multipart/form-data", "text/plain"];

function isFormContentType(request: Request): boolean {
  const type = request.headers.get("content-type")?.split(";", 1)[0].trim()?.toLowerCase() ?? "";
  return FORM_CONTENT_TYPES.includes(type);
}

// Custom CSRF handler: validates Origin when present, allows requests when absent.
// When Origin is absent (e.g. Referrer-Policy: no-referrer), security relies on
// SameSite=Lax cookies which prevent cross-site POST from carrying auth cookies.
const csrfHandle: Handle = async ({ event, resolve }) => {
  const { request } = event;

  if (
    isFormContentType(request) &&
    (request.method === "POST" || request.method === "PUT" || request.method === "PATCH" || request.method === "DELETE")
  ) {
    const requestOrigin = request.headers.get("origin");
    if (requestOrigin && requestOrigin !== "null") {
      const requestHost = new URL(requestOrigin).host;
      const expectedHost = event.url.host;
      if (requestHost !== expectedHost) {
        return new Response(`Cross-site ${request.method} form submissions are forbidden`, { status: 403 });
      }
    }
  }

  return resolve(event);
};

const apiAuthHandle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url;

  // Check if this is an API route that requires authentication
  if (isApiRoute(pathname) && !isPublicApiPath(pathname)) {
    const authHeader = event.request.headers.get("authorization");
    const token = extractBearerToken(authHeader);

    if (!token) {
      const errorResponse: UnauthorizedResponse = {
        error: {
          code: "UNAUTHORIZED",
          message: "Missing or invalid authorization header",
        },
      };
      return json(errorResponse, { status: 401 });
    }

    const resolvedKey = await ResolveAPIKey(token);
    if (!resolvedKey) {
      const errorResponse: UnauthorizedResponse = {
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid API key",
        },
      };
      return json(errorResponse, { status: 401 });
    }
    // Attach the authenticated key for downstream handlers.
    event.locals.apiKey = resolvedKey;

    // RBAC: enforce the key's permission scope for this route + method. A key
    // with permissions === null is a legacy / full-access key and always passes.
    const requiredPermission = requiredPermissionFor(pathname, event.request.method);
    if (!keySatisfies(resolvedKey.permissions, requiredPermission)) {
      const forbiddenResponse: UnauthorizedResponse = {
        error: {
          code: "FORBIDDEN",
          message: `API key lacks required permission: ${requiredPermission}`,
        },
      };
      return json(forbiddenResponse, { status: 403 });
    }

    // Validate monitor tag exists for /api/(vX/)?monitors/:monitor_tag/* routes
    const monitorTag = extractMonitorTag(pathname);
    if (monitorTag) {
      const monitor = await GetMonitorsParsed({ tag: monitorTag }).then((monitors) => monitors[0]);
      if (!monitor) {
        const errorResponse: NotFoundResponse = {
          error: {
            code: "NOT_FOUND",
            message: `Monitor with tag '${monitorTag}' not found`,
          },
        };
        return json(errorResponse, { status: 404 });
      }
      // Store monitor in locals for use in endpoints
      event.locals.monitor = monitor;
    }

    // Validate incident_id exists for /api/(vX/)?incidents/:incident_id/* routes
    const incidentId = extractIncidentId(pathname);
    if (incidentId) {
      const incident = await db.getIncidentById(incidentId);
      if (!incident) {
        const errorResponse: NotFoundResponse = {
          error: {
            code: "NOT_FOUND",
            message: `Incident with id '${incidentId}' not found`,
          },
        };
        return json(errorResponse, { status: 404 });
      }
      // Store incident in locals for use in endpoints
      event.locals.incident = incident;
    }

    // Validate maintenance_id exists for /api/(vX/)?maintenances/:maintenance_id/* routes
    const maintenanceId = extractMaintenanceId(pathname);
    if (maintenanceId) {
      const maintenance = await db.getMaintenanceById(maintenanceId);
      if (!maintenance) {
        const errorResponse: NotFoundResponse = {
          error: {
            code: "NOT_FOUND",
            message: `Maintenance with id '${maintenanceId}' not found`,
          },
        };
        return json(errorResponse, { status: 404 });
      }
      // Store maintenance in locals for use in endpoints
      event.locals.maintenance = maintenance;
    }

    // Validate page_path exists for /api/(vX/)?pages/:page_path/* routes
    const pagePath = extractPagePath(pathname);
    if (pagePath) {
      // zn-kener: the default Home page has an empty page_path (""), which can
      // never appear as a URL segment. The reserved token "~home" addresses it
      // so the Home page is editable via the API (upstream issue #716, part 1).
      const lookupPath = pagePath === "~home" ? "" : pagePath;
      const page = await db.getPageByPath(lookupPath);
      if (!page) {
        const errorResponse: NotFoundResponse = {
          error: {
            code: "NOT_FOUND",
            message: `Page with path '${pagePath}' not found`,
          },
        };
        return json(errorResponse, { status: 404 });
      }
      // Store page in locals for use in endpoints
      event.locals.page = page;
    }
  }

  const response = await resolve(event);
  response.headers.delete("Link");
  return response;
};

export const handle = sequence(csrfHandle, apiAuthHandle);
