import { useState } from 'react';

export function usePickedSet(initial: () => Iterable<string>) {
  const [picked, setPicked] = useState<Set<string>>(() => new Set(initial()));

  function toggle(name: string, checked: boolean) {
    setPicked((current) => {
      const next = new Set(current);
      if (checked) next.add(name);
      else next.delete(name);
      return next;
    });
  }

  return { picked, toggle };
}
