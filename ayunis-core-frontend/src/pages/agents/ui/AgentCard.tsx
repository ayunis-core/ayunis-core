import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/shared/ui/shadcn/card";
import { Button } from "@/shared/ui/shadcn/button";
import { Edit, MessageCircle, Trash2 } from "lucide-react";
import EditAgentDialog from "./EditAgentDialog";
import { useDeleteAgent } from "../api/useDeleteAgent";
import { useConfirmation } from "@/widgets/confirmation-modal";
import { useTranslation } from "react-i18next";
import type { Agent } from "../model/openapi";
import { Link } from "@tanstack/react-router";

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
        <CardDescription className="line-clamp-2 mb-2">
          {agent.instructions}
        </CardDescription>
        <CardAction>
          <div className="flex items-center gap-2">
            <Link to="/chat" search={{ agentId: agent.id }}>
              <Button variant="ghost">
                <MessageCircle className="h-4 w-4" /> Start Chat
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
    </Card>
  );
}
