import { useTranslation } from 'react-i18next';
import type { PermittedLanguageModelResponseDto } from '@/shared/api';
import { ProviderFlag } from '@/shared/ui/provider-flag';
import { stripProviderSuffix } from '@/widgets/model-select-options';

export type AnsweringModel = Pick<
  PermittedLanguageModelResponseDto,
  'provider' | 'displayName'
>;

/**
 * Names the model behind a mode-started chat and where it is hosted: a mode
 * can resolve to a model in a different hosting region than the user expects.
 */
export default function ModelAttribution({
  model,
}: Readonly<{ model: AnsweringModel }>) {
  const { t } = useTranslation('common');
  const hosting = t(`models.providerHosting.${model.provider}`, {
    defaultValue: '',
  });

  return (
    <p
      className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
      data-testid="assistant-model-attribution"
    >
      <ProviderFlag provider={model.provider} />
      <span className="text-foreground">
        {stripProviderSuffix(model.displayName)}
      </span>
      {hosting && <span>· {hosting}</span>}
    </p>
  );
}
