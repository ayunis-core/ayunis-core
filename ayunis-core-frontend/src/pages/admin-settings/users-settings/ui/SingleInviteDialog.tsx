import { Button } from '@/shared/ui/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Checkbox } from '@/shared/ui/shadcn/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/shadcn/select';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { InviteRole } from '../model/openapi';
import { useInviteCreate } from '../api/useInviteCreate';
import { useTranslation } from 'react-i18next';
import { Copy, Check } from 'lucide-react';
import { showSuccess } from '@/shared/lib/toast';
import type { CreateInviteResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { Label } from '@/shared/ui/shadcn/label';

interface InviteFormData {
  email: string;
  role: InviteRole;
  prepared: boolean;
}

interface SingleInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SingleInviteDialog({
  open,
  onOpenChange,
}: Readonly<SingleInviteDialogProps>) {
  const { t } = useTranslation('admin-settings-users');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [isUrlCopied, setIsUrlCopied] = useState(false);

  const form = useForm<InviteFormData>({
    defaultValues: {
      email: '',
      role: undefined,
      prepared: false,
    },
  });
  const isPrepared = useWatch({ control: form.control, name: 'prepared' });

  function handleClose() {
    onOpenChange(false);
    form.reset();
    setInviteUrl(null);
    setIsUrlCopied(false);
  }

  const { createInvite, isLoading: isCreatingInvite } = useInviteCreate(
    (response: CreateInviteResponseDto) => {
      if (response.url) {
        setInviteUrl(response.url);
      } else {
        // Email was sent successfully, close the dialog
        handleClose();
      }
    },
  );

  function onSubmit(data: InviteFormData) {
    createInvite(data);
  }

  function handleCancel() {
    handleClose();
  }

  function getSubmitLabel() {
    if (isCreatingInvite) {
      return isPrepared
        ? t('inviteDialog.preparing')
        : t('inviteDialog.sending');
    }
    return isPrepared
      ? t('inviteDialog.prepareInvitation')
      : t('inviteDialog.sendInvitation');
  }

  /* eslint-disable sonarjs/no-selector-parameter -- Required by Radix Dialog's onOpenChange callback signature */
  function handleOpenChange(newOpen: boolean) {
    if (newOpen) {
      onOpenChange(true);
    } else {
      handleClose();
    }
  }
  /* eslint-enable sonarjs/no-selector-parameter */

  async function copyUrlToClipboard() {
    if (inviteUrl) {
      try {
        await navigator.clipboard.writeText(inviteUrl);
        setIsUrlCopied(true);
        showSuccess(t('inviteDialog.urlCopied'));
        setTimeout(() => setIsUrlCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy URL:', err);
      }
    }
  }

  const formContent = (
    <Form {...form}>
      <form
        onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="email"
          rules={{
            required: t('inviteDialog.emailRequired'),
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: t('inviteDialog.emailInvalid'),
            },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('inviteDialog.emailAddress')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('inviteDialog.emailPlaceholder')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          rules={{
            required: t('inviteDialog.roleRequired'),
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('inviteDialog.roleLabel')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={t('inviteDialog.roleSelectPlaceholder')}
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="user">
                    {t('inviteDialog.roleUser')}
                  </SelectItem>
                  <SelectItem value="admin">
                    {t('inviteDialog.roleAdmin')}
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="prepared"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>{t('inviteDialog.prepareLabel')}</FormLabel>
                <p className="text-sm text-muted-foreground">
                  {t('inviteDialog.prepareDescription')}
                </p>
              </div>
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isCreatingInvite}
          >
            {t('inviteDialog.cancel')}
          </Button>
          <Button type="submit" disabled={isCreatingInvite}>
            {getSubmitLabel()}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );

  const urlContent = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="inviteUrl" className="text-sm font-medium">
          {t('inviteDialog.inviteUrl')}
        </Label>
        <div className="flex items-center space-x-2">
          <Input
            id="inviteUrl"
            value={inviteUrl ?? ''}
            readOnly
            className="bg-muted"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => void copyUrlToClipboard()}
            className="flex items-center space-x-2"
          >
            {isUrlCopied ? (
              <>
                <Check className="h-4 w-4" />
                <span>{t('inviteDialog.copied')}</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>{t('inviteDialog.copy')}</span>
              </>
            )}
          </Button>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleClose}>{t('inviteDialog.close')}</Button>
      </DialogFooter>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>
            {inviteUrl
              ? t('inviteDialog.urlDialogTitle')
              : t('inviteDialog.dialogTitle')}
          </DialogTitle>
          <DialogDescription>
            {inviteUrl
              ? t('inviteDialog.urlInstructions')
              : t('inviteDialog.dialogDescription')}
          </DialogDescription>
        </DialogHeader>
        {inviteUrl ? urlContent : formContent}
      </DialogContent>
    </Dialog>
  );
}
