// zn-kener fork (cpq-cornerstone-7): alert history (MonitorAlertV2).
// GET /api/v4/alerts  -> list triggered/resolved alerts (paginated; filters) (alerts.read)
import { json, type RequestHandler } from "@sveltejs/kit";
import { GetMonitorAlertsV2Paginated } from "$lib/server/controllers/monitorAlertConfigController";
import type { MonitorAlertV2Filter } from "$lib/server/types/db";

export const GET: RequestHandler = async ({ url }) => {
  const page = Number(url.searchParams.get("page")) || 1;
  const limit = Number(url.searchParams.get("limit")) || 50;
  const filter: MonitorAlertV2Filter = {};
  const monitorTag = url.searchParams.get("monitor_tag");
  const alertStatus = url.searchParams.get("alert_status");
  const configId = url.searchParams.get("config_id");
  if (monitorTag) filter.monitor_tag = monitorTag;
  if (alertStatus === "TRIGGERED" || alertStatus === "RESOLVED") filter.alert_status = alertStatus;
  if (configId && Number.isInteger(Number(configId))) filter.config_id = Number(configId);

  const result = await GetMonitorAlertsV2Paginated(page, limit, filter);
  return json({ alerts: result.alerts, pagination: { total: result.total, page, limit } });
};
