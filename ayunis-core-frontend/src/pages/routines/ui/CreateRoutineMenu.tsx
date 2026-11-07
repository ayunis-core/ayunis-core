import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, FileText, PenLine, Plus } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import { useDropdownDialogTransition } from '@/shared/hooks/useDropdownDialogTransition';
import {
  EMPTY_ROUTINE_FORM,
  type RoutineFormFields,
} from '@/features/routines';
import { VERKUENDUNGSPLATTFORM_ROUTINE } from '@/pages/routines/model/premade-routines';
import { CreateRoutineDialog } from './CreateRoutineDialog';

interface CreateRoutineMenuProps {
  buttonText?: string;
}

export default function CreateRoutineMenu({
  buttonText,
}: Readonly<CreateRoutineMenuProps>) {
  const { t } = useTranslation('routines');
  const [initialValues, setInitialValues] = useState<RoutineFormFields | null>(
    null,
  );
  const { requestDialogOpen, handleCloseAutoFocus } =
    useDropdownDialogTransition();

  const open = (values: RoutineFormFields) =>
    requestDialogOpen(() => setInitialValues(values));

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
            onClick={() => open(EMPTY_ROUTINE_FORM)}
          >
            <PenLine />
            <span>{t('createMenu.blank')}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>{t('createMenu.premade')}</DropdownMenuLabel>
          <DropdownMenuItem
            data-testid="create-routine-premade-verkuendungsplattform"
            onClick={() => open(VERKUENDUNGSPLATTFORM_ROUTINE)}
          >
            <FileText />
            <span>{VERKUENDUNGSPLATTFORM_ROUTINE.name}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {initialValues && (
        <CreateRoutineDialog
          initialValues={initialValues}
          onClose={() => setInitialValues(null)}
        />
      )}
    </>
  );
}
