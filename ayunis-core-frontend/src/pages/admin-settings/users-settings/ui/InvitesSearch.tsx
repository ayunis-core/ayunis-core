import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { SearchField } from '@/shared/ui/search-field';
import { useState, useEffect, useRef, useCallback } from 'react';

interface InvitesSearchProps {
  search?: string;
}

export default function InvitesSearch({
  search,
}: Readonly<InvitesSearchProps>) {
  const { t } = useTranslation('admin-settings-users');
  const navigate = useNavigate();
  const [localValue, setLocalValue] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The displayed value: local value while typing, otherwise the prop
  const displayValue = localValue ?? search ?? '';

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
          to: '/admin-settings/users',
          search: (prev: { invitesSearch?: string; invitesPage?: number }) => ({
            ...prev,
            invitesSearch: newValue || undefined,
            invitesPage: undefined,
          }),
        });
        // Reset local value after navigation
        setLocalValue(null);
      }, 300);
    },
    [navigate],
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
      leadingIcon
      wrapperClassName="flex-1 max-w-md"
      placeholder={t('invitesSearch.placeholder')}
      value={displayValue}
      onChange={handleChange}
      className="pl-10"
    />
  );
}
