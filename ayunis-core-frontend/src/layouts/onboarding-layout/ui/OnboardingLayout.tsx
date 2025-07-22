import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/shadcn/card";
import brandFullLight from "@/shared/assets/brand/brand-full-light.svg";
import gradientBg from "@/shared/assets/brand/gradient.png";

interface OnboardingLayoutProps {
  children?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  footer?: React.ReactNode;
}

export default function OnboardingLayout({
  children,
  title,
  description,
  footer,
}: OnboardingLayoutProps) {
  return (
    <div className="h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 relative overflow-y-auto">
        <div className="absolute inset-0 h-full flex flex-col gap-4 justify-between px-4">
          <div>
            {/* Brand Logo */}
            <div className="mb-12 mt-24 text-center">
              <img
                src={brandFullLight}
                alt="Ayunis Core"
                className="h-12 mx-auto mb-4"
              />
            </div>

            {/* Form Card */}
            <Card className="border-0 shadow-none max-w-md mx-auto">
              <CardHeader className="space-y-1 px-0">
                <CardTitle className="text-2xl text-center font-semibold">
                  {title}
                </CardTitle>
                {description && (
                  <CardDescription className="text-center text-gray-600">
                    {description}
                  </CardDescription>
                )}
              </CardHeader>
              {children && (
                <CardContent className="px-0">{children}</CardContent>
              )}
              {footer && (
                <CardFooter className="flex items-center justify-center gap-2 text-sm">
                  {footer}
                </CardFooter>
              )}
            </Card>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
            <a
              href="https://www.ayunis.com/impressum"
              target="_blank"
              rel="noopener noreferrer"
            >
              Impressum
            </a>
            <a
              href="https://www.ayunis.com/avv"
              target="_blank"
              rel="noopener noreferrer"
            >
              Datenschutz
            </a>
          </div>
        </div>
      </div>

      {/* Right side - Gradient background with chat mockup */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden p-4">
        <div
          className="h-full w-full rounded-xl"
          style={{
            backgroundImage: `url(${gradientBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        {/* Bottom text */}
        <div className="absolute bottom-8 left-8 right-8">
          <div className="flex justify-center items-center gap-2 text-white/90 text-sm">
            <span>Über 600 Kommunen vertrauen Ayunis bereits.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
