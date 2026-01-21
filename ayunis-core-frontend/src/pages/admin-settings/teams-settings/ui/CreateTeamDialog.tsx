import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';
import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { useCreateTeam } from '../api/useCreateTeam';
import type { CreateTeamFormData } from '../model/types';

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTeamDialog({
  open,
  onOpenChange,
}: CreateTeamDialogProps) {
  const { t } = useTranslation('admin-settings-teams');
  const { createTeam, isCreating } = useCreateTeam(() => {
    onOpenChange(false);
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTeamFormData>({
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = (data: CreateTeamFormData) => {
    createTeam(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
          <DialogHeader>
            <DialogTitle>{t('teams.createDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('teams.createDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t('teams.createDialog.nameLabel')}</Label>
              <Input
                id="name"
                placeholder={t('teams.createDialog.namePlaceholder')}
                {...register('name', {
                  required: t('teams.createDialog.nameRequired'),
                  minLength: {
                    value: 1,
                    message: t('teams.createDialog.nameRequired'),
                  },
                  maxLength: {
                    value: 100,
                    message: t('teams.createDialog.nameTooLong'),
                  },
                })}
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('teams.createDialog.cancel')}
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating
                ? t('teams.createDialog.creating')
                : t('teams.createDialog.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
