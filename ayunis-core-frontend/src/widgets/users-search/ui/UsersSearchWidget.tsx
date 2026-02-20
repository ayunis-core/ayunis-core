import { Input } from '@/shared/ui/shadcn/input';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef, useCallback } from 'react';

interface UsersSearchWidgetProps {
  search?: string;
  onSearchChange: (search?: string) => void;
  translationNamespace: string;
  placeholderKey: string;
}

export function UsersSearchWidget({
  search,
  onSearchChange,
  translationNamespace,
  placeholderKey,
}: Readonly<UsersSearchWidgetProps>) {
  const { t } = useTranslation(translationNamespace);
  const [localValue, setLocalValue] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The displayed value: local value while typing, otherwise the prop
  const displayValue = localValue ?? search ?? '';

  // Auto-focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

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
      />
    </div>
  );
}
