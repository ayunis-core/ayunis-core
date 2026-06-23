import { useEffect, useState } from 'react';

export function useAutoRotate(count: number, intervalMs = 10500) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (count <= 1) {
      return;
    }
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, intervalMs);
    return () => clearInterval(id);
  }, [count, intervalMs]);

  return { index };
}
