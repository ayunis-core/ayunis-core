import { useMemo } from 'react';
import { Brain } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import { cn } from '@ayunis/ui/lib/cn';
import {
  AgentRunTimeline,
  type AgentRunBlock,
  type AgentRunUnit,
  type TimelinePresentation,
} from '@ayunis/chat/timeline';
import {
  TextMessageContentResponseDtoType,
  ToolUseMessageContentResponseDtoType,
} from '@ayunis/api-client/schemas';
import { AyunisProgressOrb } from '@/widgets/ayunis-progress-orb';
import { DemoStateContext } from '@/pages/welcome-prototype/model/demo-state';
import {
  hasAction,
  hasReached,
  type DemoPhase,
} from '@/pages/welcome-prototype/model/demo-timeline';
import type {
  DemoTool,
  FeatureDemo as FeatureDemoData,
} from '@/pages/welcome-prototype/model/feature-demos';
import { useStreamedText } from '@/pages/welcome-prototype/model/use-streamed-text';
import { ArtifactPanel } from './CapabilityPanels';
import { DEMO_TOOL_CARDS } from './demo-tool-cards';

const PRESENTATION: TimelinePresentation = {
  toolCards: DEMO_TOOL_CARDS,
  pendingIndicator: <AyunisProgressOrb isActive />,
};

function toolUse(tool: DemoTool, id: string) {
  return {
    type: ToolUseMessageContentResponseDtoType.tool_use,
    id,
    name: tool.name,
    params: tool.params,
  };
}

function buildUnit(
  demo: FeatureDemoData,
  phase: DemoPhase,
  answer: string,
): AgentRunUnit {
  const reached = (target: DemoPhase) => hasReached(phase, target);
  const blocks: AgentRunBlock[] = [];
  if (demo.step && reached('thinking')) {
    blocks.push({
      kind: 'activity',
      key: 'activity',
      steps: [
        {
          kind: 'tool',
          key: 'step',
          toolUse: toolUse(demo.step, 'step'),
          status: reached('answer') ? 'done' : 'in_progress',
        },
      ],
    });
  }
  if (reached('answer')) {
    blocks.push({
      kind: 'text',
      key: 'answer',
      content: { type: TextMessageContentResponseDtoType.text, text: answer },
    });
  }
  if (demo.result && reached('result')) {
    blocks.push({
      kind: 'rich-tool',
      key: 'result',
      steps: [
        {
          kind: 'tool',
          key: 'result-step',
          toolUse: toolUse(demo.result.tool, 'result'),
          status: 'done',
        },
      ],
    });
  }
  return {
    kind: 'agent-run',
    key: 'run',
    blocks,
    isStreaming: reached('thinking') && !reached('result'),
  };
}

function panelTitle(demo: FeatureDemoData) {
  const title = demo.result?.tool.params.title;
  return typeof title === 'string' ? title : '';
}

export function FeatureDemo({
  demo,
  phase,
}: Readonly<{ demo: FeatureDemoData; phase: DemoPhase }>) {
  const reached = (target: DemoPhase) => hasReached(phase, target);
  const { shown } = useStreamedText(demo.answer, true, reached('answer'));
  const answer = reached('answer') ? shown : '';
  const unit = buildUnit(demo, phase, answer);
  const state = useMemo(
    () => ({
      highlight: hasReached(phase, 'highlight'),
      opened: hasReached(phase, 'panel'),
    }),
    [phase],
  );
  const panelKind =
    demo.result?.kind === 'document' || demo.result?.kind === 'spreadsheet'
      ? demo.result.kind
      : undefined;
  const isOpen = Boolean(panelKind) && reached('panel');
  const hintAt: DemoPhase = hasAction(demo) ? 'panel' : 'highlight';

  return (
    <DemoStateContext.Provider value={state}>
      <div
        className={cn(
          'wp-demo',
          reached('highlight') && 'is-highlight',
          isOpen && 'is-open',
        )}
      >
        <div className="wp-demo__chat">
          {reached('user') && (
            <div className="wp-fade-in flex flex-col items-end gap-1.5">
              {demo.attachment && (
                <Badge variant="secondary">
                  <Brain />
                  {demo.attachment}
                </Badge>
              )}
              <div className="bg-muted max-w-2xl min-w-0 rounded-2xl px-4 py-2.5">
                {demo.prompt}
              </div>
            </div>
          )}
          {reached('thinking') && (
            <AgentRunTimeline unit={unit} presentation={PRESENTATION} />
          )}
          {reached(hintAt) && <p className="wp-demo__hint">{demo.hint}</p>}
        </div>
        {panelKind && (
          <aside className="wp-demo__panel">
            {isOpen && (
              <ArtifactPanel
                kind={panelKind}
                title={panelTitle(demo)}
                highlightExports={reached('exports')}
              />
            )}
          </aside>
        )}
      </div>
    </DemoStateContext.Provider>
  );
}
