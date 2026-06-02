// zn-kener fork (cpq-cornerstone-9): delete a subscriber (by method id).
// DELETE /api/v4/subscribers/{id}  -> remove subscriber method + subscriptions (subscribers.write)
import { json, type RequestHandler } from "@sveltejs/kit";
import { AdminDeleteSubscriber } from "$lib/server/controllers/userSubscriptionsController";
import type { BadRequestResponse } from "$lib/types/api";

function parseId(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export const DELETE: RequestHandler = async ({ params }) => {
  const id = parseId(params.id);
  if (id === null) {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Valid subscriber (method) id is required" } };
    return json(err, { status: 400 });
  }
  const result = await AdminDeleteSubscriber(id);
  if (!result.success) {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: result.error || "Failed to delete subscriber" } };
    return json(err, { status: result.error === "Subscriber not found" ? 404 : 400 });
  }
  return json({ message: `Subscriber '${id}' deleted successfully` });
};
