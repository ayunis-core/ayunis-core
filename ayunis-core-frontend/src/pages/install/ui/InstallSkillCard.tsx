import { Button } from '@ayunis/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Bot } from 'lucide-react';
import { DynamicIcon, iconNames, type IconName } from 'lucide-react/dynamic';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import type { MarketplaceSkillResponseDto } from '@/pages/install/api/useFetchMarketplaceSkill';

interface InstallSkillCardProps {
  skill: MarketplaceSkillResponseDto;
  onInstall: () => void;
  isInstalling: boolean;
}

export function InstallSkillCard({
  skill,
  onInstall,
  isInstalling,
}: Readonly<InstallSkillCardProps>) {
  const { t } = useTranslation('install');

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          {isIconName(skill.iconName) ? (
            <DynamicIcon
              name={skill.iconName}
              fallback={() => <Bot className="h-8 w-8 text-primary" />}
              className="h-8 w-8 text-primary"
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
        <Button
          type="button"
          className="flex-1"
          disabled={isInstalling}
          onClick={onInstall}
        >
          {isInstalling ? t('action.installing') : t('action.install')}
        </Button>
      </CardFooter>
    </Card>
  );
}

function isIconName(name: string | null | undefined): name is IconName {
  return !!name && (iconNames as string[]).includes(name);
}
