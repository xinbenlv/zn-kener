// zn-kener fork (cpq-cornerstone-9): toggle a subscriber's subscription to an event type.
// PATCH /api/v4/subscribers/{id}/subscriptions  body {event_type, enabled} (subscribers.write)
//   id = subscriber method id; event_type = "incidents" | "maintenances".
import { json, type RequestHandler } from "@sveltejs/kit";
import { AdminUpdateSubscriptionStatus } from "$lib/server/controllers/userSubscriptionsController";
import type { UpdateSubscriptionRequest, BadRequestResponse } from "$lib/types/api";

function parseId(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export const PATCH: RequestHandler = async ({ params, request }) => {
  const id = parseId(params.id);
  if (id === null) {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Valid subscriber (method) id is required" } };
    return json(err, { status: 400 });
  }
  let body: UpdateSubscriptionRequest;
  try {
    body = await request.json();
  } catch {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } };
    return json(err, { status: 400 });
  }
  if (body.event_type !== "incidents" && body.event_type !== "maintenances") {
    const err: BadRequestResponse = {
      error: { code: "BAD_REQUEST", message: "event_type must be one of: incidents, maintenances" },
    };
    return json(err, { status: 400 });
  }
  if (typeof body.enabled !== "boolean") {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "enabled (boolean) is required" } };
    return json(err, { status: 400 });
  }
  const result = await AdminUpdateSubscriptionStatus(id, body.event_type, body.enabled);
  if (!result.success) {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: result.error || "Failed to update subscription" } };
    return json(err, { status: 400 });
  }
  return json({ message: `Subscription '${body.event_type}' for subscriber '${id}' set to ${body.enabled ? "ACTIVE" : "INACTIVE"}` });
};
