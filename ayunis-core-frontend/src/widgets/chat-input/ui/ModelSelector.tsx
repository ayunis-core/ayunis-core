import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import { useAgents } from "../api/useAgents";

interface ModelSelectorProps {
  selectedModelOrAgentId: string | undefined;
  onModelChange: (value: string) => void;
  onAgentChange: (value: string) => void;
}

export default function ModelSelector({
  selectedModelOrAgentId,
  onModelChange,
  onAgentChange,
}: ModelSelectorProps) {
  const { models, placeholder, isDisabled } = usePermittedModels();
  const { agents } = useAgents();

  function handleChange(value: string) {
    if (models.find((model) => model.id === value)) {
      onModelChange(value);
    } else if (agents.find((agent) => agent.id === value)) {
      onAgentChange(value);
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <Select
          value={selectedModelOrAgentId}
          disabled={isDisabled}
          onValueChange={handleChange}
        >
          <TooltipTrigger asChild>
            <SelectTrigger className="w-32">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
          </TooltipTrigger>
          <SelectContent>
            {agents.length > 0 && (
              <SelectGroup>
                <SelectLabel>Agents</SelectLabel>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {models.length > 0 && (
              <SelectGroup>
                <SelectLabel>Models</SelectLabel>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.displayName}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
        <TooltipContent>
          <p>Select a model</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
