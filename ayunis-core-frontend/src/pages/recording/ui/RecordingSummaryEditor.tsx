import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import { Textarea } from '@ayunis/ui/components/textarea';

export function RecordingSummaryEditor({
  initial,
  onCancel,
  onSave,
}: Readonly<{
  initial: string;
  onCancel: () => void;
  onSave: (summary: string) => void;
}>) {
  const { t } = useTranslation('recordings');
  const [draft, setDraft] = useState(initial);

  return (
    <div className="space-y-3" data-testid="recording-summary-editor">
      <Textarea
        autoFocus
        value={draft}
        aria-label={t('detail.summary.title')}
        className="min-h-96 text-sm"
        onChange={(event) => setDraft(event.target.value)}
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {t('detail.summary.edit.cancel')}
        </Button>
        <Button onClick={() => onSave(draft)} disabled={!draft.trim()}>
          {t('detail.summary.edit.save')}
        </Button>
      </div>
    </div>
  );
}
