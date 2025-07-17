import { createFileRoute, redirect } from "@tanstack/react-router";
import z from "zod";
import { userControllerConfirmEmail } from "@/shared/api";
import extractErrorData from "@/shared/api/extract-error-data";

const searchSchema = z.object({
  token: z.string(),
});

export const Route = createFileRoute("/(onboarding)/confirm-email")({
  component: RouteComponent,
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps: { token } }) => {
    try {
      await userControllerConfirmEmail({ token });
      return redirect({ to: "/login", search: { emailVerified: true } });
    } catch (error) {
      console.log(error);
      const { code } = extractErrorData(error);
      switch (code) {
        case "EMAIL_NOT_VERIFIED":
          return redirect({ to: "/email-confirm" });
        default:
          throw error;
      }
    }
  },
});

function RouteComponent() {
  return <div>Hello "/(onboarding)/confirm-email"!</div>;
}
