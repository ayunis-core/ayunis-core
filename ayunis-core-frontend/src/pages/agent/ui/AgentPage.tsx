import AppLayout from "@/layouts/app-layout";
import type { AgentResponseDto } from "@/shared/api";
import ContentAreaHeader from "@/widgets/content-area-header/ui/ContentAreaHeader";
import ContentAreaLayout from "@/layouts/content-area-layout/ui/ContentAreaLayout";
import AgentKnowledgeBaseCard from "./AgentKnowledgeBaseCard";
import AgentToolsCard from "./AgentToolsCard";
import AgentPropertiesCard from "./AgentPropertiesCard";

export function AgentPage({
  agent,
  isEmbeddingModelEnabled,
}: {
  agent: AgentResponseDto;
  isEmbeddingModelEnabled: boolean;
}) {
  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={<ContentAreaHeader title={agent.name} />}
        contentArea={
          <div className="grid gap-4">
            <AgentPropertiesCard agent={agent} />
            <AgentKnowledgeBaseCard
              agent={agent}
              isEnabled={isEmbeddingModelEnabled}
            />
            <AgentToolsCard />
          </div>
        }
      />
    </AppLayout>
  );
}
