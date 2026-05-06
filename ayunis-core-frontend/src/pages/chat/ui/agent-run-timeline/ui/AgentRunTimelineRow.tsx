import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/shared/lib/shadcn/utils';
import { ScrollArea } from '@/shared/ui/shadcn/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/shadcn/collapsible';
import { Badge } from '@/shared/ui/shadcn/badge';
import type { TimelineStep, StepStatus } from '../model/types';
import { getToolActionLabel } from '../lib/get-tool-action-label';

interface AgentRunTimelineRowProps {
  step: TimelineStep;
}

export default function AgentRunTimelineRow({
  step,
}: Readonly<AgentRunTimelineRowProps>) {
  const { t } = useTranslation('chat');
  const [open, setOpen] = useState(false);
  const { label, hasDetails, details, expandable } = getStepView(step, t);

  const integration =
    step.kind === 'tool' ? step.toolUse.integration : undefined;
  const header = (
    <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
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

  if (!hasDetails) return header;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full text-left hover:text-foreground transition-colors"
        >
          {header}
        </button>
      </CollapsibleTrigger>
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
        <ScrollArea className="max-h-40">
          <div className="text-xs text-muted-foreground whitespace-pre-wrap">
            {step.transcript}
          </div>
        </ScrollArea>
      ),
    };
  }

  if (step.kind === 'skill_instruction') {
    return {
      label: t('chat.skillInstructions'),
      hasDetails: step.text.length > 0,
      expandable: true,
      details: (
        <ScrollArea className="max-h-40">
          <div className="text-xs text-muted-foreground whitespace-pre-wrap">
            {step.text}
          </div>
        </ScrollArea>
      ),
    };
  }

  const action = getToolActionLabel(step.toolUse, t);
  const label = action.target
    ? `${action.verb}: ${action.target}`
    : action.verb;
  const params = step.toolUse.params as Record<string, unknown> | undefined;
  const hasParams = params !== undefined && Object.keys(params).length > 0;
  const hasResult = typeof step.result === 'string' && step.result.length > 0;
  const hasDetails = hasParams || hasResult;
  return {
    label,
    hasDetails,
    expandable: hasDetails,
    details: (
      <>
        {hasParams && (
          <ScrollArea className="max-h-32">
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
              {JSON.stringify(step.toolUse.params, null, 2)}
            </pre>
          </ScrollArea>
        )}
        {hasResult && (
          <Badge
            variant="outline"
            className="font-normal whitespace-normal text-left"
          >
            <ScrollArea className="max-h-32 w-full">
              <span className="text-xs text-muted-foreground whitespace-pre-wrap">
                {step.result}
              </span>
            </ScrollArea>
          </Badge>
        )}
      </>
    ),
  };
}
