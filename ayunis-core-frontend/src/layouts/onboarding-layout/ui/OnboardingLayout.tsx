import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/shadcn/card";
import brandFullLight from "@/shared/assets/brand/brand-full-light.svg";
import gradientBg from "@/shared/assets/brand/gradient.png";

interface OnboardingLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: React.ReactNode;
}

export default function OnboardingLayout({
  children,
  title,
  description,
}: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="w-full max-w-md">
          {/* Brand Logo */}
          <div className="mb-8 text-center">
            <img
              src={brandFullLight}
              alt="Ayunis Core"
              className="h-12 mx-auto mb-4"
            />
          </div>

          {/* Form Card */}
          <Card className="border-0 shadow-none">
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
            <CardContent className="px-0">{children}</CardContent>
          </Card>
        </div>
      </div>

      {/* Right side - Gradient background with chat mockup */}
      <div className="flex-1 relative overflow-hidden p-4">
        <div
          className="h-full w-full rounded-xl"
          style={{
            backgroundImage: `url(${gradientBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Chat Interface Mockup */}
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 w-full max-w-md">
              <div className="flex flex-col gap-4 mb-8">
                {/* Chat message mockup */}
                <div className="bg-white/30 backdrop-blur-sm rounded-lg p-4 w-3/4"></div>
                <div className="bg-white/30 backdrop-blur-sm rounded-lg p-4 self-end w-3/4"></div>
                <div className="bg-white/30 backdrop-blur-sm rounded-lg p-4 w-3/4"></div>
              </div>
              <div>
                {/* Chat input mockup */}
                <div className="bg-white/30 backdrop-blur-sm rounded-lg p-3 flex items-center justify-end gap-2">
                  <div className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-white/70"
                    >
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

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
