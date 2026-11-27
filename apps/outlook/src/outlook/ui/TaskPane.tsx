import type { ReactNode } from 'react';
import type { MeResponseDto } from '@ayunis/api-client/schemas';
import { useTranslation } from 'react-i18next';
import { OfficeAddinAuthShell } from '@ayunis/office-addin/auth-shell';
import type { OfficeAddinSession } from '@ayunis/office-addin/session';
import type { OpenOfficeSignInDialog } from '@ayunis/office-addin/sign-in-dialog';
import brandFullLight from '@/outlook/assets/brand-full-light.svg';

export function TaskPane({
  session,
  officeAvailable,
  openSignInDialog,
  children,
}: Readonly<{
  session: OfficeAddinSession;
  officeAvailable: () => Promise<boolean>;
  openSignInDialog: OpenOfficeSignInDialog;
  children: (user: MeResponseDto) => ReactNode;
}>) {
  const { t } = useTranslation();
  return (
    <OfficeAddinAuthShell
      session={session}
      officeAvailable={officeAvailable}
      openSignInDialog={openSignInDialog}
      brandSrc={brandFullLight}
      brandAlt="Ayunis Core"
      testIdPrefix="outlook-pane"
      copy={{
        loading: t('pane.loading'),
        description: t('pane.description'),
        signIn: t('pane.signIn'),
        signingIn: t('pane.signingIn'),
        switchAccount: t('pane.switchAccount'),
        dialogClosed: t('pane.dialogClosed'),
        errors: {
          signInFailed: t('pane.error.signInFailed'),
          sessionExpired: t('pane.error.sessionExpired'),
          unreachable: t('pane.error.unreachable'),
          hostRequired: t('pane.error.outlookRequired'),
        },
      }}
    >
      {children}
    </OfficeAddinAuthShell>
  );
}
