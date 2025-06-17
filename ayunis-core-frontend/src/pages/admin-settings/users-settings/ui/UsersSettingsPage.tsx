import SettingsLayout from "../../admin-settings-layout";
import InviteUserDialog from "./InviteUserDialog";
import InvitesSection from "./InvitesSection";
import UsersSection from "./UsersSection";
import type { Invite } from "../model/openapi";
import type { UserResponseDto } from "@/shared/api/generated/ayunisCoreAPI.schemas";

interface UsersSettingsPageProps {
  invites: Invite[];
  users: UserResponseDto[];
}

export default function UsersSettingsPage({
  invites,
  users,
}: UsersSettingsPageProps) {
  return (
    <SettingsLayout action={<InviteUserDialog />}>
      <div className="space-y-4">
        {invites.length > 0 && <InvitesSection invites={invites} />}
        <UsersSection users={users} />
      </div>
    </SettingsLayout>
  );
}
