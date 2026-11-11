import { useState } from 'react';
import {
  BookOpen,
  Check,
  FileText,
  Loader2,
  MessagesSquare,
  Send,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import { Textarea } from '@ayunis/ui/components/textarea';
import { cn } from '@ayunis/ui/lib/cn';
import {
  CHANNEL_LABELS,
  formatReceived,
  STAGES,
  type CaseItem,
  type CaseStage,
} from '@/pages/inbox/model/sample-cases';
import { CaseChannelIcon } from './CaseChannelIcon';

export interface CaseState {
  stage: CaseStage;
  assignee: string | null;
  draft: string;
}

interface CaseDetailProps {
  item: CaseItem;
  state: CaseState;
  onChange: (next: Partial<CaseState>) => void;
}

const STAGE_ORDER: CaseStage[] = STAGES.map((stage) => stage.id);

function reached(state: CaseState, stage: CaseStage) {
  return STAGE_ORDER.indexOf(state.stage) >= STAGE_ORDER.indexOf(stage);
}

function useSimulated(onDone: () => void) {
  const [isBusy, setBusy] = useState(false);
  const run = () => {
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      onDone();
    }, 1400);
  };
  return { isBusy, run };
}

export function CaseDetail({
  item,
  state,
  onChange,
}: Readonly<CaseDetailProps>) {
  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-10">
      <CaseHeading item={item} state={state} onChange={onChange} />
      <CaseStepper stage={state.stage} />
      <RequestSection item={item} />
      <ResearchSection item={item} state={state} onChange={onChange} />
      {reached(state, 'researched') && (
        <AnswerSection item={item} state={state} onChange={onChange} />
      )}
    </article>
  );
}

function CaseHeading({ item, state, onChange }: Readonly<CaseDetailProps>) {
  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <CaseChannelIcon channel={item.channel} className="mt-1 size-5" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="text-lg font-semibold">{item.subject}</h1>
          <p className="text-sm text-muted-foreground">
            {item.sender} · {CHANNEL_LABELS[item.channel]} über {item.via} ·{' '}
            {formatReceived(item.receivedAt)}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 pl-8">
        {item.dueInDays !== null && state.stage !== 'sent' && (
          <Badge variant="outline">Frist in {item.dueInDays} Tagen</Badge>
        )}
        {state.assignee ? (
          <Badge variant="secondary">Bearbeitet von {state.assignee}</Badge>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7"
            onClick={() => onChange({ assignee: 'Sofia Prototyp' })}
          >
            <UserPlus />
            Übernehmen
          </Button>
        )}
      </div>
    </header>
  );
}

function CaseStepper({ stage }: Readonly<{ stage: CaseStage }>) {
  const current = STAGE_ORDER.indexOf(stage) + 1;
  return (
    <ol className="flex flex-wrap items-center gap-2 pl-8">
      {STAGES.map((step, index) => (
        <li key={step.id} className="flex items-center gap-2">
          <span
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs',
              index < current && 'bg-muted text-muted-foreground',
              index === current && 'bg-primary text-primary-foreground',
              index > current && 'border border-dashed text-muted-foreground',
            )}
          >
            {index < current && <Check className="size-3" />}
            {step.label}
          </span>
          {index < STAGES.length - 1 && (
            <span className="h-px w-4 bg-border" aria-hidden />
          )}
        </li>
      ))}
    </ol>
  );
}

function Section({
  title,
  icon,
  children,
}: Readonly<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}>) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {title}
      </h2>
      <div className="pl-6">{children}</div>
    </section>
  );
}

function RequestSection({ item }: Readonly<{ item: CaseItem }>) {
  if (item.mention) {
    return (
      <Section
        title="Erwähnung im Chat"
        icon={<MessagesSquare className="size-4" />}
      >
        <div className="flex flex-col gap-2 rounded-lg border p-3 text-sm">
          <p className="text-xs text-muted-foreground">
            {item.mention.threadTitle} · geteilt von {item.sender}
          </p>
          {item.mention.messages.map((message, index) => (
            <p key={index} className="text-muted-foreground">
              <span className="font-medium text-foreground">
                {message.author}:
              </span>{' '}
              {message.text}
            </p>
          ))}
          <p className="rounded-md bg-accent px-2 py-1.5">
            <span className="font-medium">{item.sender}:</span> {item.request}
          </p>
        </div>
      </Section>
    );
  }
  return (
    <Section title="Anfrage" icon={<FileText className="size-4" />}>
      <p className="whitespace-pre-line rounded-lg border p-3 text-sm">
        {item.request}
      </p>
    </Section>
  );
}

