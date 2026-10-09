/**
 * The page as data.
 *
 * Foldkit builds its view from typed values, not from an HTML string, so the
 * playbook stops being markup and becomes a tree. Everything downstream reads
 * this one tree: the rendered page, the HowTo structured data, and anything
 * later that needs to know what the checklist says. There is no second copy to
 * keep in sync.
 *
 * The shapes are deliberately narrow. This models the markup the page actually
 * uses and nothing more — no nested lists, no arbitrary attributes, no raw
 * HTML escape hatch. Widening it is a decision, not an accident.
 */
import { Schema as S } from "effect";

/** A run of text with no markup. */
export class Text extends S.TaggedClass<Text>()("Text", {
  text: S.String,
}) {}

/** A link. Link text is plain by design; nothing on this page nests markup inside one. */
export class Link extends S.TaggedClass<Link>()("Link", {
  text: S.String,
  href: S.String,
}) {}

/** Emphasis. Used for quoted lines from the calls. */
export class Em extends S.TaggedClass<Em>()("Em", {
  text: S.String,
}) {}

export const Inline = S.Union([Text, Link, Em]);
export type Inline = typeof Inline.Type;

/** A sequence of inline runs: one paragraph, one list item, or one table cell. */
export const Phrase = S.Array(Inline);
export type Phrase = typeof Phrase.Type;

export class Paragraph extends S.TaggedClass<Paragraph>()("Paragraph", {
  content: Phrase,
}) {}

/**
 * Small print, set off by a rule. The page uses this once, for the sources
 * footnote, which is why it is a block rather than an inline: it is a kind of
 * paragraph, not a span of emphasis inside one.
 */
export class Note extends S.TaggedClass<Note>()("Note", {
  content: Phrase,
}) {}

/** An ordered or unordered list. The page has no nested lists and this cannot express one. */
export class List extends S.TaggedClass<List>()("List", {
  ordered: S.Boolean,
  items: S.Array(Phrase),
}) {}

/**
 * One table cell. `label` carries the `data-label` the stylesheet reads to
 * restack the table on a narrow screen, so it belongs to the data rather than
 * to the renderer.
 */
export class Cell extends S.Class<Cell>("Cell")({
  content: Phrase,
  label: S.optional(S.String),
}) {}

export class Table extends S.TaggedClass<Table>()("Table", {
  head: S.Array(S.String),
  rows: S.Array(S.Array(Cell)),
}) {}

/** The credit line: one avatar beside one run of text. */
export class Credit extends S.TaggedClass<Credit>()("Credit", {
  image: S.Struct({
    src: S.String,
    width: S.Number,
    height: S.Number,
    alt: S.String,
  }),
  content: Phrase,
}) {}

export const Block = S.Union([Paragraph, Note, List, Table, Credit]);
export type Block = typeof Block.Type;

/**
 * A heading and the blocks under it. Sections are a flat list in document
 * order; `level` says whether a heading is a section or a subsection. Nesting
 * them would buy nothing and would make "render in order" a tree walk.
 */
export class Section extends S.Class<Section>("Section")({
  id: S.optional(S.String),
  heading: S.String,
  level: S.Literals([2, 3]),
  blocks: S.Array(Block),
}) {}

export class Page extends S.Class<Page>("Page")({
  title: S.String,
  intro: S.Array(Block),
  sections: S.Array(Section),
}) {}

export const decodePage = S.decodeUnknownSync(Page);
