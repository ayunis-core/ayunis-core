import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import { usePermittedModels } from '@/features/usePermittedModels';
import { ModelSelectOptions } from '@/widgets/model-select-options';
import { ProviderFlag } from '@/shared/ui/provider-flag';
import { useTranslation } from 'react-i18next';

interface ModelSelectorProps {
  isDisabled: boolean;
  selectedModelId: string | undefined;
  onModelChange: (modelId: string) => void;
  /** In the Outlook task pane the toolbar is a `@container`. When it gets too
      narrow the model NAME collapses so only the (unchanged) provider flag
      remains — the icon itself is never swapped, just the label is hidden. */
  responsiveLabel?: boolean;
}

// Brand prefixes the provider flag already conveys, so they're dropped from the
// trigger label in the cramped task pane ("Claude Sonnet 4" → "Sonnet 4").
const BRAND_PREFIXES = [
  'Claude',
  'Mistral',
  'Gemini',
  'Llama',
  'Anthropic',
  'OpenAI',
  'Meta',
];

function abbreviateModelName(displayName: string): string {
  let name = displayName.trim();
  const openIndex = name.lastIndexOf('(');
  if (openIndex > 0 && name.endsWith(')')) {
    name = name.slice(0, openIndex).trimEnd();
  }
  const brand = BRAND_PREFIXES.find((b) => name.startsWith(`${b} `));
  return brand ? name.slice(brand.length + 1) : name;
}

export default function ModelSelector({
  isDisabled,
  selectedModelId,
  onModelChange,
  responsiveLabel = false,
}: Readonly<ModelSelectorProps>) {
  const { t } = useTranslation('common');
  const {
    models,
    placeholder,
    isDisabled: isDisabledModels,
  } = usePermittedModels();
  const selectedModel = models.find((m) => m.id === selectedModelId);
  return (
    <Select
      value={selectedModelId}
      onValueChange={onModelChange}
      disabled={isDisabled || isDisabledModels || !selectedModelId}
    >
      <SelectTrigger
        className="border-none shadow-none"
        disabled={isDisabled || isDisabledModels}
        aria-label={t('chatInput.modelSelectorAriaLabel')}
      >
        {responsiveLabel && selectedModel ? (
          <>
            <span className="contents @min-[24rem]:hidden">
              <ProviderFlag provider={selectedModel.provider} />
            </span>
            <span className="hidden items-center gap-1.5 @min-[24rem]:inline-flex">
              <ProviderFlag provider={selectedModel.provider} />
              <span className="max-w-[8rem] truncate">
                {abbreviateModelName(selectedModel.displayName)}
              </span>
            </span>
          </>
        ) : (
          <SelectValue placeholder={placeholder} />
        )}
      </SelectTrigger>
      <SelectContent
        position="popper"
        sideOffset={4}
        align="end"
        className="min-w-[260px]"
      >
        <ModelSelectOptions models={models} showFlag />
      </SelectContent>
    </Select>
  );
}
