# howtoyoutube.dev

One page about how a developer YouTube video gets made, from the title to the
final cut. No client JavaScript, no framework, one HTTP request for the whole
document.

## What is here

| Path | Role |
| --- | --- |
| `src/body.html` | The page itself. Authored by hand; this is the source of truth. |
| `src/app.css` | ratstack's `app.css`, inlined verbatim at build time. |
| `src/schema.json` | HowTo envelope. Its `step` array is regenerated, not edited. |
| `src/static/` | Assets copied to the site root: OG card, avatar, robots.txt. |
| `scripts/build.mjs` | Assembles `dist/`. |
| `alchemy.run.ts` | The Cloudflare stack. |

## The build

`scripts/build.mjs` reads the checklist markup out of `body.html` and rebuilds
the `HowTo` JSON-LD from it on every run. The structured data cannot claim a
step the page does not have, because it has no other source. Edit the checklist
and the schema follows; there is nothing to keep in sync by hand.

It also writes `sitemap.xml` with the current date and inlines the stylesheet,
so the deployed page is a single self-contained document.

```sh
pnpm build      # writes dist/
pnpm preview    # build, then serve dist/ on :4321
pnpm check      # typecheck + format check
```

## Deploying

`alchemy.run.ts` declares an assets-only Worker. There is no Worker code:
Cloudflare's asset layer answers every request itself, so the only moving part
is the build.

Prod owns the apex. Every other stage gets a single subdomain label, because
the zone's Universal SSL certificate covers `*.howtoyoutube.dev` but not two
labels deep.

```sh
pnpm deploy                 # prod, the apex
STAGE=preview pnpm deploy   # preview.howtoyoutube.dev
```

`scripts/deploy.sh` leases Cloudflare credentials from agent-secrets into the
deploy process only. Nothing is written to disk and nothing is printed. The
token needs Workers Routes: Edit, Zone: Read, and DNS: Edit **on this zone** —
an account-wide token scoped to other zones will upload the Worker and then
fail when it binds the domain.

## Credit

Packaging thinking comes from [Theo](https://x.com/theo), in [a packaging
masterclass he recorded](https://www.youtube.com/watch?v=q9GCu3hiNjw). The rest
comes from strategy and editing calls with the team at [10xn](https://10xn.dev/).
Those calls were private, so the page carries what was said and not who said it.
