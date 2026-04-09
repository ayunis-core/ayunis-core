import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import {
  getMcpIntegrationsControllerListQueryKey,
  useMcpIntegrationsControllerCreateSelfDefined,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { setValidationErrors } from '@/shared/lib/set-validation-errors';
import { showError, showSuccess } from '@/shared/lib/toast';
import type {
  CreateSelfDefinedIntegrationFormFields,
  CreateSelfDefinedIntegrationPayload,
  CreateSelfDefinedIntegrationSchemaError,
} from '../model/types';

interface ErrorResponseData {
  code?: string;
  message?: string;
  metadata?: {
    field?: string;
  };
}

export function useCreateSelfDefinedIntegration(
  form: UseFormReturn<CreateSelfDefinedIntegrationFormFields>,
  onSuccess?: () => void,
) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-integrations');
  const [schemaError, setSchemaError] =
    useState<CreateSelfDefinedIntegrationSchemaError | null>(null);

  const mutation = useMcpIntegrationsControllerCreateSelfDefined({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getMcpIntegrationsControllerListQueryKey(),
        });
        setSchemaError(null);
        showSuccess(t('integrations.createSelfDefinedDialog.success'));
        onSuccess?.();
      },
      onError: (error: unknown) => {
        try {
          setSchemaError(null);
          const { code, errors } = extractErrorData(error);

          if (code === 'VALIDATION_ERROR' && errors) {
            setValidationErrors(
              form,
              errors,
              t,
              'integrations.createSelfDefinedDialog.validation',
            );
            return;
          }

          switch (code) {
            case 'MCP_INVALID_CONFIG_SCHEMA': {
              const fieldPath = getSchemaFieldPath(error);
              setSchemaError({
                fieldPath,
                message: fieldPath
                  ? t(
                      'integrations.createSelfDefinedDialog.errorInvalidSchemaWithField',
                      {
                        field: fieldPath,
                      },
                    )
                  : t(
                      'integrations.createSelfDefinedDialog.errorInvalidSchema',
                    ),
              });
              break;
            }
            case 'MCP_OAUTH_CLIENT_NOT_CONFIGURED':
              showError(
                t('integrations.createSelfDefinedDialog.errorMissingClient'),
              );
              break;
            case 'MCP_AUTHORIZATION_HEADER_COLLISION':
              showError(
                t('integrations.createSelfDefinedDialog.errorHeaderCollision'),
              );
              break;
            case 'INVALID_SERVER_URL':
              showError(
                t('integrations.createSelfDefinedDialog.errorInvalidServerUrl'),
              );
              break;
            case 'DUPLICATE_MCP_INTEGRATION':
              showError(
                t('integrations.createSelfDefinedDialog.errorDuplicate'),
              );
              break;
            default:
              showError(t('integrations.createSelfDefinedDialog.error'));
          }
        } catch {
          showError(t('integrations.createSelfDefinedDialog.error'));
        }
      },
    },
  });

  const createSelfDefinedIntegration = (
    data: CreateSelfDefinedIntegrationPayload,
  ) => {
    setSchemaError(null);
    mutation.mutate({ data });
  };

  return {
    createSelfDefinedIntegration,
    clearSchemaError: () => setSchemaError(null),
    schemaError,
    isCreating: mutation.isPending,
  };
}

function getSchemaFieldPath(error: unknown): string | undefined {
  if (error instanceof AxiosError) {
    const responseData = error.response?.data as ErrorResponseData | undefined;
    const field = responseData?.metadata?.field;
    return typeof field === 'string' && field.length > 0 ? field : undefined;
  }

  return undefined;
}
