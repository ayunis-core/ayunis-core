import { Button } from '@/shared/ui/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/shared/ui/shadcn/dialog';
import { Loader2, Minus, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SubscriptionResponseDto } from '@/shared/api';
import { useState } from 'react';
import useSubscriptionSeatsUpdate from '../api/useSubscriptionSeatsUpdate';

interface LicenseSeatsUpdateDialogProps {
  subscription: SubscriptionResponseDto;
  trigger: React.ReactNode;
}

export default function LicenseSeatsUpdateDialog({
  subscription,
  trigger,
}: LicenseSeatsUpdateDialogProps) {
  const { t } = useTranslation('admin-settings-billing');
  const [selectedSeats, setSelectedSeats] = useState(subscription.noOfSeats);
  const { updateSeats, isPending } = useSubscriptionSeatsUpdate();

  function handleDecreaseSeats() {
    setSelectedSeats((prev) => Math.max(1, prev - 1));
  }
  function handleIncreaseSeats() {
    setSelectedSeats((prev) => prev + 1);
  }

  function handleUpdateSeats() {
    updateSeats(selectedSeats);
  }
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('licenseSeats.manageLicenseSeats')}</DialogTitle>
          <DialogDescription>
            {t('licenseSeats.manageLicenseSeatsDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-4 py-8">
          <Button
            variant="outline"
            size="icon"
            onClick={handleDecreaseSeats}
            disabled={selectedSeats <= 1}
          >
            <Minus className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2 px-4 py-2 border rounded-lg min-w-[120px] justify-center">
            <span className="text-2xl font-bold">{selectedSeats}</span>
            <span className="text-sm text-gray-500">
              {t('licenseSeats.seats')}
            </span>
          </div>

          <Button variant="outline" size="icon" onClick={handleIncreaseSeats}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <DialogFooter>
          <Button
            disabled={selectedSeats === subscription.noOfSeats}
            onClick={handleUpdateSeats}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('licenseSeats.updateSeats')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
