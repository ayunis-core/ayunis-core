import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Label } from '@ayunis/ui/components/label';
import { Textarea } from '@ayunis/ui/components/textarea';

export function SkillReadOnlyContent({
  trigger,
  instructions,
  showDescription = true,
}: Readonly<{
  trigger: string;
  instructions: string;
  showDescription?: boolean;
}>) {
  const { t } = useTranslation('skill');

  return (
    <Card data-testid="skill-read-only-content">
      <CardHeader>
        <CardTitle>{t('readOnly.title')}</CardTitle>
        {showDescription && (
          <CardDescription>{t('readOnly.description')}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="readonly-trigger">{t('readOnly.trigger')}</Label>
          <Textarea id="readonly-trigger" value={trigger} disabled readOnly />
        </div>
        <div className="space-y-2">
          <Label htmlFor="readonly-instructions">
            {t('readOnly.instructions')}
          </Label>
          <Textarea
            id="readonly-instructions"
            value={instructions}
            disabled
            readOnly
            rows={6}
          />
        </div>
      </CardContent>
    </Card>
  );
}
