import { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@ayunis/ui/lib/cn';
import { FeedIcon } from '@/features/home-feed';
import type { FeedSection } from '@/pages/new-chat/model/feed-sections';

interface Indicator {
  left: number;
  width: number;
}

function useIndicator(targetId: string | null) {
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const [indicator, setIndicator] = useState<Indicator | null>(null);
  useLayoutEffect(() => {
    const element = targetId ? tabRefs.current.get(targetId) : undefined;
    setIndicator(
      element ? { left: element.offsetLeft, width: element.offsetWidth } : null,
    );
  }, [targetId]);
  return { tabRefs, indicator };
}

export function TrayTabs({
  tabs,
  openId,
  isFresh,
  onToggle,
}: Readonly<{
  tabs: FeedSection[];
  openId: string | null;
  isFresh: boolean;
  onToggle: (id: string) => void;
}>) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const { tabRefs, indicator } = useIndicator(hoverId ?? openId);

  return (
    <div
      className="relative flex items-center gap-0.5"
      onMouseLeave={() => setHoverId(null)}
    >
      {isFresh && (
        <span
          className="home-tray__indicator"
          data-visible={indicator ? true : undefined}
          style={
            indicator
              ? {
                  transform: `translateX(${indicator.left}px)`,
                  width: indicator.width,
                }
              : undefined
          }
          aria-hidden
        />
      )}
      {tabs.map((tab) => {
        const isActive = tab.id === openId;
        return (
          <button
            key={tab.id}
            ref={(element) => {
              if (element) tabRefs.current.set(tab.id, element);
              else tabRefs.current.delete(tab.id);
            }}
            type="button"
            aria-expanded={isActive}
            onClick={() => onToggle(tab.id)}
            onMouseEnter={() => setHoverId(tab.id)}
            className={cn(
              'home-tray__tab relative',
              isActive && 'home-tray__tab--active',
            )}
          >
            <FeedIcon kind={tab.kind} className="size-3.5" />
            {tab.label}
            {tab.count > 0 && (
              <span className="home-tray__count">{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
