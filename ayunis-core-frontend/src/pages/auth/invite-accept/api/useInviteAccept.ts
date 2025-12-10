import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from '@tanstack/react-router';
import { useInvitesControllerAcceptInvite } from '@/shared/api/generated/ayunisCoreAPI';
import type { Invite } from '../model/openapi';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import * as z from 'zod';

export function useInviteAccept(invite: Invite, inviteToken: string) {
  const navigate = useNavigate();
  const acceptInviteMutation = useInvitesControllerAcceptInvite();
  const { t } = useTranslation('auth');

  const inviteAcceptFormSchema = z.object({
    email: z.string().email(),
    name: z.string().min(1, {
      message: t('inviteAccept.nameRequired'),
    }),
    password: z.string().min(8, {
      message: t('inviteAccept.passwordTooShort'),
    }),
    inviteToken: z.string(),
    hasAcceptedMarketing: z.boolean(),
  });

  const form = useForm<z.infer<typeof inviteAcceptFormSchema>>({
    resolver: zodResolver(inviteAcceptFormSchema),
    defaultValues: {
      email: invite.email,
      name: '',
      password: '',
      inviteToken: inviteToken,
      hasAcceptedMarketing: false,
    },
  });

  const onSubmit = (values: z.infer<typeof inviteAcceptFormSchema>) => {
    acceptInviteMutation.mutate(
      {
        data: {
          inviteToken: values.inviteToken,
          userName: values.name,
          password: values.password,
          hasAcceptedMarketing: values.hasAcceptedMarketing,
        },
      },
      {
        onSuccess: () => {
          // After successfully accepting the invite, redirect to login or dashboard
          void navigate({ to: '/login' });
        },
        onError: (error) => {
          console.error('Invite accept failed:', error);
          try {
            const { code } = extractErrorData(error);
            switch (code) {
              case 'INVALID_INVITE_TOKEN':
                showError(t('inviteAccept.invalidInviteToken'));
                break;
              case 'INVITE_NOT_FOUND':
                showError(t('inviteAccept.inviteNotFound'));
                break;
              case 'INVITE_ALREADY_ACCEPTED':
                showError(t('inviteAccept.inviteAlreadyAccepted'));
                break;
              case 'USER_EMAIL_PROVIDER_BLACKLISTED':
                showError(t('inviteAccept.userEmailProviderBlacklisted'));
                break;
              case 'INVALID_PASSWORD':
                showError(t('inviteAccept.invalidPassword'));
                break;
              case 'USER_ALREADY_EXISTS':
                showError(t('inviteAccept.userAlreadyExists'));
                break;
              default:
                throw error;
            }
          } catch (e) {
            // If extractErrorData threw (non-AxiosError), or if we're in default case
            // Re-throw to maintain original behavior
            throw e === error ? error : e;
          }
        },
      },
    );
  };

  return {
    form,
    onSubmit,
    isLoading: acceptInviteMutation.isPending,
  };
}
