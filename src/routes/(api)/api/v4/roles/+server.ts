// zn-kener fork (cpq-cornerstone-8): role management.
// GET  /api/v4/roles  -> list roles (roles.read)
// POST /api/v4/roles  -> create a role (roles.write)
import { json, type RequestHandler } from "@sveltejs/kit";
import { GetAllRoles, CreateRole, UpdateRolePermissions } from "$lib/server/controllers/userController";
import type { CreateRoleRequest, BadRequestResponse } from "$lib/types/api";

export const GET: RequestHandler = async () => {
  const roles = await GetAllRoles();
  return json({ roles });
};

export const POST: RequestHandler = async ({ request }) => {
  let body: CreateRoleRequest;
  try {
    body = await request.json();
  } catch {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } };
    return json(err, { status: 400 });
  }
  if (!body.id || !body.role_name) {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "id and role_name are required" } };
    return json(err, { status: 400 });
  }
  try {
    // userController signature: CreateRole({ role_id, name })
    const created = await CreateRole({ role_id: body.id, name: body.role_name });
    if (Array.isArray(body.permission_ids) && body.permission_ids.length > 0) {
      await UpdateRolePermissions(created.id, body.permission_ids);
    }
    return json({ role: created }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create role";
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message } };
    return json(err, { status: 400 });
  }
};
