import { FileStack, Library } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { cn } from '@ayunis/ui/lib/cn';
import type {
  EntryVariant,
  PanelKey,
} from '@/widgets/prototype-journey/model/journey';

interface EntryControlsProps {
  variant: EntryVariant;
  contextCount: number;
  resultCount: number;
  activePanel: PanelKey | null;
  highlight: PanelKey | null;
  onOpen: (panel: PanelKey) => void;
}

export function EntryControls({
  variant,
  contextCount,
  resultCount,
  activePanel,
  highlight,
  onOpen,
}: Readonly<EntryControlsProps>) {
  if (variant === 'header') {
    return (
      <div className="flex items-center gap-1">
        <LabelledButton
          label="Ergebnisse"
          count={resultCount}
          isActive={activePanel === 'results'}
          isHighlighted={highlight === 'results'}
          onClick={() => onOpen('results')}
        >
          <FileStack />
        </LabelledButton>
        <LabelledButton
          label="Kontext"
          count={contextCount}
          isActive={activePanel === 'context'}
          isHighlighted={highlight === 'context'}
          onClick={() => onOpen('context')}
        >
          <Library />
        </LabelledButton>
      </div>
    );
  }

  const trigger = (
    <Button
      variant={activePanel ? 'secondary' : 'ghost'}
      size="icon"
      aria-label="Ergebnisse und Kontext"
      className={cn('relative transition-all', highlight && 'text-brand')}
      onClick={variant === 'single' ? () => onOpen('results') : undefined}
    >
      <Library />
      {resultCount > 0 && (
        <span className="absolute right-1 top-1 size-1.5 rounded-full bg-brand" />
      )}
    </Button>
  );

  if (variant === 'single') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent>Ergebnisse und Kontext</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => onOpen('results')}>
          <FileStack />
          <span className="flex-1">Ergebnisse</span>
          {resultCount > 0 && (
            <span className="text-xs text-muted-foreground">{resultCount}</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onOpen('context')}>
          <Library />
          <span className="flex-1">Kontext</span>
          {contextCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {contextCount}
            </span>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LabelledButton({
  label,
  count,
  isActive,
  isHighlighted,
  onClick,
  children,
}: Readonly<{
  label: string;
  count: number;
  isActive: boolean;
  isHighlighted: boolean;
  onClick: () => void;
  children: React.ReactNode;
}>) {
  return (
    <Button
      variant={isActive ? 'secondary' : 'ghost'}
      size="sm"
      onClick={onClick}
      className={cn(
        'transition-all',
        count === 0 && 'text-muted-foreground',
        isHighlighted && 'text-brand',
      )}
    >
      {children}
      {label}
      {count > 0 && (
        <span className="text-xs text-muted-foreground">{count}</span>
      )}
    </Button>
  );
}
