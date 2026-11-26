import { useNavigate } from '@tanstack/react-router';
import { AcademyGateNotice as SharedAcademyGateNotice } from '@ayunis/chat/model-presentation';
import { useAcademyAccessStatus } from '@/features/academy';

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
  const navigate = useNavigate();
  const { isGated } = useAcademyAccessStatus();
  // The Outlook pane can't open the academy.

  if (!isGated) {
    return null;
  }

  return (
    <SharedAcademyGateNotice
      className={className}
      onOpenAcademy={
        withAction ? () => void navigate({ to: '/academy' }) : undefined
      }
    />
  );
}
