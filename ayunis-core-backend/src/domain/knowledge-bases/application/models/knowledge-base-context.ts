import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';

export interface KnowledgeBaseWithUserContext<
  T extends KnowledgeBase = KnowledgeBase,
> {
  knowledgeBase: T;
  isShared: boolean;
  isActive: boolean;
}

export interface KnowledgeBaseContext<
  T extends KnowledgeBase = KnowledgeBase,
> extends KnowledgeBaseWithUserContext<T> {
  documentCount: number;
}
