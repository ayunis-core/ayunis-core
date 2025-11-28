import type { SourceResponseDtoType } from '@/shared/api';
import { createContext } from 'react';

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
});
