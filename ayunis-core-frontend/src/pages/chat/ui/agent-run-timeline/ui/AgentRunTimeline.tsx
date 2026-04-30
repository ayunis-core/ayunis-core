import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/shared/lib/shadcn/utils';
import { Markdown } from '@/widgets/markdown';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/shadcn/collapsible';
import type { AgentRunUnit, TimelineStep } from '../model/types';
import AgentRunTimelineRow from './AgentRunTimelineRow';
import { renderRichToolCard } from '../lib/render-rich-tool-card';

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
  const { t } = useTranslation('chat');
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const [lastStreaming, setLastStreaming] = useState(unit.isStreaming);
  if (lastStreaming !== unit.isStreaming) {
    setLastStreaming(unit.isStreaming);
    setUserOpen(null);
  }
  const open = userOpen ?? unit.isStreaming;

  const displaySteps = withTrailingThinking(
    unit.steps,
    unit.isStreaming,
    unit.finalText.length > 0,
  );
  const stepCount = unit.steps.length;

  const headerLabel = unit.isStreaming
    ? t('chat.timeline.working')
    : t('chat.timeline.summary', { count: stepCount });

  const showHeader = unit.isStreaming || stepCount > 0;

  return (
    <div className="flex flex-col gap-3 w-full">
      {showHeader && (
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
                    unit.isStreaming && 'animate-pulse',
                  )}
                >
                  {headerLabel}
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform',
                    open && 'rotate-180',
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-3 pb-3 pt-1">
                {displaySteps.length === 0 ? (
                  <span className="text-sm text-muted-foreground animate-pulse">
                    {t('chat.timeline.thinking')}
                  </span>
                ) : (
                  <div>
                    {displaySteps.map((step) => (
                      <AgentRunTimelineRow key={step.key} step={step} />
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}

      {unit.richCards.map((card, i) => {
        const node = renderRichToolCard({
          toolUse: card.toolUse,
          result: card.result,
          isStreaming: unit.isStreaming,
          threadId,
          onOpenArtifact,
          index: i,
        });
        return node ? <div key={card.key}>{node}</div> : null;
      })}

      {unit.finalText.length > 0 && (
        <div data-copyable="true" className="space-y-2">
          {unit.finalText.map((text, i) => (
            <Markdown key={`final-text-${i}`}>{text.text}</Markdown>
          ))}
        </div>
      )}
    </div>
  );
}

function withTrailingThinking(
  steps: TimelineStep[],
  isStreaming: boolean,
  hasFinalText: boolean,
): TimelineStep[] {
  if (!isStreaming || hasFinalText) return steps;
  if (steps.length > 0 && steps[steps.length - 1].status === 'in_progress') {
    return steps;
  }
  return [
    ...steps,
    {
      kind: 'thinking',
      key: `pending-thinking-${steps.length}`,
      transcript: '',
      status: 'in_progress',
    },
  ];
}
