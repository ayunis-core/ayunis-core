import type { SourceResponseDtoType } from '@/shared/api';
import { createContext } from 'react';

type PendingImageFile = {
  file: File;
  altText?: string;
};

export type KnowledgeBaseSummary = {
  id: string;
  name: string;
};

type ChatContextType = {
  pendingMessage: string;
  setPendingMessage: (message: string) => void;
  sources: Array<{
    id: string;
    name: string;
    type: SourceResponseDtoType;
    file: File;
  }>;
  setSources: (
    sources: Array<{
      id: string;
      name: string;
      type: SourceResponseDtoType;
      file: File;
    }>,
  ) => void;
  pendingImages: PendingImageFile[];
  setPendingImages: (images: PendingImageFile[]) => void;
  pendingKnowledgeBases: KnowledgeBaseSummary[];
  setPendingKnowledgeBases: (kbs: KnowledgeBaseSummary[]) => void;
  pendingSkillId: string | undefined;
  setPendingSkillId: (skillId: string | undefined) => void;
};

export const ChatContext = createContext<ChatContextType>({
  pendingMessage: '',
  setPendingMessage: () => {
    throw new Error('setPendingMessage is not implemented');
  },
  sources: [],
  setSources: () => {
    throw new Error('setSources is not implemented');
  },
  pendingImages: [],
  setPendingImages: () => {
    throw new Error('setPendingImages is not implemented');
  },
  pendingKnowledgeBases: [],
  setPendingKnowledgeBases: () => {
    throw new Error('setPendingKnowledgeBases is not implemented');
  },
  pendingSkillId: undefined,
  setPendingSkillId: () => {
    throw new Error('setPendingSkillId is not implemented');
  },
});
