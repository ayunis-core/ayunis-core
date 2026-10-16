import { useTranslation } from 'react-i18next';
import { requestDateCopy } from '@/features/resource-handover/lib/request-date';
import type {
  CopyKey,
  HandoverKind,
} from '@/features/resource-handover/model/types';

export function useHandoverCopy(kind: HandoverKind) {
  const { t, i18n } = useTranslation('resource-handover');
  const noun = t(`nouns.${kind}`);

  function text(copy: CopyKey, values: Record<string, string | number> = {}) {
    return t(copy.key, { noun, ...copy.values, ...values });
  }

  function date(requestedAt: string): string {
    return text(requestDateCopy(requestedAt, i18n.language));
  }

  return { t, noun, text, date };
}
