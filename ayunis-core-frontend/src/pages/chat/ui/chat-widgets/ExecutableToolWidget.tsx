import { Loader2, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ToolUseMessageContent } from "../../model/openapi";
import AgentActivityHint from "@/widgets/agent-activity-hint/ui/AgentActivityHint";
import { useState } from "react";

export default function ExecutableToolWidget({
  content,
  isStreaming = false,
}: {
  content: ToolUseMessageContent;
  isStreaming?: boolean;
}) {
  const { t } = useTranslation("chats");
  const [open, setOpen] = useState(false);

  // Check if params are empty or incomplete (streaming in progress)
  const hasParams = content.params && Object.keys(content.params).length > 0;
  const isLoadingParams = isStreaming && !hasParams;

  return (
    <AgentActivityHint
      open={open}
      onOpenChange={setOpen}
      icon={
        isStreaming || isLoadingParams ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wrench className="h-4 w-4" />
        )
      }
      hint={t(`chat.tools.${content.name}`)}
      input={isLoadingParams ? "" : JSON.stringify(content.params, null, 2)}
    />
  );
}
