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
  return (
    <AgentActivityHint
      open={open}
      onOpenChange={setOpen}
      icon={
        isStreaming ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wrench className="h-4 w-4" />
        )
      }
      hint={t(`chat.tools.${content.name}`)}
      input={JSON.stringify(content.params, null, 2)}
    />
  );
}
