import { Children, useCallback, type ReactNode, type UIEvent } from 'react';
import type { ChatSlots } from './chat-surface-config';
import { useAutoScroll } from './use-auto-scroll';
import { useContentScrollHeader } from './use-content-scroll-header';

export interface ChatSurfaceProps {
  readonly renderContent: (
    openArtifact?: ChatSlots['onOpenArtifact'],
  ) => ReactNode;
  readonly composer: ReactNode;
  readonly slots?: ChatSlots;
  readonly empty?: boolean;
  readonly resetKey?: unknown;
}

export function ChatSurface({
  renderContent,
  composer,
  slots,
  empty,
  resetKey,
}: ChatSurfaceProps) {
  const {
    emptyState,
    onOpenArtifact,
    header: renderHeader,
    actions,
  } = slots ?? {};
  const content =
    (empty ? emptyState : undefined) ?? renderContent(onOpenArtifact);
  const header = renderHeader ? renderHeader(actions) : actions;
  const hasHeader = Children.toArray(header).some((child) => child !== '');
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
          {hasHeader && (
            <div className="content-scroll-header-offset" aria-hidden />
          )}
          <div className="mx-auto w-full max-w-[800px]">{content}</div>
        </div>
        {hasHeader && (
          <div
            className="content-scroll-header"
            data-scrolled={headerScrolled ? 'true' : 'false'}
          >
            {header}
          </div>
        )}
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
