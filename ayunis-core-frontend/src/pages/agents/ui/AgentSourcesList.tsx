import { Badge } from "@/shared/ui/shadcn/badge";
import { Button } from "@/shared/ui/shadcn/button";
import { Trash2, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useConfirmation } from "@/widgets/confirmation-modal";
import { useRemoveAgentSource } from "../api/useRemoveAgentSource";
import type { SourceResponseDto } from "@/shared/api/generated/ayunisCoreAPI.schemas";

interface AgentSourcesListProps {
  agentId: string;
  sources: SourceResponseDto[];
}

export default function AgentSourcesList({ agentId, sources }: AgentSourcesListProps) {
  const { t } = useTranslation("agents");
  const { confirm } = useConfirmation();
  const removeSource = useRemoveAgentSource();

  const handleRemoveSource = (source: SourceResponseDto) => {
    confirm({
      title: t("sources.confirmRemove.title"),
      description: t("sources.confirmRemove.description", { name: source.name }),
      confirmText: t("sources.confirmRemove.confirmText"),
      cancelText: t("sources.confirmRemove.cancelText"),
      variant: "destructive",
      onConfirm: () => {
        removeSource.mutate({ id: agentId, sourceId: source.id });
      },
    });
  };

  if (sources.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{t("sources.empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sources.map((source) => (
        <div
          key={source.id}
          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{source.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {source.type}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveSource(source)}
              disabled={removeSource.isPending}
              title={t("sources.remove")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}