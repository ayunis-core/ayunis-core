import {
  ModelSelectorMenu as SharedModelSelectorMenu,
  type ModelSelectorMenuProps,
} from '@ayunis/chat/model-presentation';
import { useModelModes } from '@/features/useModelModes';

export function ModelSelectorMenu(
  props: Readonly<Omit<ModelSelectorMenuProps, 'resolutions'>>,
) {
  const { resolutions } = useModelModes();
  return <SharedModelSelectorMenu {...props} resolutions={resolutions} />;
}
