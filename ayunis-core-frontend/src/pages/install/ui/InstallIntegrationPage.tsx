import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import { useTranslation } from 'react-i18next';
import { useMarketplaceControllerGetIntegration } from '../api/useFetchMarketplaceIntegration';
import { useInstallIntegrationFromMarketplace } from '../api/useInstallIntegrationFromMarketplace';
import { InstallErrorState } from './InstallErrorState';
import { InstallLoadingSkeleton } from './InstallLoadingSkeleton';
import type { MarketplaceIntegrationResponseDto } from '../api/useFetchMarketplaceIntegration';

interface InstallIntegrationPageProps {
  integrationIdentifier: string | undefined;
}

export default function InstallIntegrationPage({
  integrationIdentifier,
}: InstallIntegrationPageProps) {
  const { t } = useTranslation('install-integration');

  if (!integrationIdentifier) {
    return (
      <AppLayout>
        <FullScreenMessageLayout>
          <InstallErrorState
            title={t('error.missingIdentifier.title')}
            description={t('error.missingIdentifier.description')}
            backTo="/admin-settings/integrations"
            backLabel={t('action.backToIntegrations')}
          />
        </FullScreenMessageLayout>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <FullScreenMessageLayout>
        <InstallIntegrationContent
          integrationIdentifier={integrationIdentifier}
        />
      </FullScreenMessageLayout>
    </AppLayout>
  );
}

function InstallIntegrationContent({
  integrationIdentifier,
}: {
  integrationIdentifier: string;
}) {
  const { t } = useTranslation('install-integration');
  const {
    data: integration,
    isLoading,
    isError,
  } = useMarketplaceControllerGetIntegration(integrationIdentifier);
  const installMutation = useInstallIntegrationFromMarketplace();
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  if (isLoading) {
    return <InstallLoadingSkeleton />;
  }

  if (isError || !integration) {
    return (
      <InstallErrorState
        title={t('error.fetchFailed.title')}
        description={t('error.fetchFailed.description')}
        backTo="/admin-settings/integrations"
        backLabel={t('action.backToIntegrations')}
      />
    );
  }

  const handleInstall = () => {
    installMutation.mutate({
      data: {
        identifier: integrationIdentifier,
        orgConfigValues: formValues,
      },
    });
  };

  return (
    <InstallIntegrationCard
      integration={integration}
      formValues={formValues}
      onFormValuesChange={setFormValues}
      onInstall={handleInstall}
      isInstalling={installMutation.isPending}
    />
  );
}

interface InstallIntegrationCardProps {
  integration: MarketplaceIntegrationResponseDto;
  formValues: Record<string, string>;
  onFormValuesChange: (values: Record<string, string>) => void;
  onInstall: () => void;
  isInstalling: boolean;
}

function InstallIntegrationCard({
  integration,
  formValues,
  onFormValuesChange,
  onInstall,
  isInstalling,
}: InstallIntegrationCardProps) {
  const { t } = useTranslation('install-integration');

  const editableFields = getEditableOrgFields(integration);
  const isZeroConfig = editableFields.length === 0;
  const allRequiredFilled = checkRequiredFieldsFilled(
    editableFields,
    formValues,
  );

  return (
    <InstallIntegrationCardView
      integration={integration}
      editableFields={editableFields}
      isZeroConfig={isZeroConfig}
      allRequiredFilled={allRequiredFilled}
      formValues={formValues}
      onFormValuesChange={onFormValuesChange}
      onInstall={onInstall}
      isInstalling={isInstalling}
      t={t}
    />
  );
}

// Extracted to keep complexity low and reuse types
import type { MarketplaceIntegrationConfigFieldDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Input } from '@/shared/ui/shadcn/input';
import { PasswordInput } from '@/shared/ui/shadcn/password-input';
import { Label } from '@/shared/ui/shadcn/label';
import { Plug } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import type { TFunction } from 'i18next';

function getEditableOrgFields(
  integration: MarketplaceIntegrationResponseDto,
): MarketplaceIntegrationConfigFieldDto[] {
  return integration.configSchema.orgFields.filter(
    (field) => field.value == null,
  );
}

function checkRequiredFieldsFilled(
  fields: MarketplaceIntegrationConfigFieldDto[],
  values: Record<string, string>,
): boolean {
  return fields
    .filter((f) => f.required)
    .every((f) => (values[f.key] ?? '').trim().length > 0);
}

interface InstallIntegrationCardViewProps {
  integration: MarketplaceIntegrationResponseDto;
  editableFields: MarketplaceIntegrationConfigFieldDto[];
  isZeroConfig: boolean;
  allRequiredFilled: boolean;
  formValues: Record<string, string>;
  onFormValuesChange: (values: Record<string, string>) => void;
  onInstall: () => void;
  isInstalling: boolean;
  t: TFunction;
}

function InstallIntegrationCardView({
  integration,
  editableFields,
  isZeroConfig,
  allRequiredFilled,
  formValues,
  onFormValuesChange,
  onInstall,
  isInstalling,
  t,
}: InstallIntegrationCardViewProps) {
  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          {integration.iconUrl ? (
            <img
              src={integration.iconUrl}
              alt={integration.name}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <Plug className="h-8 w-8 text-primary" />
          )}
        </div>
        <CardTitle className="text-xl">{integration.name}</CardTitle>
        <CardDescription>{integration.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-md bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            {isZeroConfig
              ? t('detail.zeroConfigNote')
              : t('detail.installNote')}
          </p>
        </div>

        {editableFields.map((field) => (
          <ConfigFieldInput
            key={field.key}
            field={field}
            value={formValues[field.key] ?? ''}
            onChange={(value) =>
              onFormValuesChange({ ...formValues, [field.key]: value })
            }
            disabled={isInstalling}
          />
        ))}
      </CardContent>

      <CardFooter className="flex gap-3">
        <Button variant="outline" className="flex-1" asChild>
          <Link to="/admin-settings/integrations">{t('action.cancel')}</Link>
        </Button>
        <Button
          className="flex-1"
          onClick={onInstall}
          disabled={isInstalling || !allRequiredFilled}
        >
          {isInstalling ? t('action.installing') : t('action.install')}
        </Button>
      </CardFooter>
    </Card>
  );
}

interface ConfigFieldInputProps {
  field: MarketplaceIntegrationConfigFieldDto;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

function ConfigFieldInput({
  field,
  value,
  onChange,
  disabled,
}: ConfigFieldInputProps) {
  const inputId = `config-field-${field.key}`;

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>
        {field.label}
        {field.required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {field.type === 'secret' ? (
        <PasswordInput
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={field.help ?? ''}
        />
      ) : (
        <Input
          id={inputId}
          type={field.type === 'url' ? 'url' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={field.help ?? ''}
        />
      )}
      {field.help && (
        <p className="text-xs text-muted-foreground">{field.help}</p>
      )}
    </div>
  );
}
