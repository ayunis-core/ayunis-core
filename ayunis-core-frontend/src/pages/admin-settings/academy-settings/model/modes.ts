import { AcademyAccessMode } from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface AcademyAccessModeOption {
  value: AcademyAccessMode;
  labelKey: string;
  descriptionKey: string;
}

/** Ordered least to most restrictive, which is how the card presents them. */
export const ACADEMY_ACCESS_MODE_OPTIONS: readonly AcademyAccessModeOption[] = [
  {
    value: AcademyAccessMode.unrestricted,
    labelKey: 'requirement.modes.unrestricted.label',
    descriptionKey: 'requirement.modes.unrestricted.description',
  },
  {
    value: AcademyAccessMode.required_once,
    labelKey: 'requirement.modes.requiredOnce.label',
    descriptionKey: 'requirement.modes.requiredOnce.description',
  },
  {
    value: AcademyAccessMode.required_annually,
    labelKey: 'requirement.modes.requiredAnnually.label',
    descriptionKey: 'requirement.modes.requiredAnnually.description',
  },
];
