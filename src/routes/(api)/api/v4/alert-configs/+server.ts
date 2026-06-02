// zn-kener fork (cpq-cornerstone-7): monitor alert-config management.
// GET  /api/v4/alert-configs  -> list paginated (?page=&limit=&monitor_tag=&alert_for=&is_active=) (alerts.read)
// POST /api/v4/alert-configs  -> create (alerts.write)
import { json, type RequestHandler } from "@sveltejs/kit";
import {
  GetMonitorAlertConfigsPaginated,
  CreateMonitorAlertConfig,
} from "$lib/server/controllers/monitorAlertConfigController";
import type { MonitorAlertConfigFilter } from "$lib/server/types/db";
import type { CreateAlertConfigRequest, BadRequestResponse } from "$lib/types/api";

export const GET: RequestHandler = async ({ url }) => {
  const page = Number(url.searchParams.get("page")) || 1;
  const limit = Number(url.searchParams.get("limit")) || 50;
  const filter: MonitorAlertConfigFilter = {};
  const monitorTag = url.searchParams.get("monitor_tag");
  const alertFor = url.searchParams.get("alert_for");
  const isActive = url.searchParams.get("is_active");
  if (monitorTag) filter.monitor_tag = monitorTag;
  if (alertFor === "STATUS" || alertFor === "LATENCY" || alertFor === "UPTIME") filter.alert_for = alertFor;
  if (isActive === "YES" || isActive === "NO") filter.is_active = isActive;

  const result = await GetMonitorAlertConfigsPaginated(page, limit, filter);
  return json({
    alert_configs: result.configs,
    pagination: { total: result.total, page, limit },
  });
};

export const POST: RequestHandler = async ({ request }) => {
  let body: CreateAlertConfigRequest;
  try {
    body = await request.json();
  } catch {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } };
    return json(err, { status: 400 });
  }

  if (!Array.isArray(body.monitor_tags) || body.monitor_tags.length === 0 || !body.alert_for || !body.alert_value) {
    const err: BadRequestResponse = {
      error: { code: "BAD_REQUEST", message: "monitor_tags[], alert_for, and alert_value are required" },
    };
    return json(err, { status: 400 });
  }

  try {
    const created = await CreateMonitorAlertConfig({
      monitor_tags: body.monitor_tags,
      alert_for: body.alert_for,
      alert_value: body.alert_value,
      failure_threshold: body.failure_threshold ?? 1,
      success_threshold: body.success_threshold ?? 1,
      alert_description: body.alert_description ?? null,
      create_incident: body.create_incident,
      is_active: body.is_active,
      severity: body.severity,
      trigger_ids: body.trigger_ids,
    });
    return json({ alert_config: created }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create alert config";
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message } };
    return json(err, { status: 400 });
  }
};
