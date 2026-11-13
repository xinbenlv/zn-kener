import db from "../db/db.js";
import crypto from "crypto";
import { MaskString, CreateHash } from "./commonController.js";
import { parseKeyPermissions, validateRequestedPermissions } from "../apiPermissions.js";

interface ApiKeyInput {
  name: string;
  // zn-kener RBAC: optional subset of permission ids. null/omitted/empty =>
  // full-access key, preserving upstream behavior.
  permissions?: string[] | null;
}

// An authenticated key resolved from a request. `permissions === null` denotes
// a legacy / full-access key (see add_permissions_to_api_keys migration).
export interface ResolvedAPIKey {
  id: number;
  name: string;
  permissions: string[] | null;
}
interface ApiKeyStatusInput {
  id: number;
  status: string;
}

interface ApiKeyDeleteInput {
  id: number;
}

function generateApiKey() {
  const prefix = "kener_";
  const randomKey = crypto.randomBytes(32).toString("hex"); // 64-character hexadecimal string
  return prefix + randomKey;
}

export const CreateNewAPIKey = async (
  data: ApiKeyInput,
): Promise<{ apiKey: string; name: string; permissions: string[] | null }> => {
  //generate a new key
  const apiKey = generateApiKey();
  const hashed_key = await CreateHash(apiKey);
  //insert into db

  //data.name cant be empty
  if (!data.name) {
    throw new Error("Name is required");
  }

  // zn-kener RBAC: validate the requested scope (throws on unknown ids).
  // null => full-access key (upstream behavior preserved).
  const permissions = validateRequestedPermissions(data.permissions);

  await db.createNewApiKey({
    name: data.name,
    hashed_key: hashed_key,
    masked_key: MaskString(apiKey),
    permissions: permissions === null ? null : JSON.stringify(permissions),
  });

  return {
    apiKey: apiKey,
    name: data.name,
    permissions: permissions,
  };
};

export const GetAllAPIKeys = async () => {
  return await db.getAllApiKeys();
};

//update status of api key
export const UpdateApiKeyStatus = async (data: ApiKeyStatusInput): Promise<number> => {
  return await db.updateApiKeyStatus(data);
};

export const DeleteApiKey = async (data: ApiKeyDeleteInput): Promise<number> => {
  if (!data.id || Number.isNaN(Number(data.id))) {
    throw new Error("Valid API key id is required");
  }
  return await db.deleteApiKey(Number(data.id));
};

export const VerifyAPIKey = async (apiKey: string): Promise<boolean> => {
  const hashed_key = CreateHash(apiKey);
  // Check if the hash exists in the database
  const record = await db.getApiKeyByHashedKey(hashed_key);

  if (!!record) {
    return record.status == "ACTIVE";
  } // Adjust this for your DB query
  return false;
};

// zn-kener RBAC: resolve an ACTIVE key with its parsed permission scope, or
// null when the key is missing or inactive. Used by hooks.server.ts to both
// authenticate and authorize each API request.
export const ResolveAPIKey = async (apiKey: string): Promise<ResolvedAPIKey | null> => {
  const hashed_key = CreateHash(apiKey);
  const record = await db.getApiKeyByHashedKey(hashed_key);
  if (!record || record.status !== "ACTIVE") {
    return null;
  }
  return {
    id: record.id,
    name: record.name,
    permissions: parseKeyPermissions(record.permissions),
  };
};
