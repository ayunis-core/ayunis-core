import { Label } from '@ayunis/ui/components/label';
import { useTranslation } from 'react-i18next';
import { OwnerSelect, type OwnerOption } from '@/features/resource-ownership';

/**
 * Every way of closing a create dialog resets to it: an item created
 * personally by mistake can still be moved, one created for the
 * organization is visible to everyone at once.
 */
export const PERSONAL_OWNER_KEY = 'personal';

/** Rendered only when the user can choose between owners. */
export function OwnerChoice({
  options,
  value,
  onValueChange,
  grouped = false,
  testId,
}: Readonly<{
  options: OwnerOption[] | undefined;
  value: string;
  onValueChange: (key: string) => void;
  grouped?: boolean;
  testId: string;
}>) {
  const { t } = useTranslation('ownership');

  if (!options || options.length < 2) return null;
  return (
    <div className="grid gap-2">
      <Label htmlFor={testId}>{t('owner.label')}</Label>
      <OwnerSelect
        id={testId}
        options={options}
        value={value}
        onValueChange={onValueChange}
        grouped={grouped}
        testId={testId}
      />
    </div>
  );
}
