import { useTranslation } from 'react-i18next';
import type { OparlBodyResponseDto } from '@ayunis/api-client';

/** Each body with the organizations that linked it. */
export function OparlBodyList({
  bodies,
}: Readonly<{ bodies: OparlBodyResponseDto[] }>) {
  const { t } = useTranslation('super-admin-settings-oparl');
  if (bodies.length === 0) return <>—</>;
  return (
    <ul className="space-y-1">
      {bodies.map((body) => (
        <li key={body.id} data-testid={`oparl-system-body-${body.id}`}>
          <div>{body.name ?? body.oparlId}</div>
          <div
            className="text-xs text-muted-foreground"
            data-testid="oparl-system-body-linked-orgs"
          >
            {body.linkedOrgs.length > 0
              ? t('fields.linkedBy', {
                  orgs: body.linkedOrgs.map((org) => org.name).join(', '),
                })
              : t('fields.notLinked')}
          </div>
        </li>
      ))}
    </ul>
  );
}
