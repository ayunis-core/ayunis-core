import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { cn } from '@ayunis/ui/lib/cn';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@ayunis/ui/components/collapsible';
import { PiiText } from '@ayunis/chat/markdown';
import type {
  TimelineStep,
  ToolTimelineStep,
  StepStatus,
  SourceProcessingTimelineStep,
} from './types';
import { getToolActionLabel } from './get-tool-action-label';

import { useTimelinePresentation } from './timeline-presentation';
import type { ToolCards } from './tool-card-types';

interface AgentRunTimelineRowProps {
  step: TimelineStep;
}

export default function AgentRunTimelineRow({
  step,
}: Readonly<AgentRunTimelineRowProps>) {
  const { t } = useTranslation('chat');
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const open =
    userOpen ?? (step.kind === 'thinking' && step.status === 'in_progress');
  const { toolCards } = useTimelinePresentation();
  const { label, hasDetails, details, expandable } = getStepView(
    step,
    t,
    toolCards,
  );

  const header = (
    <StepHeader step={step} label={label} open={open} expandable={expandable} />
  );
  const hint = step.kind === 'tool' && step.status === 'error' && (
    <p className="ml-6 mb-1 text-xs text-muted-foreground">
      {t('chat.timeline.invalidToolCallHint')}
    </p>
  );

  if (!hasDetails)
    return (
      <>
        {header}
        {hint}
      </>
    );

  return (
    <Collapsible open={open} onOpenChange={setUserOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full text-left hover:text-foreground transition-colors"
        >
          {header}
        </button>
      </CollapsibleTrigger>
      {hint}
      <CollapsibleContent>
        <div className="ml-6 mb-1 flex flex-col gap-2">{details}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function StepHeader({
  step,
  label,
  open,
  expandable,
}: Readonly<{
  step: TimelineStep;
  label: string;
  open: boolean;
  expandable: boolean;
}>) {
  const toolUse = step.kind === 'tool' ? step.toolUse : undefined;
  return (
    <div
      className="flex items-center gap-2 py-1 text-sm text-muted-foreground"
      data-testid={
        step.kind === 'source_processing'
          ? 'attachment-progress'
          : toolUse && 'agent-run-tool-step'
      }
      data-stage={step.kind === 'source_processing' ? step.stage : undefined}
      data-tool-name={toolUse?.name}
      data-status={step.status}
    >
      <StepIcon step={step} />
      <span className={cn(step.status === 'in_progress' && 'animate-pulse')}>
        {label}
      </span>
      {expandable && (
        <ChevronRight
          className={cn(
            'h-3.5 w-3.5 flex-shrink-0 transition-transform',
            open && 'rotate-90',
          )}
        />
      )}
    </div>
  );
}

function StepIcon({ step }: Readonly<{ step: TimelineStep }>) {
  if (step.kind === 'skill_instruction') {
    return <Sparkles className="h-4 w-4 flex-shrink-0 text-muted-foreground" />;
  }
  const integration =
    step.kind === 'tool' ? step.toolUse.integration : undefined;
  return (
    <StatusIcon
      status={step.status}
      logoUrl={integration?.logoUrl ?? undefined}
      logoAlt={integration?.name}
    />
  );
}

interface StatusIconProps {
  status: StepStatus;
  logoUrl?: string;
  logoAlt?: string;
}

function StatusIcon({ status, logoUrl, logoAlt }: Readonly<StatusIconProps>) {
  if (status === 'in_progress') {
    return (
      <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-muted-foreground" />
    );
  }
  if (status === 'error') {
    return <AlertCircle className="h-4 w-4 flex-shrink-0 text-destructive" />;
  }
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={logoAlt ?? ''}
        className="h-4 w-4 flex-shrink-0 rounded-sm object-contain"
      />
    );
  }
  return <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-primary" />;
}

interface StepView {
  label: string;
  hasDetails: boolean;
  expandable: boolean;
  details: React.ReactNode;
}

function getStepView(
  step: TimelineStep,
  t: ReturnType<typeof useTranslation>['t'],
  toolCards: ToolCards,
): StepView {
  if (step.kind === 'source_processing') return sourceProcessingView(step, t);

  if (step.kind === 'thinking') {
    return {
      label: t('chat.timeline.thoughtProcess'),
      hasDetails: step.transcript.length > 0,
      expandable: true,
      details: (
        <ThinkingTranscript
          transcript={step.transcript}
          streaming={step.status === 'in_progress'}
        />
      ),
    };
  }

  if (step.kind === 'skill_instruction') {
    return {
      label: t('chat.skillInstructions'),
      hasDetails: step.text.length > 0,
      expandable: true,
      details: (
        <div className="max-h-40 overflow-y-auto">
          <div className="text-xs text-muted-foreground whitespace-pre-wrap">
            {step.text}
          </div>
        </div>
      ),
    };
  }

  return toolStepView(step, t, toolCards);
}

function toolStepLabel(
  step: ToolTimelineStep,
  t: ReturnType<typeof useTranslation>['t'],
  toolCards: ToolCards,
): string {
  if (step.status === 'error') return t('chat.timeline.invalidToolCall');
  if (step.toolUse.name.length === 0)
    return t('chat.timeline.preparingToolCall');
  const action = getToolActionLabel(step.toolUse, t, toolCards);
  return action.target ? `${action.verb}: ${action.target}` : action.verb;
}

function toolStepView(
  step: ToolTimelineStep,
  t: ReturnType<typeof useTranslation>['t'],
  toolCards: ToolCards,
): StepView {
  const params = step.toolUse.params as Record<string, unknown> | undefined;
  const hasParams = params !== undefined && Object.keys(params).length > 0;
  const streamedArguments = step.toolUse.stream?.argumentsJson;
  const input =
    streamedArguments ||
    (hasParams ? JSON.stringify(params, null, 2) : undefined);
  const result = step.result || undefined;
  const hasDetails = input !== undefined || result !== undefined;
  return {
    label: toolStepLabel(step, t, toolCards),
    hasDetails,
    expandable: hasDetails,
    details: <ToolStepDetails input={input} result={result} />,
  };
}

function ToolStepDetails({
  input,
  result,
}: Readonly<{ input?: string; result?: string }>) {
  return (
    <>
      {input && (
        <div className="max-h-32 overflow-y-auto">
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
            {input}
          </pre>
        </div>
      )}
      {result && (
        <div className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
          <PiiText>{result}</PiiText>
        </div>
      )}
    </>
  );
}

interface ThinkingTranscriptProps {
  transcript: string;
  streaming: boolean;
}

function ThinkingTranscript({
  transcript,
  streaming,
}: Readonly<ThinkingTranscriptProps>) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (streaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, streaming]);

  return (
    <div
      ref={scrollRef}
      className={cn('max-h-40 overflow-y-auto', streaming && 'min-h-24')}
    >
      <div className="text-xs text-muted-foreground whitespace-pre-wrap">
        <PiiText>{transcript}</PiiText>
      </div>
    </div>
  );
}

function sourceProcessingView(
  step: SourceProcessingTimelineStep,
  t: ReturnType<typeof useTranslation>['t'],
): StepView {
  const stage =
    step.stage === 'extracting' && step.isAudio ? 'transcribing' : step.stage;
  let label = t(`attachments.timeline.${stage}`, { name: step.sourceName });
  if (step.completed !== undefined && step.unit) {
    const count = t(`attachments.${step.unit}`, { count: step.completed });
    label += ` · ${count}`;
  }
  return { label, hasDetails: false, expandable: false, details: null };
}
