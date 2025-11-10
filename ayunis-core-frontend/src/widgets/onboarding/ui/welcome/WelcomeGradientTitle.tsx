// Utils
import React from "react";
import { cn } from "@/shared/lib/shadcn/utils";

interface OnboardingGradientTitleProps {
  children: React.ReactNode;
  className?: string;
}

export default function OnboardingGradientTitle({ children, className }: OnboardingGradientTitleProps) {
  return (
    <h3
      className={cn("text-2xl font-semibold gap-3 bg-gradient-to-r from-[#550FBB] to-[#B87FFD] bg-clip-text text-transparent", className)}
    >
      {children}
    </h3>
  );
}


