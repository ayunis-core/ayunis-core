import { useTranslation } from 'react-i18next';
import { Copy } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { showError, showSuccess } from '@/shared/lib/toast';

interface CopyButtonProps {
  value: string;
  label: string;
  testId: string;
}

export function CopyButton({
  value,
  label,
  testId,
}: Readonly<CopyButtonProps>) {
  const { t } = useTranslation('common');

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      showSuccess(t('common.copy.success'));
    } catch {
      showError(t('common.copy.error'));
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={t('common.copy.label', { label })}
      title={t('common.copy.label', { label })}
      onClick={() => void copy()}
      data-testid={testId}
    >
      <Copy />
    </Button>
  );
}
