/**
 * The application.
 *
 * The playbook is a constant, so the Model carries nothing and there are no
 * messages: this is an Elm-shaped app whose state space is a single point.
 * Keeping the shape rather than hand-rolling a renderer is what lets the
 * server entry, and any later interactive feature, use the same view.
 */
import type { HtmlBuilder, Document } from "foldkit/html";
import { Schema as S } from "effect";

import { playbook } from "./content/playbook.ts";
import { document } from "./view.ts";

export const Model = S.Struct({});
export type Model = typeof Model.Type;

export const Flags = S.Struct({});
export type Flags = typeof Flags.Type;

export const init = (): { readonly model: Model } => ({ model: {} });

export const view = (_model: Model, h: HtmlBuilder<never>): Document => document(playbook, h);
