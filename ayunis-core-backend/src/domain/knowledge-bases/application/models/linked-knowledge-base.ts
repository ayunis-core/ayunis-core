import type {
  NamedOwner,
  NamedPerson,
} from 'src/domain/ownership/application/models/owner-names';
import type { CollectiveKnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import type { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';

export type LinkableKnowledgeBase =
  PersonalKnowledgeBase | CollectiveKnowledgeBase;

export interface OwnedKnowledgeBase {
  knowledgeBase: LinkableKnowledgeBase;
  owner: NamedOwner;
}

export interface LinkedKnowledgeBase extends OwnedKnowledgeBase {
  linkedBy: NamedPerson | null;
  linkedAt: Date;
}

export interface LinkableKnowledgeBases {
  own: OwnedKnowledgeBase[];
  team: OwnedKnowledgeBase[];
  org: OwnedKnowledgeBase[];
}

export function matchesKnowledgeBaseSearch(
  knowledgeBase: LinkableKnowledgeBase,
  search: string | undefined,
): boolean {
  if (!search) return true;
  const needle = search.toLocaleLowerCase();
  return `${knowledgeBase.name}\n${knowledgeBase.description}`
    .toLocaleLowerCase()
    .includes(needle);
}

export function byKnowledgeBaseName(
  a: OwnedKnowledgeBase,
  b: OwnedKnowledgeBase,
): number {
  return a.knowledgeBase.name.localeCompare(b.knowledgeBase.name);
}
