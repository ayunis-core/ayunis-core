import { useTranslation } from 'react-i18next';
import { PanelRight, ShieldCheck, Star } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import { Separator } from '@ayunis/ui/components/separator';
import {
  SidebarTrigger,
  useOptionalSidebar,
} from '@ayunis/ui/components/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { cn } from '@ayunis/ui/lib/cn';

/** Opens the surrounding layout's sidebar where it is collapsed. */
export function SidebarToggle() {
  const sidebar = useOptionalSidebar();
  if (!sidebar) return null;
  return (
    <div className="flex items-center gap-2 lg:hidden">
      <SidebarTrigger />
      <Separator
        orientation="vertical"
        className="mx-2 data-[orientation=vertical]:h-4"
      />
    </div>
  );
}

export function AnonymousBadge() {
  const { t } = useTranslation('chat');
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="secondary">
          <ShieldCheck className="h-3 w-3" />
          {t('chat.anonymousMode')}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{t('chat.anonymousModeTooltip')}</TooltipContent>
    </Tooltip>
  );
}

export function NewChatButton({ onClick }: Readonly<{ onClick: () => void }>) {
  const { t } = useTranslation('chat');
  return (
    <Button
      type="button"
      size="sm"
      data-testid="chat-header-new-chat"
      onClick={onClick}
    >
      {t('newChat.newChat')}
    </Button>
  );
}

export function PinButton({
  isPinned,
  label,
  onToggle,
}: Readonly<{ isPinned: boolean; label: string; onToggle: () => void }>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button
            variant="ghost"
            size="icon"
            aria-label={label}
            onClick={onToggle}
          >
            <Star className={cn(isPinned && 'fill-brand text-brand')} />
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function ArtifactPanelButton({
  open,
  onToggle,
}: Readonly<{ open: boolean; onToggle: () => void }>) {
  const { t } = useTranslation('chat');
  return (
    <Button
      variant={open ? 'secondary' : 'ghost'}
      size="icon"
      data-testid="chat-side-panel-toggle"
      onClick={onToggle}
      aria-label={t('chat.sidePanel.open')}
      aria-pressed={open}
    >
      <PanelRight className="h-5 w-5 text-primary" />
    </Button>
  );
}
