import { Badge } from "@/shared/ui/shadcn/badge";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ToolUseSkeleton() {
  const { t } = useTranslation("chats");
  return (
    <div className="my-2">
      <Badge variant="outline">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("chat.tools.tool_use")}
      </Badge>
    </div>
  );
}
