import React from "react";
import { useAutoScroll } from "@/features/useAutoScroll";

interface ChatInterfaceLayoutProps {
  chatHeader: React.ReactNode;
  chatContent: React.ReactNode;
  chatInput: React.ReactNode;
  className?: string;
}

export const ChatInterfaceLayout: React.FC<ChatInterfaceLayoutProps> = ({
  chatHeader,
  chatContent,
  chatInput,
  className = "",
}) => {
  const { scrollRef, handleScroll } = useAutoScroll(chatContent);
  return (
    <div className={`flex flex-col absolute inset-0 px-4 ${className}`}>
      {/* Chat Header - sticky at top, not scrollable */}
      <div className="flex-shrink-0 sticky top-0 z-10">{chatHeader}</div>

      {/* Chat Content Area - takes up remaining space with scrollable content */}
      <div
        className="flex-1 overflow-y-auto w-full max-w-[800px] mx-auto"
        ref={scrollRef}
        onScroll={handleScroll}
      >
        {/* <ScrollArea className="h-full">{chatContent}</ScrollArea> */}
        {chatContent}
      </div>

      {/* Chat Input Area - adjusts to content height */}
      <div className="flex-shrink-0 sticky bottom-0 z-10 bg-background w-full max-w-[800px] mx-auto">
        {chatInput}
      </div>
    </div>
  );
};

export default ChatInterfaceLayout;
