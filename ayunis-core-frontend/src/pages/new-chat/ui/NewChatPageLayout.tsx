import AppLayout from "@/layouts/app-layout";
import { cn } from "@/shared/lib/shadcn/utils";

interface NewChatPageLayoutProps {
  header: React.ReactNode;
  children: React.ReactNode;
  trialLimitBanner?: React.ReactNode;
}

export default function NewChatPageLayout({
  trialLimitBanner,
  header,
  children,
}: NewChatPageLayoutProps) {
  const hasBanner = !!trialLimitBanner;

  return (
    <AppLayout>
      <div className="w-full h-full flex flex-col items-center justify-center">
        <div className="flex-shrink-0 sticky top-0 z-10 bg-background w-full">
          {header}
        </div>
        <div className={cn("w-full max-w-[800px] mx-auto my-auto flex flex-col gap-4", hasBanner ? "-translate-y-0" : "-translate-y-[30%]")}>
          {children}
          {trialLimitBanner}
        </div>
      </div>
    </AppLayout>
  );
}
