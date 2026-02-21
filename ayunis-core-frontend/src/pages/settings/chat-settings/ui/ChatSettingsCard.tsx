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
import { getFlagByProvider } from '@/shared/lib/getFlagByProvider';

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

  // Sort models by flag priority (DE → EU → US) then alphabetically
  const flagPriority: Record<string, number> = {
    '🇩🇪': 0,
    '🇪🇺': 1,
    '🇺🇸': 2,
  };

  const sortedModels = [...permittedModels].sort((a, b) => {
    const flagA = getFlagByProvider(a.provider);
    const flagB = getFlagByProvider(b.provider);
    const priorityA = flagPriority[flagA] ?? 3;
    const priorityB = flagPriority[flagB] ?? 3;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    return (a.displayName || a.name).localeCompare(b.displayName || b.name);
  });

  // Create options including null option and all sorted permitted models with flags
  const defaultSettingsOptions = [
    { id: 'null', label: t('chat.none') },
    ...sortedModels.map((model) => {
      const flag = getFlagByProvider(model.provider);
      const displayName = model.displayName || model.name;
      return {
        id: model.id,
        label: flag ? `${flag} ${displayName}` : displayName,
      };
    }),
  ];

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
            <SelectContent>
              {defaultSettingsOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
