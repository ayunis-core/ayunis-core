import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import { ArtifactsControllerFindPersonalType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { ListToolbarSearch } from '@/widgets/list-toolbar';

const ALL_TYPES = 'all';

interface LibraryFiltersProps {
  search?: string;
  type?: ArtifactsControllerFindPersonalType;
}

export default function LibraryFilters({
  search,
  type,
}: Readonly<LibraryFiltersProps>) {
  const { t } = useTranslation('artifacts');
  const navigate = useNavigate({ from: '/library/' });
  const [searchValue, setSearchValue] = useState(search ?? '');
  const [shownSearch, setShownSearch] = useState(search);
  if (search !== shownSearch) {
    setShownSearch(search);
    setSearchValue(search ?? '');
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== (search ?? '')) {
        void navigate({
          search: (previous) => ({
            ...previous,
            search: searchValue || undefined,
            page: undefined,
          }),
        });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, search, navigate]);

  return (
    <>
      <ListToolbarSearch
        placeholder={t('library.searchPlaceholder')}
        value={searchValue}
        onChange={(event) => setSearchValue(event.target.value)}
        data-testid="library-search"
      />
      <Select
        value={type ?? ALL_TYPES}
        onValueChange={(value) => {
          void navigate({
            search: (previous) => ({
              ...previous,
              type:
                value === ALL_TYPES
                  ? undefined
                  : (value as ArtifactsControllerFindPersonalType),
              page: undefined,
            }),
          });
        }}
      >
        <SelectTrigger
          size="sm"
          aria-label={t('library.typeFilter')}
          data-testid="library-type-filter"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_TYPES} data-testid="library-type-filter-all">
            {t('library.allTypes')}
          </SelectItem>
          {Object.values(ArtifactsControllerFindPersonalType).map((value) => (
            <SelectItem
              key={value}
              value={value}
              data-testid={`library-type-filter-${value}`}
            >
              {t(`library.type.${value}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
