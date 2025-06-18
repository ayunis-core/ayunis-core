import { Card, CardContent } from "@/shared/ui/shadcn/card";
import { Avatar, AvatarFallback } from "@/shared/ui/shadcn/avatar";
import { Bot, User, Loader2, Settings, Wrench } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "react-i18next";
import type {
  Message,
  AssistantMessageContent,
  TextMessageContent,
  ToolUseMessageContent,
  ToolResultMessageContent,
} from "../model/openapi";
import brandIconLight from "@/shared/assets/brand/brand-icon-round-light.svg";
import brandIconDark from "@/shared/assets/brand/brand-icon-round-dark.svg";
import { useTheme } from "@/features/theme";

interface ChatMessageProps {
  message?: Message;
  isLoading?: boolean;
}

// Helper function to render text content
const renderTextContent = (content: TextMessageContent) => {
  return (
    <div
      key={content.text}
      className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert"
    >
      <ReactMarkdown>{content.text}</ReactMarkdown>
    </div>
  );
};

// Helper function to render tool use content
const renderToolUseContent = (content: ToolUseMessageContent, t: any) => {
  return (
    <div key={content.id} className="space-y-2">
      <div className="text-sm font-medium text-muted-foreground">
        🔧 {t("chat.usingTool", { toolName: content.name })}
      </div>
      <div className="text-xs bg-muted/50 rounded p-2 font-mono">
        <pre className="whitespace-pre-wrap">
          {JSON.stringify(content.params, null, 2)}
        </pre>
      </div>
    </div>
  );
};

// Helper function to render tool result content
const renderToolResultContent = (content: ToolResultMessageContent, t: any) => {
  return (
    <div key={content.toolId} className="space-y-2">
      <div className="text-sm font-medium text-muted-foreground">
        🔧 {t("chat.resultFrom", { toolName: content.toolName })}:
      </div>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">
        {content.result}
      </p>
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

    case "tool":
      return message.content.map((content) =>
        renderToolResultContent(content, t),
      );

    default:
      return (
        <p className="text-sm text-muted-foreground">
          {t("chat.unknownMessageType")}
        </p>
      );
  }
};

// Helper function to get avatar icon based on role
const getAvatarIcon = (role: string, theme: string) => {
  switch (role) {
    case "assistant":
      return (
        <img
          src={theme === "dark" ? brandIconDark : brandIconLight}
          alt="Ayunis Logo"
          className="h-8 w-8 object-contain"
        />
      );
    case "user":
      return <User className="h-4 w-4" />;
    case "system":
      return <Settings className="h-4 w-4" />;
    case "tool":
      return <Wrench className="h-4 w-4" />;
    default:
      return <Bot className="h-4 w-4" />;
  }
};

// Helper function to get avatar background style based on role
const getAvatarStyle = (role: string) => {
  switch (role) {
    case "assistant":
      return "bg-primary text-primary-foreground";
    case "user":
      return "bg-secondary";
    case "system":
      return "bg-orange-500 text-white";
    case "tool":
      return "bg-green-500 text-white";
    default:
      return "bg-primary text-primary-foreground";
  }
};

// Helper function to get card style based on role
const getCardStyle = (role: string) => {
  switch (role) {
    case "user":
      return "bg-muted p-1";
    case "system":
      return "bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800";
    case "tool":
      return "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800";
    default:
      return "bg-muted";
  }
};

export default function ChatMessage({
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

  // User messages - no icon, with card styling
  if (isUserMessage) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%] space-y-1">
          <Card className={`p-2 ${getCardStyle(message.role)}`}>
            <CardContent className="p-2 space-y-2">
              {renderMessageContent(message, t)}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Assistant messages - icon on top, no card
  if (isAssistantMessage) {
    return (
      <div className="flex flex-col items-start gap-2">
        <Avatar className="h-8 w-8">
          <AvatarFallback className={getAvatarStyle(message.role)}>
            {getAvatarIcon(message.role, theme)}
          </AvatarFallback>
        </Avatar>
        <div className="max-w-[70%] space-y-1">
          <div className="space-y-2">{renderMessageContent(message, t)}</div>
        </div>
      </div>
    );
  }

  // Other message types (system, tool) - keep original styling with avatars and cards
  return (
    <div className="flex gap-3 justify-start">
      <Avatar className="h-8 w-8">
        <AvatarFallback className={getAvatarStyle(message.role)}>
          {getAvatarIcon(message.role, theme)}
        </AvatarFallback>
      </Avatar>
      <div className="max-w-[70%] space-y-1">
        <Card className={`p-2 ${getCardStyle(message.role)}`}>
          <CardContent className="p-2 space-y-2">
            {renderMessageContent(message, t)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
