import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/shadcn/card";
import { Button } from "@/shared/ui/shadcn/button";
import { ArrowRight, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import CreateSubscriptionDialog from "./CreateSubscriptionDialog";

export default function SubscriptionGetStartedSection() {
  const { t } = useTranslation("admin-settings-billing");
  const features = [
    "Manage your subscription",
    "Manage your seats",
    "Manage your billing",
    "Manage your invoices",
    "Manage your payments",
    "Manage your customers",
  ];

  return (
    <Card className="mt-8 max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{t("subscriptionGetStarted.title")}</CardTitle>
        <CardDescription>
          {t("subscriptionGetStarted.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {features.map((feature) => (
          <div key={feature} className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            {feature}
          </div>
        ))}
      </CardContent>
      <CardFooter className="">
        <CreateSubscriptionDialog
          trigger={
            <Button className="w-full">
              {t("subscriptionGetStarted.getStartedNow")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          }
        />
      </CardFooter>
    </Card>
  );
}
