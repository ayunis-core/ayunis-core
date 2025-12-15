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
}: AgentBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'flex items-center gap-1 rounded-full border-none',
        isDisabled && 'opacity-50 cursor-not-allowed',
      )}
      onClick={() => !isDisabled && onRemove(agentId)}
    >
      <Bot className="h-3 w-3" />
      {agent?.name}
      {!isDisabled && <XIcon className="h-3 w-3 cursor-pointer" />}
    </Badge>
  );
}
