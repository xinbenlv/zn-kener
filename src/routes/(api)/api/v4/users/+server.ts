// zn-kener fork (cpq-cornerstone-8): user management.
// GET  /api/v4/users  -> list users (paginated) (users.read)
// POST /api/v4/users  -> invite a new user (users.write)
import { json, type RequestHandler } from "@sveltejs/kit";
import { GetAllUsersPaginatedDashboard, SendInvitationEmail } from "$lib/server/controllers/userController";
import type { CreateUserInviteRequest, BadRequestResponse } from "$lib/types/api";

export const GET: RequestHandler = async ({ url }) => {
  const page = Number(url.searchParams.get("page")) || 1;
  const limit = Number(url.searchParams.get("limit")) || 50;
  const users = await GetAllUsersPaginatedDashboard({ page, limit });
  return json({ users, pagination: { page, limit } });
};

export const POST: RequestHandler = async ({ request }) => {
  let body: CreateUserInviteRequest;
  try {
    body = await request.json();
  } catch {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } };
    return json(err, { status: 400 });
  }
  if (!body.email || !body.name || !Array.isArray(body.role_ids) || body.role_ids.length === 0) {
    const err: BadRequestResponse = {
      error: { code: "BAD_REQUEST", message: "email, name, and a non-empty role_ids[] are required" },
    };
    return json(err, { status: 400 });
  }
  try {
    // userController signature is positional: (email, role_ids, name)
    await SendInvitationEmail(body.email, body.role_ids, body.name);
    return json({ message: `Invitation sent to ${body.email}` }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to invite user";
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message } };
    return json(err, { status: 400 });
  }
};
