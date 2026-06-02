// zn-kener fork (cpq-cornerstone-7): single alert-history operations.
// PATCH  /api/v4/alerts/{id}  body {alert_status: TRIGGERED|RESOLVED} -> update status (alerts.write)
// DELETE /api/v4/alerts/{id}  -> delete alert record (alerts.write)
import { json, type RequestHandler } from "@sveltejs/kit";
import {
  GetMonitorAlertV2ById,
  UpdateMonitorAlertV2Status,
  DeleteMonitorAlertV2,
} from "$lib/server/controllers/monitorAlertConfigController";
import type { UpdateAlertRequest, BadRequestResponse, NotFoundResponse } from "$lib/types/api";

function parseId(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export const PATCH: RequestHandler = async ({ params, request }) => {
  const id = parseId(params.id);
  if (id === null) {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Valid alert id is required" } };
    return json(err, { status: 400 });
  }
  const existing = await GetMonitorAlertV2ById(id);
  if (!existing) {
    const err: NotFoundResponse = { error: { code: "NOT_FOUND", message: `Alert '${id}' not found` } };
    return json(err, { status: 404 });
  }

  let body: UpdateAlertRequest;
  try {
    body = await request.json();
  } catch {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } };
    return json(err, { status: 400 });
  }
  if (body.alert_status !== "TRIGGERED" && body.alert_status !== "RESOLVED") {
    const err: BadRequestResponse = {
      error: { code: "BAD_REQUEST", message: "alert_status must be one of: TRIGGERED, RESOLVED" },
    };
    return json(err, { status: 400 });
  }

  const updated = await UpdateMonitorAlertV2Status(id, body.alert_status);
  return json({ alert: updated });
};

export const DELETE: RequestHandler = async ({ params }) => {
  const id = parseId(params.id);
  if (id === null) {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Valid alert id is required" } };
    return json(err, { status: 400 });
  }
  const existing = await GetMonitorAlertV2ById(id);
  if (!existing) {
    const err: NotFoundResponse = { error: { code: "NOT_FOUND", message: `Alert '${id}' not found` } };
    return json(err, { status: 404 });
  }
  await DeleteMonitorAlertV2(id);
  return json({ message: `Alert '${id}' deleted successfully` });
};
