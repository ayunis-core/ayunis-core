import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/ui/shadcn/button';
import { useTranslation } from 'react-i18next';

interface MonthPickerProps {
  year: number;
  month: number; // 0-indexed (0 = January)
  onMonthChange: (year: number, month: number) => void;
}

export function MonthPicker({
  year,
  month,
  onMonthChange,
}: Readonly<MonthPickerProps>) {
  const { i18n } = useTranslation();

  const label = new Intl.DateTimeFormat(i18n.language, {
    year: 'numeric',
    month: 'long',
  }).format(new Date(year, month, 1));

  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const goToPreviousMonth = () => {
    if (month === 0) {
      onMonthChange(year - 1, 11);
    } else {
      onMonthChange(year, month - 1);
    }
  };

  const goToNextMonth = () => {
    if (isCurrentMonth) return;
    if (month === 11) {
      onMonthChange(year + 1, 0);
    } else {
      onMonthChange(year, month + 1);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[10rem] text-center text-sm font-medium">
        {label}
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={goToNextMonth}
        disabled={isCurrentMonth}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
