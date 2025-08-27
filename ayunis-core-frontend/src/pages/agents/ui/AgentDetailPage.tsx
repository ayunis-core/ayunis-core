import AppLayout from "@/layouts/app-layout";
import ContentAreaLayout from "@/layouts/content-area-layout/ui/ContentAreaLayout";
import ContentAreaHeader from "@/widgets/content-area-header/ui/ContentAreaHeader";
import { Button } from "@/shared/ui/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";
import { Badge } from "@/shared/ui/shadcn/badge";
import { ArrowLeft, Edit, MessageCircle, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import type { Agent } from "../model/openapi";
import EditAgentDialog from "./EditAgentDialog";
import AgentSourcesSection from "./AgentSourcesSection";

interface AgentDetailPageProps {
  agent: Agent;
}

export default function AgentDetailPage({ agent }: AgentDetailPageProps) {
  const { t } = useTranslation("agents");

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            title={
              <div className="flex items-center gap-3">
                <Link to="/agents">
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold">{agent.name}</h1>
                  <p className="text-sm text-muted-foreground">Agent Details</p>
                </div>
              </div>
            }
            action={
              <div className="flex items-center gap-2">
                <Link to="/chat" search={{ agentId: agent.id }}>
                  <Button>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {t("card.startChatButton")}
                  </Button>
                </Link>
                <EditAgentDialog
                  selectedAgent={agent}
                  trigger={
                    <Button variant="outline">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  }
                />
              </div>
            }
          />
        }
        contentArea={
          <div className="space-y-6">
            {/* Agent Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Instructions</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {agent.instructions}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Model</h3>
                  <Badge variant="outline">
                    {agent.model.displayName} ({agent.model.provider})
                  </Badge>
                </div>

                {agent.tools.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Tools</h3>
                    <div className="flex flex-wrap gap-2">
                      {agent.tools.map((tool) => (
                        <Badge key={tool.type} variant="secondary">
                          {tool.type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground pt-2 border-t">
                  <p>Created: {new Date(agent.createdAt).toLocaleDateString()}</p>
                  <p>Updated: {new Date(agent.updatedAt).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>

            {/* Agent Sources */}
            <AgentSourcesSection agentId={agent.id} />
          </div>
        }
      />
    </AppLayout>
  );
}