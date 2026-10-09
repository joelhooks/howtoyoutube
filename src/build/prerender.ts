/**
 * Render the page into the built shell, as part of the Vite build.
 *
 * The playbook does not change between requests, so rendering per request
 * would spend a Worker invocation producing identical bytes. Doing it here
 * means the deployment is assets-only: Cloudflare serves a finished document
 * and no code runs at the edge.
 *
 * `isHydratable: false` is the other half of that. Nothing on the page can be
 * clicked, so no client runtime is shipped and none is expected to adopt the
 * DOM.
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Effect } from "effect";
import { Server } from "foldkit/experimental";
import type { Plugin } from "vite";

import { Flags, init, view } from "../main.ts";
import { ORIGIN } from "../view.ts";

const sitemap = (lastmod: string): string =>
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${ORIGIN}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;

export const prerender = (): Plugin => {
  let outDir = "dist";
  return {
    name: "howtoyoutube-prerender",
    apply: "build",
    // Only the client build produces the shell, and `closeBundle` runs once
    // per environment — without this guard a second environment would render
    // into a file it did not write.
    applyToEnvironment: (environment) => environment.name === "client",
    configResolved(config) {
      outDir = join(config.root, config.build.outDir);
    },
    async closeBundle() {
      const rendered = await Effect.runPromise(
        Server.renderToString({ Flags, init, view }, { flags: {}, isHydratable: false }),
      );
      const template = await readFile(join(outDir, "index.html"), "utf8");
      const page = Server.injectIntoTemplate(template, rendered);
      await Promise.all([
        writeFile(join(outDir, "index.html"), page),
        writeFile(join(outDir, "sitemap.xml"), sitemap(new Date().toISOString().slice(0, 10))),
      ]);
      this.info(`prerendered ${page.length} bytes into ${outDir}/index.html`);
    },
  };
};
