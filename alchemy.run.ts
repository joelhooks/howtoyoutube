/**
 * howtoyoutube.dev — one static page, served by an assets-only Worker.
 *
 * There is no Worker code. `scripts/build.mjs` writes dist/ and Cloudflare's
 * asset layer answers every request, so the only moving part is the build.
 * Prod owns the apex; every other stage gets a subdomain, which Universal SSL
 * already covers for one label.
 */
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { Effect } from "effect";

const ZONE = "howtoyoutube.dev";

const hostname = (stage: string): string => (stage === "prod" ? ZONE : `${stage}.${ZONE}`);

export default Alchemy.Stack(
  "howtoyoutube",
  { providers: Cloudflare.providers(), state: Cloudflare.state() },
  Effect.gen(function* effectMain() {
    const stage = yield* Alchemy.Stage;
    const host = hostname(stage);

    const site = yield* Cloudflare.Website.StaticSite("HowToYouTube", {
      command: "node scripts/build.mjs",
      outdir: "dist",
      domain: host,
      routes: [{ pattern: `${host}/*`, zoneName: ZONE }],
      memo: { include: ["src/**", "scripts/build.mjs"] },
      assets: { htmlHandling: "auto-trailing-slash", notFoundHandling: "none" },
    });

    return { url: `https://${host}/`, worker: site.url };
  }),
);
