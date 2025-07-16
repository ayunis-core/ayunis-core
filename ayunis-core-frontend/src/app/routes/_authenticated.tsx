import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authenticationControllerMe } from "@/shared/api";
import { queryOptions } from "@tanstack/react-query";

const meQueryOptions = () =>
  queryOptions({
    queryKey: ["me"],
    queryFn: () => authenticationControllerMe(),
  });

export const Route = createFileRoute("/_authenticated")({
  component: Outlet,
  beforeLoad: async ({ context, context: { queryClient } }) => {
    try {
      const response = await queryClient.fetchQuery(meQueryOptions());
      if (!response.role) {
        throw new Error("User not found");
      }
      context.user = response;
    } catch (error) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }
  },
});
