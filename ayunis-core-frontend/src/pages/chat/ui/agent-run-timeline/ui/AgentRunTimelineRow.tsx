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
import { PiiText } from '@/widgets/markdown';
import type {
  TimelineStep,
  StepStatus,
} from '@/pages/chat/ui/agent-run-timeline/model/types';
import { getToolActionLabel } from '@/pages/chat/ui/agent-run-timeline/lib/get-tool-action-label';

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
  const { label, hasDetails, details, expandable } = getStepView(step, t);

  const toolUse = step.kind === 'tool' ? step.toolUse : undefined;
  const integration = toolUse?.integration;
  const header = (
    <div
      className="flex items-center gap-2 py-1 text-sm text-muted-foreground"
      data-testid={toolUse && 'agent-run-tool-step'}
      data-tool-name={toolUse?.name}
      data-status={toolUse && step.status}
    >
      {step.kind === 'skill_instruction' ? (
        <Sparkles className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      ) : (
        <StatusIcon
          status={step.status}
          logoUrl={integration?.logoUrl ?? undefined}
          logoAlt={integration?.name}
        />
      )}
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
): StepView {
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

  const action = getToolActionLabel(step.toolUse, t);
  let label = action.target ? `${action.verb}: ${action.target}` : action.verb;
  if (step.toolUse.name.length === 0) {
    label = t('chat.timeline.preparingToolCall');
  }
  if (step.status === 'error') {
    label = t('chat.timeline.invalidToolCall');
  }
  const params = step.toolUse.params as Record<string, unknown> | undefined;
  const hasParams = params !== undefined && Object.keys(params).length > 0;
  const streamedArguments = step.toolUse.stream?.argumentsJson;
  const hasStreamedArguments =
    streamedArguments !== undefined && streamedArguments.length > 0;
  const hasResult = typeof step.result === 'string' && step.result.length > 0;
  const hasDetails = hasStreamedArguments || hasParams || hasResult;
  return {
    label,
    hasDetails,
    expandable: hasDetails,
    details: (
      <>
        {hasStreamedArguments && (
          <div className="max-h-32 overflow-y-auto">
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
              {streamedArguments}
            </pre>
          </div>
        )}
        {!hasStreamedArguments && hasParams && (
          <div className="max-h-32 overflow-y-auto">
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
              {JSON.stringify(step.toolUse.params, null, 2)}
            </pre>
          </div>
        )}
        {hasResult && (
          <div className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
            <PiiText>{step.result ?? ''}</PiiText>
          </div>
        )}
      </>
    ),
  };
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
