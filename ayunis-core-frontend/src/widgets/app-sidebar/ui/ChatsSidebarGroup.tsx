import {
  MoreHorizontal,
  MessageCircle,
  Loader2,
  AlertCircle,
  Trash,
  ChevronDown,
} from "lucide-react";
import { Link, useParams, useNavigate } from "@tanstack/react-router";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
  SidebarGroupContent,
} from "@/shared/ui/shadcn/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/shadcn/dropdown-menu";
import { useThreads } from "../api";
import { useDeleteThread } from "@/features/useDeleteThread";
import { Button } from "@/shared/ui/shadcn/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/ui/shadcn/collapsible";
import { useTranslation } from "node_modules/react-i18next";
import { useConfirmation } from "@/widgets/confirmation-modal";

export function ChatsSidebarGroup() {
  const { t } = useTranslation("common");
  const { threads, isLoading, error } = useThreads();
  const { confirm } = useConfirmation();
  const { deleteChat } = useDeleteThread({
    onSuccess: () => {
      console.log("Chat deleted");
    },
    onError: (error) => {
      console.error("Error deleting chat", error);
    },
  });
  const params = useParams({ strict: false });
  const navigate = useNavigate();

  const handleDeleteClick = (threadId: string) => {
    confirm({
      title: t("sidebar.deleteChatTitle"),
      description: t("sidebar.deleteChatDescription"),
      confirmText: t("sidebar.deleteChatConfirm"),
      cancelText: t("sidebar.deleteChatCancel"),
      variant: "destructive",
      onConfirm: () => {
        // Check if the user is currently viewing the chat being deleted
        const currentThreadId = params.threadId;
        const isCurrentChat = currentThreadId === threadId;

        deleteChat(threadId);

        // If the user is on the chat being deleted, redirect to /chat
        if (isCurrentChat) {
          navigate({ to: "/chat" });
        }
      },
    });
  };

  if (isLoading) {
    return (
      <Collapsible defaultOpen className="group/collapsible">
        <SidebarGroup>
          <SidebarGroupLabel asChild>
            <CollapsibleTrigger>
              {t("sidebar.chats")}{" "}
              <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
            </CollapsibleTrigger>
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton className="text-sidebar-foreground/70">
                    <Loader2 className="size-4 animate-spin" />
                    <span>{t("sidebar.loadingChats")}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    );
  }

  if (error) {
    return (
      <Collapsible defaultOpen className="group/collapsible">
        <SidebarGroup>
          <SidebarGroupLabel asChild>
            <CollapsibleTrigger>
              {t("sidebar.chats")}{" "}
              <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
            </CollapsibleTrigger>
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton className="text-sidebar-foreground/70">
                    <AlertCircle className="text-destructive" />
                    <span>{t("sidebar.failedToLoadChats")}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    );
  }

  if (threads.length === 0) {
    return (
      <Collapsible defaultOpen className="group/collapsible">
        <SidebarGroup>
          <SidebarGroupLabel asChild>
            <CollapsibleTrigger>
              {t("sidebar.chats")}{" "}
              <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
            </CollapsibleTrigger>
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarGroupContent>
              <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-6">
                <div className="text-center space-y-2">
                  <div className="text-sm text-foreground">
                    {t("sidebar.emptyChatsTitle")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("sidebar.emptyChatsDescription")}
                  </div>
                  <Button
                    className="mt-2"
                    onClick={() => navigate({ to: "/chat" })}
                  >
                    {t("sidebar.newChat")}
                  </Button>
                </div>
              </div>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    );
  }

  return (
    <Collapsible defaultOpen className="group/collapsible">
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger>
            {t("sidebar.chats")}{" "}
            <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {threads
                .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
                .map((thread) => (
                  <SidebarMenuItem key={thread.id}>
                    <SidebarMenuButton asChild>
                      <Link
                        to={"/chats/$threadId"}
                        params={{ threadId: thread.id }}
                      >
                        <MessageCircle />
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate">
                            {thread.title || t("sidebar.untitled")}
                          </span>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuAction showOnHover>
                          <MoreHorizontal />
                          <span className="sr-only">{t("sidebar.more")}</span>
                        </SidebarMenuAction>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className="w-48 rounded-lg"
                        side="bottom"
                        align="end"
                      >
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(thread.id)}
                        >
                          <Trash className="text-destructive" />
                          <span>{t("sidebar.deleteChat")}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
