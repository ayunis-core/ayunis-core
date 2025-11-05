import SettingsLayout from "../../admin-settings-layout";
import { UsageStatsCards } from "./UsageStatsCards";
import { ProviderConsumption } from "@/widgets/provider-consumption-chart";
import { ModelDistribution } from "@/widgets/model-distribution-chart";
import { UserUsageTable } from "@/widgets/user-usage-table";
import { UsageFilters } from "./UsageFilters";
import { useState } from "react";
import { Separator } from "@/shared/ui/shadcn/separator";

export default function UsageSettingsPage() {
  const [dateRange, setDateRange] = useState<{
    startDate?: Date;
    endDate?: Date;
  }>({});
  const [selectedProvider, setSelectedProvider] = useState<string | undefined>();
  const [selectedModel, setSelectedModel] = useState<string | undefined>();

  return (
    <SettingsLayout>
      <div>
        <UsageFilters
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          selectedProvider={selectedProvider}
          onProviderChange={setSelectedProvider}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />

        <Separator className="my-8" />

        <UsageStatsCards
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
        />

        <Separator className="my-8" />

        <div className="space-y-8">
          <ProviderConsumption
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            selectedProvider={selectedProvider}
          />

          <ModelDistribution
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            selectedModel={selectedModel}
          />
        </div>

        <Separator className="my-8" />
        <UserUsageTable
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
        />
      </div>
    </SettingsLayout>
  );
}

