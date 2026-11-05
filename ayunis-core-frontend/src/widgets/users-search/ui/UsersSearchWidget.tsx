import { useTranslation } from 'react-i18next';
import { SearchField } from '@/shared/ui/search-field';
import { useState, useEffect, useRef, useCallback } from 'react';

interface UsersSearchWidgetProps {
  search?: string;
  onSearchChange: (search?: string) => void;
  translationNamespace: string;
  placeholderKey: string;
  /** Off for pages where the search box is not the primary control. */
  autoFocus?: boolean;
  inputTestId?: string;
}

export function UsersSearchWidget({
  search,
  onSearchChange,
  translationNamespace,
  placeholderKey,
  autoFocus = true,
  inputTestId,
}: Readonly<UsersSearchWidgetProps>) {
  const { t } = useTranslation(translationNamespace);
  const [localValue, setLocalValue] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [previousSearch, setPreviousSearch] = useState(search);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The search prop lags behind onSearchChange while the route loader fetches,
  // so the typed value stays until the prop changes, and a late prop update
  // must not overwrite text typed after it was published.
  if (search !== previousSearch) {
    setPreviousSearch(search);
    if (!isTyping) {
      setLocalValue(null);
    }
  }

  const displayValue = localValue ?? search ?? '';

  // Auto-focus search input on mount
  useEffect(() => {
    if (autoFocus) {
      searchInputRef.current?.focus();
    }
  }, [autoFocus]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      setIsTyping(true);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        onSearchChange(newValue || undefined);
        setIsTyping(false);
      }, 300);
    },
    [onSearchChange],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <SearchField
      ref={searchInputRef}
      leadingIcon
      wrapperClassName="flex-1 max-w-md"
      placeholder={t(placeholderKey)}
      value={displayValue}
      onChange={handleChange}
      className="pl-10"
      data-testid={inputTestId}
    />
  );
}
