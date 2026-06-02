// zn-kener fork (cpq-cornerstone-7): single alert-config operations.
// GET    /api/v4/alert-configs/{id}  -> get one with triggers (alerts.read)
// PATCH  /api/v4/alert-configs/{id}  -> update (alerts.write)
// DELETE /api/v4/alert-configs/{id}  -> delete (alerts.write)
import { json, type RequestHandler } from "@sveltejs/kit";
import {
  GetMonitorAlertConfigById,
  UpdateMonitorAlertConfig,
  DeleteMonitorAlertConfig,
} from "$lib/server/controllers/monitorAlertConfigController";
import type { UpdateAlertConfigRequest, BadRequestResponse, NotFoundResponse } from "$lib/types/api";

function parseId(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export const GET: RequestHandler = async ({ params }) => {
  const id = parseId(params.id);
  if (id === null) {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Valid alert-config id is required" } };
    return json(err, { status: 400 });
  }
  const cfg = await GetMonitorAlertConfigById(id);
  if (!cfg) {
    const err: NotFoundResponse = { error: { code: "NOT_FOUND", message: `Alert config '${id}' not found` } };
    return json(err, { status: 404 });
  }
  return json({ alert_config: cfg });
};

export const PATCH: RequestHandler = async ({ params, request }) => {
  const id = parseId(params.id);
  if (id === null) {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Valid alert-config id is required" } };
    return json(err, { status: 400 });
  }
  const existing = await GetMonitorAlertConfigById(id);
  if (!existing) {
    const err: NotFoundResponse = { error: { code: "NOT_FOUND", message: `Alert config '${id}' not found` } };
    return json(err, { status: 404 });
  }

  let body: UpdateAlertConfigRequest;
  try {
    body = await request.json();
  } catch {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } };
    return json(err, { status: 400 });
  }

  try {
    const updated = await UpdateMonitorAlertConfig({
      id,
      monitor_tags: body.monitor_tags,
      alert_for: body.alert_for,
      alert_value: body.alert_value,
      failure_threshold: body.failure_threshold,
      success_threshold: body.success_threshold,
      alert_description: body.alert_description,
      create_incident: body.create_incident,
      is_active: body.is_active,
      severity: body.severity,
      trigger_ids: body.trigger_ids,
    });
    return json({ alert_config: updated });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update alert config";
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message } };
    return json(err, { status: 400 });
  }
};

export const DELETE: RequestHandler = async ({ params }) => {
  const id = parseId(params.id);
  if (id === null) {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Valid alert-config id is required" } };
    return json(err, { status: 400 });
  }
  const deleted = await DeleteMonitorAlertConfig(id);
  if (!deleted) {
    const err: NotFoundResponse = { error: { code: "NOT_FOUND", message: `Alert config '${id}' not found` } };
    return json(err, { status: 404 });
  }
  return json({ message: `Alert config '${id}' deleted successfully` });
};
