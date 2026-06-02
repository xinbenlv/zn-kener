// zn-kener fork (cpq-cornerstone-6): single-trigger operations.
// GET    /api/v4/triggers/{id}  -> get one (triggers.read)
// PATCH  /api/v4/triggers/{id}  -> update (triggers.write)
// DELETE /api/v4/triggers/{id}  -> delete (triggers.write)
import { json, type RequestHandler } from "@sveltejs/kit";
import { GetTriggerByID, CreateUpdateTrigger, DeleteTrigger } from "$lib/server/controllers/triggerController";
import type { TriggerRecord } from "$lib/server/types/db";
import type { UpdateTriggerRequest, TriggerResponse, BadRequestResponse, NotFoundResponse } from "$lib/types/api";

function parseId(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function toResponse(t: TriggerRecord): TriggerResponse {
  let meta: unknown = {};
  try {
    meta = t.trigger_meta ? JSON.parse(t.trigger_meta) : {};
  } catch {
    meta = {};
  }
  return {
    id: t.id,
    name: t.name,
    trigger_type: t.trigger_type,
    trigger_desc: t.trigger_desc,
    trigger_status: t.trigger_status,
    trigger_meta: meta,
    created_at: String(t.created_at),
    updated_at: String(t.updated_at),
  };
}

export const GET: RequestHandler = async ({ params }) => {
  const id = parseId(params.id);
  if (id === null) {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Valid trigger id is required" } };
    return json(err, { status: 400 });
  }
  const t = await GetTriggerByID(id);
  if (!t) {
    const err: NotFoundResponse = { error: { code: "NOT_FOUND", message: `Trigger '${id}' not found` } };
    return json(err, { status: 404 });
  }
  return json({ trigger: toResponse(t) });
};

export const PATCH: RequestHandler = async ({ params, request }) => {
  const id = parseId(params.id);
  if (id === null) {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Valid trigger id is required" } };
    return json(err, { status: 400 });
  }
  const existing = await GetTriggerByID(id);
  if (!existing) {
    const err: NotFoundResponse = { error: { code: "NOT_FOUND", message: `Trigger '${id}' not found` } };
    return json(err, { status: 404 });
  }

  let body: UpdateTriggerRequest;
  try {
    body = await request.json();
  } catch {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } };
    return json(err, { status: 400 });
  }

  // Merge onto existing; CreateUpdateTrigger updates when id is present.
  const mergedMeta =
    body.trigger_meta !== undefined ? JSON.stringify(body.trigger_meta) : (existing.trigger_meta ?? "{}");

  try {
    await CreateUpdateTrigger({
      id,
      name: body.name !== undefined ? body.name : existing.name,
      trigger_type: body.trigger_type !== undefined ? body.trigger_type : existing.trigger_type,
      trigger_desc: body.trigger_desc !== undefined ? body.trigger_desc : existing.trigger_desc,
      trigger_status: body.trigger_status !== undefined ? body.trigger_status : existing.trigger_status,
      trigger_meta: mergedMeta,
    });
    const updated = await GetTriggerByID(id);
    return json({ trigger: toResponse(updated!) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update trigger";
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message } };
    return json(err, { status: 400 });
  }
};

export const DELETE: RequestHandler = async ({ params }) => {
  const id = parseId(params.id);
  if (id === null) {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Valid trigger id is required" } };
    return json(err, { status: 400 });
  }
  const existing = await GetTriggerByID(id);
  if (!existing) {
    const err: NotFoundResponse = { error: { code: "NOT_FOUND", message: `Trigger '${id}' not found` } };
    return json(err, { status: 404 });
  }
  await DeleteTrigger(id);
  return json({ message: `Trigger '${id}' deleted successfully` });
};
