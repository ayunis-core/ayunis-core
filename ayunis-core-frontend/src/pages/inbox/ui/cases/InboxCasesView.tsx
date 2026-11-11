import { useState } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@ayunis/ui/lib/cn';
import AppLayout from '@/layouts/app-layout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import {
  formatReceived,
  SAMPLE_CASES,
  type CaseStage,
  type CaseItem,
} from '@/pages/inbox/model/sample-cases';
import { CaseChannelIcon } from './CaseChannelIcon';
import { CaseDetail, type CaseState } from './CaseDetail';

type CaseTab = 'mine' | 'team' | 'done';

const STATUS_LABELS: Record<CaseStage, string> = {
  new: 'Neu',
  researched: 'Recherchiert',
  drafted: 'Entwurf fertig',
  sent: 'Versendet',
};

const TABS: { id: CaseTab; label: string }[] = [
  { id: 'mine', label: 'Meine' },
  { id: 'team', label: 'Ordnungsamt' },
  { id: 'done', label: 'Erledigt' },
];

function initialStates(): Record<string, CaseState> {
  return Object.fromEntries(
    SAMPLE_CASES.map((item) => [
      item.id,
      { stage: item.initialStage, assignee: item.assignee, draft: item.draft },
    ]),
  );
}

function inTab(tab: CaseTab, state: CaseState) {
  if (tab === 'done') return state.stage === 'sent';
  if (state.stage === 'sent') return false;
  if (tab === 'mine') return state.assignee === 'Sofia Prototyp';
  return true;
}

function CaseRow({
  item,
  state,
  isSelected,
  onSelect,
}: Readonly<{
  item: CaseItem;
  state: CaseState;
  isSelected: boolean;
  onSelect: () => void;
}>) {
  const stageLabel = STATUS_LABELS[state.stage];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={isSelected}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
        isSelected ? 'bg-accent' : 'hover:bg-accent/50',
      )}
    >
      <CaseChannelIcon
        channel={item.channel}
        className="mt-0.5 size-4 shrink-0"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium">{item.subject}</span>
        <span className="truncate text-xs text-muted-foreground">
          {item.sender} · {formatReceived(item.receivedAt)}
        </span>
        <span className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="rounded-full bg-muted px-1.5 py-0.5">
            {stageLabel}
          </span>
          {!state.assignee && (
            <span className="rounded-full border border-dashed px-1.5 py-0.5">
              Nicht zugewiesen
            </span>
          )}
          {item.dueInDays !== null &&
            item.dueInDays <= 5 &&
            state.stage !== 'sent' && (
              <span className="text-amber-600">
                Frist in {item.dueInDays} Tagen
              </span>
            )}
        </span>
      </span>
    </button>
  );
}

function TabBar({
  tab,
  counts,
  onTab,
}: Readonly<{
  tab: CaseTab;
  counts: Record<CaseTab, number>;
  onTab: (tab: CaseTab) => void;
}>) {
  return (
    <div className="flex items-center gap-1 px-1 pb-2">
      {TABS.map((entry) => (
        <button
          key={entry.id}
          type="button"
          onClick={() => onTab(entry.id)}
          className={cn(
            'whitespace-nowrap rounded-md px-2 py-1 text-xs',
            tab === entry.id
              ? 'bg-accent text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {entry.label}
          <span className="ml-1 tabular-nums opacity-60">
            {counts[entry.id]}
          </span>
        </button>
      ))}
    </div>
  );
}

export function InboxCasesView() {
  const [states, setStates] = useState(initialStates);
  const [tab, setTab] = useState<CaseTab>('mine');
  const [selectedId, setSelectedId] = useState<string>(SAMPLE_CASES[0].id);
  const items = SAMPLE_CASES.filter(
    (item) => inTab(tab, states[item.id]) || item.id === selectedId,
  );
  const counts = Object.fromEntries(
    TABS.map((entry) => [
      entry.id,
      SAMPLE_CASES.filter((item) => inTab(entry.id, states[item.id])).length,
    ]),
  ) as Record<CaseTab, number>;
  const selected = SAMPLE_CASES.find((item) => item.id === selectedId);
  const update = (id: string, next: Partial<CaseState>) =>
    setStates((current) => ({ ...current, [id]: { ...current[id], ...next } }));
  const switchTab = (next: CaseTab) => {
    setTab(next);
    const first = SAMPLE_CASES.find((item) => inTab(next, states[item.id]));
    if (first) setSelectedId(first.id);
  };

  return (
    <AppLayout>
      <div className="absolute inset-0 flex min-h-0 flex-col px-2 pb-2 sm:px-4 sm:pb-4">
        <div className="content-area-page-header">
          <ContentAreaHeader
            breadcrumbs={[{ label: 'Posteingang' }]}
            badge={
              <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                {counts.mine} offen für Sie
              </span>
            }
          />
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(200px,260px)_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] gap-4 pt-2 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] xl:gap-6">
          <aside className="flex min-h-0 flex-col">
            <TabBar tab={tab} counts={counts} onTab={switchTab} />
            <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
              {items.map((item) => (
                <CaseRow
                  key={item.id}
                  item={item}
                  state={states[item.id]}
                  isSelected={item.id === selectedId}
                  onSelect={() => setSelectedId(item.id)}
                />
              ))}
              {items.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Hier ist gerade nichts.
                </p>
              )}
            </div>
          </aside>
          <section
            key={selectedId}
            className="min-h-0 overflow-y-auto border-l border-border/60 pr-2 pl-4 pt-2 xl:pl-8"
          >
            {selected ? (
              <CaseDetail
                key={selected.id}
                item={selected}
                state={states[selected.id]}
                onChange={(next) => update(selected.id, next)}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <Inbox className="size-6" />
                Wählen Sie links einen Vorgang aus.
              </div>
            )}
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
