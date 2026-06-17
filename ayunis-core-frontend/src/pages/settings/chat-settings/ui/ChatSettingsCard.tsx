import {
  Card,
  CardContent,
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
import { useTranslation } from 'react-i18next';
import { usePermittedModels } from '@/features/usePermittedModels';
import { useUserDefaultModel } from '../api/useUserDefaultModel';
import { ModelSelectOptions } from '@/widgets/model-select-options';

export function ChatSettingsCard() {
  const { t } = useTranslation('settings');
  const { models: permittedModels, isLoading: modelsLoading } =
    usePermittedModels();

  const { userDefaultModel, manageUserDefaultModel, deleteUserDefaultModel } =
    useUserDefaultModel({ allModels: permittedModels });

  const handleDefaultSettingChange = (value: string) => {
    if (value === 'null') {
      // Delete the default model (set to null)
      deleteUserDefaultModel();
    } else {
      // Set/update the default model
      manageUserDefaultModel(value);
    }
  };

  // Get current selected value
  const selectedValue = userDefaultModel?.id ?? 'null';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('chat.defaultModel')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
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
            disabled={modelsLoading}
          >
            <SelectTrigger id="default-settings-select" className="w-[180px]">
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
              />
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
