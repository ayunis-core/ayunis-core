import { Card, CardContent } from "@/shared/ui/shadcn/card";
import { Avatar, AvatarFallback } from "@/shared/ui/shadcn/avatar";
import { Bot, Loader2, Wrench } from "lucide-react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/ui/shadcn/collapsible";
import { Badge } from "@/shared/ui/shadcn/badge";
import { cn } from "@/shared/lib/shadcn/utils";

interface ChatMessageProps {
  message?: Message;
  isLoading?: boolean;
  hideAvatar?: boolean;
}

// Helper function to render text content
const renderTextContent = (content: TextMessageContent) => {
  return <Markdown key={content.text}>{content.text}</Markdown>;
};

// Helper function to render tool use content
const renderToolUseContent = (content: ToolUseMessageContent, t: any) => {
  return (
    <div
      className="my-2"
      key={`${content.name}-${JSON.stringify(content.params)}`}
    >
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Badge
            variant="outline"
            className="text-sm font-medium text-muted-foreground cursor-pointer"
          >
            <Wrench className="h-4 w-4" />{" "}
            {t(`chat.tools.${content.name.toLowerCase()}`)}
          </Badge>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Badge variant="outline">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(content.params, null, 2)}
            </pre>
          </Badge>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

// Helper function to render message content based on type
const renderMessageContent = (message: Message, t: any) => {
  switch (message.role) {
    case "user":
    case "system":
      return message.content.map((content) => renderTextContent(content));

    case "assistant":
      return message.content.map((content: AssistantMessageContent) => {
        if (content.type === "text") {
          return renderTextContent(content as TextMessageContent);
        } else if (content.type === "tool_use") {
          return renderToolUseContent(content as ToolUseMessageContent, t);
        }
        return null;
      });

    default:
      return null;
  }
};

// Helper function to get avatar icon based on role
const getAvatarIcon = (theme: string) => {
  return (
    <img
      src={theme === "dark" ? brandIconDark : brandIconLight}
      alt="Ayunis Logo"
      className="h-8 w-8 object-contain"
    />
  );
};

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
      <div className="flex justify-end">
        <div className="max-w-2xl min-w-0 space-y-1">
          <Card className={`p-2 py-0 bg-muted `}>
            <CardContent className="p-2 space-y-2 min-w-0 overflow-hidden">
              {renderMessageContent(message, t)}
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
            <AvatarFallback>{getAvatarIcon(theme)}</AvatarFallback>
          </Avatar>
        )}
        <div className="max-w-2xl min-w-0 space-y-1">
          <div className="space-y-2 overflow-hidden">
            {renderMessageContent(message, t)}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
