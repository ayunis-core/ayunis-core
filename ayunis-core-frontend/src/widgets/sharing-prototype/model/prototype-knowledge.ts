import { KNOWLEDGE_COLLECTIONS } from './knowledge-fixtures';
import {
  applyTransfer,
  patchState,
  readState,
  usePrototypeState,
  type PrototypeState,
} from './prototype-store';
import type {
  LinkedKnowledge,
  PrototypeKnowledge,
  WorkspaceKnowledge,
} from './types';

let cachedSource: PrototypeState | null = null;
let cachedItems: PrototypeKnowledge[] = KNOWLEDGE_COLLECTIONS;

export function selectKnowledge(current: PrototypeState): PrototypeKnowledge[] {
  if (cachedSource === current) return cachedItems;
  cachedSource = current;
  cachedItems = [...KNOWLEDGE_COLLECTIONS, ...current.createdKnowledgeItems]
    .filter((item) => !current.deletedKnowledgeIds.includes(item.id))
    .map((item) => applyTransfer(item, 'knowledge', current));
  return cachedItems;
}

export function useKnowledgeItems(): PrototypeKnowledge[] {
  return selectKnowledge(usePrototypeState());
}

export function addKnowledgeItem(item: PrototypeKnowledge) {
  const state = readState();
  patchState({
    createdKnowledgeItems: [
      ...state.createdKnowledgeItems.filter(
        (existing) => existing.id !== item.id,
      ),
      item,
    ],
    deletedKnowledgeIds: state.deletedKnowledgeIds.filter(
      (id) => id !== item.id,
    ),
  });
}

export function deleteKnowledgeItem(itemId: string) {
  const state = readState();
  patchState({
    deletedKnowledgeIds: [...state.deletedKnowledgeIds, itemId],
    requests: state.requests.filter(
      (request) =>
        !(request.resource === 'knowledge' && request.itemId === itemId),
    ),
  });
}

export function setWorkspaceKnowledgeLinked(
  workspaceId: string,
  link: LinkedKnowledge,
  isLinked: boolean,
) {
  const state = readState();
  const without = (state.linkedKnowledge[workspaceId] ?? []).filter(
    (item) => item.knowledgeId !== link.knowledgeId,
  );
  patchState({
    linkedKnowledge: {
      ...state.linkedKnowledge,
      [workspaceId]: isLinked ? [...without, link] : without,
    },
  });
}

export function addWorkspaceKnowledge(
  workspaceId: string,
  knowledge: WorkspaceKnowledge,
) {
  const state = readState();
  patchState({
    createdKnowledge: {
      ...state.createdKnowledge,
      [workspaceId]: [
        ...(state.createdKnowledge[workspaceId] ?? []),
        knowledge,
      ],
    },
  });
}
