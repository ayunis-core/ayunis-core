import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@ayunis/ui/components/button';
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from '@ayunis/ui/components/alert';
import { useAcademyAccessStatus } from '../useAcademyAccessStatus';

interface AcademyGateNoticeProps {
  className?: string;
  /** Hide the "go to the academy" button on the academy page itself. */
  withAction?: boolean;
}

/**
 * Explains why chat is locked and points at the academy. Renders nothing when
 * the user is not gated, so callers can drop it in unconditionally.
 */
export default function AcademyGateNotice({
  className,
  withAction = true,
}: Readonly<AcademyGateNoticeProps>) {
  const { t } = useTranslation('academy');
  const navigate = useNavigate();
  const { isGated } = useAcademyAccessStatus();

  if (!isGated) {
    return null;
  }

  return (
    <Alert variant="warning" className={className}>
      <Lock />
      <AlertTitle>{t('gate.title')}</AlertTitle>
      <AlertDescription>
        {t('gate.description')}
        {withAction && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void navigate({ to: '/academy' })}
            className="mt-2"
          >
            {t('gate.action')}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
