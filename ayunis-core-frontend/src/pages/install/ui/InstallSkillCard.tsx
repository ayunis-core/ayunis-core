import { useForm } from 'react-hook-form';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Form } from '@/shared/ui/shadcn/form';
import { Bot } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { useMarketplaceConfig } from '@/features/marketplace';
import type { MarketplaceSkillResponseDto } from '../api/useFetchMarketplaceSkill';
import { AcceptanceCheckboxField } from './AcceptanceCheckboxField';

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
  const marketplace = useMarketplaceConfig();
  const form = useForm<{ termsAccepted: boolean }>({
    defaultValues: { termsAccepted: false },
  });

  const termsOfServiceUrl = marketplace.url
    ? `${marketplace.url.replace(/\/$/, '')}/nutzungsbedingungen`
    : null;

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

      <Form {...form}>
        <form
          onSubmit={(e) => {
            void form.handleSubmit(() => onInstall())(e);
          }}
        >
          <CardContent className="space-y-4">
            <div className="rounded-md bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                {t('detail.installNote')}
              </p>
            </div>

            <AcceptanceCheckboxField
              form={form}
              name="termsAccepted"
              id="terms-accept"
              disabled={isInstalling}
            >
              <Trans
                ns="install"
                i18nKey="detail.termsOfServiceText"
                components={{
                  termsLink: (
                    <a
                      href={termsOfServiceUrl ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-primary hover:text-primary/80"
                    >
                      placeholder
                    </a>
                  ),
                }}
              />
            </AcceptanceCheckboxField>
          </CardContent>

          <CardFooter className="flex gap-3">
            <Button variant="outline" className="flex-1" asChild>
              <Link to="/skills">{t('action.cancel')}</Link>
            </Button>
            <Button type="submit" className="flex-1" disabled={isInstalling}>
              {isInstalling ? t('action.installing') : t('action.install')}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
