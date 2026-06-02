import type { Knex } from "knex";

/**
 * zn-kener carried patch (cpq-cornerstone-2): per-key RBAC.
 *
 * Adds a nullable `permissions` column to `api_keys`. Semantics:
 *   - NULL            → legacy / full-access key (backward compatible; every
 *                       API key issued before this migration keeps full access,
 *                       and keys created without an explicit scope stay full).
 *   - JSON string[]   → the key is scoped to exactly these permission ids
 *                       (a subset of the ids in src/lib/allPerms.ts).
 *
 * Stored as text (JSON) for portability across SQLite / Postgres / MySQL.
 */
export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn("api_keys", "permissions");
  if (!hasColumn) {
    await knex.schema.alterTable("api_keys", (table) => {
      table.text("permissions").nullable().defaultTo(null);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn("api_keys", "permissions");
  if (hasColumn) {
    await knex.schema.alterTable("api_keys", (table) => {
      table.dropColumn("permissions");
    });
  }
}
