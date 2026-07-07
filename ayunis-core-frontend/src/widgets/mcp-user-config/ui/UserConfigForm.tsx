import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DialogFooter } from '@/shared/ui/shadcn/dialog';
import { Button } from '@/shared/ui/shadcn/button';
import { ConfigFieldInput } from '@/shared/ui/config-field-input';
import { Skeleton } from '@/shared/ui/shadcn/skeleton';
import { useGetUserConfig, useSetUserConfig } from '../api/useUserConfig';
import type {
  McpIntegrationResponseDto,
  MarketplaceIntegrationConfigFieldDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { SECRET_MASK } from '@/shared/constants/secret-mask';
import { isUserEditableField } from '@/shared/lib/config-field';

/**
 * Per-user credential form for a marketplace MCP integration. Renders the
 * integration's `userFields` and lets the current user save their own values.
 * Shared by the admin integrations page and the user Settings → Integrations page.
 */
export function UserConfigForm({
  integration,
  onClose,
}: Readonly<{
  integration: McpIntegrationResponseDto;
  onClose: () => void;
}>) {
  const { t } = useTranslation('mcp-user-config');
  const { userConfig, isLoadingUserConfig } = useGetUserConfig(integration.id);
  const { setUserConfig, isSaving } = useSetUserConfig(integration.id, onClose);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const userFields = getUserFields(integration);

  useEffect(() => {
    if (userConfig?.configValues) {
      initFormFromExisting(userConfig.configValues, userFields, setFormValues);
    }
  }, [userConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoadingUserConfig) {
    return <UserConfigLoadingSkeleton />;
  }

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setUserConfig(formValues);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {userFields.map((field) => (
        <ConfigFieldInput
          key={field.key}
          field={field}
          value={formValues[field.key] ?? ''}
          onChange={(value) =>
            setFormValues((prev) => ({ ...prev, [field.key]: value }))
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
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? t('saving') : t('save')}
        </Button>
      </DialogFooter>
    </form>
  );
}

function getUserFields(
  integration: McpIntegrationResponseDto,
): MarketplaceIntegrationConfigFieldDto[] {
  const schema = integration.configSchema as
    { userFields?: MarketplaceIntegrationConfigFieldDto[] } | undefined;
  // System-fixed fields carry a marketplace value and must not be shown in the
  // form — the user cannot meaningfully provide them.
  return (schema?.userFields ?? []).filter(isUserEditableField);
}

function initFormFromExisting(
  existing: Record<string, string>,
  fields: MarketplaceIntegrationConfigFieldDto[],
  setFormValues: (values: Record<string, string>) => void,
) {
  const initial: Record<string, string> = {};
  for (const field of fields) {
    const existingValue = existing[field.key];
    // Secret fields come back masked — don't prefill.
    if (existingValue && existingValue !== SECRET_MASK) {
      initial[field.key] = existingValue;
    }
  }
  setFormValues(initial);
}

function UserConfigLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <div className="flex justify-end gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}
