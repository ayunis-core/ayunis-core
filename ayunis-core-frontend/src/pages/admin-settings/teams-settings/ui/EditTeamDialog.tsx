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
import { useUpdateTeam } from '../api/useUpdateTeam';
import type { Team, UpdateTeamFormData } from '../model/types';

interface EditTeamDialogProps {
  team: Team | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTeamDialog({
  team,
  open,
  onOpenChange,
}: EditTeamDialogProps) {
  const { t } = useTranslation('admin-settings-teams');
  const { updateTeam, isUpdating } = useUpdateTeam(() => {
    onOpenChange(false);
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateTeamFormData>({
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    if (open && team) {
      reset({ name: team.name });
    } else if (!open) {
      reset({ name: '' });
    }
  }, [open, team, reset]);

  const onSubmit = (data: UpdateTeamFormData) => {
    if (team) {
      updateTeam(team.id, data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
          <DialogHeader>
            <DialogTitle>{t('teams.editDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('teams.editDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t('teams.editDialog.nameLabel')}</Label>
              <Input
                id="name"
                placeholder={t('teams.editDialog.namePlaceholder')}
                {...register('name', {
                  required: t('teams.editDialog.nameRequired'),
                  validate: (value) =>
                    value.trim().length >= 1 ||
                    t('teams.editDialog.nameRequired'),
                  maxLength: {
                    value: 100,
                    message: t('teams.editDialog.nameTooLong'),
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
              {t('teams.editDialog.cancel')}
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating
                ? t('teams.editDialog.saving')
                : t('teams.editDialog.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
