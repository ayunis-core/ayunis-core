import { createFileRoute } from "@tanstack/react-router";
import { AcademyPage } from "@/pages/academy";

export const Route = createFileRoute("/(onboarding)/academy/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <AcademyPage />;
}
