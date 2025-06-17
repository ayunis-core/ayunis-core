import { createContext } from "react";

type ChatContextType = {
  pendingMessage: string;
  setPendingMessage: (message: string) => void;
};

export const ChatContext = createContext<ChatContextType>({
  pendingMessage: "",
  setPendingMessage: () => {
    throw new Error("setPendingMessage is not implemented");
  },
});
