/**
 * The playbook, decoded once at module load.
 *
 * `playbook.json` is the authored content; this is the typed value everything
 * else reads. Decoding here rather than at each call site means a malformed
 * tree fails the build instead of rendering a half page.
 */
import playbookJson from "./playbook.json" with { type: "json" };
import { decodePage } from "./model.ts";

export const playbook = decodePage(playbookJson);
