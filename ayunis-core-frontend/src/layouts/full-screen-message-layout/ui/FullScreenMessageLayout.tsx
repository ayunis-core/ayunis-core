interface FullScreenMessageLayoutProps {
  children: React.ReactNode;
}

export default function FullScreenMessageLayout({
  children,
}: FullScreenMessageLayoutProps) {
  return (
    <div className="flex h-full w-full mx-auto items-center justify-center -translate-y-[40px]">
      {children}
    </div>
  );
}
