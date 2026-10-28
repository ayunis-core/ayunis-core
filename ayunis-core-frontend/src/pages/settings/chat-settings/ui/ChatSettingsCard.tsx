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
import { ModelSelectOptions } from '@/widgets/model-select-options';
import { SettingsFieldRow } from '@/pages/settings/settings-layout';

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
            disabled={modelsLoading}
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
              />
            </SelectContent>
          </Select>
        </SettingsFieldRow>
      </CardContent>
    </Card>
  );
}
