import { Card, CardContent } from "@/shared/ui/shadcn/card";
import { Avatar, AvatarFallback } from "@/shared/ui/shadcn/avatar";
import { Bot, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type {
  Message,
  AssistantMessageContent,
  TextMessageContent,
  ToolUseMessageContent,
} from "../model/openapi";
import brandIconLight from "@/shared/assets/brand/brand-icon-round-light.svg";
import brandIconDark from "@/shared/assets/brand/brand-icon-round-dark.svg";
import { useTheme } from "@/features/theme";
import { Markdown } from "@/widgets/markdown";
import { cn } from "@/shared/lib/shadcn/utils";
import SendEmailWidget from "./chat-widgets/SendEmailWidget";
import ExecutableToolWidget from "./chat-widgets/ExecutableToolWidget";
import ToolUseSkeleton from "./chat-widgets/ToolUseSkeleton";

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
      return message.content.map((content) => (
        <Markdown key={content.text}>{content.text}</Markdown>
      ));

    case "assistant":
      // If streaming yielded an empty assistant message (no text/tool yet), show a placeholder
      if (!message.content || message.content.length === 0) {
        return <ToolUseSkeleton />;
      }

      return message.content.map((content: AssistantMessageContent) => {
        if (content.type === "text") {
          const textMessageContent = content as TextMessageContent;
          return (
            <Markdown key={textMessageContent.text}>
              {textMessageContent.text}
            </Markdown>
          );
        } else if (content.type === "tool_use") {
          const toolUseMessageContent = content as ToolUseMessageContent;
          if (toolUseMessageContent.name === "send_email") {
            return <SendEmailWidget content={toolUseMessageContent} />;
          }
          return <ExecutableToolWidget content={toolUseMessageContent} />;
        }
        return null;
      });

    default:
      return null;
  }
}
