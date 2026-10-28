import catalog from './catalog/extension-500.json';
import additional from './catalog/extension-ai-100.json';
import type { Concept } from './concepts';
const groups = [...catalog.groups, ...additional.groups];
export const referenceTopics = groups.map((group) => ({
  id: group.id,
  title: group.title,
  count: group.entries.length,
}));
export const referenceConcepts: readonly Concept[] = groups.flatMap((group) =>
  group.entries.map((entry) => ({
    ...entry,
    reference: true,
    topic: group.id,
    aliases: [...entry.aliases, group.title],
  })),
);
export const catalogPlannedCount = 152 + referenceConcepts.length;
