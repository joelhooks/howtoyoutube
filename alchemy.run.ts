/**
 * howtoyoutube.dev — one Foldkit page, served as static assets.
 *
 * The page is prerendered during the Vite build, so this deployment carries no
 * Worker code: Cloudflare's asset layer answers every request itself. Foldkit
 * is the renderer, not a runtime the reader pays for.
 *
 * Prod owns the apex. Other stages get a single subdomain label, which is as
 * deep as the zone's Universal SSL certificate reaches.
 */
import * as Cloudflare from "@alchemy.run/cloudflare";
import * as Alchemy from "alchemy";
import { Effect } from "effect";

const ZONE = "howtoyoutube.dev";

const hostname = (stage: string): string => (stage === "prod" ? ZONE : `${stage}.${ZONE}`);

export default Alchemy.Stack(
  "howtoyoutube",
  { providers: Cloudflare.providers(), state: Cloudflare.state() },
  Effect.gen(function* effectMain() {
    const stage = yield* Alchemy.Stage;
    const host = hostname(stage);

    const site = yield* Cloudflare.Website.Foldkit("HowToYouTube", {
      domain: host,
      routes: [{ pattern: `${host}/*`, zoneName: ZONE }],
      // One page, fully rendered at build time. A request that matches no file
      // is a genuine miss, not a route for a client router to pick up.
      assets: { htmlHandling: "auto-trailing-slash", notFoundHandling: "none" },
    });

    return { url: `https://${host}/`, worker: site.url };
  }),
);
