import { Trans } from 'react-i18next';
import { Checkbox } from '@/shared/ui/shadcn/checkbox';
import { useMarketplaceConfig } from '@/features/marketplace';

interface TermsCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  translationNs: string;
}

export function TermsCheckbox({
  checked,
  onCheckedChange,
  disabled = false,
  translationNs,
}: Readonly<TermsCheckboxProps>) {
  const marketplace = useMarketplaceConfig();

  const termsOfServiceUrl = marketplace.url
    ? `${marketplace.url.replace(/\/$/, '')}/nutzungsbedingungen`
    : null;

  return (
    <div className="flex items-start gap-2">
      <Checkbox
        id="terms-accept"
        className="mt-0.5"
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        disabled={disabled}
      />
      <span
        className="text-sm leading-normal cursor-pointer select-none"
        onClick={(e) => {
          if (!disabled && !(e.target as HTMLElement).closest('a')) {
            onCheckedChange(!checked);
          }
        }}
      >
        <Trans
          ns={translationNs}
          i18nKey="detail.termsOfServiceText"
          components={{
            termsLink: (
              <a
                href={termsOfServiceUrl ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-primary hover:text-primary/80"
              >
                placeholder
              </a>
            ),
          }}
        />
      </span>
    </div>
  );
}
