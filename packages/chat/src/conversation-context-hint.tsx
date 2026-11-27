import { Layers3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import type { ChatContextHint } from './chat-config';

/** What the chat's answers draw on, opening where it can be changed. */
export function ContextHint({ hint }: Readonly<{ hint: ChatContextHint }>) {
  if (!hint.summary) return null;
  return (
    <ContextHintButton
      workspaceName={hint.summary.workspaceName}
      skillsCount={hint.summary.skills}
      knowledgeBasesCount={hint.summary.knowledgeBases}
      onOpen={hint.open}
    />
  );
}

interface ContextHintButtonProps {
  readonly workspaceName?: string;
  readonly skillsCount: number;
  readonly knowledgeBasesCount: number;
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
        <span aria-hidden="true">·</span>
        <span>{t('chat.context.hint.skills', { count: skillsCount })}</span>
        <span aria-hidden="true">·</span>
        <span>
          {t('chat.context.hint.knowledgeBases', {
            count: knowledgeBasesCount,
          })}
        </span>
        <span className="sr-only">— {t('chat.context.hint.open')}</span>
      </Button>
    </div>
  );
}
