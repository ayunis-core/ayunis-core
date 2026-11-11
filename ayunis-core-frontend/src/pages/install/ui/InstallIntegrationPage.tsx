import { useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { useTranslation, Trans } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import type { TFunction } from 'i18next';
import { Plug } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import { useMarketplaceControllerGetIntegration } from '@/pages/install/api/useFetchMarketplaceIntegration';
import { useInstallIntegrationFromMarketplace } from '@/pages/install/api/useInstallIntegrationFromMarketplace';
import { InstallErrorState } from './InstallErrorState';
import { InstallLoadingSkeleton } from './InstallLoadingSkeleton';
import type { MarketplaceIntegrationResponseDto } from '@/pages/install/api/useFetchMarketplaceIntegration';
import type { MarketplaceIntegrationConfigFieldDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { Button } from '@ayunis/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Form } from '@ayunis/ui/components/form';
import { useMarketplaceConfig } from '@/features/marketplace';
import { ConfigFieldInput } from '@/shared/ui/config-field-input';
import {
  hasOAuthConfiguration,
  type McpOAuthConfig,
  type McpSchemaWithOAuth,
} from '@/shared/lib/mcp-oauth';
import { AcceptanceCheckboxField } from './AcceptanceCheckboxField';
import type { InstallIntegrationFormFields } from '@/pages/install/model/types';
import { buildMarketplaceIntegrationPayload } from '@/pages/install/lib/build-marketplace-integration-payload';
import { MarketplaceOAuthFields } from './MarketplaceOAuthFields';
import { MarketplaceServerUrlField } from './MarketplaceServerUrlField';

interface InstallIntegrationPageProps {
  readonly integrationIdentifier: string | undefined;
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
  readonly integrationIdentifier: string;
}) {
  const { t } = useTranslation('install-integration');
  const {
    data: integration,
    isLoading,
    isError,
  } = useMarketplaceControllerGetIntegration(integrationIdentifier);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const form = useForm<InstallIntegrationFormFields>({
    defaultValues: {
      legalAccepted: false,
      termsAccepted: false,
      oauthClientId: '',
      oauthClientSecret: '',
      serverUrl: '',
    },
  });
  const installMutation = useInstallIntegrationFromMarketplace(form);

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
    const values = form.getValues();
    installMutation.mutate({
      data: buildMarketplaceIntegrationPayload(
        integrationIdentifier,
        formValues,
        integration.configSchema,
        {
          clientId: values.oauthClientId,
          clientSecret: values.oauthClientSecret,
        },
        integration.customerProvidesServerUrl ? values.serverUrl : undefined,
      ),
    });
  };

  return (
    <InstallIntegrationCard
      integration={integration}
      formValues={formValues}
      onFormValuesChange={setFormValues}
      onInstall={handleInstall}
      isInstalling={installMutation.isPending}
      form={form}
    />
  );
}

interface InstallIntegrationCardProps {
  readonly integration: MarketplaceIntegrationResponseDto;
  readonly formValues: Record<string, string>;
  readonly onFormValuesChange: (values: Record<string, string>) => void;
  readonly onInstall: () => void;
  readonly isInstalling: boolean;
  readonly form: UseFormReturn<InstallIntegrationFormFields>;
}

