import { useTranslation } from 'react-i18next';
import {
  DIN_5008_FORM_A_MARGINS,
  DIN_5008_FORM_B_MARGINS,
} from '@/shared/lib/letterhead-margins';
import type { MarginPreset } from '@/widgets/margin-editor/ui/MarginEditor';

/**
 * First-page presets for German official correspondence. Form B suits a
 * letterhead with a tall header (room for a logo), Form A a shallow one.
 */
export function useDinLetterPresets(): readonly MarginPreset[] {
  const { t } = useTranslation('admin-settings-letterheads');
  return [
    {
      label: t('letterheads.marginEditor.presetFormB'),
      margins: DIN_5008_FORM_B_MARGINS,
    },
    {
      label: t('letterheads.marginEditor.presetFormA'),
      margins: DIN_5008_FORM_A_MARGINS,
    },
  ];
}
