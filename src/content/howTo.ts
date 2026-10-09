/**
 * The HowTo structured data, derived from the playbook.
 *
 * The checklist section is the recipe. Reading it out of the tree means the
 * steps Google is told about and the steps on the page are the same values,
 * not two lists that have to agree.
 */
import { ORIGIN } from "../view.ts";
import { playbook } from "./playbook.ts";
import type { Phrase } from "./model.ts";

const CHECKLIST_ID = "checklist";

const plain = (content: Phrase): string => content.map((run) => run.text).join("");

/** The subsections that follow the checklist heading, up to the next section. */
const checklistGroups = () => {
  const start = playbook.sections.findIndex((s) => s.id === CHECKLIST_ID);
  if (start === -1) throw new Error(`no section with id "${CHECKLIST_ID}"`);
  const rest = playbook.sections.slice(start + 1);
  const end = rest.findIndex((s) => s.level === 2);
  return (end === -1 ? rest : rest.slice(0, end)).filter((s) => s.level === 3);
};

export const howTo = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to make a YouTube video for a developer audience",
  description:
    "Packaging, retention, editing, and publishing steps for a developer-education YouTube channel.",
  url: `${ORIGIN}/`,
  image: `${ORIGIN}/card.png`,
  totalTime: "P1W",
  step: checklistGroups().map((group, index) => ({
    "@type": "HowToSection",
    position: index + 1,
    name: group.heading,
    itemListElement: group.blocks.flatMap((b) =>
      b._tag === "List"
        ? b.items.map((item, step) => ({
            "@type": "HowToStep",
            position: step + 1,
            text: plain(item),
          }))
        : [],
    ),
  })),
};
