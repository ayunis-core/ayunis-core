import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Plus } from 'lucide-react';
import { ItemGroup } from '@ayunis/ui/components/item';
import { cn } from '@ayunis/ui/lib/cn';
import type { HomeFeed } from '@/features/home-feed';
import { FeedRow } from '@/features/home-feed';
import { buildFeedSections } from '@/pages/new-chat/model/feed-sections';
import { TrayTabs } from './TrayTabs';

export function HomeTab({
  feed,
  placement = 'top',
  isFresh = false,
}: Readonly<{
  feed: HomeFeed;
  placement?: 'top' | 'bottom';
  isFresh?: boolean;
}>) {
  const tabs = buildFeedSections(feed);
  const [openId, setOpenId] = useState<string | null>(null);
  const [shownId, setShownId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const shownTab = tabs.find((tab) => tab.id === shownId);
  const isOpen = openId !== null;

  function toggle(id: string) {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setShownId(id);
    setOpenId(id);
  }

  useEffect(() => {
    if (!openId) return;
    function handlePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpenId(null);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenId(null);
    }
    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [openId]);

  const isInvite = tabs.length === 0 && feed.routines.length === 0;
  if (tabs.length === 0 && !isInvite) return null;

  return (
    <div
      className={cn(
        'home-tray-slot relative px-3',
        placement === 'top' ? '-mb-4' : '-mt-4',
      )}
      data-placement={placement}
    >
      <div
        ref={rootRef}
        className="home-tray"
        data-open={isOpen || undefined}
        data-placement={placement}
        data-fresh={isFresh || undefined}
      >
        <div className="home-tray__panel" aria-hidden={!isOpen}>
          <div className="min-h-0 overflow-hidden">
            {shownTab && (
              <div key={shownTab.id} className="home-tray__panel-inner p-1.5">
                <ItemGroup>
                  {shownTab.items.slice(0, 3).map((item) => (
                    <FeedRow key={item.id} item={item} />
                  ))}
                </ItemGroup>
                <Link
                  to={shownTab.more.to}
                  tabIndex={isOpen ? undefined : -1}
                  className="group flex items-center justify-center gap-1 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {shownTab.more.label}
                  <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
        <div
          className={cn(
            'flex items-center gap-0.5 p-1',
            placement === 'top' ? 'pb-5' : 'pt-5',
          )}
        >
          <TrayTabs
            tabs={tabs}
            openId={openId}
            isFresh={isFresh}
            onToggle={toggle}
          />
          {isInvite && (
            <Link to="/routines" className="home-tray__tab">
              <Plus className="size-3.5" />
              Erste Routine einrichten
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
