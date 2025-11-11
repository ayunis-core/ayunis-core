import SuperAdminSettingsLayout from "../../super-admin-settings-layout";
import type {
  SuperAdminOrgResponseDto,
  SubscriptionResponseDto,
  UserResponseDto,
} from "@/shared/api";
import UsersTable from "./UsersTable";
import OrgDetails from "./OrgDetails";
import LicenseSeatsSection from "./LicenseSeatsSection";
import BillingInfoSection from "./BillingInfoSection";
import SubscriptionCancellationSection from "./SubscriptionCancellationSection";
import NoSubscriptionSection from "./NoSubscriptionSection";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/shared/ui/shadcn/tabs";
import { useTranslation } from "react-i18next";

interface SuperAdminSettingsOrgPageProps {
  org: SuperAdminOrgResponseDto;
  users: UserResponseDto[];
  subscription: SubscriptionResponseDto | null;
}
export default function SuperAdminSettingsOrgPage({
  org,
  users,
  subscription,
}: SuperAdminSettingsOrgPageProps) {
  const { t } = useTranslation("super-admin-settings-org");

  return (
    <SuperAdminSettingsLayout pageTitle={org.name}>
      <Tabs defaultValue="org" className="w-full">
        <TabsList>
          <TabsTrigger value="org">{t("tabs.org")}</TabsTrigger>
          <TabsTrigger value="users">{t("tabs.users")}</TabsTrigger>
          <TabsTrigger value="subscriptions">
            {t("tabs.subscriptions")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="org" className="mt-4">
          <OrgDetails org={org} />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UsersTable users={users} orgId={org.id} />
        </TabsContent>
        <TabsContent value="subscriptions" className="mt-4">
          {subscription ? (
            <div className="space-y-4">
              <LicenseSeatsSection subscription={subscription} orgId={org.id} />
              <BillingInfoSection subscription={subscription} orgId={org.id} />
              <SubscriptionCancellationSection
                subscription={subscription}
                orgId={org.id}
              />
            </div>
          ) : (
            <NoSubscriptionSection orgId={org.id} />
          )}
        </TabsContent>
      </Tabs>
    </SuperAdminSettingsLayout>
  );
}
