import * as z from 'zod';

/** Entra tenant and client IDs are GUIDs, whatever their UUID version. */
const GUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const CLIENT_SECRET_MAX_LENGTH = 1024;

export function microsoft365ConnectorFormSchema(
  t: (key: string) => string,
  { secretStored }: { secretStored: boolean },
) {
  const clientSecret = z
    .string()
    .max(
      CLIENT_SECRET_MAX_LENGTH,
      t('microsoft365.validation.clientSecret.maxLength'),
    );
  return z.object({
    tenantId: z
      .string()
      .trim()
      .regex(GUID_PATTERN, t('microsoft365.validation.tenantId.matches')),
    clientId: z
      .string()
      .trim()
      .regex(GUID_PATTERN, t('microsoft365.validation.clientId.matches')),
    clientSecret: secretStored
      ? clientSecret
      : clientSecret.min(1, t('microsoft365.validation.clientSecret.required')),
  });
}

export type Microsoft365ConnectorFormValues = z.infer<
  ReturnType<typeof microsoft365ConnectorFormSchema>
>;
