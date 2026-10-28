import { z } from 'zod';

export function buildOrgNameSchema(t: (key: string) => string) {
  return z.object({
    name: z.string().trim().min(1, t('orgDetails.validation.name.isNotEmpty')),
  });
}
