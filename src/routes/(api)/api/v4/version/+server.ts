// zn-kener fork (patch-feat-pr3-xinbenlv): build provenance endpoint.
// GET /api/v4/version -> { version, upstream, cpq:{sha}, commit, builtAt, branch }
// Public (no auth) — see PUBLIC_API_ROUTE_IDS in src/hooks.server.ts.
import { json, type RequestHandler } from "@sveltejs/kit";
import { getBuildInfo } from "$lib/buildInfo";

export const GET: RequestHandler = async () => {
  return json(getBuildInfo());
};
