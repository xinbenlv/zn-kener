// zn-kener fork (cpq-cornerstone-9): subscriber management.
// GET  /api/v4/subscribers  -> list (paginated) + per-method counts (subscribers.read)
// POST /api/v4/subscribers  -> admin-add an email subscriber (subscribers.write)
import { json, type RequestHandler } from "@sveltejs/kit";
import {
  GetAdminSubscribersPaginated,
  AdminAddSubscriber,
  GetSubscriberCountsByMethod,
} from "$lib/server/controllers/userSubscriptionsController";
import type { CreateSubscriberRequest, BadRequestResponse } from "$lib/types/api";

export const GET: RequestHandler = async ({ url }) => {
  const page = Number(url.searchParams.get("page")) || 1;
  const limit = Number(url.searchParams.get("limit")) || 50;
  const result = await GetAdminSubscribersPaginated(page, limit);
  const counts = await GetSubscriberCountsByMethod();
  return json({
    subscribers: result.subscribers,
    counts,
    pagination: { total: result.total, total_pages: result.totalPages, page: result.page, limit: result.limit },
  });
};

export const POST: RequestHandler = async ({ request }) => {
  let body: CreateSubscriberRequest;
  try {
    body = await request.json();
  } catch {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } };
    return json(err, { status: 400 });
  }
  if (!body.email || typeof body.email !== "string") {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "email is required" } };
    return json(err, { status: 400 });
  }
  // userController signature: AdminAddSubscriber(email, incidents, maintenances)
  const result = await AdminAddSubscriber(body.email, body.incidents ?? true, body.maintenances ?? true);
  if (!result.success) {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: result.error || "Failed to add subscriber" } };
    return json(err, { status: 400 });
  }
  return json({ subscriber: result.subscriber }, { status: 201 });
};
