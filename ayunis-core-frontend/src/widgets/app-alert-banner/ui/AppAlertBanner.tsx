import { TriangleAlert } from 'lucide-react';
import { useAppAlertControllerGetAppAlert } from '@/shared/api';

/**
 * Persistent app-wide alert banner shown at the top of every authenticated
 * page when a super admin has enabled it. Renders nothing when disabled or
 * when no message has been configured.
 */
export default function AppAlertBanner() {
  const { data } = useAppAlertControllerGetAppAlert();

  if (!data?.enabled || data.message.trim().length === 0) {
    return null;
  }

  return (
    <div
      role="alert"
      data-app-alert-banner
      className="relative grid w-full shrink-0 grid-cols-[calc(var(--spacing)*4)_1fr] items-center gap-x-3 rounded-none border border-x-0 border-t-0 bg-warning/10 px-4 py-2 text-sm text-warning backdrop-blur-md md:rounded-t-xl"
    >
      <TriangleAlert className="size-4" />
      <p className="font-medium">{data.message}</p>
    </div>
  );
}
