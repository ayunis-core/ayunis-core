import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Label } from '@ayunis/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import { useTranslation } from 'react-i18next';
import { usePermittedModels } from '@/features/usePermittedModels';
import { useUserDefaultModel } from '@/pages/settings/chat-settings/api/useUserDefaultModel';
import { useModelModes } from '@/features/useModelModes';
import { useModelModeDefault } from '@/features/model-mode-defaults';
import {
  MODEL_MODES,
  ModelSelectOptions,
  getModeFromValue,
  getModeValue,
  resolveModeModel,
  type ModeOption,
} from '@/widgets/model-select-options';
import { SettingsFieldRow } from '@/pages/settings/settings-layout';

export function ChatSettingsCard() {
  const { t } = useTranslation('settings');
  const { models: permittedModels, isLoading: modelsLoading } =
    usePermittedModels();

  const { userDefaultModel, manageUserDefaultModel, deleteUserDefaultModel } =
    useUserDefaultModel({ allModels: permittedModels });
  const {
    mode: defaultMode,
    setMode,
    isLoading: modeLoading,
  } = useModelModeDefault({ level: 'user' });
  const { resolutions } = useModelModes();

  // Offer a mode only while it resolves, but keep a saved one visible.
  const modes: ModeOption[] = MODEL_MODES.map((mode) => ({
    mode,
    resolvedModel: resolveModeModel(mode, permittedModels, resolutions),
  })).filter(
    ({ mode, resolvedModel }) =>
      resolvedModel !== undefined || mode === defaultMode,
  );

  // Until the mode default is known, a leftover model default would flash.
  let selectedValue: string | undefined;
  if (!modeLoading) {
    selectedValue = defaultMode
      ? getModeValue(defaultMode)
      : (userDefaultModel?.id ?? 'null');
  }

  const handleDefaultSettingChange = (value: string) => {
    const mode = getModeFromValue(value);
    if (mode) {
      setMode(mode);
    } else if (value === 'null') {
      deleteUserDefaultModel();
    } else {
      manageUserDefaultModel(value);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('chat.defaultModel')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SettingsFieldRow>
          <div className="min-w-0 space-y-0.5">
            <Label htmlFor="default-settings-select">
              {t('chat.defaultModelSelection')}
            </Label>
            <div className="text-sm text-muted-foreground">
              {t('chat.defaultModelDescription')}
            </div>
          </div>
          <Select
            value={selectedValue}
            onValueChange={handleDefaultSettingChange}
            disabled={modelsLoading || modeLoading}
          >
            <SelectTrigger
              id="default-settings-select"
              className="w-full min-w-0 sm:w-[180px]"
            >
              <SelectValue
                placeholder={
                  modelsLoading ? 'Loading...' : t('chat.selectDefaultModel')
                }
              />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4} align="end">
              <SelectItem value="null">{t('chat.none')}</SelectItem>
              <ModelSelectOptions
                models={permittedModels}
                showFlag
                showHeading={false}
                modes={modes}
              />
            </SelectContent>
          </Select>
        </SettingsFieldRow>
      </CardContent>
    </Card>
  );
}
