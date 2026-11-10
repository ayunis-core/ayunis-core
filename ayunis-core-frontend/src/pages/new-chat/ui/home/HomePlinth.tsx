import { useEffect, useState } from 'react';
import { useViewportMaxHeight } from './useViewportMaxHeight';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { ItemGroup } from '@ayunis/ui/components/item';
import { cn } from '@ayunis/ui/lib/cn';
import {
  FeedIcon,
  FeedRow,
  ReadToggleButton,
  useReadToggle,
  type FeedItem,
  type HomeFeed,
} from '@/features/home-feed';
import {
  buildPlinthSections,
  plinthStatus,
  type PlinthSection,
} from '@/pages/new-chat/model/plinth-sections';
import { useArrivalBumps, useSlidingIndicator } from './usePlinthMotion';
import { PlinthStatusLine } from './PlinthStatusLine';
import { DetectionCard } from './DetectedRoutineCard';
import {
  FirstRoutineInvite,
  MoreIdeas,
  SuggestionCard,
  SuggestionChip,
} from './PlinthCalm';
import {
  SUGGESTIONS,
  type PlinthSuggestion,
} from '@/pages/new-chat/model/plinth-suggestions';
import { Lightbulb } from 'lucide-react';
import { useSeenIds } from '@/shared/lib/prototype-settings';

