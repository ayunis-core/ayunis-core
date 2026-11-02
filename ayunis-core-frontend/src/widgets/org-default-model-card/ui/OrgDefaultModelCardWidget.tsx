import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Label } from '@ayunis/ui/components/label';
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import { useTranslation } from 'react-i18next';
import type { ModelWithConfigResponseDto } from '@/shared/api';
import { useMemo } from 'react';
import TooltipIf from '@/widgets/tooltip-if/ui/TooltipIf';
import {
  ModelSelectOptions,
  getModeFromValue,
  getModeValue,
  type ModelMode,
  type ModelOption,
} from '@/widgets/model-select-options';
import { ProviderFlag } from '@/shared/ui/provider-flag';
import { modeOptionsForLevel } from '@/widgets/org-default-model-card/lib/mode-options';

interface OrgDefaultModelCardWidgetProps {
  models: ModelWithConfigResponseDto[];
  isLoading: boolean;
  isSaving: boolean;
  onDefaultModelChange: (permittedModelId: string) => void;
  selectId?: string;
  translationNamespace?: string;
  /** Omit to offer individual models only. */
  modeDefault?: {
    mode: ModelMode | null;
    currentPermittedModelId: string | null;
    availableModes: ModelMode[];
    isLoading: boolean;
    isSaving: boolean;
    onModeChange: (mode: ModelMode) => void;
  };
}

export function OrgDefaultModelCardWidget({
  models,
  isLoading,
  isSaving,
  onDefaultModelChange,
  selectId = 'org-default-model-select',
  translationNamespace = 'admin-settings-models',
  modeDefault,
}: Readonly<OrgDefaultModelCardWidgetProps>) {
  const { t } = useTranslation(translationNamespace);
  const { t: tCommon } = useTranslation('common');

  const permittedModels = useMemo(
    () =>
      models.filter(
        (model) => model.isPermitted && Boolean(model.permittedModelId),
      ),
    [models],
  );
  const defaultModel = permittedModels.find((model) => model.isDefault);

  const modelOptions: ModelOption[] = useMemo(
    () =>
      permittedModels.map((model) => ({
        id: model.permittedModelId!,
        name: model.name,
        provider: model.provider,
        displayName: model.displayName,
        tier: model.tier,
        description: model.description,
      })),
    [permittedModels],
  );

  const isDisabled =
    isLoading ||
    isSaving ||
    Boolean(modeDefault?.isSaving) ||
    Boolean(modeDefault?.isLoading) ||
    permittedModels.length === 0;

  const selectedMode = modeDefault?.mode ?? null;
  // Until the mode default is known, a leftover model default would flash.
  let selectedValue: string | undefined;
  if (!modeDefault?.isLoading) {
    selectedValue = selectedMode
      ? getModeValue(selectedMode)
      : (defaultModel?.permittedModelId ?? undefined);
  }
  const modeModel = modelOptions.find(
    (model) => model.id === modeDefault?.currentPermittedModelId,
  );
  const modes = modeDefault
    ? modeOptionsForLevel(modeDefault.availableModes, selectedMode, modeModel)
    : [];

  const handleChange = (value: string) => {
    if (value === selectedValue) return;
    const mode = getModeFromValue(value);
    if (mode) {
      modeDefault?.onModeChange(mode);
    } else {
      onDefaultModelChange(value);
    }
  };

  return (
    <Card className="border-[#8178C3]">
      <CardHeader>
        <CardTitle>{t('models.defaultModel.title')}</CardTitle>
        <CardDescription>
          {t('models.defaultModel.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <Label htmlFor={selectId}>{t('models.defaultModel.label')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('models.defaultModel.helper')}
            </p>
          </div>
          <TooltipIf
            condition={permittedModels.length === 0}
            tooltip={t('models.defaultModel.empty')}
          >
            <Select
              value={selectedValue}
              onValueChange={handleChange}
              disabled={isDisabled}
            >
              <SelectTrigger id={selectId} className="w-full lg:w-[240px]">
                <SelectValue
                  placeholder={
                    isLoading
                      ? t('models.defaultModel.loading')
                      : t('models.defaultModel.placeholder')
                  }
                />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4} align="end">
                <ModelSelectOptions
                  models={modelOptions}
                  showFlag
                  showHeading={false}
                  modes={modes}
                />
              </SelectContent>
            </Select>
          </TooltipIf>
        </div>
        {selectedMode && !modeDefault?.isSaving && (
          <p
            className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
            data-testid="default-model-mode-current"
          >
            {tCommon('models.modes.adminHint')}
            {modeModel ? (
              <span className="inline-flex items-center gap-1.5">
                {tCommon('models.modes.current')}
                <ProviderFlag provider={modeModel.provider} />
                <span className="text-foreground">{modeModel.displayName}</span>
              </span>
            ) : (
              <span>{tCommon('models.modes.noneAvailable')}</span>
            )}
          </p>
        )}
        {permittedModels.length === 0 && !isLoading && (
          <div className="text-sm text-muted-foreground">
            {t('models.defaultModel.empty')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
