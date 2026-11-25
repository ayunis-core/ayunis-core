import {
  ModelSelector as SharedModelSelector,
  type ModelSelectorProps,
} from '@ayunis/chat/model-presentation';
import { usePermittedModels } from '@/features/usePermittedModels';
import { ModelSelectorMenu } from './ModelSelectorMenu';

export default function ModelSelector(
  props: Readonly<
    Omit<ModelSelectorProps, 'models' | 'resolutions' | 'placeholder'>
  >,
) {
  const { models, placeholder, isDisabled } = usePermittedModels();
  return (
    <SharedModelSelector
      {...props}
      models={models}
      renderMenu={(menu) => <ModelSelectorMenu {...menu} />}
      placeholder={placeholder}
      isDisabled={props.isDisabled || isDisabled}
    />
  );
}
