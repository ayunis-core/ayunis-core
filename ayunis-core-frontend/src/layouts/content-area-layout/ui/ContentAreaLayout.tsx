import React from 'react';
import { useContentScrollHeader } from '@/features/useContentScrollHeader';

interface ContentAreaLayoutProps {
  contentHeader?: React.ReactNode;
  contentArea: React.ReactNode;
  className?: string;
  resetKey?: unknown;
}

export const ContentAreaLayout: React.FC<ContentAreaLayoutProps> = ({
  contentHeader,
  contentArea,
  className = '',
  resetKey,
}) => {
  const { scrollRef, headerScrolled, onScroll } =
    useContentScrollHeader(resetKey);

  return (
    <div className={`flex min-h-0 flex-col absolute inset-0 pb-4 ${className}`}>
      <div className="content-scroll-region relative flex min-h-0 flex-1 flex-col pr-2">
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto w-full"
          onScroll={onScroll}
        >
          {contentHeader && (
            <div className="content-scroll-header-offset" aria-hidden />
          )}
          <div className="mx-auto w-full max-w-[800px] px-2 pb-3">
            {contentArea}
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
