import { Input } from '@/shared/ui/shadcn/input';
import { useNavigate } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef, useCallback } from 'react';

interface SuperAdminUsersSearchProps {
  search?: string;
  orgId: string;
}

interface SearchParams {
  tab?: string;
  usersSearch?: string;
  usersPage?: number;
}

export default function SuperAdminUsersSearch({
  search,
  orgId,
}: SuperAdminUsersSearchProps) {
  const { t } = useTranslation('super-admin-settings-org');
  const navigate = useNavigate();
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

      // Debounce navigation
      timerRef.current = setTimeout(() => {
        void navigate({
          to: '/super-admin-settings/orgs/$id',
          params: { id: orgId },
          search: (prev: SearchParams) => ({
            ...prev,
            tab: 'users' as const,
            usersSearch: newValue || undefined,
            usersPage: undefined,
          }),
        });
        // Reset local value after navigation
        setLocalValue(null);
      }, 300);
    },
    [navigate, orgId],
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
        placeholder={t('search.placeholder')}
        value={displayValue}
        onChange={handleChange}
        className="pl-10"
      />
    </div>
  );
}
