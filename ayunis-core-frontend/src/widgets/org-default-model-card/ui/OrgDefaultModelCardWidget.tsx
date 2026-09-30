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
  resolveModeModel,
  useModeSelection,
  type ModelOption,
} from '@/widgets/model-select-options';
import { ProviderFlag } from '@/shared/ui/provider-flag';

interface OrgDefaultModelCardWidgetProps {
  models: ModelWithConfigResponseDto[];
  isLoading: boolean;
  isSaving: boolean;
  onDefaultModelChange: (permittedModelId: string) => void;
  selectId?: string;
  translationNamespace?: string;
}

export function OrgDefaultModelCardWidget({
  models,
  isLoading,
  isSaving,
  onDefaultModelChange,
  selectId = 'org-default-model-select',
  translationNamespace = 'admin-settings-models',
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
        anonymousOnly: model.anonymousOnly ?? false,
      })),
    [permittedModels],
  );

  const isDisabled = isLoading || isSaving || permittedModels.length === 0;

  const fallbackValue = resolveModeModel('auto', modelOptions)
    ? getModeValue('auto')
    : undefined;
  const { selectedValue, select } = useModeSelection(
    defaultModel?.permittedModelId ?? fallbackValue,
    isSaving,
  );
  const selectedMode = getModeFromValue(selectedValue);
  const modeModel = selectedMode
    ? resolveModeModel(selectedMode, modelOptions)
    : undefined;

  const handleChange = (value: string) => {
    select(value);
    if (getModeFromValue(value)) return;
    if (value === defaultModel?.permittedModelId) {
      return;
    }
    onDefaultModelChange(value);
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
                  showModes
                />
              </SelectContent>
            </Select>
          </TooltipIf>
        </div>
        {modeModel && (
          <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            {tCommon('models.modes.adminHint')}
            <span className="inline-flex items-center gap-1.5">
              {tCommon('models.modes.current')}
              <ProviderFlag provider={modeModel.provider} />
              <span className="text-foreground">{modeModel.displayName}</span>
            </span>
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
