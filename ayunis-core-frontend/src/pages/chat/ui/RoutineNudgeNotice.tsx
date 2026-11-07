import { BellRing } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface RoutineNudgeNoticeProps {
  readonly text: string;
}

/** A reminder the system sent to an unattended routine run, not a user message. */
export default function RoutineNudgeNotice({ text }: RoutineNudgeNoticeProps) {
  const { t } = useTranslation('chat');
  return (
    <div
      className="flex items-start gap-2 py-2 text-sm text-muted-foreground"
      data-testid="routine-nudge"
    >
      <BellRing className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 space-y-0.5">
        <div className="font-medium">{t('chat.routine.nudge')}</div>
        <div>{text}</div>
      </div>
    </div>
  );
}
