import { useCallback, useEffect, useRef, useState } from 'react';

export function useContentScrollHeader(resetKey?: unknown) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [headerScrolled, setHeaderScrolled] = useState(false);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setHeaderScrolled(e.currentTarget.scrollTop > 0);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      setHeaderScrolled(el.scrollTop > 0);
    }
  }, [resetKey]);

  return { scrollRef, headerScrolled, onScroll };
}
