import React from "react";
import { ScrollArea } from "@/shared/ui/shadcn/scroll-area";

interface ChatInterfaceLayoutProps {
  chatHeader?: React.ReactNode;
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
  return (
    <div className={`flex flex-col h-screen ${className}`}>
      {/* Chat Header - sticky at top, not scrollable */}
      {chatHeader && (
        <div className="flex-shrink-0 sticky top-0 z-10 bg-background">
          {chatHeader}
        </div>
      )}

      {/* Chat Content Area - takes up remaining space with scrollable content */}
      <div className="flex-1 overflow-hidden w-full max-w-[800px] mx-auto">
        <ScrollArea className="h-full">{chatContent}</ScrollArea>
      </div>

      {/* Chat Input Area - adjusts to content height */}
      <div className="flex-shrink-0 sticky bottom-4 z-10 bg-background w-full max-w-[800px] mx-auto">
        {chatInput}
      </div>
    </div>
  );
};

export default ChatInterfaceLayout;
