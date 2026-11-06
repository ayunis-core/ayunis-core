import {
  MODEL_MODES,
  type ModeOption,
  type ModelMode,
} from '@/widgets/model-select-options';

/**
 * Every mode is offered as a level's default; those that do not resolve there
 * are disabled so admins can see why they cannot pick them.
 */
export function modeOptionsForLevel(
  availableModes: ModelMode[],
  selectedMode: ModelMode | null,
  currentModel: ModeOption['resolvedModel'],
): ModeOption[] {
  return MODEL_MODES.map((mode) => ({
    mode,
    resolvedModel: mode === selectedMode ? currentModel : undefined,
    disabled: !availableModes.includes(mode),
  }));
}

export function unavailableModesHint(
  options: ModeOption[],
): ModelMode | 'both' | null {
  const unavailable = options.filter((option) => option.disabled);
  if (unavailable.length > 1) return 'both';
  return unavailable.at(0)?.mode ?? null;
}
