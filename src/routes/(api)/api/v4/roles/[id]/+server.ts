// zn-kener fork (cpq-cornerstone-8): single-role operations.
// GET    /api/v4/roles/{id}  -> role permissions + users (roles.read)
// PATCH  /api/v4/roles/{id}  -> update role and/or its permissions (roles.write)
// DELETE /api/v4/roles/{id}  -> delete role (roles.write); ?migrate_to=<roleId> to migrate users
import { json, type RequestHandler } from "@sveltejs/kit";
import {
  GetRolePermissions,
  GetRoleUsers,
  UpdateRole,
  UpdateRolePermissions,
  DeleteRole,
} from "$lib/server/controllers/userController";
import type { UpdateRoleRequest, BadRequestResponse } from "$lib/types/api";

export const GET: RequestHandler = async ({ params }) => {
  const id = params.id!;
  const [permissions, users] = await Promise.all([GetRolePermissions(id), GetRoleUsers(id)]);
  return json({ role: { id, permissions, users } });
};

export const PATCH: RequestHandler = async ({ params, request }) => {
  const id = params.id!;
  let body: UpdateRoleRequest;
  try {
    body = await request.json();
  } catch {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } };
    return json(err, { status: 400 });
  }

  try {
    if (body.role_name !== undefined || body.status !== undefined) {
      // userController signature: UpdateRole(roleId, { name?, status? })
      await UpdateRole(id, { name: body.role_name, status: body.status });
    }
    if (Array.isArray(body.permission_ids)) {
      await UpdateRolePermissions(id, body.permission_ids);
    }
    const permissions = await GetRolePermissions(id);
    return json({ role: { id, permissions } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update role";
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message } };
    return json(err, { status: 400 });
  }
};

export const DELETE: RequestHandler = async ({ params, url }) => {
  const id = params.id!;
  const migrateTo = url.searchParams.get("migrate_to");
  try {
    // DeleteRole(roleId, { action: "remove" } | { action: "migrate", targetRoleId })
    if (migrateTo) {
      await DeleteRole(id, { action: "migrate", targetRoleId: migrateTo });
    } else {
      await DeleteRole(id, { action: "remove" });
    }
    return json({ message: `Role '${id}' deleted successfully` });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete role";
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message } };
    return json(err, { status: 400 });
  }
};
