import { Button } from '@/shared/ui/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Badge } from '@/shared/ui/shadcn/badge';
import { Bot } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import type { MarketplaceAgentResponseDto } from '../api/useFetchMarketplaceAgent';

interface InstallAgentCardProps {
  agent: MarketplaceAgentResponseDto;
  onInstall: () => void;
  isInstalling: boolean;
}

export function InstallAgentCard({
  agent,
  onInstall,
  isInstalling,
}: InstallAgentCardProps) {
  const { t } = useTranslation('install');

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          {agent.iconUrl ? (
            <img
              src={agent.iconUrl}
              alt={agent.name}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <Bot className="h-8 w-8 text-primary" />
          )}
        </div>
        <CardTitle className="text-xl">{agent.name}</CardTitle>
        <CardDescription>{agent.briefDescription}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {agent.recommendedModelName && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t('detail.recommendedModel')}
            </span>
            <Badge variant="secondary">{agent.recommendedModelName}</Badge>
          </div>
        )}

        <div className="rounded-md bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            {t('detail.installNote')}
          </p>
        </div>
      </CardContent>

      <CardFooter className="flex gap-3">
        <Button variant="outline" className="flex-1" asChild>
          <Link to="/agents">{t('action.cancel')}</Link>
        </Button>
        <Button className="flex-1" onClick={onInstall} disabled={isInstalling}>
          {isInstalling ? t('action.installing') : t('action.install')}
        </Button>
      </CardFooter>
    </Card>
  );
}
