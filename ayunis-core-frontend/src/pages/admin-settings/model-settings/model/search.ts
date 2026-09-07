import { z } from 'zod';

export const modelSettingsSearchSchema = z.object({
  tab: z.enum(['organization', 'teams']).catch('organization'),
  search: z.string().catch(''),
});
