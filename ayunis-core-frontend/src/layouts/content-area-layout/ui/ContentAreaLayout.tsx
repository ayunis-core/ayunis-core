import React from 'react';
import { ScrollArea } from '@/shared/ui/shadcn/scroll-area';

interface ContentAreaLayoutProps {
  contentHeader?: React.ReactNode;
  /** Fixed below header (outside scroll) — for toolbars with focus rings/shadows */
  contentToolbar?: React.ReactNode;
  contentArea: React.ReactNode;
  className?: string;
}

export const ContentAreaLayout: React.FC<ContentAreaLayoutProps> = ({
  contentHeader,
  contentToolbar,
  contentArea,
  className = '',
}) => {
  return (
    <div className={`flex flex-col absolute inset-0 ${className} px-4 pb-4`}>
      {/* Content Header - sticky at top, not scrollable */}
      {contentHeader && (
        <div className="flex-shrink-0 sticky top-0 z-10 bg-background mb-2">
          {contentHeader}
        </div>
      )}

      {contentToolbar && (
        <div className="mx-auto mb-4 w-full max-w-[800px] shrink-0 px-0.5">
          {contentToolbar}
        </div>
      )}

      {/* Content Area - takes up remaining space with scrollable content */}
      <div className="mx-auto w-full max-w-[800px] flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="px-0.5 pb-4">{contentArea}</div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default ContentAreaLayout;
