// zn-kener fork (cpq-cornerstone-6): trigger (notification) management.
// GET  /api/v4/triggers  -> list triggers (triggers.read)
// POST /api/v4/triggers  -> create a trigger (triggers.write)
import { json, type RequestHandler } from "@sveltejs/kit";
import { GetAllTriggers, CreateUpdateTrigger, GetTriggerByID } from "$lib/server/controllers/triggerController";
import type { TriggerRecord } from "$lib/server/types/db";
import type {
  GetTriggersResponse,
  CreateTriggerRequest,
  TriggerResponse,
  BadRequestResponse,
} from "$lib/types/api";

const VALID_TRIGGER_TYPES = ["webhook", "email", "discord", "slack"];

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

export const GET: RequestHandler = async ({ url }) => {
  const status = url.searchParams.get("status") || undefined;
  const triggers = await GetAllTriggers({ status });
  const response: GetTriggersResponse = { triggers: triggers.map(toResponse) };
  return json(response);
};

export const POST: RequestHandler = async ({ request }) => {
  let body: CreateTriggerRequest;
  try {
    body = await request.json();
  } catch {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } };
    return json(err, { status: 400 });
  }

  if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "name is required" } };
    return json(err, { status: 400 });
  }
  if (!body.trigger_type || !VALID_TRIGGER_TYPES.includes(body.trigger_type)) {
    const err: BadRequestResponse = {
      error: { code: "BAD_REQUEST", message: `trigger_type must be one of: ${VALID_TRIGGER_TYPES.join(", ")}` },
    };
    return json(err, { status: 400 });
  }
  // trigger_meta is required by the controller (it JSON.parses it).
  const triggerMeta = body.trigger_meta === undefined ? "{}" : JSON.stringify(body.trigger_meta);

  try {
    const result = await CreateUpdateTrigger({
      name: body.name.trim(),
      trigger_type: body.trigger_type,
      trigger_desc: body.trigger_desc ?? null,
      trigger_status: body.trigger_status ?? "ACTIVE",
      trigger_meta: triggerMeta,
    });
    const newId = Array.isArray(result) ? result[0] : result;
    const created = await GetTriggerByID(Number(newId));
    if (!created) {
      const err: BadRequestResponse = { error: { code: "INTERNAL_ERROR", message: "Failed to create trigger" } };
      return json(err, { status: 500 });
    }
    return json({ trigger: toResponse(created) }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create trigger";
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message } };
    return json(err, { status: 400 });
  }
};
