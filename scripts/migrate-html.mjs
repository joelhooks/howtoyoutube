#!/usr/bin/env node
/**
 * One-time migration: src/body.html -> src/content/playbook.json
 *
 * The authored HTML becomes the typed tree Foldkit renders. This refuses
 * anything the model cannot express rather than dropping it, so a silent
 * content loss is not possible — if it exits non-zero, the model is too narrow
 * and that is the thing to fix.
 *
 * Keep this around as the record of how the tree was derived. It is not part
 * of the build.
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Parser } from "htmlparser2";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const INLINE = new Set(["a", "em"]);
const BLOCK_PARENTS = new Set(["p", "li", "td", "th"]);

const decode = (s) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

/** Collapse runs of whitespace but keep the single spaces that separate words. */
const squeeze = (s) => s.replace(/\s+/g, " ");

const parse = (html) => {
  const page = { title: "", intro: [], sections: [] };
  /** Where blocks currently land: the intro, or the newest section. */
  let sink = page.intro;

  const stack = [];
  let phrase = null; // accumulating inline runs
  let inlineTag = null; // the open a/em/small, if any
  let inlineAttrs = {};
  let inlineText = "";
  let list = null;
  let table = null;
  let row = null;
  let cell = null;
  let credit = null;
  let note = false;
  let heading = null;

  const pushText = (raw) => {
    const text = squeeze(decode(raw));
    if (text.trim() === "" && text !== " ") return;
    if (heading !== null) {
      heading.text += text;
      return;
    }
    if (inlineTag !== null) {
      inlineText += text;
      return;
    }
    if (phrase === null) return;
    const last = phrase.at(-1);
    if (last && last._tag === "Text") last.text += text;
    else phrase.push({ _tag: "Text", text });
  };

  const closeInline = () => {
    const text = squeeze(inlineText);
    if (inlineTag === "a") phrase.push({ _tag: "Link", text, href: inlineAttrs.href });
    else if (inlineTag === "em") phrase.push({ _tag: "Em", text });
    inlineTag = null;
    inlineAttrs = {};
    inlineText = "";
  };

  /** Trim the outer edges of a phrase without touching the gaps between runs. */
  const tidy = (runs) => {
    const out = runs.filter((r) => !(r._tag === "Text" && r.text === ""));
    const first = out[0];
    if (first && first._tag === "Text") first.text = first.text.replace(/^\s+/, "");
    const last = out.at(-1);
    if (last && last._tag === "Text") last.text = last.text.replace(/\s+$/, "");
    return out.filter((r) => !(r._tag === "Text" && r.text === ""));
  };

  const parser = new Parser(
    {
      onopentag(name, attrs) {
        stack.push(name);
        if (name === "main" || name === "hr") return;

        if (name === "h1") {
          heading = { level: 1, id: attrs.id, text: "" };
          return;
        }
        if (name === "h2" || name === "h3") {
          heading = { level: Number(name[1]), id: attrs.id, text: "" };
          return;
        }

        if (INLINE.has(name)) {
          if (inlineTag !== null) throw new Error(`nested inline <${name}> inside <${inlineTag}>`);
          inlineTag = name;
          inlineAttrs = attrs;
          inlineText = "";
          return;
        }

        if (name === "p") {
          phrase = [];
          if (attrs.class === "credit") credit = { image: null, content: null };
          return;
        }
        if (name === "img") {
          if (credit === null) throw new Error("<img> outside a credit block is not modelled");
          credit.image = {
            src: attrs.src,
            width: Number(attrs.width),
            height: Number(attrs.height),
            alt: attrs.alt ?? "",
          };
          return;
        }
        if (name === "span") return; // the credit's text wrapper; its runs land in `phrase`
        if (name === "small") {
          // Only ever wraps a whole paragraph, so it marks the block rather
          // than nesting inside it.
          if (phrase === null) throw new Error("<small> outside a paragraph is not modelled");
          note = true;
          return;
        }

        if (name === "ul" || name === "ol") {
          list = { _tag: "List", ordered: name === "ol", items: [] };
          return;
        }
        if (name === "li") {
          phrase = [];
          return;
        }

        if (name === "table") {
          table = { _tag: "Table", head: [], rows: [] };
          return;
        }
        if (name === "thead" || name === "tbody") return;
        if (name === "tr") {
          row = [];
          return;
        }
        if (name === "th" || name === "td") {
          phrase = [];
          cell = { label: attrs["data-label"] };
          return;
        }
        throw new Error(`unmodelled tag <${name}>`);
      },

      ontext: pushText,

      onclosetag(name) {
        stack.pop();
        if (INLINE.has(name)) {
          closeInline();
          return;
        }

        if (name === "h1") {
          page.title = squeeze(heading.text).trim();
          heading = null;
          return;
        }
        if (name === "h2" || name === "h3") {
          const section = {
            id: heading.id,
            heading: squeeze(heading.text).trim(),
            level: heading.level,
            blocks: [],
          };
          page.sections.push(section);
          sink = section.blocks;
          heading = null;
          return;
        }

        if (name === "small") return;
        if (name === "p") {
          const content = tidy(phrase);
          if (note) {
            sink.push({ _tag: "Note", content });
            note = false;
            phrase = null;
            return;
          }
          if (credit !== null) {
            credit.content = content;
            sink.push({ _tag: "Credit", image: credit.image, content });
            credit = null;
          } else {
            sink.push({ _tag: "Paragraph", content });
          }
          phrase = null;
          return;
        }
        if (name === "li") {
          list.items.push(tidy(phrase));
          phrase = null;
          return;
        }
        if (name === "ul" || name === "ol") {
          sink.push(list);
          list = null;
          return;
        }
        if (name === "th") {
          table.head.push(
            tidy(phrase)
              .map((r) => r.text ?? "")
              .join(""),
          );
          phrase = null;
          cell = null;
          return;
        }
        if (name === "td") {
          const built = { content: tidy(phrase) };
          if (cell.label !== undefined) built.label = cell.label;
          row.push(built);
          phrase = null;
          cell = null;
          return;
        }
        if (name === "tr") {
          if (row.length > 0) table.rows.push(row);
          row = null;
          return;
        }
        if (name === "table") {
          sink.push(table);
          table = null;
        }
      },
    },
    { decodeEntities: false, lowerCaseTags: true },
  );

  parser.write(html);
  parser.end();
  return page;
};

const html = await readFile(join(root, "src", "body.html"), "utf8");
const page = parse(html);

const counts = page.sections.reduce(
  (acc, s) => {
    acc.sections += s.level === 2 ? 1 : 0;
    acc.subsections += s.level === 3 ? 1 : 0;
    acc.blocks += s.blocks.length;
    return acc;
  },
  { sections: 0, subsections: 0, blocks: 0 },
);

await writeFile(
  join(root, "src", "content", "playbook.json"),
  `${JSON.stringify(page, null, 1)}\n`,
);
console.log(
  `migrated — title "${page.title}", ${counts.sections} sections, ${counts.subsections} subsections, ${counts.blocks + page.intro.length} blocks`,
);
