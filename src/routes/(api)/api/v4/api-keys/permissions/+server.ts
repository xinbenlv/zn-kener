// zn-kener fork (cpq-cornerstone-3): permission catalog for scoping API keys.
// GET /api/v4/api-keys/permissions -> list assignable permission ids (api_keys.read)
//
// A static-route file (`permissions`) takes precedence over the sibling
// dynamic `[id]` route, so this does not collide with /api/v4/api-keys/{id}.
import { json, type RequestHandler } from "@sveltejs/kit";
import { permissions } from "$lib/allPerms";
import type { GetPermissionsResponse } from "$lib/types/api";

export const GET: RequestHandler = async () => {
  const response: GetPermissionsResponse = {
    permissions: permissions.map((p) => ({ id: p.id, permission_name: p.permission_name })),
  };
  return json(response);
};
