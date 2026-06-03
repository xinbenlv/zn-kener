// zn-kener fork: standalone Vitest config.
//
// Deliberately does NOT load the SvelteKit/Vite app plugins — these server-side
// unit/functional tests only exercise plain TypeScript modules, and the
// sveltekit() plugin interferes with the test runner. We only need the `$lib`
// alias (normally provided by SvelteKit) so imports resolve the same way they
// do in app code.
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const lib = fileURLToPath(new URL("./src/lib", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      $lib: lib,
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.{test,spec}.ts"],
    // Keep functional tests that import src/hooks.server.ts isolated so module
    // mocks (vi.mock) don't bleed across files.
    clearMocks: true,
    restoreMocks: true,
  },
});
