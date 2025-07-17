import { useEffect, useState } from "react";
import { showSuccess } from "@/shared/lib/toast";

interface UseRedirectNotificationProps {
  show: boolean;
  text: string;
}

export function useRedirectNotification({
  show,
  text,
}: UseRedirectNotificationProps) {
  const [isComponentReady, setIsComponentReady] = useState(false);

  // otherwise the toast is not shown
  useEffect(() => {
    setIsComponentReady(true);
  }, []);

  useEffect(() => {
    if (show && isComponentReady) {
      showSuccess(text);
    }
  }, [show, text, isComponentReady]);
}
