#!/usr/bin/env node
/**
 * Prove the rendered page still says what the authored HTML said.
 *
 * The content moved from markup to a typed tree, so "it looks right" is not
 * enough — this compares the text, the links, the anchors, and the table
 * labels of the built page against `src/body.html`, which is kept as the
 * migration's reference copy. It exits non-zero on any drift.
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const decode = (s) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

/** Inline tags close up with no gap; block tags become one space. */
const textOf = (html) =>
  decode(html.replace(/<\/?(?:a|em|small|span)\b[^>]*>/g, "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

const all = (html, re) => [...html.matchAll(re)].map((m) => m[1]);

const built = await readFile(join(root, "dist", "index.html"), "utf8");
const original = await readFile(join(root, "src", "body.html"), "utf8");
const main = built.slice(built.indexOf("<main"), built.indexOf("</main>") + 7);

const checks = [];
const check = (name, actual, expected) =>
  checks.push({ name, ok: JSON.stringify(actual) === JSON.stringify(expected), actual, expected });

check("text", textOf(main), textOf(original));
check("links", all(main, /href="([^"]+)"/g), all(original, /href="([^"]+)"/g));
check("anchors", all(main, /id="([^"]+)"/g), all(original, /id="([^"]+)"/g));
check("table labels", all(main, /data-label="([^"]+)"/g), all(original, /data-label="([^"]+)"/g));
check("image", all(main, /src="([^"]+)"/g), all(original, /src="([^"]+)"/g));

const structured = built.match(/application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
if (structured === null) throw new Error("no JSON-LD in the built page");
const howTo = JSON.parse(structured[1]);
const steps = howTo.step.reduce((total, s) => total + s.itemListElement.length, 0);

const scripts = (built.match(/<script/g) ?? []).length;

for (const c of checks) {
  console.log(`${c.ok ? "ok  " : "FAIL"} ${c.name}`);
  if (!c.ok) {
    const a = String(c.actual);
    const e = String(c.expected);
    for (let i = 0; i < Math.max(a.length, e.length); i += 1) {
      if (a[i] !== e[i]) {
        console.log(`     built:    ${JSON.stringify(a.slice(Math.max(0, i - 90), i + 90))}`);
        console.log(`     original: ${JSON.stringify(e.slice(Math.max(0, i - 90), i + 90))}`);
        break;
      }
    }
  }
}

console.log(`ok   ${howTo.step.length} HowTo sections, ${steps} steps`);
console.log(
  `ok   ${scripts} script tag${scripts === 1 ? "" : "s"} (the JSON-LD; no client bundle)`,
);
console.log(`ok   ${built.length} bytes`);

if (checks.some((c) => !c.ok) || scripts !== 1) process.exit(1);
