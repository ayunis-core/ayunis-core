import { useEffect, useState } from 'react';
import { showSuccess } from '@/shared/lib/toast';

interface UseRedirectNotificationProps {
  show: boolean;
  text: string;
}

export function useRedirectNotification({
  show,
  text,
}: UseRedirectNotificationProps) {
  const [isComponentReady, setIsComponentReady] = useState(false);

  // Wait for next tick to ensure component is mounted
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsComponentReady(true);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (show && isComponentReady) {
      showSuccess(text);
    }
  }, [show, text, isComponentReady]);
}
