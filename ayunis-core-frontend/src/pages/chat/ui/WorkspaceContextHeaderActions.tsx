import type { ReactNode } from 'react';
import { Database, FileText, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import type { WorkspaceContextResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { WorkspaceContextPanel } from './WorkspaceContextSidePanel';

interface WorkspaceContextHeaderActionsProps {
  context: WorkspaceContextResponseDto;
  activePanel: WorkspaceContextPanel | null;
  onToggle?: (panel: WorkspaceContextPanel) => void;
}

export function WorkspaceContextHeaderActions({
  context,
  activePanel,
  onToggle,
}: Readonly<WorkspaceContextHeaderActionsProps>) {
  const { t } = useTranslation('workspace');
  const knowledgeCount =
    context.knowledgeBases.length + context.documents.length;
  return (
    <div className="mr-1 flex items-center gap-1 border-r pr-1">
      <ContextPanelButton
        panel="skills"
        activePanel={activePanel}
        label={t('contextDock.skills.toggle')}
        testId="workspace-context-toggle-skills"
        count={context.skills.length}
        onToggle={onToggle}
      >
        <Sparkles />
      </ContextPanelButton>
      <ContextPanelButton
        panel="knowledge"
        activePanel={activePanel}
        label={t('contextDock.knowledge.toggle')}
        testId="workspace-context-toggle-knowledge"
        count={knowledgeCount}
        onToggle={onToggle}
      >
        <Database />
      </ContextPanelButton>
      <ContextPanelButton
        panel="instructions"
        activePanel={activePanel}
        label={t('contextDock.instructions.toggle')}
        testId="workspace-context-toggle-instructions"
        active={context.instruction !== null}
        onToggle={onToggle}
      >
        <FileText />
      </ContextPanelButton>
    </div>
  );
}

function ContextPanelButton({
  panel,
  activePanel,
  label,
  count,
  testId,
  active = false,
  onToggle,
  children,
}: Readonly<{
  panel: WorkspaceContextPanel;
  activePanel: WorkspaceContextPanel | null;
  label: string;
  count?: number;
  testId: string;
  active?: boolean;
  onToggle?: (panel: WorkspaceContextPanel) => void;
  children: ReactNode;
}>) {
  const hasContext = active || (count ?? 0) > 0;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={activePanel === panel ? 'secondary' : 'ghost'}
          size="icon"
          disabled={!onToggle}
          data-testid={testId}
          onClick={() => onToggle?.(panel)}
          aria-label={label}
          className="relative"
        >
          {children}
          {hasContext && <ContextIndicator count={count} />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function ContextIndicator({ count }: Readonly<{ count?: number }>) {
  if (count === undefined) {
    return (
      <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-brand" />
    );
  }
  if (count === 0) return null;
  return (
    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-medium text-secondary-foreground">
      {count}
    </span>
  );
}
