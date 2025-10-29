import { Loader2, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ToolUseMessageContent } from "../../model/openapi";
import AgentActivityHint from "@/widgets/agent-activity-hint/ui/AgentActivityHint";
import { useState } from "react";

/**
 * Formats a tool name for display when no translation exists.
 * Converts snake_case or kebab-case to human-readable format.
 * Examples:
 *   - "mcp_obsidian-mcp-tools_fetch" -> "Fetch"
 *   - "internet_search" -> "Internet Search"
 *   - "mcp_context7_get-library-docs" -> "Get Library Docs"
 */
function formatToolName(toolName: string): string {
  // Remove mcp_ prefix if present (e.g., "mcp_obsidian-mcp-tools_fetch")
  let formatted = toolName.replace(/^mcp_[^_]+_/, "");

  // Replace underscores and hyphens with spaces
  formatted = formatted.replace(/[_-]/g, " ");

  // Capitalize each word
  formatted = formatted
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return formatted;
}

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

  // Try to get translation, fallback to formatted tool name if not found
  // When a key doesn't exist, i18next returns the key itself (with namespace prefix)
  const translationKey = `chat.tools.${content.name}`;
  const translation = t(translationKey, { defaultValue: "" });
  const toolHint =
    translation && typeof translation === "string" && translation !== ""
      ? translation
      : formatToolName(content.name);

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
      hint={toolHint}
      input={isLoadingParams ? "" : JSON.stringify(content.params, null, 2)}
    />
  );
}
