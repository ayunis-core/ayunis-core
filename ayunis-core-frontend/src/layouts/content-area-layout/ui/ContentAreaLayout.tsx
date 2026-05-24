import React from 'react';
import { useContentScrollHeader } from '@/features/useContentScrollHeader';

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
  const { scrollRef, headerScrolled, onScroll } =
    useContentScrollHeader(contentArea);

  return (
    <div
      className={`flex min-h-0 flex-col absolute inset-0 px-4 pb-4 ${className}`}
    >
      {contentToolbar && (
        <div className="mx-auto mb-4 w-full max-w-[800px] shrink-0">
          {contentToolbar}
        </div>
      )}

      <div className="content-scroll-region relative flex min-h-0 flex-1 flex-col">
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto w-full"
          onScroll={onScroll}
        >
          {contentHeader && (
            <div className="content-scroll-header-offset" aria-hidden />
          )}
          <div className="mx-auto w-full max-w-[800px]">
            <div className="px-0.5">{contentArea}</div>
          </div>
        </div>

        {contentHeader && (
          <div
            className="content-scroll-header"
            data-scrolled={headerScrolled ? 'true' : 'false'}
          >
            {contentHeader}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentAreaLayout;
