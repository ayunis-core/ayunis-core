import { Input } from '@/shared/ui/shadcn/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/shadcn/select';
import { useNavigate } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef, useMemo } from 'react';
import type { Agent } from '../model/types';

interface ChatsFiltersProps {
  agents: Agent[];
  search?: string;
  agentId?: string;
}

export default function ChatsFilters({
  agents,
  search,
  agentId,
}: Readonly<ChatsFiltersProps>) {
  const { t } = useTranslation('chats');
  const { t: tAgents } = useTranslation('agents');
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState(search ?? '');
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Auto-focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Sync search value with URL params
  useEffect(() => {
    const updateValue = () => {
      setSearchValue(search ?? '');
    };
    updateValue();
  }, [search]);

  // Debounced search update
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== (search ?? '')) {
        void navigate({
          to: '/chats',
          search: (prev: {
            search?: string;
            agentId?: string;
            page?: number;
          }) => ({
            ...prev,
            search: searchValue || undefined,
            page: undefined, // Reset to page 1 when search changes
          }),
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue, search, navigate]);

  const handleAgentChange = (value: string) => {
    void navigate({
      to: '/chats',
      search: (prev: { search?: string; agentId?: string; page?: number }) => ({
        ...prev,
        agentId: value === 'all' ? undefined : value,
        page: undefined, // Reset to page 1 when agent filter changes
      }),
    });
  };

  return (
    <div className="flex gap-4 mb-6">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          type="text"
          placeholder={t('filters.searchPlaceholder')}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-10"
        />
      </div>
      <Select value={agentId ?? 'all'} onValueChange={handleAgentChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={t('filters.agentFilterLabel')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('filters.agentFilterAll')}</SelectItem>
          {agents.length > 0 && (
            <>
              {/* Personal Agents Group */}
              {personalAgents.length > 0 && (
                <SelectGroup>
                  {sharedAgents.length > 0 && (
                    <SelectLabel>{tAgents('tabs.personal')}</SelectLabel>
                  )}
                  {personalAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              {/* Shared Agents Group */}
              {sharedAgents.length > 0 && (
                <SelectGroup>
                  {personalAgents.length > 0 && (
                    <SelectLabel>{tAgents('tabs.shared')}</SelectLabel>
                  )}
                  {sharedAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
