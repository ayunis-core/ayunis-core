import { useState, useMemo } from "react";
import { ChatContext } from "./chatContext";

export const ChatContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [pendingMessage, setPendingMessage] = useState("");

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      pendingMessage,
      setPendingMessage,
    }),
    [pendingMessage, setPendingMessage],
  );

  return (
    <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
  );
};
