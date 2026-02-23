import { useState, useMemo } from 'react';
import { ChatContext } from './chatContext';
import type { SourceResponseDtoType } from '@/shared/api';

type PendingImageFile = {
  file: File;
  altText?: string;
};

export const ChatContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [pendingMessage, setPendingMessage] = useState('');
  const [sources, setSources] = useState<
    Array<{
      id: string;
      name: string;
      type: SourceResponseDtoType;
      file: File;
    }>
  >([]);
  const [pendingImages, setPendingImages] = useState<PendingImageFile[]>([]);
  const [pendingSkillId, setPendingSkillId] = useState('');

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      pendingMessage,
      setPendingMessage,
      sources,
      setSources,
      pendingImages,
      setPendingImages,
      pendingSkillId,
      setPendingSkillId,
    }),
    [pendingMessage, sources, pendingImages, pendingSkillId],
  );

  return (
    <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
  );
};
