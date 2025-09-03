import { useEffect, useRef, useState } from "react";

/**
 * Custom hook for managing auto-scroll behavior in a scrollable container.
 * Automatically scrolls to the bottom when content changes, but stops if the user scrolls up.
 * Resumes auto-scrolling when the user scrolls back to the bottom.
 *
 * @param content - The content that triggers auto-scrolling when it changes
 * @returns Object containing the ref for the scrollable element and scroll handler
 */
export function useAutoScroll(content: string | React.ReactNode) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasScrolledUp, setHasScrolledUp] = useState<boolean>(false);

  // Auto-scroll to bottom when content changes (if user hasn't scrolled up)
  useEffect(() => {
    if (scrollRef.current && !hasScrolledUp) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [content, hasScrolledUp]);

  // Handle scroll events to detect if user is at bottom or has scrolled up
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom =
      target.scrollTop + target.clientHeight >= target.scrollHeight - 1;
    setHasScrolledUp(!isAtBottom);
  };

  return {
    scrollRef,
    handleScroll,
  };
}
