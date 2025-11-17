import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogTrigger,
} from '@/shared/ui/shadcn/dialog';
import { Button } from '@/shared/ui/shadcn/button';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PermittedProviderResponseDtoProvider,
  PermittedProviderResponseDtoHostedIn,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface Provider {
  provider: PermittedProviderResponseDtoProvider;
  displayName: string;
  hostedIn: PermittedProviderResponseDtoHostedIn;
  isPermitted: boolean;
}

interface ProviderConfirmationDialogProps {
  provider: Provider;
  onConfirm: () => void;
  children: ReactNode;
}

export default function ProviderConfirmationDialog({
  provider,
  onConfirm,
  children,
}: ProviderConfirmationDialogProps) {
  const { t } = useTranslation('admin-settings-models');

  function handleConfirm() {
    onConfirm();
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {provider.isPermitted
              ? t('models.providerConfirmation.disableProvider', {
                  provider: provider.displayName,
                })
              : t('models.providerConfirmation.enableProvider', {
                  provider: provider.displayName,
                })}
          </DialogTitle>
        </DialogHeader>
        <p>
          {provider.isPermitted
            ? t('models.providerConfirmation.disableProviderDescription')
            : t('models.providerConfirmation.enableProviderDescription')}
        </p>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="submit" onClick={handleConfirm}>
              {provider.isPermitted
                ? t('models.disableProvider')
                : t('models.enableProvider')}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
