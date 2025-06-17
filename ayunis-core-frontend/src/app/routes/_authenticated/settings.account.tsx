import { AccountSettingsPage } from "@/pages/settings/account-settings";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/account")({
  component: RouteComponent,
});

function RouteComponent() {
  return <AccountSettingsPage />;
}
