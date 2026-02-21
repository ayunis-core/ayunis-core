import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';

interface TooltipIfProps {
  children: React.ReactNode;
  condition: boolean;
  tooltip: string;
}

export default function TooltipIf({
  children,
  condition,
  tooltip,
}: Readonly<TooltipIfProps>): React.ReactElement {
  if (!condition) {
    return <>{children}</>;
  }
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>{children}</div>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
