import { useTranslation } from 'react-i18next';
import { EyeOff } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { cn } from '@ayunis/ui/lib/cn';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import type { PiiWhitelistEntryDto } from '@/shared/api';
import { usePiiMasks } from '@/widgets/markdown';
import { useOrgPiiWhitelist } from '@/pages/chat/api/useOrgPiiWhitelist';
import { useSaveAnonymizationException } from '@/pages/chat/api/useSaveAnonymizationException';
import {
  currentPattern,
  exceptionRulePattern,
  isExceptionAccepted,
  isWordExempt,
  parseAnonymizationException,
} from '@/pages/chat/lib/anonymization-exception';
import type { AnonymizationException } from '@/pages/chat/lib/anonymization-exception';

// Rendered from the call only once the backend accepted it; a rejected call
// gets no card, so nothing it proposed can be saved.
export default function AddAnonymizationExceptionWidget({
  content,
  result,
  isStreaming = false,
}: Readonly<{
  content: ToolUseMessageContent;
  result?: string;
  isStreaming?: boolean;
}>) {
  const { t } = useTranslation('chat');
  const masks = usePiiMasks();
  const accepted = !isStreaming && isExceptionAccepted(result);
  const exception = accepted
    ? parseAnonymizationException(content.params, masks)
    : null;
  const whitelist = useOrgPiiWhitelist({ enabled: exception !== null });

  if (!isStreaming && !exception) return null;

  return (
    <Item
      variant="outline"
      className={cn('my-2 w-full', !exception && 'animate-pulse')}
      data-testid="anonymization-exception-widget"
    >
      <ItemMedia variant="icon">
        <EyeOff />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemDescription>
          {t('chat.tools.add_anonymization_exception.title')}
        </ItemDescription>
        {exception ? (
          <ExceptionDetails
            exception={exception}
            entries={whitelist.entries}
            isError={whitelist.isError}
          />
        ) : (
          <ItemDescription>
            {t('chat.tools.add_anonymization_exception.preparing')}
          </ItemDescription>
        )}
      </ItemContent>
    </Item>
  );
}

function ExceptionDetails({
  exception,
  entries,
  isError,
}: Readonly<{
  exception: AnonymizationException;
  entries?: PiiWhitelistEntryDto[];
  isError: boolean;
}>) {
  const { t } = useTranslation('chat');

  return (
    <>
      <ItemTitle
        className="break-all"
        data-testid="anonymization-exception-word"
      >
        {exception.word}
      </ItemTitle>
      <ItemDescription data-testid="anonymization-exception-category">
        {t(`chat.piiMask.categories.${exception.category}`)}
      </ItemDescription>
      {entries ? (
        <ExceptionProposal exception={exception} entries={entries} />
      ) : (
        <p
          className="text-sm text-muted-foreground"
          data-testid="anonymization-exception-state"
        >
          {isError
            ? t('chat.tools.add_anonymization_exception.loadError')
            : t('chat.tools.add_anonymization_exception.loading')}
        </p>
      )}
    </>
  );
}

function ExceptionProposal({
  exception,
  entries,
}: Readonly<{
  exception: AnonymizationException;
  entries: PiiWhitelistEntryDto[];
}>) {
  const { t } = useTranslation('chat');
  const save = useSaveAnonymizationException();

  if (isWordExempt(entries, exception)) {
    return (
      <div className="mt-2">
        <Badge data-testid="anonymization-exception-saved">
          {t('chat.tools.add_anonymization_exception.saved')}
        </Badge>
      </div>
    );
  }

  const previousPattern = currentPattern(entries, exception.category);
  return (
    <>
      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">
          {t('chat.tools.add_anonymization_exception.previousRule')}
        </dt>
        <dd
          className="break-all"
          data-testid="anonymization-exception-previous"
        >
          {previousPattern ? (
            <code>{previousPattern}</code>
          ) : (
            t('chat.tools.add_anonymization_exception.noRule')
          )}
        </dd>
        <dt className="text-muted-foreground">
          {t('chat.tools.add_anonymization_exception.newRule')}
        </dt>
        <dd className="break-all" data-testid="anonymization-exception-new">
          <code>
            {exceptionRulePattern(
              previousPattern ?? undefined,
              exception.pattern,
            )}
          </code>
        </dd>
      </dl>
      <p className="text-sm text-muted-foreground">
        {t('chat.tools.add_anonymization_exception.orgWide')}
      </p>
      <div className="mt-2">
        <Button
          size="sm"
          onClick={() =>
            save.mutate({ exception, shownPattern: previousPattern })
          }
          disabled={save.isPending}
          data-testid="anonymization-exception-save"
        >
          {save.isPending
            ? t('chat.tools.add_anonymization_exception.saving')
            : t('chat.tools.add_anonymization_exception.save')}
        </Button>
      </div>
    </>
  );
}
