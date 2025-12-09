import { useMemo, useState, useEffect } from 'react';
import type { ToolUseMessageContent } from '../../model/openapi';
import { useTranslation } from 'react-i18next';
import { Label } from '@/shared/ui/shadcn/label';
import { Input } from '@/shared/ui/shadcn/input';
import { Textarea } from '@/shared/ui/shadcn/textarea';
import { Button } from '@/shared/ui/shadcn/button';
import { Mail } from 'lucide-react';
import { cn } from '@/shared/lib/shadcn/utils';

export default function SendEmailWidget({
  content,
  isStreaming = false,
}: {
  content: ToolUseMessageContent;
  isStreaming?: boolean;
}) {
  const { t } = useTranslation('chats');
  const params = (content.params || {}) as {
    subject?: string;
    body?: string;
    to?: string;
  };

  // Derive initial values directly from params to avoid setState in useEffect
  const initialSubject = params.subject || '';
  const initialBody = params.body || '';
  const initialTo = params.to || '';

  const [subject, setSubject] = useState<string>(initialSubject);
  const [body, setBody] = useState<string>(initialBody);
  const [to, setTo] = useState<string>(initialTo);
  const [copied, setCopied] = useState<boolean>(false);

  // Update state when params change (for streaming updates)
  useEffect(() => {
    const updateWidget = () => {
      setSubject(params.subject || '');
      setBody(params.body || '');
      setTo(params.to || '');
    };
    updateWidget();
  }, [params.subject, params.body, params.to, content.id]);

  const mailtoHref = useMemo(() => {
    const mailtoPath = to ? encodeURIComponent(to) : '';

    // Normalize line breaks, then force CRLF in the percent-encoded output for maximum client compatibility
    const normalizedBody = (body || '').replace(/\r\n|\r|\n/g, '\n');
    const encodedBodyWithCrlf = encodeURIComponent(normalizedBody).replace(
      /%0A/g,
      '%0D%0A',
    );
    const queryParams: string[] = [];
    if ((subject || '').length > 0) {
      queryParams.push(`subject=${encodeURIComponent(subject)}`);
    }
    if (normalizedBody.length > 0) {
      queryParams.push(`body=${encodedBodyWithCrlf}`);
    }
    const query = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
    return `mailto:${mailtoPath}${query}`;
  }, [subject, body, to]);

  return (
    <div
      className="my-2 space-y-4 w-full"
      key={`${content.name}-${content.id}`}
    >
      <div className="space-y-2 w-full">
        <Label
          htmlFor={`send-email-to-${content.id}`}
          className={cn(isStreaming && 'animate-pulse')}
        >
          {t('chat.tools.send_email.to')}
        </Label>
        <Input
          className={cn('w-full', isStreaming && 'animate-pulse')}
          id={`send-email-to-${content.id}`}
          placeholder={t('chat.tools.send_email.toPlaceholder')}
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>
      <div className="space-y-2 w-full">
        <Label
          htmlFor={`send-email-subject-${content.id}`}
          className={cn(isStreaming && 'animate-pulse')}
        >
          {t('chat.tools.send_email.subject')}
        </Label>
        <Input
          className={cn('w-full', isStreaming && 'animate-pulse')}
          id={`send-email-subject-${content.id}`}
          placeholder={t('chat.tools.send_email.subjectPlaceholder')}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>
      <div className="space-y-2 w-full">
        <Label
          htmlFor={`send-email-body-${content.id}`}
          className={cn(isStreaming && 'animate-pulse')}
        >
          {t('chat.tools.send_email.body')}
        </Label>
        <Textarea
          id={`send-email-body-${content.id}`}
          placeholder={t('chat.tools.send_email.bodyPlaceholder')}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={cn('h-40', isStreaming && 'animate-pulse')}
        />
      </div>
      <div className="w-full flex gap-2">
        <Button asChild className={cn(isStreaming && 'animate-pulse')}>
          <a href={mailtoHref} target="_blank" rel="noopener noreferrer">
            <Mail className="h-4 w-4" /> {t('chat.tools.send_email.open')}
          </a>
        </Button>
        <Button
          className={cn(isStreaming && 'animate-pulse')}
          type="button"
          variant="secondary"
          onClick={() => {
            void (async () => {
              try {
                await navigator.clipboard.writeText(body);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              } catch {
                // noop
              }
            })();
          }}
        >
          {copied
            ? t('chat.tools.send_email.copied')
            : t('chat.tools.send_email.copyBody')}
        </Button>
      </div>
    </div>
  );
}
