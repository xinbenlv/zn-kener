// zn-kener fork (cpq-cornerstone-3): API-key management over the v4 API.
// GET  /api/v4/api-keys      -> list keys (api_keys.read)
// POST /api/v4/api-keys      -> create a key, optionally permission-scoped (api_keys.write)
import { json, type RequestHandler } from "@sveltejs/kit";
import db from "$lib/server/db/db";
import { CreateNewAPIKey } from "$lib/server/controllers/apiController";
import { parseKeyPermissions } from "$lib/server/apiPermissions";
import type { ApiKeyRecord } from "$lib/server/types/db";
import type { GetApiKeysResponse, CreateApiKeyResponse, CreateApiKeyRequest, BadRequestResponse } from "$lib/types/api";

export const GET: RequestHandler = async () => {
  const rows = await db.getAllApiKeys();
  const response: GetApiKeysResponse = {
    api_keys: rows.map((r: ApiKeyRecord) => ({
      id: r.id,
      name: r.name,
      masked_key: r.masked_key,
      status: r.status,
      permissions: parseKeyPermissions(r.permissions),
      created_at: String(r.created_at),
      updated_at: String(r.updated_at),
    })),
  };
  return json(response);
};

export const POST: RequestHandler = async ({ request }) => {
  let body: CreateApiKeyRequest;
  try {
    body = await request.json();
  } catch {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } };
    return json(err, { status: 400 });
  }

  if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Name is required" } };
    return json(err, { status: 400 });
  }

  try {
    // CreateNewAPIKey validates `permissions` against the catalog and throws
    // on unknown ids; null/omitted/empty => full-access key.
    const created = await CreateNewAPIKey({ name: body.name.trim(), permissions: body.permissions ?? null });
    const response: CreateApiKeyResponse = {
      api_key: {
        name: created.name,
        key: created.apiKey,
        permissions: created.permissions,
      },
    };
    return json(response, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create API key";
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message } };
    return json(err, { status: 400 });
  }
};
