import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@ayunis/ui/components/input';
import { Label } from '@ayunis/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import {
  DOCUMENT_FONT_STACKS,
  MIN_DOCUMENT_FONT_SIZE_PT,
  MAX_DOCUMENT_FONT_SIZE_PT,
  type DocumentFontFamily,
  type DocumentTypography,
} from '@/shared/lib/document-typography';

const INHERIT_FONT = 'inherit';
const fonts = (Object.keys(DOCUMENT_FONT_STACKS) as DocumentFontFamily[]).sort(
  (a, b) => a.localeCompare(b),
);

interface DocumentTypographyFieldsProps {
  value: DocumentTypography;
  onChange: (patch: Partial<DocumentTypography>) => void;
  scope: 'letterhead' | 'organization';
  disabled?: boolean;
}

export function DocumentTypographyFields({
  value,
  onChange,
  scope,
  disabled,
}: Readonly<DocumentTypographyFieldsProps>) {
  const { t } = useTranslation('admin-settings-letterheads');
  const fontFamilyId = useId();
  const fontSizeId = useId();
  const inherit = t(
    scope === 'letterhead'
      ? 'typography.organizationDefault'
      : 'typography.appDefault',
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor={fontFamilyId}>{t('typography.fontFamily')}</Label>
        <Select
          value={value.fontFamily ?? INHERIT_FONT}
          onValueChange={(fontFamily) =>
            onChange({
              fontFamily: fonts.find((font) => font === fontFamily) ?? null,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger id={fontFamilyId} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" align="start">
            <SelectItem value={INHERIT_FONT}>{inherit}</SelectItem>
            {fonts.map((font) => (
              <SelectItem
                key={font}
                value={font}
                style={{ fontFamily: DOCUMENT_FONT_STACKS[font] }}
              >
                {font}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={fontSizeId}>{t('typography.fontSizePt')}</Label>
        <Input
          id={fontSizeId}
          type="number"
          min={MIN_DOCUMENT_FONT_SIZE_PT}
          max={MAX_DOCUMENT_FONT_SIZE_PT}
          step={1}
          value={value.fontSizePt ?? ''}
          placeholder={inherit}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              fontSizePt:
                event.currentTarget.value === ''
                  ? null
                  : event.currentTarget.valueAsNumber,
            })
          }
        />
      </div>
    </div>
  );
}
