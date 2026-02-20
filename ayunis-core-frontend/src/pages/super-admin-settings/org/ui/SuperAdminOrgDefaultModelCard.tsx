import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Label } from '@/shared/ui/shadcn/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/shadcn/select';
import TooltipIf from '@/widgets/tooltip-if/ui/TooltipIf';
import { useTranslation } from 'react-i18next';
import type { ModelWithConfigResponseDto } from '@/shared/api';
import { useMemo } from 'react';
import { useSuperAdminManageOrgDefaultModel } from '../api/useSuperAdminManageOrgDefaultModel';

interface SuperAdminOrgDefaultModelCardProps {
  models: ModelWithConfigResponseDto[];
  isLoading: boolean;
  orgId: string;
}

export function SuperAdminOrgDefaultModelCard({
  models,
  isLoading,
  orgId,
}: Readonly<SuperAdminOrgDefaultModelCardProps>) {
  const { t } = useTranslation('admin-settings-models');
  const { manageOrgDefaultModel, isLoading: isSaving } =
    useSuperAdminManageOrgDefaultModel(orgId);

  const permittedModels = useMemo(
    () =>
      models.filter(
        (model) => model.isPermitted && Boolean(model.permittedModelId),
      ),
    [models],
  );

  const defaultModel = permittedModels.find((model) => model.isDefault);

  const isDisabled = isLoading || isSaving || permittedModels.length === 0;

  const handleChange = (value: string) => {
    if (value === defaultModel?.permittedModelId) {
      return;
    }

    manageOrgDefaultModel(value);
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
            <Label htmlFor="super-admin-org-default-model-select">
              {t('models.defaultModel.label')}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t('models.defaultModel.helper')}
            </p>
          </div>
          <TooltipIf
            condition={permittedModels.length === 0}
            tooltip={t('models.defaultModel.empty')}
          >
            <Select
              value={defaultModel?.permittedModelId ?? undefined}
              onValueChange={handleChange}
              disabled={isDisabled}
            >
              <SelectTrigger
                id="super-admin-org-default-model-select"
                className="w-full lg:w-[240px]"
              >
                <SelectValue
                  placeholder={
                    isLoading
                      ? t('models.defaultModel.loading')
                      : t('models.defaultModel.placeholder')
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {permittedModels.map((model) => (
                  <SelectItem
                    key={model.permittedModelId}
                    value={model.permittedModelId!}
                  >
                    {model.displayName || model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TooltipIf>
        </div>
        {permittedModels.length === 0 && !isLoading && (
          <div className="text-sm text-muted-foreground">
            {t('models.defaultModel.empty')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
