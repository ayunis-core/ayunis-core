import { useCallback, type ReactNode, type UIEvent } from 'react';
import { useAutoScroll } from './use-auto-scroll';
import { useContentScrollHeader } from './use-content-scroll-header';

interface ChatSurfaceProps {
  readonly header: ReactNode;
  readonly content: ReactNode;
  readonly composer: ReactNode;
  readonly resetKey: unknown;
}

/** The conversation's scrolling frame: header over the timeline, composer below. */
export function ChatSurface({
  header,
  content,
  composer,
  resetKey,
}: ChatSurfaceProps) {
  const { setScrollRef, onScroll, headerScrolled } = useChatScroll(
    content,
    resetKey,
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-t-xl pb-2 sm:pb-4">
      <div className="content-scroll-region relative flex min-h-0 flex-1 flex-col">
        <div
          className="content-scroll-viewport min-h-0 flex-1 overflow-x-hidden overflow-y-auto w-full"
          ref={setScrollRef}
          onScroll={onScroll}
        >
          <div className="content-scroll-header-offset" aria-hidden />
          <div className="mx-auto w-full max-w-[800px]">{content}</div>
        </div>
        <div
          className="content-scroll-header"
          data-scrolled={headerScrolled ? 'true' : 'false'}
        >
          {header}
        </div>
      </div>
      <div className="sticky bottom-0 z-10 mx-auto w-full min-w-0 max-w-[800px] flex-shrink-0 bg-background">
        {composer}
      </div>
    </div>
  );
}

function useChatScroll(content: ReactNode, resetKey: unknown) {
  const { scrollRef: autoScrollRef, handleScroll } = useAutoScroll(
    content,
    resetKey,
  );
  const {
    scrollRef: headerScrollRef,
    headerScrolled,
    onScroll: onHeaderScroll,
  } = useContentScrollHeader(resetKey);

  const setScrollRef = useCallback(
    (node: HTMLDivElement | null) => {
      autoScrollRef.current = node;
      headerScrollRef.current = node;
    },
    [autoScrollRef, headerScrollRef],
  );

  const onScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      handleScroll(event);
      onHeaderScroll(event);
    },
    [handleScroll, onHeaderScroll],
  );
  return { setScrollRef, onScroll, headerScrolled };
}
