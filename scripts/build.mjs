#!/usr/bin/env node
/**
 * Assemble dist/ for howtoyoutube.dev.
 *
 * One page, no client JS. The body is authored HTML, the stylesheet is
 * ratstack's app.css inlined so the page is a single request, and the HowTo
 * JSON-LD is regenerated from the checklist markup on every build so the
 * structured data cannot drift from what the page actually says.
 */
import { mkdir, readFile, readdir, copyFile, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");
const dist = join(root, "dist");

const ORIGIN = "https://howtoyoutube.dev";
const TITLE = "YouTube Playbook for Technical Creators";
const DESCRIPTION =
  "How a developer YouTube video gets made, from the title to the final cut. Packaging, retention, editing, publishing.";
const SOCIAL_DESCRIPTION = "How a developer YouTube video gets made, from the title to the final cut.";

/** Strip tags and collapse whitespace so a list item reads as one plain sentence. */
const plain = (html) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Read the checklist section and return it as HowTo sections.
 * The page is the source of truth; this never invents a step.
 */
const howToSteps = (body) => {
  const section = body.match(/<h2 id="checklist".*?(?=<h2 )/s);
  if (!section) throw new Error("checklist section not found in body.html");
  const groups = [...section[0].matchAll(/<h3[^>]*>(.*?)<\/h3>\s*<(ul|ol)>(.*?)<\/\2>/gs)];
  if (groups.length === 0) throw new Error("no checklist groups found");
  return groups.map(([, heading, , list], index) => ({
    "@type": "HowToSection",
    position: index + 1,
    name: plain(heading),
    itemListElement: [...list.matchAll(/<li>(.*?)<\/li>/gs)].map(([, item], step) => ({
      "@type": "HowToStep",
      position: step + 1,
      text: plain(item),
    })),
  }));
};

const sitemap = (lastmod) =>
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

const page = ({ body, css, schema }) =>
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${TITLE}</title>
<meta name="description" content="${DESCRIPTION}">
<link rel="canonical" href="${ORIGIN}/">
<meta property="og:type" content="article">
<meta property="og:site_name" content="howtoyoutube.dev">
<meta property="og:title" content="${TITLE}">
<meta property="og:description" content="${SOCIAL_DESCRIPTION}">
<meta property="og:url" content="${ORIGIN}/">
<meta property="og:image" content="${ORIGIN}/card.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="YouTube playbook for developer channels, in the ratstack monospace style with a rat in the corner.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${TITLE}">
<meta name="twitter:description" content="${SOCIAL_DESCRIPTION}">
<meta name="twitter:image" content="${ORIGIN}/card.png">
<script type="application/ld+json">
${JSON.stringify(schema, null, 1)}
</script>
<style>
/* joel/ratstack-mdsvx app.css, verbatim */
${css}
.credit { align-items: center; border: 1px solid; display: flex; gap: 0.9rem; overflow-wrap: normal; padding: 0.75rem 1rem; }
.credit img { border-radius: 50%; flex: none; }
.credit span { min-width: 0; }
</style>
</head>
<body>
${body}</body>
</html>
`;

const build = async () => {
  const [body, css, schemaFile] = await Promise.all([
    readFile(join(src, "body.html"), "utf8"),
    readFile(join(src, "app.css"), "utf8"),
    readFile(join(src, "schema.json"), "utf8"),
  ]);

  const schema = { ...JSON.parse(schemaFile), url: `${ORIGIN}/`, image: `${ORIGIN}/card.png` };
  schema.step = howToSteps(body);

  await rm(dist, { force: true, recursive: true });
  await mkdir(dist, { recursive: true });

  const statics = await readdir(join(src, "static"));
  await Promise.all(statics.map((name) => copyFile(join(src, "static", name), join(dist, name))));

  await Promise.all([
    writeFile(join(dist, "index.html"), page({ body, css, schema })),
    writeFile(join(dist, "sitemap.xml"), sitemap(new Date().toISOString().slice(0, 10))),
  ]);

  const steps = schema.step.reduce((total, section) => total + section.itemListElement.length, 0);
  console.log(`built dist/ — ${statics.length + 2} files, ${schema.step.length} HowTo sections, ${steps} steps`);
};

await build();
