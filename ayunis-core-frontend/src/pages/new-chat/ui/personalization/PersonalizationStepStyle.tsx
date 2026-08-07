import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import { Textarea } from '@ayunis/ui/components/textarea';
import { Label } from '@ayunis/ui/components/label';
import { cn } from '@ayunis/ui/lib/cn';

// eslint-disable-next-line react-refresh/only-export-components -- the parent wizard consumes this shared option metadata
export const STYLE_OPTIONS = [
  { key: 'casual', i18nKey: 'newChat.personalization.styleCasual' },
  {
    key: 'professional',
    i18nKey: 'newChat.personalization.styleProfessional',
  },
  { key: 'factual', i18nKey: 'newChat.personalization.styleFactual' },
] as const;

interface PersonalizationStepStyleProps {
  selectedStyle: string;
  onStyleChange: (style: string) => void;
  customStyle: string;
  onCustomStyleChange: (customStyle: string) => void;
}

export function PersonalizationStepStyle({
  selectedStyle,
  onStyleChange,
  customStyle,
  onCustomStyleChange,
}: Readonly<PersonalizationStepStyleProps>) {
  const { t } = useTranslation('chat');

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold">
          {t('newChat.personalization.styleTitle')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('newChat.personalization.styleDescription')}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {STYLE_OPTIONS.map((option) => (
          <Button
            key={option.key}
            type="button"
            variant={selectedStyle === option.key ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'rounded-full',
              selectedStyle === option.key && 'ring-2 ring-primary/30',
            )}
            onClick={() => onStyleChange(option.key)}
          >
            {t(option.i18nKey)}
          </Button>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="personalization-custom-style">
          {t('newChat.personalization.styleCustomLabel')}
        </Label>
        <Textarea
          id="personalization-custom-style"
          value={customStyle}
          onChange={(e) => onCustomStyleChange(e.target.value)}
          placeholder={t('newChat.personalization.styleCustomPlaceholder')}
          maxLength={500}
          rows={2}
        />
      </div>
    </div>
  );
}
