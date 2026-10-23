import catalog from './catalog/extension-500.json';
import type { Concept } from './concepts';
export const referenceTopics = catalog.groups.map((group) => ({
  id: group.id,
  title: group.title,
  count: group.entries.length,
}));
export const referenceConcepts: readonly Concept[] = catalog.groups.flatMap((group) =>
  group.entries.map((entry) => ({
    ...entry,
    reference: true,
    topic: group.id,
    aliases: [...entry.aliases, group.title],
  })),
);
export const catalogPlannedCount = 152 + referenceConcepts.length;
