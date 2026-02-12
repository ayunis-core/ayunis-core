import { useMemo } from 'react';
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
  isDisabled?: boolean;
}

export default function AgentButton({
  selectedAgentId,
  onAgentChange,
  isDisabled,
}: AgentButtonProps) {
  const { agents } = useAgents();
  const { t } = useTranslation('common');
  const { t: tAgents } = useTranslation('agents');
  const navigate = useNavigate();

  // Separate agents into personal (owned) and shared, sorted alphabetically
  const { personalAgents, sharedAgents } = useMemo(() => {
    const personal = agents
      .filter((agent) => !agent.isShared)
      .sort((a, b) => a.name.localeCompare(b.name));
    const shared = agents
      .filter((agent) => agent.isShared)
      .sort((a, b) => a.name.localeCompare(b.name));
    return { personalAgents: personal, sharedAgents: shared };
  }, [agents]);

  function handleChange(value: string) {
    onAgentChange(value);
  }

  const renderAgentItem = (agent: (typeof agents)[0]) => (
    <DropdownMenuItem key={agent.id} onClick={() => handleChange(agent.id)}>
      {agent.name}{' '}
      {agent.id === selectedAgentId && <Check className="h-4 w-4" />}
    </DropdownMenuItem>
  );

  return (
    <Tooltip>
      <TooltipContent>{t('chatInput.agentButtonTooltip')}</TooltipContent>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={isDisabled}>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              disabled={isDisabled}
              aria-label={t('chatInput.agentButtonTooltip')}
            >
              <Bot className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>{t('chatInput.agents.title')}</DropdownMenuLabel>
          {agents.length === 0 ? (
            <DropdownMenuGroup>
              <DropdownMenuItem disabled>
                {t('chatInput.agentsEmptyState')}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          ) : (
            <>
              {/* Personal Agents Group */}
              <DropdownMenuGroup>
                {sharedAgents.length > 0 && personalAgents.length > 0 && (
                  <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                    {tAgents('tabs.personal')}
                  </DropdownMenuLabel>
                )}
                {personalAgents.length > 0 ? (
                  personalAgents.map(renderAgentItem)
                ) : (
                  <DropdownMenuItem disabled className="text-muted-foreground">
                    {tAgents('emptyState.personal.title')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              {/* Shared Agents Group */}
              {sharedAgents.length > 0 && (
                <DropdownMenuGroup>
                  {personalAgents.length > 0 && (
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                      {tAgents('tabs.shared')}
                    </DropdownMenuLabel>
                  )}
                  {sharedAgents.map(renderAgentItem)}
                </DropdownMenuGroup>
              )}
            </>
          )}
          <DropdownMenuGroup>
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
