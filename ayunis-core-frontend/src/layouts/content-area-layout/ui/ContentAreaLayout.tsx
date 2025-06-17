import React from "react";
import { ScrollArea } from "@/shared/ui/shadcn/scroll-area";

interface ContentAreaLayoutProps {
  contentHeader?: React.ReactNode;
  contentArea: React.ReactNode;
  className?: string;
}

export const ContentAreaLayout: React.FC<ContentAreaLayoutProps> = ({
  contentHeader,
  contentArea,
  className = "",
}) => {
  return (
    <div className={`flex flex-col h-screen ${className} pb-4`}>
      {/* Content Header - sticky at top, not scrollable */}
      {contentHeader && (
        <div className="flex-shrink-0 sticky top-0 z-10 bg-background mb-4">
          {contentHeader}
        </div>
      )}

      {/* Content Area - takes up remaining space with scrollable content */}
      <div className="flex-1 overflow-hidden  w-full max-w-[800px] mx-auto">
        <ScrollArea className="h-full">{contentArea}</ScrollArea>
      </div>
    </div>
  );
};

export default ContentAreaLayout;
