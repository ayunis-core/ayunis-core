import { useState, useMemo } from 'react';
import { ChatContext } from './chatContext';

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
  const [pendingImages, setPendingImages] = useState<PendingImageFile[]>([]);
  const [pendingSkillId, setPendingSkillId] = useState<string | undefined>();

  const contextValue = useMemo(
    () => ({
      pendingMessage,
      setPendingMessage,
      pendingImages,
      setPendingImages,
      pendingSkillId,
      setPendingSkillId,
    }),
    [pendingMessage, pendingImages, pendingSkillId],
  );

  return (
    <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
  );
};
