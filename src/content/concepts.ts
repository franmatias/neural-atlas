import { coreRecords } from './core-records';
import { referenceConcepts } from './reference-concepts';
import { conceptControls } from './concept-controls';
import { searchConcepts as searchOriginal, type Concept } from './legacy-concepts';
export type { Concept } from './legacy-concepts';
export const concepts: readonly Concept[] = [
  ...coreRecords.map((c) => ({
    id: c.id,
    title: c.title.es,
    english: c.title.en,
    aliases: [...c.aliases.es, ...c.aliases.en],
    definition: c.definition.es,
    formula: c.formal.notation,
    question: c.selfAssessment.prompt,
    answer: c.selfAssessment.answer,
    lab: conceptControls
      .find((r) => r.labId === c.labIds[0] && r.controlId === c.relatedControls[0]?.controlId)
      ?.path.slice(5),
    reference: !['implemented', 'reviewed'].includes(c.status),
    topic: c.category,
  })),
  ...referenceConcepts,
];
export function searchConcepts(
  query: string,
  source: readonly Concept[] = concepts,
): readonly Concept[] {
  return searchOriginal(query, source);
}
