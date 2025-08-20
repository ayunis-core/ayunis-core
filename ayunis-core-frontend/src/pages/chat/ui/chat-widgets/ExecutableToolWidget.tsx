import { Badge } from "@/shared/ui/shadcn/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/ui/shadcn/collapsible";
import { Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ToolUseMessageContent } from "../../model/openapi";

export default function ExecutableToolWidget({
  content,
}: {
  content: ToolUseMessageContent;
}) {
  const { t } = useTranslation("chats");
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
            <Wrench className="h-4 w-4" /> {t(`chat.tools.${content.name}`)}
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
}
