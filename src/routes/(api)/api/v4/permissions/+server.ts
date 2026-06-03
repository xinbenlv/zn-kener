// zn-kener fork (cpq-cornerstone-8): full permission catalog (roles context).
// GET /api/v4/permissions -> all permission records (roles.read)
// Distinct from /api/v4/api-keys/permissions, which serves the catalog under
// the api_keys.read scope for key-scoping UIs.
import { json, type RequestHandler } from "@sveltejs/kit";
import { GetAllPermissions } from "$lib/server/controllers/userController";

export const GET: RequestHandler = async () => {
  const permissions = await GetAllPermissions();
  return json({ permissions });
};
