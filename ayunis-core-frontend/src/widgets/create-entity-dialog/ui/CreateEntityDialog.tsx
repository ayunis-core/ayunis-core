import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/shadcn/dialog';
import { Button } from '@/shared/ui/shadcn/button';
import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';

interface CreateEntityDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onSubmit: (e: React.SyntheticEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  translations: {
    buttonText: string;
    title: string;
    description: string;
    cancel: string;
    create: string;
    creating: string;
  };
  buttonText?: string;
  showIcon?: boolean;
  buttonClassName?: string;
  footerHint?: ReactNode;
  children: ReactNode;
}

export default function CreateEntityDialog({
  isOpen,
  onOpenChange,
  onCancel,
  onSubmit,
  isLoading,
  translations,
  buttonText,
  showIcon = false,
  buttonClassName = '',
  footerHint,
  children,
}: Readonly<CreateEntityDialogProps>) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className={`${showIcon ? 'inline-flex items-center gap-2' : ''} ${buttonClassName}`}
        >
          {showIcon && <Plus className="h-4 w-4" />}
          {buttonText ?? translations.buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{translations.title}</DialogTitle>
          <DialogDescription>{translations.description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-6">
          {children}
          <DialogFooter
            className={
              footerHint ? 'sm:justify-between sm:items-center' : undefined
            }
          >
            {footerHint && (
              <p className="text-xs text-muted-foreground sm:max-w-xs">
                {footerHint}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                {translations.cancel}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? translations.creating : translations.create}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
