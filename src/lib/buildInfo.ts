// zn-kener fork (cpq-cornerstone-4): build provenance.
//
// Surfaces the upstream/fork relationship as a structured triple. Values are
// injected at build time via import.meta.env.* (see vite.config.ts for dev and
// scripts/build-server.js for the production bundle). Everything falls back
// gracefully when not injected (e.g. unit tests, vite-node scripts).

function readEnv(key: string): string | undefined {
  try {
    const env = (import.meta as unknown as { env?: Record<string, unknown> }).env;
    const v = env?.[key];
    return typeof v === "string" && v.length > 0 ? v : undefined;
  } catch {
    return undefined;
  }
}

// Upstream Kener version (package.json#version, unchanged by the fork).
const UPSTREAM_VERSION = readEnv("PACKAGE_VERSION") ?? "0.0.0";
// First 6 chars of cpq-capstone-0 (cpq-head) at build time; "dev" when not built.
const CPQ_SHA = readEnv("CPQ_SHA") ?? "dev";
// ISO-8601 build timestamp.
const BUILT_AT = readEnv("BUILD_TIME") ?? "";
// Our fork's working branch.
const BRANCH = readEnv("GIT_BRANCH") ?? "main";

export interface BuildInfo {
  // Combined version string: "<upstream>+cpq.<sha>" (SemVer build metadata),
  // or just "<upstream>" in a non-CPQ dev build.
  version: string;
  upstream: string;
  cpq: { sha: string };
  builtAt: string;
  branch: string;
}

export function getBuildInfo(): BuildInfo {
  const hasSha = CPQ_SHA && CPQ_SHA !== "dev";
  const version = hasSha ? `${UPSTREAM_VERSION}+cpq.${CPQ_SHA}` : UPSTREAM_VERSION;
  return {
    version,
    upstream: UPSTREAM_VERSION,
    cpq: { sha: CPQ_SHA },
    builtAt: BUILT_AT,
    branch: BRANCH,
  };
}

// One-line provenance summary, e.g.
//   "zn-kener v4.0.23+cpq.bbd33e (upstream v4.0.23) · main · 2026-05-30T..."
export function buildInfoLine(): string {
  const b = getBuildInfo();
  const when = b.builtAt ? ` · ${b.builtAt}` : "";
  return `zn-kener v${b.version} (upstream v${b.upstream}) · ${b.branch}${when}`;
}
