import { useTranslation } from 'react-i18next';
import { ChatStarter, type ChatStarterDefaults } from '@/widgets/chat-starter';

interface ReleaseNoteChatStarterProps extends ChatStarterDefaults {
  releaseNoteId: string;
}

/** Starts a chat about a product update. */
export function ReleaseNoteChatStarter({
  releaseNoteId,
  selectedModelId,
}: Readonly<ReleaseNoteChatStarterProps>) {
  const { t } = useTranslation('release-notes');

  return (
    <div data-testid="release-note-chat-starter">
      <ChatStarter
        origin={{ kind: 'release_note', releaseNoteId }}
        placeholder={t('detail.chatPlaceholder')}
        selectedModelId={selectedModelId}
      />
    </div>
  );
}
