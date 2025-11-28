import { useState } from 'react';
import { Button } from '@/shared/ui/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/shadcn/dropdown-menu';
import { Switch } from '@/shared/ui/shadcn/switch';
import { Label } from '@/shared/ui/shadcn/label';
import { Wrench } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';

interface ToolsButtonProps {
  internetSearch?: boolean;
  codeExecution?: boolean;
  onInternetSearchChange?: (enabled: boolean) => void;
  onCodeExecutionChange?: (enabled: boolean) => void;
}

export default function ToolsButton({
  internetSearch = false,
  codeExecution = false,
  onInternetSearchChange,
  onCodeExecutionChange,
}: ToolsButtonProps) {
  const [localInternetSearch, setLocalInternetSearch] =
    useState(internetSearch);
  const [localCodeExecution, setLocalCodeExecution] = useState(codeExecution);

  const handleInternetSearchChange = (enabled: boolean) => {
    setLocalInternetSearch(enabled);
    onInternetSearchChange?.(enabled);
  };

  const handleCodeExecutionChange = (enabled: boolean) => {
    setLocalCodeExecution(enabled);
    onCodeExecutionChange?.(enabled);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <DropdownMenu>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Wrench className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <DropdownMenuContent className="w-64">
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <div className="flex items-center justify-between w-full">
                <div className="space-y-1">
                  <Label
                    htmlFor="internetSearch"
                    className="text-sm font-medium"
                  >
                    Internet Search
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Allow AI to search the web for real-time information
                  </p>
                </div>
                <Switch
                  id="internetSearch"
                  checked={localInternetSearch}
                  onCheckedChange={handleInternetSearchChange}
                />
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <div className="flex items-center justify-between w-full">
                <div className="space-y-1">
                  <Label
                    htmlFor="codeExecution"
                    className="text-sm font-medium"
                  >
                    Code Execution
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Enable AI to run and test code snippets
                  </p>
                </div>
                <Switch
                  id="codeExecution"
                  checked={localCodeExecution}
                  onCheckedChange={handleCodeExecutionChange}
                />
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <TooltipContent>
          <p>Add tools & capabilities</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
