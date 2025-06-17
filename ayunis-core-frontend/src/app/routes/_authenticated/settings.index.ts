import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/")({
  beforeLoad: async () => {
    throw redirect({ to: "/settings/general" });
  },
});
