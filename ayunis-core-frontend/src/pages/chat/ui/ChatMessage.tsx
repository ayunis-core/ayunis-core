import { useRef, useState } from 'react';
import { Card, CardContent } from '@/shared/ui/shadcn/card';
import { Avatar, AvatarFallback } from '@/shared/ui/shadcn/avatar';
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/shadcn/dialog';
import { Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
import type {
  Message,
  AssistantMessageContent,
  TextMessageContent,
  ToolUseMessageContent,
  ThinkingMessageContent,
  ImageMessageContentResponseDto,
} from '../model/openapi';
import config from '@/shared/config';
import brandIconLight from '@/shared/assets/brand/brand-icon-round-light.svg';
import brandIconDark from '@/shared/assets/brand/brand-icon-round-dark.svg';
import { useTheme } from '@/features/theme';
import { Markdown } from '@/widgets/markdown';
import { cn } from '@/shared/lib/shadcn/utils';
import SendEmailWidget from './chat-widgets/SendEmailWidget';
import ExecutableToolWidget from './chat-widgets/ExecutableToolWidget';
import IntegrationToolWidget from './chat-widgets/IntegrationToolWidget';
import ThinkingBlockWidget from './chat-widgets/ThinkingBlockWidget';
import CreateCalendarEventWidget from './chat-widgets/CreateCalendarEventWidget';
import CreateSkillWidget from './chat-widgets/CreateSkillWidget';
import SkillInstructionWidget from './chat-widgets/SkillInstructionWidget';
import {
  BarChartWidget,
  LineChartWidget,
  PieChartWidget,
} from '@/widgets/charts';
import {
  ToolAssignmentDtoType,
  type TextMessageContentResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface ChatMessageProps {
  readonly message: Message;
  readonly hideAvatar?: boolean;
  readonly isStreaming?: boolean;
}

function CopyMessageButton({
  contentRef,
}: {
  readonly contentRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation('chat');

  const handleCopy = async () => {
    const el = contentRef.current;
    if (!el) return;

    const copyableElements = el.querySelectorAll('[data-copyable="true"]');
    if (copyableElements.length === 0) return;

    const htmlParts: string[] = [];
    const textParts: string[] = [];
    copyableElements.forEach((element) => {
      htmlParts.push(element.innerHTML);
      textParts.push(element.textContent ?? '');
    });

    const html = htmlParts.join('<br><br>');
    const plainText = textParts.join('\n\n');
    if (!plainText.trim()) return;

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plainText], { type: 'text/plain' }),
        }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        await navigator.clipboard.writeText(plainText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy message:', error);
      }
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 mt-1"
          onClick={() => void handleCopy()}
          aria-label={t('chat.copyToClipboard')}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t('chat.copyToClipboard')}</TooltipContent>
    </Tooltip>
  );
}

