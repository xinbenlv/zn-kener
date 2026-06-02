import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import version from "vite-plugin-package-version";
import { defineConfig } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";

import * as dotenv from "dotenv";
import { execSync } from "node:child_process";

dotenv.config();

// zn-kener CPQ build provenance (best-effort; safe fallbacks in non-git env).
function gitOut(cmd: string, fallback: string): string {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function getAllowedHost(origin: string): string | undefined {
  try {
    return new URL(origin).hostname;
  } catch {
    return undefined;
  }
}

export default defineConfig(({ mode }) => {
  const port = Number(process.env.PORT) || 3000;

  const buildEnv = process.env.VITE_BUILD_ENV || mode || "development";
  const isProduction = buildEnv === "production";

  const origin = process.env.ORIGIN || `http://localhost:${port}`;
  const allowedHost = getAllowedHost(origin);

  return {
    optimizeDeps: {
      include: ["rrule"],
      exclude: [
        "svelte-codemirror-editor",
        "codemirror",
        "@codemirror/lang-javascript",
        "@codemirror/lang-json",
        "@codemirror/lang-markdown",
        "@codemirror/lang-css",
        "@codemirror/lang-html",
        "@uiw/codemirror-theme-github",
      ],
    },
    plugins: [tailwindcss(), sveltekit(), version(), devtoolsJson()],
    server: {
      allowedHosts: allowedHost ? [allowedHost] : undefined,
      port,
      watch: {
        ignored: ["**/src/lib/server/data/**"],
      },
    },
    assetsInclude: ["**/*.yaml"],
    ssr: {
      noExternal: ["svelte-sonner", "svelte-codemirror-editor", "rrule"],
    },
    // Keeping this around for quick grepping/debugging.
    define: {
      __KENER_BUILD_ENV__: JSON.stringify(buildEnv),
      __KENER_IS_PROD__: JSON.stringify(isProduction),
      // zn-kener CPQ build provenance, consumed by src/lib/buildInfo.ts.
      // (PACKAGE_VERSION is provided by the vite-plugin-package-version plugin.)
      "import.meta.env.CPQ_SHA": JSON.stringify(gitOut("git rev-parse --short=6 HEAD", "dev")),
      "import.meta.env.GIT_BRANCH": JSON.stringify(gitOut("git rev-parse --abbrev-ref HEAD", "main")),
      "import.meta.env.BUILD_TIME": JSON.stringify(new Date().toISOString()),
    },
  };
});
