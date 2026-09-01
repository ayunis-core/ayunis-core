import { useCallback, type ReactNode, type UIEvent } from 'react';
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
} from 'react-resizable-panels';
import { useAutoScroll } from '@/features/useAutoScroll';
import { useContentScrollHeader } from '@/features/useContentScrollHeader';

interface PrototypeChatLayoutProps {
  chatHeader: ReactNode;
  chatContent: ReactNode;
  chatInput: ReactNode;
  sidePanel?: ReactNode;
  panelSize?: number;
  resetKey?: unknown;
}

export function PrototypeChatLayout({
  chatHeader,
  chatContent,
  chatInput,
  sidePanel,
  panelSize = 38,
  resetKey,
}: Readonly<PrototypeChatLayoutProps>) {
  const { scrollRef: autoScrollRef, handleScroll } = useAutoScroll(
    chatContent,
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

  return (
    <PanelGroup
      key={panelSize}
      orientation="horizontal"
      className="absolute inset-0"
    >
      <Panel defaultSize={sidePanel ? 100 - panelSize : 100} minSize={30}>
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-t-xl pb-4">
          <div className="content-scroll-region relative flex min-h-0 flex-1 flex-col">
            <div
              className="content-scroll-viewport min-h-0 w-full flex-1 overflow-y-auto overflow-x-hidden"
              ref={setScrollRef}
              onScroll={onScroll}
            >
              <div className="content-scroll-header-offset" aria-hidden />
              <div className="mx-auto w-full max-w-[800px]">{chatContent}</div>
            </div>
            <div
              className="content-scroll-header"
              data-scrolled={headerScrolled ? 'true' : 'false'}
            >
              {chatHeader}
            </div>
          </div>
          <div className="sticky bottom-0 z-10 mx-auto w-full max-w-[800px] flex-shrink-0 bg-background">
            {chatInput}
          </div>
        </div>
      </Panel>
      {sidePanel && (
        <>
          <PanelResizeHandle className="group flex w-2 shrink-0 items-stretch justify-center bg-transparent">
            <div className="w-px bg-border transition-all group-hover:w-0.5 group-hover:bg-brand group-hover:shadow-sm" />
          </PanelResizeHandle>
          <Panel defaultSize={panelSize} minSize={24}>
            {sidePanel}
          </Panel>
        </>
      )}
    </PanelGroup>
  );
}
