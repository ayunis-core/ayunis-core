import {
  MODEL_MODES,
  type ModeOption,
  type ModelMode,
} from '@/widgets/model-select-options';

/**
 * Modes to offer as a level's default: those that resolve there, plus a saved
 * one that stopped resolving so the select can still show it.
 */
export function modeOptionsForLevel(
  availableModes: ModelMode[],
  selectedMode: ModelMode | null,
  currentModel: ModeOption['resolvedModel'],
): ModeOption[] {
  return MODEL_MODES.filter(
    (mode) => availableModes.includes(mode) || mode === selectedMode,
  ).map((mode) => ({
    mode,
    resolvedModel: mode === selectedMode ? currentModel : undefined,
  }));
}
