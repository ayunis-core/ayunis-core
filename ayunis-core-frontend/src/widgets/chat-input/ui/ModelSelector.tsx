import { Fragment } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/shadcn/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/shadcn/tooltip";
import { usePermittedModels } from "@/features/usePermittedModels";
import type { PermittedModel } from "../model/openapi";

interface ModelSelectorProps {
  selectedModel: PermittedModel;
  onChange: (value: PermittedModel) => void;
}

export default function ModelSelector({
  selectedModel,
  onChange,
}: ModelSelectorProps) {
  const { models, placeholder, isDisabled } = usePermittedModels();
  const splitChar = "$%$%$";

  // group models by provider
  const groupedModels = models.reduce(
    (acc, model) => {
      acc[model.provider] = acc[model.provider] || [];
      acc[model.provider].push(model);
      return acc;
    },
    {} as Record<string, typeof models>,
  );

  function modelToString(model: PermittedModel) {
    return `${model.name}${splitChar}${model.provider}`;
  }

  function stringToModel(value: string): PermittedModel {
    const [modelName, modelProvider] = value.split(splitChar);
    const model = models.find(
      (model) => model.name === modelName && model.provider === modelProvider,
    );
    if (!model) {
      throw new Error(`Model ${value} not found`);
    }
    return model;
  }

  function handleChange(value: string) {
    onChange(stringToModel(value));
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <Select
          value={selectedModel ? modelToString(selectedModel) : ""}
          disabled={isDisabled}
          onValueChange={handleChange}
        >
          <TooltipTrigger asChild>
            <SelectTrigger className="w-32">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
          </TooltipTrigger>
          <SelectContent>
            {models &&
              Object.entries(groupedModels).map(([provider, models], i) => (
                // One group per provider
                <Fragment key={i}>
                  <SelectGroup>
                    <SelectLabel>{provider}</SelectLabel>
                    {models.map((model) => (
                      <SelectItem
                        key={model.name}
                        value={`${model.name}${splitChar}${provider}`}
                      >
                        {model.displayName}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  {i < Object.keys(groupedModels).length - 1 && (
                    <SelectSeparator />
                  )}
                </Fragment>
              ))}
          </SelectContent>
        </Select>
        <TooltipContent>
          <p>Select a model</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
