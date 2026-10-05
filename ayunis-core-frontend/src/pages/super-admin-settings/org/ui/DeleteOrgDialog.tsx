import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Trans, useTranslation } from 'react-i18next';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@ayunis/ui/components/dialog';
import { Input } from '@ayunis/ui/components/input';
import { Label } from '@ayunis/ui/components/label';
import type { SuperAdminOrgResponseDto } from '@/shared/api';
import type { DeleteOrgFormData } from '@/pages/super-admin-settings/org/model/types';
import { useDeleteOrg } from '@/pages/super-admin-settings/org/api/useDeleteOrg';

export default function DeleteOrgDialog({
  org,
}: Readonly<{ org: SuperAdminOrgResponseDto }>) {
  const { t } = useTranslation('super-admin-settings-org');
  const [open, setOpen] = useState(false);
  const form = useForm<DeleteOrgFormData>({
    defaultValues: { confirmationName: '' },
  });
  const deletion = useDeleteOrg();
  const nameCue = (
    <Badge
      variant="secondary"
      className="inline max-w-full whitespace-normal break-all align-baseline"
    >
      {org.name}
    </Badge>
  );
  const name = useWatch({ control: form.control, name: 'confirmationName' });
  const submit = form.handleSubmit((data) => {
    if (data.confirmationName !== org.name) return;
    deletion.mutate({ id: org.id, data }, { onSuccess: () => setOpen(false) });
  });
  function changeOpen(value: boolean) {
    if (deletion.isPending) return;
    setOpen(value);
    form.reset();
  }
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" data-testid="org-delete-open">
          {t('lifecycle.deleteButton')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('lifecycle.deleteTitle')}</DialogTitle>
          <DialogDescription>
            <Trans
              t={t}
              i18nKey="lifecycle.deleteDescription"
              values={{ name: org.name }}
              components={{ name: nameCue }}
            />
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-delete-name" className="flex-wrap">
              <Trans
                t={t}
                i18nKey="lifecycle.typeName"
                values={{ name: org.name }}
                components={{ name: nameCue }}
              />
            </Label>
            <Input
              id="org-delete-name"
              data-testid="org-delete-name"
              autoComplete="off"
              disabled={deletion.isPending}
              {...form.register('confirmationName', { required: true })}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deletion.isPending}
              onClick={() => changeOpen(false)}
            >
              {t('lifecycle.cancel')}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              data-testid="org-delete-confirm"
              disabled={name !== org.name || deletion.isPending}
            >
              {t('lifecycle.deleteButton')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
