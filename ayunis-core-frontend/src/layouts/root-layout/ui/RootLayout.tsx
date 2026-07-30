import { runtimeEnv } from '@/shared/config/runtime-env';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const plausibleDomain = runtimeEnv('VITE_PLAUSIBLE_DOMAIN');
  const plausibleSrc = runtimeEnv('VITE_PLAUSIBLE_SRC');

  return (
    <>
      {plausibleDomain && plausibleSrc && (
        <script async src={plausibleSrc} data-domain={plausibleDomain}></script>
      )}
      {children}
    </>
  );
}
