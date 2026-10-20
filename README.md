# howtoyoutube.dev

One page about how a developer YouTube video gets made, from the title to the
final cut. A [Foldkit](https://github.com/foldkit/foldkit) app rendered once at
build time, so the reader gets finished HTML and no JavaScript at all.

## What is here

| Path                        | Role                                                  |
| --------------------------- | ----------------------------------------------------- |
| `src/content/playbook.json` | The page, as data. This is the source of truth.       |
| `src/content/model.ts`      | What that data is allowed to be, in Effect Schema.    |
| `src/content/howTo.ts`      | HowTo JSON-LD, derived from the content.              |
| `src/view.ts`               | The content tree rendered as Foldkit HTML.            |
| `src/main.ts`               | The application: Model, Flags, init, view.            |
| `src/build/prerender.ts`    | Vite plugin that renders the page into the shell.     |
| `src/body.html`             | The original markup, kept as the migration reference. |
| `alchemy.run.ts`            | The Cloudflare stack.                                 |

## The content is data

The page used to be 438 lines of hand-written HTML. It is now a typed tree, and
everything reads that one value: the view renders it, and the HowTo structured
data is generated from its checklist section. The schema cannot claim a step the
page does not have, because it has no separate source to drift from.

The model is deliberately narrow — no nested lists, no arbitrary attributes, no
raw HTML escape hatch. Widening it is a decision, not an accident.

`src/body.html` is the markup the tree was migrated from. It is neither built
nor served; `scripts/verify.mjs` diffs the rendered page against it, so the move
from markup to data has to stay lossless.

```sh
pnpm build      # vite build, then prerender into dist/
pnpm verify     # diff the built page against the original markup
pnpm check      # build + verify + typecheck + format check
pnpm migrate    # re-derive playbook.json from body.html; kept as a record
```

## Nothing hydrates

The render uses `isHydratable: false`. Nothing on the page can be clicked, so no
client runtime is shipped and none is expected to adopt the DOM. What lands in
`dist/` is one HTML document, a stylesheet, and the images. The only `<script>`
on the page is the JSON-LD, and `verify` fails if a second one appears.

## Deploying

`alchemy.run.ts` declares an assets-only Worker through
`Cloudflare.Website.Foldkit`. There is no Worker code: the page is already
rendered, so Cloudflare's asset layer answers every request itself.

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
