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
import type { AgentRunUnit } from '../model/types';
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

  const stepCount = unit.steps.length;

  const headerLabel = unit.isStreaming
    ? t('chat.timeline.working')
    : t('chat.timeline.summary', { count: stepCount });

  const showHeader = stepCount > 0;

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
                <div>
                  {unit.steps.map((step) => (
                    <AgentRunTimelineRow key={step.key} step={step} />
                  ))}
                </div>
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
