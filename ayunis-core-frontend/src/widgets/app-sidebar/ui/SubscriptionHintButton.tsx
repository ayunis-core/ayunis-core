import { Crown } from "lucide-react";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/shared/ui/shadcn/sidebar";
import { useHasActiveSubscription } from "../api/useHasActiveSubscription";

export function SubscriptionHintButton() {
  const { hasSubscription, isLoading, error } = useHasActiveSubscription();

  if (isLoading || error || hasSubscription) {
    return null;
  }

  return (
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
  );
}
