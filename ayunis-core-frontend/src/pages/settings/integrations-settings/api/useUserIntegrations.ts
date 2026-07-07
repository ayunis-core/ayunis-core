import { useMcpIntegrationsControllerListAvailable } from '@/shared/api/generated/ayunisCoreAPI';
import type {
  McpIntegrationResponseDto,
  MarketplaceIntegrationConfigFieldDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { isUserEditableField } from '@/shared/lib/config-field';

/**
 * Lists the enabled org integrations a user can personalize — i.e. those that
 * expose at least one user-editable (non-system-fixed) config field, whether
 * required or optional. Integrations whose user fields are all system-fixed
 * (nothing for the user to enter) are filtered out.
 */
export function useUserIntegrations() {
  const { data, isLoading, isError, refetch } =
    useMcpIntegrationsControllerListAvailable();

  const integrations: McpIntegrationResponseDto[] = (data ?? []).filter(
    (integration) =>
      integration.type === 'marketplace' && hasUserEditableFields(integration),
  );

  return {
    integrations,
    isLoading,
    isError,
    refetch,
  };
}

function hasUserEditableFields(
  integration: McpIntegrationResponseDto,
): boolean {
  const schema = integration.configSchema as
    { userFields?: MarketplaceIntegrationConfigFieldDto[] } | undefined;
  return (schema?.userFields ?? []).some(isUserEditableField);
}
