import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
  CardFooter,
} from "@/shared/ui/shadcn/card";
import { Button } from "@/shared/ui/shadcn/button";
import { Edit, MessageCircle, Trash2, Settings } from "lucide-react";
import EditAgentDialog from "./EditAgentDialog";
import { useDeleteAgent } from "../api/useDeleteAgent";
import { useConfirmation } from "@/widgets/confirmation-modal";
import { useTranslation } from "react-i18next";
import type { Agent } from "../model/openapi";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/shared/ui/shadcn/badge";

interface AgentCardProps {
  agent: Agent;
}

export default function AgentCard({ agent }: AgentCardProps) {
  const { t } = useTranslation("agents");
  const deleteAgent = useDeleteAgent();
  const { confirm } = useConfirmation();

  function handleDelete() {
    confirm({
      title: t("card.confirmDelete.title"),
      description: t("card.confirmDelete.description", { title: agent.name }),
      confirmText: t("card.confirmDelete.confirmText"),
      cancelText: t("card.confirmDelete.cancelText"),
      variant: "destructive",
      onConfirm: () => {
        deleteAgent.mutate({ id: agent.id });
      },
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{agent.name}</CardTitle>
        <CardAction>
          <div className="flex items-center gap-2">
            <Link to="/agents/$agentId" params={{ agentId: agent.id }}>
              <Button variant="ghost" size="icon" title="View Details">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/chat" search={{ agentId: agent.id }}>
              <Button variant="ghost">
                <MessageCircle className="h-4 w-4" />{" "}
                {t("card.startChatButton")}
              </Button>
            </Link>
            <EditAgentDialog
              selectedAgent={agent}
              trigger={
                <Button variant="ghost" size="icon">
                  <Edit className="h-4 w-4" />
                </Button>
              }
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={deleteAgent.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="line-clamp-2">{agent.instructions}</p>
      </CardContent>
      {(agent.tools.length > 0 || agent.sources.length > 0) && (
        <CardFooter>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {agent.tools.map((tool) => (
                <Badge key={tool.type} variant="outline">
                  {tool.type}
                </Badge>
              ))}
              {agent.sources.length > 0 && (
                <Badge variant="secondary">
                  {agent.sources.length} {agent.sources.length === 1 ? 'source' : 'sources'}
                </Badge>
              )}
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
