import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";
import { FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAgentSources } from "../api/useAgentSources";
import AgentSourcesList from "./AgentSourcesList";
import AddAgentSourceDialog from "./AddAgentSourceDialog";

interface AgentSourcesSectionProps {
  agentId: string;
}

export default function AgentSourcesSection({ agentId }: AgentSourcesSectionProps) {
  const { t } = useTranslation("agents");
  const { data: sources, isLoading, error } = useAgentSources(agentId);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("sources.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-destructive">
            <p>{t("sources.loadError")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {t("sources.title")}
          {sources && sources.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({sources.length})
            </span>
          )}
        </CardTitle>
        <AddAgentSourceDialog agentId={agentId} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-5 w-5" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        ) : (
          <AgentSourcesList agentId={agentId} sources={sources || []} />
        )}
      </CardContent>
    </Card>
  );
}