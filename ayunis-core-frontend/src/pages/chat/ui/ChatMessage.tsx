import { useState } from 'react';
import { Card, CardContent } from '@/shared/ui/shadcn/card';
import { Avatar, AvatarFallback } from '@/shared/ui/shadcn/avatar';
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/shadcn/dialog';
import { Bot, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
import ThinkingBlockWidget from './chat-widgets/ThinkingBlockWidget';
import CreateCalendarEventWidget from './chat-widgets/CreateCalendarEventWidget';
import {
  BarChartWidget,
  LineChartWidget,
  PieChartWidget,
} from '@/widgets/charts';
import {
  ToolAssignmentDtoType,
  type TextMessageContentResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import AgentActivityHint from '@/widgets/agent-activity-hint/ui/AgentActivityHint';
import { Skeleton } from '@/shared/ui/shadcn/skeleton';

interface ChatMessageProps {
  message?: Message;
  isLoading?: boolean;
  hideAvatar?: boolean;
  isStreaming?: boolean;
}

export default function ChatMessage({
  hideAvatar = false,
  message,
  isLoading = false,
  isStreaming = false,
}: ChatMessageProps) {
  const { t } = useTranslation('chat');
  const { theme } = useTheme();
  // Show loading indicator when isLoading is true and no message
  if (isLoading && !message) {
    return (
      <div className="flex flex-col items-start gap-2">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">
            {t('chat.aiThinking')}
          </span>
        </div>
      </div>
    );
  }

  // Return null if no message and not loading
  if (!message) {
    return null;
  }

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
            className="space-y-2 overflow-hidden w-full"
            data-testid="assistant-message"
          >
            {renderMessageContent(message, isStreaming)}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function ImageThumbnail({
  imageContent,
}: {
  imageContent: ImageMessageContentResponseDto;
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
            {imageContent.altText || 'Image preview'}
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

          {texts.map((textContent, index) => (
            <Markdown key={`text-${index}-${textContent.text.slice(0, 50)}`}>
              {textContent.text}
            </Markdown>
          ))}
        </>
      );
    }

    case 'assistant':
      // If streaming yielded an empty assistant message (no text/tool yet), show a placeholder
      if (!message.content || message.content.length === 0) {
        return (
          <AgentActivityHint
            open={false}
            onOpenChange={() => {}}
            icon={<Loader2 className="h-4 w-4 animate-spin" />}
            hint={<Skeleton className="h-4 w-16" />}
            input={''}
          />
        );
      }

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
            <Markdown
              key={`text-${index}-${textMessageContent.text.slice(0, 50)}`}
            >
              {textMessageContent.text}
            </Markdown>
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

    default:
      return null;
  }
}
