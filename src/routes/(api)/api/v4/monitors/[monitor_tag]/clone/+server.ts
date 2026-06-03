// zn-kener fork (cpq-cornerstone-10): clone a monitor.
// POST /api/v4/monitors/{monitor_tag}/clone  body {new_tag, new_name} (monitors.write)
import { json, type RequestHandler } from "@sveltejs/kit";
import { CloneMonitor } from "$lib/server/controllers/monitorsController";
import type { CloneMonitorRequest, BadRequestResponse } from "$lib/types/api";

export const POST: RequestHandler = async ({ locals, request }) => {
  const source = locals.monitor!; // validated by hooks middleware

  let body: CloneMonitorRequest;
  try {
    body = await request.json();
  } catch {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } };
    return json(err, { status: 400 });
  }
  if (!body.new_tag || !body.new_name) {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "new_tag and new_name are required" } };
    return json(err, { status: 400 });
  }

  try {
    // CloneMonitor({ sourceTag, newTag, newName }) -> number[] (insert ids)
    await CloneMonitor({ sourceTag: source.tag, newTag: String(body.new_tag), newName: String(body.new_name) });
    return json({ monitor: { tag: String(body.new_tag), name: String(body.new_name) } }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Clone failed";
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message } };
    return json(err, { status: 400 });
  }
};
