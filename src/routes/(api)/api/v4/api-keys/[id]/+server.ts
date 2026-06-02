// zn-kener fork (cpq-cornerstone-3): API-key status + deletion over the v4 API.
// PATCH  /api/v4/api-keys/{id}  -> set status ACTIVE|INACTIVE (api_keys.write)
// DELETE /api/v4/api-keys/{id}  -> delete a key (api_keys.delete)
import { json, type RequestHandler } from "@sveltejs/kit";
import { UpdateApiKeyStatus, DeleteApiKey } from "$lib/server/controllers/apiController";
import type {
  UpdateApiKeyRequest,
  UpdateApiKeyResponse,
  DeleteApiKeyResponse,
  BadRequestResponse,
  NotFoundResponse,
} from "$lib/types/api";

function parseId(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export const PATCH: RequestHandler = async ({ params, request }) => {
  const id = parseId(params.id);
  if (id === null) {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Valid API key id is required" } };
    return json(err, { status: 400 });
  }

  let body: UpdateApiKeyRequest;
  try {
    body = await request.json();
  } catch {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } };
    return json(err, { status: 400 });
  }

  if (body.status !== "ACTIVE" && body.status !== "INACTIVE") {
    const err: BadRequestResponse = {
      error: { code: "BAD_REQUEST", message: "status must be one of: ACTIVE, INACTIVE" },
    };
    return json(err, { status: 400 });
  }

  const updated = await UpdateApiKeyStatus({ id, status: body.status });
  if (!updated) {
    const err: NotFoundResponse = { error: { code: "NOT_FOUND", message: `API key '${id}' not found` } };
    return json(err, { status: 404 });
  }

  const response: UpdateApiKeyResponse = { message: `API key '${id}' status set to ${body.status}` };
  return json(response);
};

export const DELETE: RequestHandler = async ({ params }) => {
  const id = parseId(params.id);
  if (id === null) {
    const err: BadRequestResponse = { error: { code: "BAD_REQUEST", message: "Valid API key id is required" } };
    return json(err, { status: 400 });
  }

  const deleted = await DeleteApiKey({ id });
  if (!deleted) {
    const err: NotFoundResponse = { error: { code: "NOT_FOUND", message: `API key '${id}' not found` } };
    return json(err, { status: 404 });
  }

  const response: DeleteApiKeyResponse = { message: `API key '${id}' deleted successfully` };
  return json(response);
};
