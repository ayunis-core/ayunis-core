import { Card, CardContent } from "@/shared/ui/shadcn/card";
import { Avatar, AvatarFallback } from "@/shared/ui/shadcn/avatar";
import { Bot, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type {
  Message,
  AssistantMessageContent,
  TextMessageContent,
  ToolUseMessageContent,
  ThinkingMessageContent,
} from "../model/openapi";
import brandIconLight from "@/shared/assets/brand/brand-icon-round-light.svg";
import brandIconDark from "@/shared/assets/brand/brand-icon-round-dark.svg";
import { useTheme } from "@/features/theme";
import { Markdown } from "@/widgets/markdown";
import { cn } from "@/shared/lib/shadcn/utils";
import SendEmailWidget from "./chat-widgets/SendEmailWidget";
import ExecutableToolWidget from "./chat-widgets/ExecutableToolWidget";
import ThinkingBlockWidget from "./chat-widgets/ThinkingBlockWidget";
import CreateCalendarEventWidget from "./chat-widgets/CreateCalendarEventWidget";
import { ToolAssignmentDtoType } from "@/shared/api/generated/ayunisCoreAPI.schemas";

interface ChatMessageProps {
  message?: Message;
  isLoading?: boolean;
  hideAvatar?: boolean;
}

export default function ChatMessage({
  hideAvatar = false,
  message,
  isLoading = false,
}: ChatMessageProps) {
  const { t } = useTranslation("chats");
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
            {t("chat.aiThinking")}
          </span>
        </div>
      </div>
    );
  }

  // Return null if no message and not loading
  if (!message) {
    return null;
  }

  const isUserMessage = message.role === "user";
  const isAssistantMessage = message.role === "assistant";

  // User messages
  if (isUserMessage) {
    return (
      <div className="flex justify-end my-4">
        <div className="max-w-2xl min-w-0 space-y-1">
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
        className={cn("flex flex-col items-start gap-2", !hideAvatar && "mt-4")}
      >
        {!hideAvatar && (
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              <img
                src={theme === "dark" ? brandIconDark : brandIconLight}
                alt="Ayunis Logo"
                className="h-8 w-8 object-contain"
              />
            </AvatarFallback>
          </Avatar>
        )}
        <div className="max-w-2xl min-w-0 space-y-1 w-full">
          <div className="space-y-2 overflow-hidden w-full">
            {renderMessageContent(message)}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function renderMessageContent(message: Message) {
  switch (message.role) {
    case "user":
    case "system":
      return message.content.map((content, index) => (
        <Markdown key={`${content.type}-${index}-${content.text.slice(0, 50)}`}>
          {content.text}
        </Markdown>
      ));

    case "assistant":
      // If streaming yielded an empty assistant message (no text/tool yet), show a placeholder
      if (!message.content || message.content.length === 0) {
        return null;
      }

      return message.content.map((content: AssistantMessageContent, index) => {
        if (content.type === "thinking") {
          const thinkingMessageContent = content as ThinkingMessageContent;
          const hasTextContent = message.content.some((c) => c.type === "text");
          return (
            <ThinkingBlockWidget
              open={!hasTextContent}
              key={`thinking-${index}-${thinkingMessageContent.thinking.slice(0, 50)}`}
              content={thinkingMessageContent}
            />
          );
        }
        if (content.type === "text") {
          const textMessageContent = content as TextMessageContent;
          return (
            <Markdown
              key={`text-${index}-${textMessageContent.text.slice(0, 50)}`}
            >
              {textMessageContent.text}
            </Markdown>
          );
        } else if (content.type === "tool_use") {
          try {
            const toolUseMessageContent = content as ToolUseMessageContent;
            if (
              toolUseMessageContent.name === ToolAssignmentDtoType.send_email
            ) {
              return (
                <SendEmailWidget
                  key={`send-email-${index}-${toolUseMessageContent.name.slice(0, 50)}`}
                  content={toolUseMessageContent}
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
                />
              );
            }

            return (
              <ExecutableToolWidget
                key={`executable-tool-${index}-${toolUseMessageContent.name.slice(0, 50)}`}
                content={toolUseMessageContent}
              />
            );
          } catch {
            return (
              <Markdown
                key={`error-rendering-tool-use-message-${index}-${content.type.slice(0, 50)}`}
              >
                {"Error rendering tool use message"}
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
