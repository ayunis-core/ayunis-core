import { useState } from 'react';

/** Knowledge bases or integrations picked for a chat that doesn't exist yet. */
export function useChatResourceSelection<T extends { id: string }>() {
  const [attached, setAttached] = useState<T[]>([]);
  return {
    attached,
    attach: (item: T) => setAttached((current) => [...current, item]),
    detach: (id: string) =>
      setAttached((current) => current.filter((item) => item.id !== id)),
  };
}
