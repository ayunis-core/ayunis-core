import type { TFunction } from 'i18next';
import * as z from 'zod';

export function createAddOparlSystemSchema(t: TFunction) {
  return z.object({
    url: z.string().trim().min(1, t('add.validation.url.isNotEmpty')),
  });
}
