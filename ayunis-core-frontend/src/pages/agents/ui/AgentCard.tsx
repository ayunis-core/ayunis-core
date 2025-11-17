import { Button } from '@/shared/ui/shadcn/button';
import { Edit, MessageCircle, Trash2 } from 'lucide-react';
// import EditAgentDialog from "./EditAgentDialog";
import { useDeleteAgent } from '../api/useDeleteAgent';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useTranslation } from 'react-i18next';
import type { Agent } from '../model/openapi';
import { Link, useRouter } from '@tanstack/react-router';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/shared/ui/shadcn/item';

interface AgentCardProps {
  agent: Agent;
}

export default function AgentCard({ agent }: AgentCardProps) {
  const { t } = useTranslation('agents');
  const deleteAgent = useDeleteAgent();
  const { confirm } = useConfirmation();
  const router = useRouter();
  function handleDelete() {
    confirm({
      title: t('card.confirmDelete.title'),
      description: t('card.confirmDelete.description', { title: agent.name }),
      confirmText: t('card.confirmDelete.confirmText'),
      cancelText: t('card.confirmDelete.cancelText'),
      variant: 'destructive',
      onConfirm: () => {
        deleteAgent.mutate({ id: agent.id });
      },
    });
  }

  return (
    <Item
      variant="outline"
      className="cursor-pointer"
      onClick={() =>
        void router.navigate({ to: '/agents/$id', params: { id: agent.id } })
      }
    >
      <ItemContent>
        <ItemTitle>{agent.name}</ItemTitle>
        <ItemDescription>{agent.instructions}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Link
          to="/chat"
          search={{ agentId: agent.id }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button variant="ghost">
            <MessageCircle className="h-4 w-4" /> {t('card.startChatButton')}
          </Button>
        </Link>
        <Link
          to="/agents/$id"
          params={{ id: agent.id }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button variant="ghost" size="icon">
            <Edit className="h-4 w-4" />
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          disabled={deleteAgent.isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </ItemActions>
    </Item>
  );
}
