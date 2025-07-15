import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/shadcn/card";
import { Button } from "@/shared/ui/shadcn/button";
import { Badge } from "@/shared/ui/shadcn/badge";
import { useTranslation } from "react-i18next";
import type { SubscriptionResponseDto } from "@/shared/api";
import { useConfirmation } from "@/widgets/confirmation-modal";
import useSubscriptionCancel from "../api/useSubscriptionCancel";
import useSubscriptionUncancel from "../api/useSubscriptionUncancel";

interface SubscriptionCancellationSectionProps {
  subscription: SubscriptionResponseDto;
}

export default function SubscriptionCancellationSection({
  subscription,
}: SubscriptionCancellationSectionProps) {
  const { t } = useTranslation("admin-settings-billing");
  const { cancelSubscription } = useSubscriptionCancel();
  const { uncancelSubscription } = useSubscriptionUncancel();
  const { confirm: confirmUncancel } = useConfirmation();
  const { confirm: confirmCancel } = useConfirmation();

  const isCancelled = subscription.cancelledAt != null;

  if (isCancelled) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t("subscription.title")}
            <Badge variant="destructive">{t("subscription.cancelled")}</Badge>
          </CardTitle>
          <CardAction>
            <Button
              size="sm"
              variant="default"
              onClick={() => {
                confirmUncancel({
                  title: t("subscription.reactivateSubscription"),
                  description: t(
                    "subscription.reactivateSubscriptionDescription",
                  ),
                  confirmText: t("subscription.confirmReactivate"),
                  cancelText: t("subscription.cancelCancel"),
                  variant: "default",
                  onConfirm: () => {
                    uncancelSubscription();
                  },
                });
              }}
            >
              {t("subscription.reactivate")}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("subscription.reactivateAnytime")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t("subscription.title")}
          <Badge variant="secondary">{t("subscription.active")}</Badge>
        </CardTitle>
        <CardAction>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              confirmCancel({
                title: t("subscription.cancelSubscription"),
                description: t("subscription.cancelSubscriptionDescription"),
                confirmText: t("subscription.confirmCancel"),
                cancelText: t("subscription.cancelCancel"),
                variant: "destructive",
                onConfirm: () => {
                  cancelSubscription();
                },
              });
            }}
          >
            {t("subscription.cancel")}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t("subscription.nextRenewalDate", {
            date: new Date(subscription.nextRenewalDate).toLocaleDateString(),
          })}
        </p>
      </CardContent>
    </Card>
  );
}
