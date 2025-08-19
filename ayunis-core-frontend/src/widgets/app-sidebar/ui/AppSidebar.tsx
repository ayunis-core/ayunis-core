import React from "react";
import {
  User2,
  BookOpen,
  ChevronUp,
  Settings2,
  LogOut,
  Plus,
  Bot,
  GraduationCap,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/shared/ui/shadcn/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/shared/ui/shadcn/dropdown-menu";
import { ChatsSidebarGroup } from "./ChatsSidebarGroup";
import { SubscriptionHintButton } from "./SubscriptionHintButton";
import { useMe } from "../api/useMe";
import { useLogout } from "../api/useLogout";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import useKeyboardShortcut from "@/features/useKeyboardShortcut";
import { useNavigate } from "@tanstack/react-router";
import brandFullLight from "@/shared/assets/brand/brand-full-light.svg";
import brandFullDark from "@/shared/assets/brand/brand-full-dark.svg";
import { useTheme } from "@/features/theme";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { theme } = useTheme();
  const { user, error: userError } = useMe();
  const { logout } = useLogout();
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  useKeyboardShortcut(["j", "Meta"], () => {
    navigate({ to: "/chat" });
  });

  
  const isAuthenticated = user && !userError;

  const items = isAuthenticated ? [
    {
      title: t("sidebar.newChat"),
      url: "/chat",
      icon: Plus,
      shortcut: "⌘J",
    },
    {
      title: t("sidebar.prompts"),
      url: "/prompts",
      icon: BookOpen,
    },
    {
      title: t("sidebar.agents"),
      url: "/agents",
      icon: Bot,
    },
    {
      title: t("sidebar.academy"),
      url: "/academy",
      icon: GraduationCap,
    },
  ] : [
    {
      title: t("sidebar.academy"),
      url: "/academy",
      icon: GraduationCap,
    },
  ];

  return (
    <Sidebar {...props} variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <img
                  src={theme === "dark" ? brandFullDark : brandFullLight}
                  alt="Ayunis Logo"
                  className="w-full max-w-32"
                />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <Link to={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                    {item.shortcut && (
                      <DropdownMenuShortcut>
                        {item.shortcut}
                      </DropdownMenuShortcut>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {isAuthenticated && <SubscriptionHintButton />}

        {isAuthenticated && <ChatsSidebarGroup />}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <User2 className="size-4" />
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{user?.name}</span>
                      <span className="truncate text-xs">{user?.email}</span>
                    </div>
                    <ChevronUp className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="bottom"
                  align="end"
                  sideOffset={4}
                >
                  <Link to="/settings/general">
                    <DropdownMenuItem>
                      <User2 />
                      {t("sidebar.accountSettings")}
                    </DropdownMenuItem>
                  </Link>
                  {user?.role === "admin" && (
                    <Link to="/admin-settings">
                      <DropdownMenuItem>
                        <Settings2 />
                        {t("sidebar.adminSettings")}
                      </DropdownMenuItem>
                    </Link>
                  )}
                  <DropdownMenuItem onClick={logout}>
                    <LogOut />
                    {t("sidebar.signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <SidebarMenuButton size="lg" asChild>
                <Link to="/login">
                  <User2 className="size-4" />
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{t("sidebar.signIn")}</span>
                    <span className="truncate text-xs">{t("sidebar.accessYourAccount")}</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
