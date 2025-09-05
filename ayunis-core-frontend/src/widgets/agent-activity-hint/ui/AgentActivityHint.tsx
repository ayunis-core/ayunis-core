import { Badge } from "@/shared/ui/shadcn/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/ui/shadcn/collapsible";
import { ScrollArea } from "@/shared/ui/shadcn/scroll-area";
import { ChevronsUpDown } from "lucide-react";
import { useAutoScroll } from "@/features/useAutoScroll";

interface AgentActivityHintProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: React.ReactNode;
  hint: string;
  input: string;
  output?: string;
}

export default function AgentActivityHint({
  open,
  onOpenChange,
  icon,
  hint,
  input,
  output,
}: AgentActivityHintProps) {
  const { scrollRef, handleScroll } = useAutoScroll(input);
  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className="flex flex-col gap-2 mt-2"
    >
      <div>
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-2 text-muted-foreground">
            {icon} {hint}
            <ChevronsUpDown className="h-4 w-4" />
          </div>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="flex flex-col gap-2">
        <div
          className="max-h-32 text-muted-foreground overflow-y-auto whitespace-pre-wrap"
          ref={scrollRef}
          onScroll={handleScroll}
        >
          {input}
        </div>
        {output && (
          <Badge variant="outline">
            <ScrollArea className="h-fit max-h-32">{output}</ScrollArea>
          </Badge>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
