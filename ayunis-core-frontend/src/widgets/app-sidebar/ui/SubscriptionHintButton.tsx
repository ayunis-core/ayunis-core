import { Check, Crown } from "lucide-react";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/shared/ui/shadcn/sidebar";
import { useHasActiveSubscription } from "../api/useHasActiveSubscription";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/shadcn/dialog";
import { Button } from "@/shared/ui/shadcn/button";

export function SubscriptionHintButton() {
  const { hasSubscription, isLoading, error } = useHasActiveSubscription();

  if (isLoading || error || hasSubscription) {
    return null;
  }

  const benefits = [
    "Unlimited users",
    "Unlimited chats",
    "Unlimited messages",
    "All future features",
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="bg-gradient-to-r from-[#62589F] to-[#A7A0CA] text-white hover:text-white active:text-white"
                onClick={() => {
                  // TODO: Implement subscription navigation
                  console.log("Navigate to subscription page");
                }}
              >
                <Crown className="size-4" />
                <span className="font-medium">Upgrade to Pro</span>
                <div className="ml-auto bg-white/20 text-xs px-2 py-1 rounded-full">
                  New
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upgrade to Pro</DialogTitle>
          <DialogDescription>
            You need to upgrade to a paid plan to use this feature.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {benefits.map((benefit) => (
            <div className="flex gap-2 items-center">
              <Check className="size-4" />
              {benefit}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button>Upgrade to Pro</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
