// zn-kener fork (cpq-cornerstone-8): role membership.
// POST   /api/v4/roles/{id}/users  body {user_id} -> add user to role (roles.assign_users)
// DELETE /api/v4/roles/{id}/users  body {user_id} -> remove user from role (roles.assign_users)
import { json, type RequestHandler } from "@sveltejs/kit";
import { AddUserToRole, RemoveUserFromRole } from "$lib/server/controllers/userController";
import type { RoleUserRequest, BadRequestResponse } from "$lib/types/api";

async function readUserId(request: Request): Promise<number | null> {
  try {
    const body = (await request.json()) as RoleUserRequest;
    const n = Number(body.user_id);
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export const POST: RequestHandler = async ({ params, request }) => {
  const roleId = params.id!;
  const userId = await readUserId(request);
  if (userId === null) {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Valid user_id is required" } };
    return json(err, { status: 400 });
  }
  // userController signature: AddUserToRole(roleId, userId)
  await AddUserToRole(roleId, userId);
  return json({ message: `User ${userId} added to role '${roleId}'` }, { status: 201 });
};

export const DELETE: RequestHandler = async ({ params, request }) => {
  const roleId = params.id!;
  const userId = await readUserId(request);
  if (userId === null) {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Valid user_id is required" } };
    return json(err, { status: 400 });
  }
  await RemoveUserFromRole(roleId, userId);
  return json({ message: `User ${userId} removed from role '${roleId}'` });
};
