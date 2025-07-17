import { createFileRoute } from "@tanstack/react-router";
import InviteAcceptPage from "@/pages/auth/invite-accept";
import { queryOptions } from "@tanstack/react-query";
import {
  getInvitesControllerGetInviteByTokenQueryKey,
  invitesControllerGetInviteByToken,
} from "@/shared/api";

const inviteQueryOptions = (inviteToken: string) =>
  queryOptions({
    queryKey: getInvitesControllerGetInviteByTokenQueryKey(inviteToken),
    queryFn: () => invitesControllerGetInviteByToken(inviteToken),
  });

export const Route = createFileRoute("/(onboarding)/invites/$token/accept")({
  loader: async ({ params: { token }, context: { queryClient } }) => {
    const invite = await queryClient.ensureQueryData(inviteQueryOptions(token));
    return { invite, token };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { invite, token } = Route.useLoaderData();
  return <InviteAcceptPage invite={invite} inviteToken={token} />;
}
