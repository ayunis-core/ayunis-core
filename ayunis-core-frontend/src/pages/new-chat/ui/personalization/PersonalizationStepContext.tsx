import { useTranslation } from 'react-i18next';
import { Textarea } from '@/shared/ui/shadcn/textarea';
import { Label } from '@/shared/ui/shadcn/label';

interface PersonalizationStepContextProps {
  context: string;
  onContextChange: (context: string) => void;
}

export function PersonalizationStepContext({
  context,
  onContextChange,
}: Readonly<PersonalizationStepContextProps>) {
  const { t } = useTranslation('chat');

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold">
          {t('newChat.personalization.contextTitle')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('newChat.personalization.contextDescription')}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="personalization-context">
          {t('newChat.personalization.contextLabel')}
        </Label>
        <Textarea
          id="personalization-context"
          value={context}
          onChange={(e) => onContextChange(e.target.value)}
          placeholder={t('newChat.personalization.contextPlaceholder')}
          maxLength={1000}
          rows={3}
          autoFocus
        />
      </div>
    </div>
  );
}
