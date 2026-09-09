import { Layers3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import { useThreadAiContext } from '@/pages/chat/api/useThreadAiContext';
import {
  useIsKnowledgeBasesEnabled,
  useIsSkillsEnabled,
  useIsWorkspacesEnabled,
} from '@/features/feature-toggles';
import { useWorkspace } from '@/features/workspaces';

interface ChatContextHintProps {
  readonly threadId: string;
  readonly workspaceId: string | null;
  readonly onOpen: () => void;
}

export function ChatContextHint({
  threadId,
  workspaceId,
  onOpen,
}: Readonly<ChatContextHintProps>) {
  const skillsEnabled = useIsSkillsEnabled();
  const knowledgeBasesEnabled = useIsKnowledgeBasesEnabled();
  const workspacesEnabled = useIsWorkspacesEnabled();
  const contextEnabled = skillsEnabled || knowledgeBasesEnabled;
  const { context, isLoading, error } = useThreadAiContext(
    threadId,
    contextEnabled,
  );
  const {
    workspace,
    isLoading: isLoadingWorkspace,
    error: workspaceError,
  } = useWorkspace(workspaceId);
  const workspaceUnavailable =
    workspaceId !== null &&
    (!workspacesEnabled ||
      isLoadingWorkspace ||
      Boolean(workspaceError) ||
      !workspace);

  if (
    !contextEnabled ||
    isLoading ||
    error ||
    !context ||
    workspaceUnavailable
  ) {
    return null;
  }

  return (
    <ContextHintButton
      workspaceName={workspaceId ? workspace?.name : undefined}
      skillsCount={skillsEnabled ? context.skills.length : undefined}
      knowledgeBasesCount={
        knowledgeBasesEnabled ? context.knowledgeBases.length : undefined
      }
      onOpen={onOpen}
    />
  );
}

interface ContextHintButtonProps {
  readonly workspaceName?: string;
  readonly skillsCount?: number;
  readonly knowledgeBasesCount?: number;
  readonly onOpen: () => void;
}

function ContextHintButton({
  workspaceName,
  skillsCount,
  knowledgeBasesCount,
  onOpen,
}: Readonly<ContextHintButtonProps>) {
  const { t } = useTranslation('chat');
  const scope = workspaceName
    ? t('chat.context.hint.workspace', { name: workspaceName })
    : t('chat.context.hint.personal');

  return (
    <div className="mb-4 flex justify-center">
      <Button
        type="button"
        variant="outline"
        size="xs"
        className="max-w-full"
        data-testid="chat-context-hint"
        aria-controls="chat-side-panel"
        onClick={onOpen}
      >
        <Layers3 />
        <span className="min-w-0 truncate">{scope}</span>
        {skillsCount !== undefined && (
          <>
            <span aria-hidden="true">·</span>
            <span>{t('chat.context.hint.skills', { count: skillsCount })}</span>
          </>
        )}
        {knowledgeBasesCount !== undefined && (
          <>
            <span aria-hidden="true">·</span>
            <span>
              {t('chat.context.hint.knowledgeBases', {
                count: knowledgeBasesCount,
              })}
            </span>
          </>
        )}
        <span className="sr-only">— {t('chat.context.hint.open')}</span>
      </Button>
    </div>
  );
}
