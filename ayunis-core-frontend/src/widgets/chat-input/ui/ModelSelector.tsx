import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/shadcn/select";
import { usePermittedModels } from "@/features/usePermittedModels";

interface ModelSelectorProps {
  isDisabled: boolean;
  selectedModelId: string | undefined;
  onModelChange: (modelId: string) => void;
}

export default function ModelSelector({
  isDisabled,
  selectedModelId,
  onModelChange,
}: ModelSelectorProps) {
  const {
    models,
    placeholder,
    isDisabled: isDisabledModels,
  } = usePermittedModels();
  return (
    <Select
      value={selectedModelId}
      onValueChange={onModelChange}
      disabled={isDisabled || isDisabledModels || !selectedModelId}
    >
      <SelectTrigger
        className="border-none shadow-none"
        disabled={isDisabled || isDisabledModels}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {models
          .sort((a, b) => a.displayName.localeCompare(b.displayName))
          .map((model) => (
            <SelectItem key={model.id} value={model.id}>
              {model.displayName}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
