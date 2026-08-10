import { useTranslation } from 'react-i18next';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ayunis/ui/components/dialog';
import { Button } from '@ayunis/ui/components/button';
import { useCertificateExpiryNotice } from '@/widgets/certificate-expiry/model/useCertificateExpiryNotice';

/**
 * The two dismissible expiry warnings: a neutral one a month out, a red one two
 * weeks out. Both link straight to the academy, where the certificate is earned
 * and downloaded. Renders nothing at every other level, so callers can mount it
 * unconditionally.
 */
export default function CertificateExpiryDialog() {
  const { t } = useTranslation('academy');
  const navigate = useNavigate();
  const { pathname } = useRouterState({ select: (s) => s.location });
  const { level, daysRemaining, isDismissed, dismiss } =
    useCertificateExpiryNotice();

  // Never interrupt the academy itself: a modal whose whole purpose is "go
  // renew" must not block the pages where renewing happens.
  const inTheAcademy = pathname.startsWith('/academy');
  // `urgent` reads the level rather than the open state, so dismissing closes
  // the dialog without rewriting its copy mid-animation.
  const isOpen =
    (level === 'month' || level === 'twoWeeks') &&
    !isDismissed &&
    !inTheAcademy;
  const urgent = level === 'twoWeeks';

  // Stays mounted and closes through `open`, rather than unmounting an open
  // dialog: hard-unmounting one leaves Radix's scroll lock and pointer-events
  // guard behind, which freezes the page underneath.
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {/* The two-week warning has to read as urgent, but the colour goes
                on our own element rather than overriding the title's styling. */}
            <span className={urgent ? 'text-destructive' : undefined}>
              {t('expiry.title', { count: daysRemaining })}
            </span>
          </DialogTitle>
          <DialogDescription>
            {urgent ? t('expiry.urgentDescription') : t('expiry.description')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={dismiss}>
            {t('expiry.later')}
          </Button>
          <Button
            onClick={() => {
              dismiss();
              void navigate({ to: '/academy' });
            }}
          >
            {t('expiry.action')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
