import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemActions,
} from '@ayunis/ui/components/item';
import { FileText, FileWarning, Mic, X } from 'lucide-react';
import { cn } from '@ayunis/ui/lib/cn';
import { useTranslation } from 'react-i18next';
import type { SourceAttachment } from '@/pages/chat/model/source-attachment';

interface ChatAttachmentsProps {
  readonly attachments: SourceAttachment[];
  readonly onRemove: (attachment: SourceAttachment) => void;
}

export function ChatAttachments({
  attachments,
  onRemove,
}: ChatAttachmentsProps) {
  const { t } = useTranslation('chat');
  return (
    <>
      {attachments.map((attachment) => {
        const { step } = attachment;
        const FileIcon = step.isAudio ? Mic : FileText;
        const Icon = step.status === 'error' ? FileWarning : FileIcon;
        return (
          <Item
            variant="outline"
            size="sm"
            key={attachment.id}
            data-testid="chat-attachment"
            data-stage={step.stage}
            title={
              step.status === 'error'
                ? t('attachments.timeline.failed', { name: step.sourceName })
                : undefined
            }
            className="my-2 h-14.5 max-w-60 min-w-0 gap-2 rounded-lg bg-background/50 px-2.5 py-0"
          >
            <ItemMedia>
              <Icon
                className={cn(
                  'size-5 shrink-0 text-muted-foreground',
                  step.status === 'error' && 'text-destructive',
                )}
                aria-hidden
              />
            </ItemMedia>
            <ItemContent className="min-w-0">
              <ItemTitle className="break-words text-xs font-normal line-clamp-2">
                {step.sourceName}
              </ItemTitle>
            </ItemContent>
            <ItemActions>
              <button
                type="button"
                data-testid="attachment-remove"
                disabled={step.stage === 'removing'}
                aria-label={t('attachments.remove', { name: step.sourceName })}
                onClick={() => onRemove(attachment)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </ItemActions>
          </Item>
        );
      })}
    </>
  );
}
