import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';
import { Textarea } from '@/shared/ui/shadcn/textarea';
import { Label } from '@/shared/ui/shadcn/label';
import { cn } from '@/shared/lib/shadcn/utils';

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
