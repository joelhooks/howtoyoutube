/**
 * The playbook tree rendered as Foldkit HTML.
 *
 * Pure: a `Page` in, a `Document` out, no I/O and no message handling. The
 * page has nothing to click, so this is the whole UI — the server renders it
 * once and nothing adopts it in the browser.
 *
 * Sections arrive flat with a level, so rendering is a map rather than a tree
 * walk. An `h3` is a subsection by position, exactly as it reads.
 */
import type { Document, Html, HtmlBuilder } from "foldkit/html";

import type { Block, Inline, Page, Phrase, Section } from "./content/model.ts";

export const ORIGIN = "https://howtoyoutube.dev";

/** A bare string is a text node; `h.text` is the SVG element and not that. */
const inline = <M>(run: Inline, h: HtmlBuilder<M>): Html | string => {
  switch (run._tag) {
    case "Text":
      return run.text;
    case "Link":
      return h.a([h.Href(run.href)], [run.text]);
    case "Em":
      return h.em([], [run.text]);
  }
};

const phrase = <M>(content: Phrase, h: HtmlBuilder<M>): ReadonlyArray<Html | string> =>
  content.map((run) => inline(run, h));

const block = <M>(value: Block, h: HtmlBuilder<M>): Html => {
  switch (value._tag) {
    case "Paragraph":
      return h.p([], phrase(value.content, h));

    case "Note":
      return h.p([], [h.small([], phrase(value.content, h))]);

    case "List": {
      const items = value.items.map((item) => h.li([], phrase(item, h)));
      return value.ordered ? h.ol([], items) : h.ul([], items);
    }

    case "Table":
      return h.table(
        [],
        [
          h.thead(
            [],
            [
              h.tr(
                [],
                value.head.map((cell) => h.th([], [cell])),
              ),
            ],
          ),
          h.tbody(
            [],
            value.rows.map((row) =>
              h.tr(
                [],
                row.map((cell) =>
                  h.td(
                    cell.label === undefined ? [] : [h.DataAttribute("label", cell.label)],
                    phrase(cell.content, h),
                  ),
                ),
              ),
            ),
          ),
        ],
      );

    case "Credit":
      return h.p(
        [h.Class("credit")],
        [
          h.img([
            h.Src(value.image.src),
            h.Width(String(value.image.width)),
            h.Height(String(value.image.height)),
            h.Alt(value.image.alt),
            h.Loading("lazy"),
          ]),
          h.span([], phrase(value.content, h)),
        ],
      );
  }
};

const section = <M>(value: Section, h: HtmlBuilder<M>): ReadonlyArray<Html> => {
  const attrs = value.id === undefined ? [] : [h.Id(value.id)];
  const heading = value.level === 2 ? h.h2(attrs, [value.heading]) : h.h3(attrs, [value.heading]);
  return [heading, ...value.blocks.map((b) => block(b, h))];
};

export const body = <M>(page: Page, h: HtmlBuilder<M>): Html =>
  h.main(
    [],
    [
      h.h1([], [page.title]),
      ...page.intro.map((b) => block(b, h)),
      ...page.sections.flatMap((s) => section(s, h)),
    ],
  );

/** The whole document. Foldkit owns the title and canonical; the rest of the head lives in the shell. */
export const document = <M>(page: Page, h: HtmlBuilder<M>): Document => ({
  title: "YouTube Playbook for Technical Creators",
  lang: "en",
  canonical: `${ORIGIN}/`,
  ogUrl: `${ORIGIN}/`,
  body: body(page, h),
});
