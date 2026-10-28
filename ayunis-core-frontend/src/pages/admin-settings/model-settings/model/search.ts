import { z } from 'zod';

export const modelSettingsSearchSchema = z.object({
  tab: z
    .enum(['organization', 'teams'])
    .default('organization')
    .catch('organization'),
  search: z.string().default('').catch(''),
});
