import SuperAdminSettingsLayout from "../../super-admin-settings-layout";
import CreateOrgDialog from "./CreateOrgDialog";
import OrgsTable from "./OrgsTable";
import type { SuperAdminOrgResponseDto } from "@/shared/api";

export default function SuperAdminOrgsPage({
  orgs,
}: {
  orgs: SuperAdminOrgResponseDto[];
}) {
  return (
    <SuperAdminSettingsLayout action={<CreateOrgDialog />}>
      <div className="space-y-4">
        <OrgsTable orgs={orgs} />
      </div>
    </SuperAdminSettingsLayout>
  );
}
