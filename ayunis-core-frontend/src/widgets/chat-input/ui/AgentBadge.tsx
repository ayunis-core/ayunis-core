import { Bot, XIcon } from 'lucide-react';
import { Badge } from '@/shared/ui/shadcn/badge';
import { cn } from '@/shared/lib/shadcn/utils';
import type { AgentResponseDto } from '@/shared/api';

interface AgentBadgeProps {
  agentId: string;
  agent: AgentResponseDto | undefined;
  isDisabled: boolean;
  onRemove: (agentId: string) => void;
}

export function AgentBadge({
  agentId,
  agent,
  isDisabled,
  onRemove,
}: Readonly<AgentBadgeProps>) {
  return (
    <Badge
      variant="secondary"
      className={cn(isDisabled && 'opacity-50 cursor-not-allowed')}
    >
      <Bot className="h-3 w-3" />
      {agent?.name}
      {!isDisabled && (
        <div
          className="cursor-pointer"
          onClick={() => onRemove(agentId)}
        >
          <XIcon className="h-3 w-3" />
        </div>
      )}
    </Badge>
  );
}
