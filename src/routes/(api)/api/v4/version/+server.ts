// zn-kener fork (cpq-cornerstone-4): build provenance endpoint.
// GET /api/v4/version -> { version, upstream, cpq:{sha}, builtAt, branch }
// Public (no auth) — see PUBLIC_API_PATHS in src/hooks.server.ts.
import { json, type RequestHandler } from "@sveltejs/kit";
import { getBuildInfo } from "$lib/buildInfo";

export const GET: RequestHandler = async () => {
  return json(getBuildInfo());
};