export default function ChatMessage({
  hideAvatar = false,
  message,
  isStreaming = false,
}: ChatMessageProps) {
  const { theme } = useTheme();
  const messageContentRef = useRef<HTMLDivElement>(null);

  const isUserMessage = message.role === 'user';
  const isAssistantMessage = message.role === 'assistant';

  // User messages
  if (isUserMessage) {
    return (
      <div className="flex justify-end my-4">
        <div className="max-w-2xl min-w-0 space-y-1" data-testid="user-message">
          <Card className={`p-2 py-0 bg-muted `}>
            <CardContent className="p-2 space-y-2 min-w-0 overflow-hidden">
              {renderMessageContent(message)}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Assistant messages
  if (isAssistantMessage) {
    return (
      <div
        className={cn('flex flex-col items-start gap-2', !hideAvatar && 'mt-4')}
      >
        {!hideAvatar && (
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              <img
                src={theme === 'dark' ? brandIconDark : brandIconLight}
                alt="Ayunis Logo"
                className="h-8 w-8 object-contain"
              />
            </AvatarFallback>
          </Avatar>
        )}
        <div className="max-w-2xl min-w-0 space-y-1 w-full">
          <div
            ref={messageContentRef}
            className="space-y-2 overflow-hidden w-full"
            data-testid="assistant-message"
          >
            {renderMessageContent(message, isStreaming)}
          </div>
          <CopyMessageButton contentRef={messageContentRef} />
        </div>
      </div>
    );
  }

  return null;
}

function ImageThumbnail({
  imageContent,
}: {
  readonly imageContent: ImageMessageContentResponseDto;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const encodedObjectName = encodeURIComponent(imageContent.imageUrl);
  const imageUrl = `${config.api.baseUrl}/storage/${encodedObjectName}`;

  return (
    <>
      <div
        className="rounded-lg h-14.5 w-14.5 my-2 overflow-hidden border border-border cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => setIsOpen(true)}
      >
        <img
          src={imageUrl}
          alt={imageContent.altText}
          className="w-full h-full object-cover"
        />
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="max-w-[90vw] max-h-[90vh] p-0"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">
            {imageContent.altText ?? 'Image preview'}
          </DialogTitle>
          <img
            src={imageUrl}
            alt={imageContent.altText}
            className="w-full h-full max-h-[90vh] object-contain rounded-lg"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

// eslint-disable-next-line sonarjs/function-return-type
function renderMessageContent(message: Message, isStreaming?: boolean) {
  switch (message.role) {
    case 'user':
    case 'system': {
      const images = message.content.filter(
        (c) => c.type === 'image',
      ) as ImageMessageContentResponseDto[];
      const texts = message.content.filter(
        (c) => c.type !== 'image',
      ) as TextMessageContentResponseDto[];

      return (
        <>
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {images.map((imageContent, index) => (
                <ImageThumbnail
                  key={`image-${index}-${imageContent.imageUrl}`}
                  imageContent={imageContent}
                />
              ))}
            </div>
          )}

          {texts.map((textContent, index) =>
            textContent.isSkillInstruction ? (
              <SkillInstructionWidget
                key={`skill-instruction-${index}-${textContent.text.slice(0, 50)}`}
                content={textContent}
              />
            ) : (
              <Markdown key={`text-${index}-${textContent.text.slice(0, 50)}`}>
                {textContent.text}
              </Markdown>
            ),
          )}
        </>
      );
    }

    case 'assistant':
      // eslint-disable-next-line eqeqeq, @typescript-eslint/no-unnecessary-condition -- content may be undefined during streaming even if typed as required
      if (message.content == null || message.content.length === 0) {
        return null;
      }

      // eslint-disable-next-line sonarjs/cognitive-complexity
      return message.content.map((content: AssistantMessageContent, index) => {
        if (content.type === 'thinking') {
          const thinkingMessageContent = content as ThinkingMessageContent;
          const hasTextContent = message.content.some((c) => c.type === 'text');
          const hasToolUseContent = message.content.some(
            (c) => c.type === 'tool_use',
          );
          return (
            <ThinkingBlockWidget
              open={!hasTextContent && !hasToolUseContent}
              key={`thinking-${index}-${thinkingMessageContent.thinking.slice(0, 50)}`}
              content={thinkingMessageContent}
            />
          );
        }
        if (content.type === 'text') {
          const textMessageContent = content as TextMessageContent;
          return (
            <div
              key={`text-${index}-${textMessageContent.text.slice(0, 50)}`}
              data-copyable="true"
            >
              <Markdown>{textMessageContent.text}</Markdown>
            </div>
          );
        } else if (content.type === 'tool_use') {
          try {
            const toolUseMessageContent = content as ToolUseMessageContent;
            if (
              toolUseMessageContent.name === ToolAssignmentDtoType.send_email
            ) {
              return (
                <SendEmailWidget
                  key={`send-email-${index}-${toolUseMessageContent.name.slice(0, 50)}`}
                  content={toolUseMessageContent}
                  isStreaming={isStreaming}
                />
              );
            }
            if (
              toolUseMessageContent.name ===
              ToolAssignmentDtoType.create_calendar_event
            ) {
              return (
                <CreateCalendarEventWidget
                  key={`create-calendar-event-${index}-${toolUseMessageContent.name.slice(0, 50)}`}
                  content={toolUseMessageContent}
                  isStreaming={isStreaming}
                />
              );
            }
            if (
              toolUseMessageContent.name === ToolAssignmentDtoType.create_skill
            ) {
              return (
                <CreateSkillWidget
                  key={`create-skill-${index}-${toolUseMessageContent.name.slice(0, 50)}`}
                  content={toolUseMessageContent}
                  isStreaming={isStreaming}
                />
              );
            }
            if (
              toolUseMessageContent.name === ToolAssignmentDtoType.bar_chart
            ) {
              return (
                <BarChartWidget
                  key={`bar-chart-${index}-${toolUseMessageContent.name.slice(0, 50)}`}
                  content={toolUseMessageContent}
                  isStreaming={isStreaming}
                />
              );
            }
            if (
              toolUseMessageContent.name === ToolAssignmentDtoType.line_chart
            ) {
              return (
                <LineChartWidget
                  key={`line-chart-${index}-${toolUseMessageContent.name.slice(0, 50)}`}
                  content={toolUseMessageContent}
                  isStreaming={isStreaming}
                />
              );
            }
            if (
              toolUseMessageContent.name === ToolAssignmentDtoType.pie_chart
            ) {
              return (
                <PieChartWidget
                  key={`pie-chart-${index}-${toolUseMessageContent.name.slice(0, 50)}`}
                  content={toolUseMessageContent}
                  isStreaming={isStreaming}
                />
              );
            }

            if (toolUseMessageContent.integration) {
              return (
                <IntegrationToolWidget
                  key={`integration-tool-${index}-${toolUseMessageContent.name.slice(0, 50)}`}
                  content={toolUseMessageContent}
                  isStreaming={isStreaming}
                />
              );
            }

            return (
              <ExecutableToolWidget
                key={`executable-tool-${index}-${toolUseMessageContent.name.slice(0, 50)}`}
                content={toolUseMessageContent}
                isStreaming={isStreaming}
              />
            );
          } catch {
            return (
              <Markdown
                key={`error-rendering-tool-use-message-${index}-${content.type.slice(0, 50)}`}
              >
                {'Error rendering tool use message'}
              </Markdown>
            );
          }
        }
        return null;
      });

    case 'tool':
      // Tool messages are handled inline within assistant message rendering
      return null;
  }
}
