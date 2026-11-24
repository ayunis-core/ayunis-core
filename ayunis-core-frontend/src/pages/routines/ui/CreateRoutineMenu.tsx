import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, PenLine, Plus, Store } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import { useRoutineMarketplaceUrl } from '@/features/marketplace';
import { useDropdownDialogTransition } from '@/shared/hooks/useDropdownDialogTransition';
import { CreateRoutineDialog } from './CreateRoutineDialog';

interface CreateRoutineMenuProps {
  buttonText?: string;
}

export default function CreateRoutineMenu({
  buttonText,
}: Readonly<CreateRoutineMenuProps>) {
  const { t } = useTranslation('routines');
  const marketplaceUrl = useRoutineMarketplaceUrl();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { requestDialogOpen, handleCloseAutoFocus } =
    useDropdownDialogTransition();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" data-testid="create-routine-menu">
            <Plus className="h-4 w-4" />
            {buttonText ?? t('createMenu.button')}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onCloseAutoFocus={handleCloseAutoFocus}
        >
          <DropdownMenuItem
            data-testid="create-routine-blank"
            onClick={() => requestDialogOpen(() => setIsDialogOpen(true))}
          >
            <PenLine />
            <span>{t('createMenu.blank')}</span>
          </DropdownMenuItem>
          {marketplaceUrl && (
            <DropdownMenuItem
              data-testid="create-routine-marketplace"
              onClick={() =>
                window.open(marketplaceUrl, '_blank', 'noopener,noreferrer')
              }
            >
              <Store />
              <span>{t('createMenu.marketplace')}</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {isDialogOpen && (
        <CreateRoutineDialog onClose={() => setIsDialogOpen(false)} />
      )}
    </>
  );
}
