import { createFileRoute, redirect } from "@tanstack/react-router";
import { authenticationControllerMe } from "@/shared/api";

export const Route = createFileRoute("/_authenticated/admin-settings/")({
  beforeLoad: async () => {
    const user = await authenticationControllerMe();
    const isAdmin = user?.role === "admin";
    if (!isAdmin) {
      throw redirect({ to: "/" });
    }
    throw redirect({ to: "/admin-settings/users" });
  },
});