function InstallIntegrationCard({
  integration,
  formValues,
  onFormValuesChange,
  onInstall,
  isInstalling,
  form,
}: InstallIntegrationCardProps) {
  const { t } = useTranslation('install-integration');
  const marketplace = useMarketplaceConfig();

  const editableFields = getEditableOrgFields(integration);
  const isZeroConfig =
    editableFields.length === 0 && !integration.customerProvidesServerUrl;
  const serverUrlFilled =
    !integration.customerProvidesServerUrl ||
    form.watch('serverUrl').trim().length > 0;
  const allRequiredFilled =
    serverUrlFilled && checkRequiredFieldsFilled(editableFields, formValues);
  const schema = integration.configSchema as McpSchemaWithOAuth;
  const oauth = hasOAuthConfiguration(schema) ? schema.oauth : undefined;
  const staticClientReady =
    oauth?.clientRegistration !== 'static' ||
    form.watch('oauthClientId').trim().length > 0;
  const termsOfServiceUrl = marketplace.url
    ? `${marketplace.url.replace(/\/$/, '')}/nutzungsbedingungen`
    : null;

  return (
    <InstallIntegrationCardView
      integration={integration}
      editableFields={editableFields}
      isZeroConfig={isZeroConfig}
      allRequiredFilled={allRequiredFilled}
      oauth={oauth}
      staticClientReady={staticClientReady}
      formValues={formValues}
      onFormValuesChange={onFormValuesChange}
      onInstall={onInstall}
      isInstalling={isInstalling}
      form={form}
      termsOfServiceUrl={termsOfServiceUrl}
      t={t}
    />
  );
}

function getEditableOrgFields(
  integration: MarketplaceIntegrationResponseDto,
): MarketplaceIntegrationConfigFieldDto[] {
  return integration.configSchema.orgFields.filter(
    (field) => field.value === null || field.value === undefined,
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
  readonly integration: MarketplaceIntegrationResponseDto;
  readonly editableFields: MarketplaceIntegrationConfigFieldDto[];
  readonly isZeroConfig: boolean;
  readonly allRequiredFilled: boolean;
  readonly oauth?: McpOAuthConfig;
  readonly staticClientReady: boolean;
  readonly formValues: Record<string, string>;
  readonly onFormValuesChange: (values: Record<string, string>) => void;
  readonly onInstall: () => void;
  readonly isInstalling: boolean;
  readonly form: UseFormReturn<InstallIntegrationFormFields>;
  readonly termsOfServiceUrl: string | null;
  readonly t: TFunction;
}

function InstallIntegrationCardView({
  integration,
  editableFields,
  isZeroConfig,
  allRequiredFilled,
  oauth,
  staticClientReady,
  formValues,
  onFormValuesChange,
  onInstall,
  isInstalling,
  form,
  termsOfServiceUrl,
  t,
}: InstallIntegrationCardViewProps) {
  const hasLegalText = Boolean(integration.legalTextUrl);

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          void form.handleSubmit(() => onInstall())(e);
        }}
      >
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
              {integration.logoUrl ? (
                <img
                  src={integration.logoUrl}
                  alt={integration.name}
                  className="h-16 w-16 object-contain"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Plug className="h-8 w-8 text-primary" />
                </div>
              )}
            </div>
            <CardTitle className="text-xl">{integration.name}</CardTitle>
            <CardDescription>{integration.shortDescription}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-md bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                {isZeroConfig
                  ? t('detail.zeroConfigNote')
                  : t('detail.installNote')}
              </p>
            </div>

            {integration.customerProvidesServerUrl && (
              <MarketplaceServerUrlField
                form={form}
                hint={integration.serverUrlHint}
                disabled={isInstalling}
              />
            )}

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

            {oauth && (
              <MarketplaceOAuthFields
                oauth={oauth}
                form={form}
                disabled={isInstalling}
                t={t}
              />
            )}

            {hasLegalText && (
              <AcceptanceCheckboxField
                form={form}
                name="legalAccepted"
                id="legal-accept"
                disabled={isInstalling}
              >
                <Trans
                  ns="install-integration"
                  i18nKey="detail.legalText"
                  components={{
                    legalLink: (
                      <a
                        href={integration.legalTextUrl ?? ''}
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
            )}

            <AcceptanceCheckboxField
              form={form}
              name="termsAccepted"
              id="terms-accept"
              disabled={isInstalling}
            >
              <Trans
                ns="install-integration"
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
              <Link to="/admin-settings/integrations">
                {t('action.cancel')}
              </Link>
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={
                isInstalling || !allRequiredFilled || !staticClientReady
              }
            >
              {isInstalling ? t('action.installing') : t('action.install')}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
