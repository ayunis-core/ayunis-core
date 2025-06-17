import React from "react";
import {
  User2,
  BookOpen,
  ChevronUp,
  Settings2,
  LogOut,
  Plus,
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
import { useMe } from "../api/useMe";
import { useLogout } from "../api/useLogout";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import useKeyboardShortcut from "@/features/useKeyboardShortcut";
import { useNavigate } from "@tanstack/react-router";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useMe();
  const { logout } = useLogout();
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  useKeyboardShortcut(["j", "Meta"], () => {
    navigate({ to: "/chat" });
  });

  // Menu items.
  const items = [
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
  ];

  return (
    <Sidebar collapsible="icon" {...props} variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <BookOpen className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {t("sidebar.appName")}
                  </span>
                  <span className="truncate text-xs">
                    {t("sidebar.appTagline")}
                  </span>
                </div>
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

        <ChatsSidebarGroup />
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
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
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