function ResearchSection({ item, state, onChange }: Readonly<CaseDetailProps>) {
  const research = useSimulated(() => onChange({ stage: 'researched' }));
  const hasResearch = reached(state, 'researched');
  return (
    <Section title="Recherche" icon={<BookOpen className="size-4" />}>
      {hasResearch ? (
        <div className="flex flex-col gap-2">
          {item.initialStage !== 'new' && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="size-3" />
              Ayunis hat beim Eingang automatisch in Ihrem Wissen recherchiert.
            </p>
          )}
          {item.findings.map((finding) => (
            <div key={finding.title} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{finding.title}</p>
              <p className="text-xs text-muted-foreground">{finding.source}</p>
              <p className="mt-1.5 text-muted-foreground">{finding.excerpt}</p>
            </div>
          ))}
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          disabled={research.isBusy}
          onClick={research.run}
        >
          {research.isBusy ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Sparkles />
          )}
          {research.isBusy
            ? 'Durchsuche Satzungen und Gesetze …'
            : 'Recherche starten'}
        </Button>
      )}
    </Section>
  );
}

function AnswerSection({ item, state, onChange }: Readonly<CaseDetailProps>) {
  const drafting = useSimulated(() => onChange({ stage: 'drafted' }));
  const sending = useSimulated(() => onChange({ stage: 'sent' }));
  if (!reached(state, 'drafted')) {
    return (
      <Section title="Antwort" icon={<Send className="size-4" />}>
        <Button size="sm" disabled={drafting.isBusy} onClick={drafting.run}>
          {drafting.isBusy ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Sparkles />
          )}
          {drafting.isBusy ? 'Schreibe Entwurf …' : 'Antwortentwurf erstellen'}
        </Button>
      </Section>
    );
  }
  const isMention = item.channel === 'mention';
  const isSent = state.stage === 'sent';
  return (
    <Section
      title={isMention ? 'Antwort im Chat' : 'Antwort'}
      icon={<Send className="size-4" />}
    >
      <div className="flex flex-col gap-3">
        <Textarea
          value={state.draft}
          disabled={isSent}
          onChange={(event) => onChange({ draft: event.target.value })}
          className="min-h-56 text-sm"
        />
        {isSent ? (
          <SentNote item={item} />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={sending.isBusy} onClick={sending.run}>
              {sending.isBusy ? <Loader2 className="animate-spin" /> : <Send />}
              {isMention ? `An ${item.sender} antworten` : sendLabel(item)}
            </Button>
            {!isMention && (
              <Button size="sm" variant="ghost">
                <MessagesSquare />
                Im Chat weiterbearbeiten
              </Button>
            )}
          </div>
        )}
      </div>
    </Section>
  );
}

function sendLabel(item: CaseItem) {
  if (item.channel === 'ozg') return 'Bescheid ins Fachverfahren übergeben';
  if (item.channel === 'letter') return 'Als Brief mit Briefkopf drucken';
  return `Per E-Mail an ${item.sender} senden`;
}

function SentNote({ item }: Readonly<{ item: CaseItem }>) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted/60 p-3 text-sm">
      <p className="flex items-center gap-1.5 font-medium">
        <Check className="size-4" />
        {item.channel === 'mention'
          ? 'Im Chat beantwortet'
          : 'Versendet · Vorgang erledigt'}
      </p>
      {item.channel !== 'mention' && (
        <p className="text-muted-foreground">
          Anfrage und Antwort wurden in der E-Akte abgelegt (Aktenzeichen 32.10-
          {item.id.slice(-1)}/2026).
        </p>
      )}
    </div>
  );
}
