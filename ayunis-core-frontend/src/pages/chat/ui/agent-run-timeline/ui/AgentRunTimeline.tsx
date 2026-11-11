import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, CircleCheck } from 'lucide-react';
import { cn } from '@ayunis/ui/lib/cn';
import { Markdown } from '@/widgets/markdown';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@ayunis/ui/components/collapsible';
import type {
  ActivityRunBlock,
  AgentRunBlock,
  AgentRunUnit,
  InlineToolRunBlock,
  ToolTimelineStep,
} from '@/pages/chat/ui/agent-run-timeline/model/types';
import ResponseStartOrb from '@/pages/chat/ui/ResponseStartOrb';
import AgentRunTimelineRow from './AgentRunTimelineRow';
import { renderRichToolCard } from '@/pages/chat/ui/agent-run-timeline/lib/render-rich-tool-card';
import { getArtifactToolTarget } from '@/pages/chat/ui/agent-run-timeline/lib/tool-classification';
import { useTrackProductiveOutcome } from '@/shared/lib/openpanel-outcomes';
import {
  type ToolCallConfirmation,
  useToolCallConfirmation,
} from '@/pages/chat/ui/agent-run-timeline/model/tool-call-confirmation';

interface AgentRunTimelineProps {
  unit: AgentRunUnit;
  threadId?: string;
  onOpenArtifact?: (artifactId: string) => void;
}

export default function AgentRunTimeline({
  unit,
  threadId,
  onOpenArtifact,
}: Readonly<AgentRunTimelineProps>) {
  const showPendingContinuation =
    unit.isStreaming &&
    unit.blocks.at(-1)?.kind !== 'text' &&
    !unit.blocks.some(hasInProgressStep);

  return (
    // translate="no" while streaming: browser page translation rewrites
    // text nodes mid-stream, freezing each paragraph at its first chunk.
    <div
      className="flex flex-col gap-3 w-full"
      translate={unit.isStreaming ? 'no' : undefined}
    >
      {unit.blocks.map((block, index) => (
        <RunBlock
          key={block.key}
          block={block}
          index={index}
          isStreaming={unit.isStreaming && index === unit.blocks.length - 1}
          hasFollowingText={unit.blocks
            .slice(index + 1)
            .some((candidate) => candidate.kind === 'text')}
          threadId={threadId}
          onOpenArtifact={onOpenArtifact}
        />
      ))}
      {showPendingContinuation && <ResponseStartOrb />}
    </div>
  );
}

function hasInProgressStep(block: AgentRunBlock): boolean {
  if (block.kind === 'activity' || block.kind === 'rich-tool') {
    return block.steps.some((step) => step.status === 'in_progress');
  }
  return block.kind === 'pending-tool' && block.step.status === 'in_progress';
}

interface RunBlockProps {
  block: AgentRunBlock;
  index: number;
  /** True only for the block the streaming run is currently writing. */
  isStreaming: boolean;
  hasFollowingText: boolean;
  threadId?: string;
  onOpenArtifact?: (artifactId: string) => void;
}

const RunBlock = memo(function RunBlock({
  block,
  index,
  isStreaming,
  hasFollowingText,
  threadId,
  onOpenArtifact,
}: Readonly<RunBlockProps>) {
  if (block.kind === 'activity') {
    return <ActivityBlock block={block} hasFollowingText={hasFollowingText} />;
  }
  if (block.kind === 'routine-finished') {
    return <RoutineFinishedMarker />;
  }
  if (block.kind === 'rich-tool' || block.kind === 'pending-tool') {
    return (
      <InlineToolBlock
        block={block}
        index={index}
        threadId={threadId}
        onOpenArtifact={onOpenArtifact}
      />
    );
  }
  return <AnswerText text={block.content.text} isStreaming={isStreaming} />;
});

