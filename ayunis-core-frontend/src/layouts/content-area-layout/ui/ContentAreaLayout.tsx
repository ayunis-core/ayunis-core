import React from 'react';
import { cn } from '@ayunis/ui/lib/cn';
import { useContentScrollHeader } from '@/features/useContentScrollHeader';
import { useEmbedded } from '@/shared/contexts/embedded/useEmbedded';

interface ContentAreaLayoutProps {
  contentHeader?: React.ReactNode;
  contentArea: React.ReactNode;
  className?: string;
  resetKey?: unknown;
  /**
   * When true, the content area is not constrained to the default max width,
   * allowing children to span the full width of the scroll region.
   */
  fullWidth?: boolean;
}

export const ContentAreaLayout: React.FC<ContentAreaLayoutProps> = ({
  contentHeader,
  contentArea,
  className = '',
  resetKey,
  fullWidth = false,
}) => {
  const { scrollRef, headerScrolled, onScroll } =
    useContentScrollHeader(resetKey);
  const isEmbedded = useEmbedded();

  return (
    <div className={`flex min-h-0 flex-col absolute inset-0 pb-4 ${className}`}>
      <div className="content-scroll-region relative flex min-h-0 flex-1 flex-col">
        <div
          ref={scrollRef}
          className="content-scroll-viewport min-h-0 flex-1 overflow-x-hidden overflow-y-auto w-full"
          onScroll={onScroll}
        >
          {contentHeader && (
            <div className="content-scroll-header-offset" aria-hidden />
          )}
          <div
            className={cn(
              'mx-auto w-full pb-3',
              isEmbedded ? 'px-5' : 'px-2',
              !fullWidth && 'max-w-[800px]',
            )}
          >
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
