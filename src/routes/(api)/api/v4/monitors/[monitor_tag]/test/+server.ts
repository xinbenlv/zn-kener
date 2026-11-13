// zn-kener fork (cpq-cornerstone-10): run a one-off test of a monitor's check.
// POST /api/v4/monitors/{monitor_tag}/test  -> execute once, return the result (monitors.write)
import { json, type RequestHandler } from "@sveltejs/kit";
import Service, { type MonitorWithType } from "$lib/server/services/service.js";
import type { BadRequestResponse } from "$lib/types/api";

export const POST: RequestHandler = async ({ locals }) => {
  const monitor = locals.monitor!; // validated by hooks middleware

  if (monitor.monitor_type === "NONE") {
    const err: BadRequestResponse = {
      error: { code: "BAD_REQUEST", message: "Tests can't be run on monitor type NONE" },
    };
    return json(err, { status: 400 });
  }

  // Mirror the admin dispatcher's reduced shape passed to Service.
  const monitorReducedType: MonitorWithType = {
    tag: monitor.tag,
    monitor_type: monitor.monitor_type,
    type_data: monitor.type_data,
    cron: monitor.cron ? monitor.cron : undefined,
  };

  const serviceClient = new Service(monitorReducedType);
  const result = await serviceClient.execute();
  return json({ result, monitor_tag: monitor.tag });
};
