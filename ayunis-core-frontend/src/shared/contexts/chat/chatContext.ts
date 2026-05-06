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
  pendingImages: PendingImageFile[];
  setPendingImages: (images: PendingImageFile[]) => void;
  pendingSkillId: string | undefined;
  setPendingSkillId: (skillId: string | undefined) => void;
};

export const ChatContext = createContext<ChatContextType>({
  pendingMessage: '',
  setPendingMessage: () => {
    throw new Error('setPendingMessage is not implemented');
  },
  pendingImages: [],
  setPendingImages: () => {
    throw new Error('setPendingImages is not implemented');
  },
  pendingSkillId: undefined,
  setPendingSkillId: () => {
    throw new Error('setPendingSkillId is not implemented');
  },
});
