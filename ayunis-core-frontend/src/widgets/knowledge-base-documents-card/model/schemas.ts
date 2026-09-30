import type { TFunction } from 'i18next';
import * as z from 'zod';
import { ReindexIntervalUnit } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { isValidUrl } from '@/widgets/knowledge-base-documents-card/lib/isValidUrl';
import { REINDEX_INTERVAL_MAX_VALUE } from '@/widgets/knowledge-base-documents-card/lib/reindex-schedule';

function reindexIntervalSchema(t: TFunction) {
  return z
    .object({
      enabled: z.boolean(),
      // An emptied number input yields NaN; the range check below reports it.
      value: z.number().or(z.nan()),
      unit: z.enum(ReindexIntervalUnit),
    })
    .superRefine((interval, ctx) => {
      if (!interval.enabled) return;
      const { value, unit } = interval;
      if (
        !Number.isInteger(value) ||
        value < 1 ||
        value > REINDEX_INTERVAL_MAX_VALUE[unit]
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['value'],
          message: t(
            'detail.documents.validation.reindexInterval.value.invalid',
          ),
        });
      }
    });
}

export function createReindexScheduleSchema(t: TFunction) {
  return z.object({ reindexInterval: reindexIntervalSchema(t) });
}

export function createAddUrlSchema(t: TFunction) {
  return z.object({
    url: z
      .string()
      .trim()
      .refine(isValidUrl, t('detail.documents.validation.url.invalid')),
    maxDepth: z.number(),
    reindexInterval: reindexIntervalSchema(t),
  });
}
