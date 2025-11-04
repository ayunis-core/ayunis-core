import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/shadcn/button";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";
import { Plus, AlertCircle } from "lucide-react";
import { IntegrationsList } from "./integrations-list";
import { CreatePredefinedDialog } from "./create-predefined-dialog";
import { CreateCustomDialog } from "./create-custom-dialog";
import { EditIntegrationDialog } from "./edit-integration-dialog";
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog";
import { useMe } from "@/widgets/app-sidebar/api/useMe";
import SettingsLayout from "../../admin-settings-layout";
import { useMcpIntegrationsQueries } from "../api/useMcpIntegrationsQueries";
import type { McpIntegration } from "../model/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/shadcn/dropdown-menu";

export function McpIntegrationsPage({ isCloud }: { isCloud: boolean }) {
  const { t } = useTranslation("admin-settings-integrations");
  const { user } = useMe();
  const isAdmin = user?.role === "admin";

  // Dialog states
  const [createPredefinedOpen, setCreatePredefinedOpen] = useState(false);
  const [createCustomOpen, setCreateCustomOpen] = useState(false);
  const [editIntegration, setEditIntegration] = useState<McpIntegration | null>(
    null,
  );
  const [deleteIntegration, setDeleteIntegration] =
    useState<McpIntegration | null>(null);

  // Queries
  const {
    integrations,
    isLoadingIntegrations,
    integrationsError,
    refetchIntegrations,
    predefinedConfigs,
  } = useMcpIntegrationsQueries();

  // Authorization check
  if (!isAdmin) {
    return (
      <SettingsLayout>
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <AlertCircle className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <h2 className="mb-2 text-2xl font-bold">
              {t("integrations.page.accessDenied")}
            </h2>
            <p className="text-muted-foreground">
              {t("integrations.page.accessDeniedMessage")}
            </p>
          </div>
        </div>
      </SettingsLayout>
    );
  }

  // Loading state
  if (isLoadingIntegrations) {
    return (
      <SettingsLayout>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </div>
      </SettingsLayout>
    );
  }

  // Error state
  if (integrationsError) {
    return (
      <SettingsLayout>
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-600" />
            <h2 className="mb-2 text-2xl font-bold">
              {t("integrations.page.errorLoadingTitle")}
            </h2>
            <p className="mb-4 text-muted-foreground">
              {(integrationsError as any)?.message ||
                t("integrations.page.errorLoadingMessage")}
            </p>
            <Button onClick={() => refetchIntegrations()}>
              {t("integrations.page.retry")}
            </Button>
          </div>
        </div>
      </SettingsLayout>
    );
  }

  const headerActions = (
    <div className="flex gap-2">
      {isCloud ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCreateCustomOpen(true)}
        >
          <Plus className="h-4 w-4" />
          {t("integrations.page.add")}
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              {t("integrations.page.add")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setCreatePredefinedOpen(true)}>
              {t("integrations.page.addPredefined")}
            </DropdownMenuItem>
            {!isCloud && (
              <DropdownMenuItem onClick={() => setCreateCustomOpen(true)}>
                {t("integrations.page.addCustom")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

  return (
    <SettingsLayout action={headerActions}>
      <div className="space-y-4">
        <IntegrationsList
          integrations={integrations}
          onEdit={setEditIntegration}
          onDelete={setDeleteIntegration}
          isAdmin={isAdmin}
        />

        <CreatePredefinedDialog
          open={createPredefinedOpen}
          onOpenChange={setCreatePredefinedOpen}
          predefinedConfigs={predefinedConfigs}
          isCloud={isCloud}
        />

        <CreateCustomDialog
          open={createCustomOpen}
          onOpenChange={setCreateCustomOpen}
        />

        <EditIntegrationDialog
          integration={editIntegration}
          open={!!editIntegration}
          onOpenChange={(open) => !open && setEditIntegration(null)}
        />

        <DeleteConfirmationDialog
          integration={deleteIntegration}
          open={!!deleteIntegration}
          onOpenChange={(open) => !open && setDeleteIntegration(null)}
        />
      </div>
    </SettingsLayout>
  );
}
