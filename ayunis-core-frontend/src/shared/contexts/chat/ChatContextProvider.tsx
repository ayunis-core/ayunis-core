import { useState, useMemo } from 'react';
import { ChatContext } from './chatContext';
import type { SourceResponseDtoType } from '@/shared/api';

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

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      pendingMessage,
      setPendingMessage,
      sources,
      setSources,
    }),
    [pendingMessage, setPendingMessage, sources, setSources],
  );

  return (
    <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
  );
};
