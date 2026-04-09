import { useState, type FormEvent } from 'react';
import type { MarketplaceIntegrationConfigFieldDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { OAuthAuthorizeButtonMessages } from '@/features/mcp-oauth';
import {
  OAuthAuthorizeButton,
  OAuthStatusBadge,
  useOAuthStatus,
} from '@/features/mcp-oauth';
import { parseMcpOAuthInfo } from '@/shared/lib/mcp-oauth';
import { SECRET_MASK } from '@/shared/constants/secret-mask';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';
import { Skeleton } from '@/shared/ui/shadcn/skeleton';
import { ConfigFieldInput } from '@/shared/ui/config-field-input';
import { useGetUserConfig } from '../api/useGetUserConfig';
import { useSetUserConfig } from '../api/useSetUserConfig';

interface UserConfigurableIntegration {
  id: string;
  name: string;
  configSchema?: unknown;
  oauth?: unknown;
}

interface UserConfigDialogMessages {
  title: (name: string) => string;
  description: string;
  save: string;
  saving: string;
  cancel: string;
  close: string;
  success: string;
  error: string;
  notFound: string;
  nothingToConfigure: string;
  authorizationTitle: string;
  authorizationDescription: string;
  statusAuthorized: string;
  statusPending: string;
  statusExpiresAt: (date: string) => string;
  oauthButton: OAuthAuthorizeButtonMessages;
}

interface UserConfigDialogProps {
  readonly integration: UserConfigurableIntegration | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly messages: UserConfigDialogMessages;
}

export function UserConfigDialog({
  integration,
  open,
  onOpenChange,
  messages,
}: Readonly<UserConfigDialogProps>) {
  if (!integration) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{messages.title(integration.name)}</DialogTitle>
          <DialogDescription>{messages.description}</DialogDescription>
        </DialogHeader>
        <UserConfigForm
          integration={integration}
          messages={messages}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function UserConfigForm({
  integration,
  messages,
  onClose,
}: Readonly<{
  integration: UserConfigurableIntegration;
  messages: UserConfigDialogMessages;
  onClose: () => void;
}>) {
  const userFields = getUserFields(integration);
  const showsUserOAuth = hasUserLevelOAuth(integration);
  const hasConfigurableContent = userFields.length > 0 || showsUserOAuth;
  const { userConfig, isLoadingUserConfig } = useGetUserConfig(integration.id);
  const { setUserConfig, isSaving } = useSetUserConfig(
    integration.id,
    {
      success: messages.success,
      error: messages.error,
      notFound: messages.notFound,
    },
    onClose,
  );
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const initialValues = buildInitialFormValues(
    userConfig?.configValues ?? {},
    userFields,
  );
  const formValues = { ...initialValues, ...draftValues };

  if (isLoadingUserConfig && userFields.length > 0) {
    return <UserConfigLoadingSkeleton />;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (userFields.length === 0) {
      return;
    }
    setUserConfig(formValues);
  };

  if (!hasConfigurableContent) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {messages.nothingToConfigure}
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {messages.close}
          </Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {showsUserOAuth && (
        <UserOAuthAuthorizationSection
          integrationId={integration.id}
          messages={messages}
        />
      )}

      {userFields.map((field) => (
        <ConfigFieldInput
          key={field.key}
          field={field}
          value={formValues[field.key] ?? ''}
          onChange={(value) =>
            setDraftValues((previous) => ({ ...previous, [field.key]: value }))
          }
          disabled={isSaving}
          idPrefix="user-config"
        />
      ))}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSaving}
        >
          {userFields.length > 0 ? messages.cancel : messages.close}
        </Button>
        {userFields.length > 0 && (
          <Button type="submit" disabled={isSaving}>
            {isSaving ? messages.saving : messages.save}
          </Button>
        )}
      </DialogFooter>
    </form>
  );
}

function UserOAuthAuthorizationSection({
  integrationId,
  messages,
}: Readonly<{
  integrationId: string;
  messages: UserConfigDialogMessages;
}>) {
  const { oauthStatus, isLoading } = useOAuthStatus(integrationId);
  const isAuthorized = oauthStatus?.authorized === true;
  const expiresAtLabel = formatTimestamp(oauthStatus?.expiresAt);

  return (
    <section className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">{messages.authorizationTitle}</h3>
          {isLoading ? (
            <Skeleton className="h-5 w-24" />
          ) : (
            <OAuthStatusBadge
              status={isAuthorized ? 'authorized' : 'pending'}
              authorizedLabel={messages.statusAuthorized}
              pendingLabel={messages.statusPending}
            />
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {messages.authorizationDescription}
        </p>
        {isAuthorized && expiresAtLabel && (
          <p className="text-xs text-muted-foreground">
            {messages.statusExpiresAt(expiresAtLabel)}
          </p>
        )}
      </div>
      <OAuthAuthorizeButton
        integrationId={integrationId}
        isAuthorized={isAuthorized}
        messages={messages.oauthButton}
      />
    </section>
  );
}

function getUserFields(
  integration: Pick<UserConfigurableIntegration, 'configSchema'>,
): MarketplaceIntegrationConfigFieldDto[] {
  if (
    !integration.configSchema ||
    typeof integration.configSchema !== 'object'
  ) {
    return [];
  }

  const schema = integration.configSchema as {
    userFields?: MarketplaceIntegrationConfigFieldDto[];
  };

  return Array.isArray(schema.userFields) ? schema.userFields : [];
}

function hasUserLevelOAuth(
  integration: Pick<UserConfigurableIntegration, 'oauth'>,
): boolean {
  const oauthInfo = parseMcpOAuthInfo(integration.oauth);
  return oauthInfo?.enabled === true && oauthInfo.level === 'user';
}

function buildInitialFormValues(
  existing: Record<string, string>,
  fields: MarketplaceIntegrationConfigFieldDto[],
): Record<string, string> {
  const initialValues: Record<string, string> = {};

  for (const field of fields) {
    const existingValue = existing[field.key];

    if (existingValue && existingValue !== SECRET_MASK) {
      initialValues[field.key] = existingValue;
    }
  }

  return initialValues;
}

function formatTimestamp(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function UserConfigLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <div className="flex justify-end gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}
