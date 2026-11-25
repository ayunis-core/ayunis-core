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
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import { useOparlEmbeddingModel } from '@/pages/super-admin-settings/oparl/api/useOparlEmbeddingModel';
import { useSetOparlEmbeddingModel } from '@/pages/super-admin-settings/oparl/api/useSetOparlEmbeddingModel';

export function OparlEmbeddingModelCard() {
  const { t } = useTranslation('super-admin-settings-oparl');
  const { model, choices, isLoading, isError } = useOparlEmbeddingModel();
  const { setModel, isPending } = useSetOparlEmbeddingModel();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('embeddingModel.title')}</CardTitle>
        <CardDescription>{t('embeddingModel.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label htmlFor="oparl-embedding-model">
          {t('embeddingModel.label')}
        </Label>
        <Select
          value={model?.id ?? ''}
          onValueChange={setModel}
          disabled={isLoading || isError || isPending}
        >
          <SelectTrigger
            id="oparl-embedding-model"
            className="w-full sm:w-[320px]"
            data-testid="oparl-embedding-model-select"
          >
            <SelectValue placeholder={t('embeddingModel.none')} />
          </SelectTrigger>
          <SelectContent>
            {choices.map((choice) => (
              <SelectItem
                key={choice.id}
                value={choice.id}
                data-testid={`oparl-embedding-model-option-${choice.name}`}
              >
                {choice.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isError && (
          <p className="text-sm text-destructive">
            {t('embeddingModel.loadError')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
