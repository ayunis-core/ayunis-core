// Utils
import { useEffect } from "react";

type UseClickOutsideOptions = {
  enabled?: boolean;
  ignore?: Array<HTMLElement | null>;
};
  
export function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  handler: (event: MouseEvent | TouchEvent) => void,
  options?: UseClickOutsideOptions,
) {
  useEffect(() => {
    if (options?.enabled === false) {
      return;
    }

    const isIgnored = (target: EventTarget | null): boolean => {
      if (!target || !options?.ignore?.length) {
        return false;
      }

      return options.ignore.some((el) => el && el.contains(target as Node));
    };

    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref.current;
      const target = event.target as Node | null;
      if (!el || !target) return;
      if (isIgnored(target) || el.contains(target)) return;
      handler(event);
    };

    const onMouseDown = (e: MouseEvent) => listener(e);
    const onTouchStart = (e: TouchEvent) => listener(e);

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("touchstart", onTouchStart);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("touchstart", onTouchStart);
    };
  }, [ref, handler, options?.enabled, options?.ignore]);
}

export default useClickOutside;