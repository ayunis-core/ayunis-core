import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/shadcn/select';
import { useLetterheadsControllerFindAll } from '@/shared/api/generated/ayunisCoreAPI';
import { useTranslation } from 'react-i18next';

const NO_LETTERHEAD = '__none__';

interface LetterheadPickerProps {
  letterheadId: string | null | undefined;
  onLetterheadChange: (letterheadId: string | null) => void;
  disabled?: boolean;
}

export function LetterheadPicker({
  letterheadId,
  onLetterheadChange,
  disabled,
}: Readonly<LetterheadPickerProps>) {
  const { t } = useTranslation('artifacts');
  const { data: letterheads = [] } = useLetterheadsControllerFindAll();

  if (letterheads.length === 0) return null;

  return (
    <Select
      value={letterheadId ?? NO_LETTERHEAD}
      onValueChange={(value) =>
        onLetterheadChange(value === NO_LETTERHEAD ? null : value)
      }
      disabled={disabled}
    >
      <SelectTrigger className="h-8 w-[160px] text-xs">
        <SelectValue placeholder={t('letterhead.none')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_LETTERHEAD}>{t('letterhead.none')}</SelectItem>
        {letterheads.map((lh) => (
          <SelectItem key={lh.id} value={lh.id}>
            {lh.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
