import { TriangleAlert } from 'lucide-react';
import { useAppAlertControllerGetAppAlert } from '@/shared/api';
import { Alert, AlertDescription } from '@/shared/ui/shadcn/alert';

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
    <Alert
      variant="warning"
      className="shrink-0 items-center rounded-none border-x-0 border-t-0 px-4 py-2 [&>svg]:translate-y-0"
    >
      <TriangleAlert className="h-4 w-4" />
      <AlertDescription className="text-warning font-medium">
        {data.message}
      </AlertDescription>
    </Alert>
  );
}
