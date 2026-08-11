import type { ReactNode } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ayunis/ui/components/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import { Input } from '@ayunis/ui/components/input';
import { Textarea } from '@ayunis/ui/components/textarea';
import { Button } from '@ayunis/ui/components/button';
import { WorkspaceAppearancePicker } from '@/widgets/workspace-appearance-picker';
import { defaultWorkspaceColor } from '@/shared/lib/workspace-appearance';
import type { WorkspaceFormData } from '@/features/workspaces';

interface WorkspaceFormDialogProps {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<WorkspaceFormData>;
  onSubmit: (data: WorkspaceFormData) => void;
  isSubmitting: boolean;
  submitLabel: string;
  submittingLabel: string;
  /** Rendered below the fields — used by the settings dialog for its delete row. */
  footerContent?: ReactNode;
}

export function WorkspaceFormDialog({
  title,
  open,
  onOpenChange,
  form,
  onSubmit,
  isSubmitting,
  submitLabel,
  submittingLabel,
  footerContent,
}: Readonly<WorkspaceFormDialogProps>) {
  const { t } = useTranslation('workspaces');
  const name = form.watch('name');
  const icon = form.watch('icon');
  const color = form.watch('color');
  // An empty colour means "not chosen yet" — derive one from the name so the
  // preview is never colourless while the user is still typing. Callers
  // resolve the same way on submit.
  const effectiveColor = color || defaultWorkspaceColor(name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.nameLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t('form.namePlaceholder')}
                      disabled={isSubmitting}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.descriptionLabel')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      placeholder={t('form.descriptionPlaceholder')}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <WorkspaceAppearancePicker
              name={name}
              icon={icon}
              color={effectiveColor}
              onIconChange={(next) =>
                form.setValue('icon', next, { shouldDirty: true })
              }
              onColorChange={(next) =>
                form.setValue('color', next, { shouldDirty: true })
              }
            />

            {footerContent}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t('form.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting || !name.trim()}>
                {isSubmitting ? submittingLabel : submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