function useOutsideClose(openId: string | null, close: () => void) {
  useEffect(() => {
    if (!openId) return;
    function handlePointer(event: PointerEvent) {
      const target = event.target as HTMLElement;
      if (target.closest('.home-plinth__chip, .home-plinth__body')) return;
      close();
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [openId, close]);
}

function SectionChip({
  section,
  isActive,
  isBumped,
  register,
  onToggle,
}: Readonly<{
  section: PlinthSection;
  isActive: boolean;
  isBumped: boolean;
  register: (element: HTMLButtonElement | null) => void;
  onToggle: () => void;
}>) {
  return (
    <button
      ref={register}
      type="button"
      aria-expanded={isActive}
      onClick={onToggle}
      data-alert={section.id === 'failed' || undefined}
      className={cn(
        'home-plinth__chip',
        isActive && 'home-plinth__chip--active',
        isBumped && 'home-plinth__chip--bump',
      )}
    >
      <FeedIcon kind={section.kind} className="home-plinth__icon size-3.5" />
      {section.label}
      <span key={section.count} className="home-plinth__count">
        {section.count}
      </span>
    </button>
  );
}

function PlinthRow({
  item,
  index,
  isUnread,
  onToggle,
}: Readonly<{
  item: FeedItem;
  index: number;
  isUnread: boolean;
  onToggle: (isUnread: boolean) => void;
}>) {
  const navigate = useNavigate();
  return (
    <div
      className="home-plinth__row group relative"
      style={{ animationDelay: `${80 + index * 50}ms` }}
      onClickCapture={(event) => {
        if (item.kind !== 'news') return;
        if ((event.target as HTMLElement).closest('[aria-pressed]')) return;
        event.preventDefault();
        void navigate({ to: '/news/$newsId', params: { newsId: item.id } });
      }}
    >
      <FeedRow item={{ ...item, isUnread: false }} />
      <ReadToggleButton
        isUnread={isUnread}
        onToggle={() => onToggle(isUnread)}
        className={cn(
          'absolute top-1/2 right-3 -translate-y-1/2',
          !isUnread &&
            'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
        )}
      />
    </div>
  );
}

function PlinthList({
  section,
  isOpen,
  detected,
}: Readonly<{
  section: PlinthSection | undefined;
  isOpen: boolean;
  detected?: React.ReactNode;
}>) {
  const { resolveUnread, setRead } = useReadToggle();
  const { ref, maxHeight } = useViewportMaxHeight(isOpen);
  return (
    <div className="home-plinth__body" aria-hidden={!isOpen}>
      <div className="min-h-0 overflow-hidden">
        <div ref={ref} className="home-plinth__scroll" style={{ maxHeight }}>
          {detected && <div className="px-1.5 pb-1.5">{detected}</div>}
          {!detected && section && (
            <div key={section.id} className="px-1.5 pb-1.5">
              <ItemGroup>
                {section.items.slice(0, 3).map((item, index) => (
                  <PlinthRow
                    key={item.id}
                    item={item}
                    index={index}
                    isUnread={resolveUnread(item.id, true)}
                    onToggle={(isUnread) => setRead(item.id, isUnread)}
                  />
                ))}
              </ItemGroup>
              <Link
                to="/inbox"
                tabIndex={isOpen ? undefined : -1}
                className="group flex items-center justify-center gap-1 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Alle im Posteingang ansehen
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function scopeToWorkspace(feed: HomeFeed): HomeFeed {
  return {
    ...feed,
    routineResults: feed.routineResults.slice(0, 1),
    news: [],
    tasks: feed.tasks.slice(0, 1),
    unreadRoutineCount: Math.min(feed.unreadRoutineCount, 1),
    unreadNewsCount: 0,
  };
}

const SUGGESTION_ROTATE_MS = 8000;

function OpenContent({
  openId,
  suggestion,
  detection,
  onClose,
  onPromptSend,
  onPromptSelect,
  onDismissDetection,
  onPickIdea,
}: Readonly<{
  openId: string | null;
  suggestion: PlinthSuggestion;
  detection: HomeFeed['detection'];
  onClose: () => void;
  onPromptSend: (text: string) => void;
  onPromptSelect: (text: string) => void;
  onDismissDetection: () => void;
  onPickIdea: (index: number) => void;
}>) {
  if (openId === 'suggestion') {
    return (
      <SuggestionCard
        suggestion={suggestion}
        onSend={(text) => {
          onClose();
          onPromptSend(text);
        }}
        onEdit={(text) => {
          onClose();
          onPromptSelect(text);
        }}
      >
        <MoreIdeas currentId={suggestion.id} onPick={onPickIdea} />
      </SuggestionCard>
    );
  }
  if (openId !== 'detected' || !detection) return null;
  return (
    <DetectionCard
      detection={detection}
      onDismiss={() => {
        onDismissDetection();
        onClose();
      }}
    >
      <MoreIdeas
        currentId={detection.kind === 'routine' ? 'routine' : null}
        onPick={onPickIdea}
      />
    </DetectionCard>
  );
}

export function HomePlinth({
  feed: rawFeed,
  isBrand = false,
  workspaceId = null,
  isSample = false,
  onPromptSelect,
  onPromptSend,
}: Readonly<{
  feed: HomeFeed;
  isBrand?: boolean;
  workspaceId?: string | null;
  isSample?: boolean;
  onPromptSelect: (text: string) => void;
  onPromptSend: (text: string) => void;
}>) {
  const feed = isSample && workspaceId ? scopeToWorkspace(rawFeed) : rawFeed;
  const [seenIds, markSeen] = useSeenIds();
  const [hiddenIds, setHiddenIds] = useState(() => seenIds);
  if (seenIds.size === 0 && hiddenIds.size > 0) setHiddenIds(seenIds);
  const sections = buildPlinthSections(feed, hiddenIds);
  const [openId, setOpenId] = useState<string | null>(null);
  const [shownSection, setShownSection] = useState<PlinthSection>();
  const bumped = useArrivalBumps(sections);
  const { box, registerChip } = useSlidingIndicator(openId);
  const [close] = useState(() => () => setOpenId(null));
  useOutsideClose(openId, close);

  const isQuiet = sections.length === 0;
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const suggestion = SUGGESTIONS[suggestionIndex % SUGGESTIONS.length];
  const showsSuggestion = isQuiet && feed.routines.length > 0;
  const [isHovered, setIsHovered] = useState(false);
  const isRotating = showsSuggestion && openId === null && !isHovered;
  useEffect(() => {
    if (!isRotating) return;
    const timer = window.setInterval(
      () => setSuggestionIndex((current) => current + 1),
      SUGGESTION_ROTATE_MS,
    );
    return () => window.clearInterval(timer);
  }, [isRotating]);
  const pickIdea = (index: number) => {
    setSuggestionIndex(index);
    setOpenId('suggestion');
  };
  const status = plinthStatus(feed);
  const [detectedDismissed, setDetectedDismissed] = useState(false);
  const visibleStatus =
    status?.kind === 'detected' && detectedDismissed ? null : status;
  const showsRightSuggestion =
    !isQuiet && !visibleStatus && feed.routines.length > 0;

  const showsCard =
    openId === 'suggestion' || (openId === 'detected' && !!feed.detection);

  function toggle(id: string) {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    const section = sections.find((candidate) => candidate.id === id);
    setShownSection(section);
    if (section) markSeen(section.items.map((item) => item.id));
  }

  return (
    <div className="relative h-9">
      <div
        className="home-plinth absolute inset-x-4 -top-5"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        data-open={openId ? true : undefined}
        data-brand={isBrand || undefined}
        data-quiet={isQuiet || undefined}
      >
        <div className="home-plinth__bar flex items-center gap-1 text-xs">
          <div className="relative flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            <span
              className="home-plinth__indicator"
              data-visible={box ? true : undefined}
              style={
                box
                  ? { transform: `translateX(${box.left}px)`, width: box.width }
                  : undefined
              }
              aria-hidden
            />
            {isQuiet && !showsSuggestion && <FirstRoutineInvite />}
            {showsSuggestion && (
              <SuggestionChip
                key={suggestion.id}
                suggestion={suggestion}
                isOpen={openId === 'suggestion'}
                register={registerChip('suggestion')}
                onToggle={() => toggle('suggestion')}
              />
            )}
            {!isQuiet &&
              sections.map((section) => (
                <SectionChip
                  key={section.id}
                  section={section}
                  isActive={openId === section.id}
                  isBumped={bumped.has(section.id)}
                  register={registerChip(section.id)}
                  onToggle={() => toggle(section.id)}
                />
              ))}
          </div>
          {visibleStatus && (
            <PlinthStatusLine
              status={visibleStatus}
              isDetectedOpen={openId === 'detected'}
              onDetectedClick={() => toggle('detected')}
            />
          )}
          {showsRightSuggestion && (
            <button
              type="button"
              aria-expanded={openId === 'suggestion'}
              onClick={() => toggle('suggestion')}
              className="home-plinth__chip home-plinth__detected ml-auto shrink-0"
            >
              <Lightbulb className="home-plinth__icon size-3.5" />
              Vorschlag
            </button>
          )}
        </div>
        <PlinthList
          section={shownSection}
          isOpen={openId !== null}
          detected={
            showsCard && (
              <OpenContent
                openId={openId}
                suggestion={suggestion}
                detection={feed.detection}
                onClose={close}
                onPromptSend={onPromptSend}
                onPromptSelect={onPromptSelect}
                onDismissDetection={() => setDetectedDismissed(true)}
                onPickIdea={pickIdea}
              />
            )
          }
        />
      </div>
    </div>
  );
}