function AnswerText({
  text,
  isStreaming,
}: Readonly<{ text: string; isStreaming: boolean }>) {
  const trackOutcome = useTrackProductiveOutcome();
  const trackCodeCopied = useCallback(
    () => trackOutcome({ outcome_type: 'code_copied', output_type: 'code' }),
    [trackOutcome],
  );
  return (
    <div data-copyable="true">
      <Markdown
        isStreaming={isStreaming}
        renderLegalReferences
        renderSourceCitations
        renderUrlReferences
        onCodeCopied={trackCodeCopied}
      >
        {text}
      </Markdown>
    </div>
  );
}

function RoutineFinishedMarker() {
  const { t } = useTranslation('chat');
  return (
    <div
      className="flex items-center gap-2 text-sm text-muted-foreground"
      data-testid="routine-finished"
    >
      <CircleCheck className="size-4 text-brand" />
      <span>{t('chat.routine.finished')}</span>
    </div>
  );
}

function ActivityBlock({
  block,
  hasFollowingText,
}: Readonly<{ block: ActivityRunBlock; hasFollowingText: boolean }>) {
  const { t } = useTranslation('chat');
  const isActive = block.steps.some((step) => step.status === 'in_progress');
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const [previousHasFollowingText, setPreviousHasFollowingText] =
    useState(hasFollowingText);
  if (previousHasFollowingText !== hasFollowingText) {
    setPreviousHasFollowingText(hasFollowingText);
    setUserOpen(null);
  }
  const open = userOpen ?? !hasFollowingText;
  const headerLabel = isActive
    ? t('chat.timeline.working')
    : t('chat.timeline.summary', { count: block.steps.length });

  return (
    <Collapsible open={open} onOpenChange={setUserOpen}>
      <div className="rounded-lg border border-border bg-muted/30">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-between gap-2 w-full px-3 py-2 text-left"
          >
            <span
              className={cn(
                'text-sm text-muted-foreground',
                isActive && 'animate-pulse',
              )}
            >
              {headerLabel}
            </span>
            <ActivityChevron open={open} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-1">
            {block.steps.map((step) => (
              <AgentRunTimelineRow key={step.key} step={step} />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function ActivityChevron({ open }: Readonly<{ open: boolean }>) {
  return (
    <ChevronDown
      className={cn(
        'h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform',
        open && 'rotate-180',
      )}
    />
  );
}

interface InlineToolBlockProps {
  block: InlineToolRunBlock;
  index: number;
  threadId?: string;
  onOpenArtifact?: (artifactId: string) => void;
}

function InlineToolBlock({
  block,
  index,
  threadId,
  onOpenArtifact,
}: Readonly<InlineToolBlockProps>) {
  const steps = block.kind === 'rich-tool' ? block.steps : [block.step];
  const latestStep = steps[steps.length - 1];
  // A still-streaming mutation step has no parseable artifact_id yet, which
  // would disable the card's open action; fall back to the newest step whose
  // target is resolved so the merged card stays openable while args stream.
  const cardStep =
    [...steps].reverse().find((step) => getArtifactToolTarget(step.toolUse)) ??
    latestStep;
  const card =
    block.kind === 'rich-tool'
      ? renderRichToolCard({
          toolUse: cardStep.toolUse,
          result: cardStep.result,
          decision: cardStep.decision,
          isStreaming: latestStep.status === 'in_progress',
          threadId,
          onOpenArtifact,
          index,
        })
      : null;
  const confirmation = useToolCallConfirmation();
  const rowSteps = steps.filter((step) =>
    hasRunOrIsRunning(step, confirmation),
  );
  return (
    <div className="flex flex-col gap-2">
      {rowSteps.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-1">
          {rowSteps.map((step) => (
            <AgentRunTimelineRow key={step.key} step={step} />
          ))}
        </div>
      )}
      {card}
    </div>
  );
}

// A call awaiting confirmation has not run, and a rejected one never does.
// While the decisions are sent, every call of the paused turn is in
// progress; only the confirmed ones run.
function hasRunOrIsRunning(
  step: ToolTimelineStep,
  { decisionFor }: ToolCallConfirmation,
): boolean {
  if (!step.toolUse.requiresConfirmation) return true;
  if (step.decision) return step.decision === 'confirmed';
  return (
    step.status === 'in_progress' &&
    decisionFor(step.toolUse.id)?.approved === true
  );
}
