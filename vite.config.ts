import { foldkit } from "@foldkit/vite-plugin";
import { defineConfig, type Plugin } from "vite";

import { prerender } from "./src/build/prerender.ts";
import { howTo } from "./src/content/howTo.ts";

/**
 * The HowTo structured data, injected into the shell at build time.
 *
 * It is generated from the content tree, so it cannot claim a step the page
 * does not have: the schema and the view read the same value.
 */
const structuredData = (): Plugin => ({
  name: "howtoyoutube-structured-data",
  transformIndexHtml: () => [
    {
      tag: "script",
      attrs: { type: "application/ld+json" },
      children: JSON.stringify(howTo, null, 1),
      injectTo: "head",
    },
  ],
});

// A hydratable render compares this against the id the client carries. Nothing
// here hydrates, so it only has to exist and differ per build.
const buildId = process.env.FOLDKIT_BUILD_ID ?? `local-${Date.now().toString(36)}`;

export default defineConfig({
  // No SSR environment: the page is rendered once during this build, so there
  // is no server bundle to produce.
  environments: { ssr: { build: { ssr: false } } },
  plugins: [foldkit({ buildId }), structuredData(), prerender()],
});
