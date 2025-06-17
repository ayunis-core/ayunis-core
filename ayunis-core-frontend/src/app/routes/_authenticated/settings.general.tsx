import { createFileRoute } from "@tanstack/react-router";
import { GeneralSettingsPage } from "@/pages/settings/general-settings";

export const Route = createFileRoute("/_authenticated/settings/general")({
  component: RouteComponent,
});

function RouteComponent() {
  return <GeneralSettingsPage />;
}
