import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import { Checkbox } from '@ayunis/ui/components/checkbox';
import { Label } from '@ayunis/ui/components/label';

interface ChapterConfirmationFormProps {
  isSubmitting: boolean;
  onConfirm: () => void;
}

export function ChapterConfirmationForm({
  isSubmitting,
  onConfirm,
}: Readonly<ChapterConfirmationFormProps>) {
  const { t } = useTranslation('academy');
  const [hasWatchedVideos, setHasWatchedVideos] = useState(false);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (hasWatchedVideos && !isSubmitting) {
          onConfirm();
        }
      }}
      className="space-y-6"
    >
      <div className="flex items-start gap-3">
        <Checkbox
          id="watched-videos"
          data-testid="academy-confirmation-watched"
          checked={hasWatchedVideos}
          onCheckedChange={(checked) => setHasWatchedVideos(checked === true)}
          disabled={isSubmitting}
        />
        <Label htmlFor="watched-videos">
          {t('confirmation.watchedVideos')}
        </Label>
      </div>
      <Button
        type="submit"
        data-testid="academy-confirmation-submit"
        disabled={!hasWatchedVideos || isSubmitting}
      >
        {t('confirmation.completeChapter')}
      </Button>
    </form>
  );
}
