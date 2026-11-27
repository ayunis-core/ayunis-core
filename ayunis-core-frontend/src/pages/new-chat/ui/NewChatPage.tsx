import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NewChat } from '@ayunis/chat/surface';
import AppLayout from '@/layouts/app-layout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { CreateWorkspaceDialog } from '@/widgets/create-workspace-dialog';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { useFileFromUrl } from '@/shared/hooks/useFileFromUrl';
import { threadRunLifecycle } from '@/features/thread-run';
import { useTimeBasedGreeting } from '@/pages/new-chat/model/useTimeBasedGreeting';
import { useNewChatConfig } from '@/pages/new-chat/hooks/useNewChatConfig';

interface NewChatPageProps {
  readonly sessionKey: string;
  /** A model id or `mode:<mode>` from the link that opened the page. */
  readonly initialModel?: string;
  readonly initialPrompt?: string;
  readonly initialAttachmentUrl?: string;
  /** Preselects a workspace, e.g. when arriving from a workspace page. */
  readonly initialWorkspaceId?: string;
}

const NO_STARTER_PROMPTS = [] as const;

export default function NewChatPage({
  sessionKey,
  initialModel,
  initialPrompt,
  initialAttachmentUrl,
  initialWorkspaceId,
}: NewChatPageProps) {
  const { t } = useTranslation('chat');
  const greeting = useTimeBasedGreeting();
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [files, setFiles] = useState<File[]>();
  useFileFromUrl(initialAttachmentUrl, (file) => setFiles([file]));
  const { config, selectWorkspace } = useNewChatConfig({
    sessionKey,
    initialWorkspaceId,
    onCreateWorkspace: () => setIsCreatingWorkspace(true),
  });

  return (
    <AppLayout>
      <div className="absolute inset-0 isolate flex flex-col overflow-hidden">
        <div className="sticky top-0 z-10 mb-1.5 w-full shrink-0 bg-background px-3 pt-2">
          <ContentAreaHeader
            breadcrumbs={[{ label: t('newChat.newChat') }]}
            action={<HelpLink path="" />}
          />
        </div>
        <NewChat
          config={config}
          content={{
            greeting: { title: greeting },
            starterPrompts: NO_STARTER_PROMPTS,
          }}
          lifecycle={threadRunLifecycle}
          prefill={{ model: initialModel, message: initialPrompt, files }}
        />
      </div>
      {isCreatingWorkspace && (
        <CreateWorkspaceDialog
          open={isCreatingWorkspace}
          onOpenChange={setIsCreatingWorkspace}
          onCreated={(workspace) => selectWorkspace(workspace.id)}
        />
      )}
    </AppLayout>
  );
}
