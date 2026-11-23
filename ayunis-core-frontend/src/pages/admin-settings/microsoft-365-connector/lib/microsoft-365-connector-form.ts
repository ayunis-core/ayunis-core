import type {
  Microsoft365ConnectorResponseDto,
  SaveMicrosoft365ConnectorDto,
} from '@ayunis/api-client/schemas';
import type { Microsoft365ConnectorFormValues } from '@/pages/admin-settings/microsoft-365-connector/model/microsoft365ConnectorFormSchema';

/** The stored secret is never shown, so its field always starts empty. */
export function toMicrosoft365ConnectorFormValues(
  connector: Microsoft365ConnectorResponseDto,
): Microsoft365ConnectorFormValues {
  return {
    tenantId: connector.tenantId ?? '',
    clientId: connector.clientId ?? '',
    clientSecret: '',
  };
}

/** An empty or blank secret field is left out, which keeps the stored secret. */
export function toSaveMicrosoft365ConnectorDto(
  values: Microsoft365ConnectorFormValues,
): SaveMicrosoft365ConnectorDto {
  return {
    tenantId: values.tenantId,
    clientId: values.clientId,
    ...(values.clientSecret.trim() === ''
      ? {}
      : { clientSecret: values.clientSecret }),
  };
}
