// zn-kener fork (cpq-cornerstone-8): single-user operations.
// GET   /api/v4/users/{id}  -> get one (users.read)
// PATCH /api/v4/users/{id}  -> update roles and/or active flag (users.write)
import { json, type RequestHandler } from "@sveltejs/kit";
import { GetUserByIDDashboard, ManualUpdateUserData } from "$lib/server/controllers/userController";
import type { UpdateUserRequest, BadRequestResponse, NotFoundResponse } from "$lib/types/api";

function parseId(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export const GET: RequestHandler = async ({ params }) => {
  const id = parseId(params.id);
  if (id === null) {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Valid user id is required" } };
    return json(err, { status: 400 });
  }
  const user = await GetUserByIDDashboard(id);
  if (!user) {
    const err: NotFoundResponse = { error: { code: "NOT_FOUND", message: `User '${id}' not found` } };
    return json(err, { status: 404 });
  }
  return json({ user });
};

export const PATCH: RequestHandler = async ({ params, request }) => {
  const id = parseId(params.id);
  if (id === null) {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Valid user id is required" } };
    return json(err, { status: 400 });
  }
  const existing = await GetUserByIDDashboard(id);
  if (!existing) {
    const err: NotFoundResponse = { error: { code: "NOT_FOUND", message: `User '${id}' not found` } };
    return json(err, { status: 404 });
  }

  let body: UpdateUserRequest;
  try {
    body = await request.json();
  } catch {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } };
    return json(err, { status: 400 });
  }

  try {
    // ManualUpdateUserData dispatches on updateType (one aspect per call).
    if (Array.isArray(body.role_ids)) {
      await ManualUpdateUserData(id, { updateType: "role", role_ids: body.role_ids });
    }
    if (body.is_active !== undefined) {
      await ManualUpdateUserData(id, { updateType: "is_active", is_active: body.is_active });
    }
    const updated = await GetUserByIDDashboard(id);
    return json({ user: updated });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update user";
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message } };
    return json(err, { status: 400 });
  }
};
