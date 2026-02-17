import { Button } from '@/shared/ui/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Bot } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import type { MarketplaceSkillResponseDto } from '../api/useFetchMarketplaceSkill';

interface InstallSkillCardProps {
  skill: MarketplaceSkillResponseDto;
  onInstall: () => void;
  isInstalling: boolean;
}

export function InstallSkillCard({
  skill,
  onInstall,
  isInstalling,
}: InstallSkillCardProps) {
  const { t } = useTranslation('install');

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          {skill.iconUrl ? (
            <img
              src={skill.iconUrl}
              alt={skill.name}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <Bot className="h-8 w-8 text-primary" />
          )}
        </div>
        <CardTitle className="text-xl">{skill.name}</CardTitle>
        <CardDescription>{skill.shortDescription}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-md bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            {t('detail.installNote')}
          </p>
        </div>
      </CardContent>

      <CardFooter className="flex gap-3">
        <Button variant="outline" className="flex-1" asChild>
          <Link to="/skills">{t('action.cancel')}</Link>
        </Button>
        <Button className="flex-1" onClick={onInstall} disabled={isInstalling}>
          {isInstalling ? t('action.installing') : t('action.install')}
        </Button>
      </CardFooter>
    </Card>
  );
}
