import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/shadcn/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/shadcn/form';
import { Input } from '@/shared/ui/shadcn/input';
import { Textarea } from '@/shared/ui/shadcn/textarea';
import { Button } from '@/shared/ui/shadcn/button';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useCreateSkill } from '../api/useCreateSkill';
import { useTranslation } from 'react-i18next';

interface CreateSkillDialogProps {
  buttonText?: string;
  showIcon?: boolean;
  buttonClassName?: string;
}

export default function CreateSkillDialog({
  buttonText,
  showIcon = false,
  buttonClassName = '',
}: CreateSkillDialogProps) {
  const { t } = useTranslation('skills');
  const [isOpen, setIsOpen] = useState(false);
  const { form, onSubmit, resetForm, isLoading } = useCreateSkill();

  const handleCancel = () => {
    resetForm();
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className={`${showIcon ? 'inline-flex items-center gap-2' : ''} ${buttonClassName}`}
        >
          {showIcon && <Plus className="h-4 w-4" />}
          {buttonText || t('createDialog.buttonText')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{t('createDialog.title')}</DialogTitle>
          <DialogDescription>{t('createDialog.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('createDialog.form.nameLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('createDialog.form.namePlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="shortDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('createDialog.form.shortDescriptionLabel')}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t(
                        'createDialog.form.shortDescriptionPlaceholder',
                      )}
                      className="min-h-[80px] max-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('createDialog.form.instructionsLabel')}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t(
                        'createDialog.form.instructionsPlaceholder',
                      )}
                      className="min-h-[150px] max-h-[200px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                {t('createDialog.buttons.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? t('createDialog.buttons.creating')
                  : t('createDialog.buttons.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
