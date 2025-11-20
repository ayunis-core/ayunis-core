import { useAgents } from '../../../features/useAgents';
import { Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/shadcn/dropdown-menu';
import { Button } from '@/shared/ui/shadcn/button';
import { Bot, Check } from 'lucide-react';
import { Switch } from '@/shared/ui/shadcn/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';

interface AgentButtonProps {
  selectedAgentId: string | undefined;
  onAgentChange: (value: string) => void;
}

export default function AgentButton({
  selectedAgentId,
  onAgentChange,
}: AgentButtonProps) {
  const { agents } = useAgents();
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  function handleChange(value: string) {
    onAgentChange(value);
  }

  return (
    <Tooltip>
      <TooltipContent>{t('chatInput.agentButtonTooltip')}</TooltipContent>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon">
              <Bot className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>{t('chatInput.agents.title')}</DropdownMenuLabel>
          <DropdownMenuGroup>
            {agents.length ? (
              agents
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((agent) => (
                  <DropdownMenuItem
                    key={agent.id}
                    onClick={() => handleChange(agent.id)}
                  >
                    {agent.name}{' '}
                    {agent.id === selectedAgentId && (
                      <Check className="h-4 w-4" />
                    )}
                  </DropdownMenuItem>
                ))
            ) : (
              <DropdownMenuItem disabled>
                {t('chatInput.agentsEmptyState')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => void navigate({ to: '/agents' })}>
              <Plus /> {t('chatInput.createFirstAgent')}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>{t('chatInput.tools.title')}</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem className="flex items-center justify-between">
              {t('chatInput.tools.internet_search')}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Switch checked={true} disabled />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {t('chatInput.tools.cannot_disable')}
                </TooltipContent>
              </Tooltip>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center justify-between">
              {t('chatInput.tools.send_email')}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Switch checked={true} disabled />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {t('chatInput.tools.cannot_disable')}
                </TooltipContent>
              </Tooltip>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </Tooltip>
  );
}
