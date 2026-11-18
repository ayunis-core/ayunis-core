import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import type { ModelWithConfigResponseDto } from '@/shared/api';
import {
  ModelSelectOptions,
  type ModelOption,
} from '@/widgets/model-select-options';
import {
  useRecordingSummaryModel,
  useSetRecordingSummaryModel,
} from '@/pages/admin-settings/model-settings/api';

const ORG_DEFAULT_VALUE = 'org-default';

interface RecordingSummaryModelCardProps {
  models: ModelWithConfigResponseDto[];
}

export function RecordingSummaryModelCard({
  models,
}: Readonly<RecordingSummaryModelCardProps>) {
  const { t } = useTranslation('admin-settings-models');
  const { permittedModelId, isLoading } = useRecordingSummaryModel();
  const { setRecordingSummaryModel, isSaving } = useSetRecordingSummaryModel();

  // Transcripts are not anonymized, so anonymous-only models can't summarize them.
  const modelOptions: ModelOption[] = useMemo(
    () =>
      models
        .filter((model) => model.isPermitted && !model.anonymousOnly)
        .flatMap((model) =>
          model.permittedModelId
            ? [
                {
                  id: model.permittedModelId,
                  name: model.name,
                  provider: model.provider,
                  displayName: model.displayName,
                  tier: model.tier,
                  description: model.description,
                },
              ]
            : [],
        ),
    [models],
  );
  const selectedValue =
    permittedModelId &&
    modelOptions.some((model) => model.id === permittedModelId)
      ? permittedModelId
      : ORG_DEFAULT_VALUE;

  const handleChange = (value: string) => {
    if (value === selectedValue) return;
    setRecordingSummaryModel(value === ORG_DEFAULT_VALUE ? null : value);
  };

  return (
    <Card data-testid="recording-summary-model-card">
      <CardHeader>
        <CardTitle>{t('models.recordingSummaryModel.title')}</CardTitle>
        <CardDescription>
          {t('models.recordingSummaryModel.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <Label htmlFor="recording-summary-model-select">
            {t('models.recordingSummaryModel.label')}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t('models.recordingSummaryModel.helper')}
          </p>
        </div>
        <Select
          value={isLoading ? undefined : selectedValue}
          onValueChange={handleChange}
          disabled={isLoading || isSaving}
        >
          <SelectTrigger
            id="recording-summary-model-select"
            data-testid="recording-summary-model-select"
            className="w-full lg:w-[240px]"
          >
            <SelectValue
              placeholder={t('models.recordingSummaryModel.loading')}
            />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4} align="end">
            <SelectItem
              value={ORG_DEFAULT_VALUE}
              data-testid="recording-summary-model-org-default"
            >
              {t('models.recordingSummaryModel.orgDefault')}
            </SelectItem>
            {modelOptions.length > 0 && <SelectSeparator />}
            <ModelSelectOptions
              models={modelOptions}
              showFlag
              showHeading={false}
            />
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
