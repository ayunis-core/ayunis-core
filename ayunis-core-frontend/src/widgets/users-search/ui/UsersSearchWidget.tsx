import { Input } from '@ayunis/ui/components/input';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const searchInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The displayed value: local value while typing, otherwise the prop
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

      // Clear existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Debounce search change
      timerRef.current = setTimeout(() => {
        onSearchChange(newValue || undefined);
        // Reset local value after search change
        setLocalValue(null);
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
    <div className="relative flex-1 max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input
        ref={searchInputRef}
        type="text"
        placeholder={t(placeholderKey)}
        value={displayValue}
        onChange={handleChange}
        className="pl-10"
        data-testid={inputTestId}
      />
    </div>
  );
}
