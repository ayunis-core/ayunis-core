import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
import { getHelpCenterUrl } from '@/shared/lib/help-center';

interface HelpLinkProps {
  readonly path: string;
  /** Use "icon" for card-level links (icon-only with tooltip) */
  readonly variant?: 'default' | 'icon';
}

export function HelpLink({ path, variant = 'default' }: HelpLinkProps) {
  const { t } = useTranslation('common');
  const url = getHelpCenterUrl(path);
  const label = t('common.helpLink');

  if (variant === 'icon') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button variant="outline" size="sm" asChild>
      <a href={url} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="h-4 w-4" />
        {label}
      </a>
    </Button>
  );
}
