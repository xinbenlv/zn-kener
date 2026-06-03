// zn-kener fork (cpq-cornerstone-10): reorder a page's monitors.
// POST /api/v4/pages/{page_path}/reorder  body {monitor_tags: string[]} (pages.write)
// Use the reserved token ~home for the default (empty page_path) Home page.
import { json, type RequestHandler } from "@sveltejs/kit";
import { ReorderPageMonitors } from "$lib/server/controllers/pagesController";
import type { ReorderPageMonitorsRequest, BadRequestResponse } from "$lib/types/api";

export const POST: RequestHandler = async ({ locals, request }) => {
  const page = locals.page!; // validated by hooks middleware (handles ~home alias)

  let body: ReorderPageMonitorsRequest;
  try {
    body = await request.json();
  } catch {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } };
    return json(err, { status: 400 });
  }
  if (!Array.isArray(body.monitor_tags)) {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "monitor_tags[] is required" } };
    return json(err, { status: 400 });
  }

  // ReorderPageMonitors(pageId, monitorTags)
  await ReorderPageMonitors(page.id, body.monitor_tags);
  return json({ message: `Reordered ${body.monitor_tags.length} monitor(s) on page '${page.page_path || "~home"}'` });
};
