import { createPortal } from 'react-dom';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { SampleControls } from './SampleControls';
import { Button } from '@ayunis/ui/components/button';
import { Tabs, TabsList, TabsTrigger } from '@ayunis/ui/components/tabs';
import { Switch } from '@ayunis/ui/components/switch';
import { Label } from '@ayunis/ui/components/label';
import {
  HOME_VARIANTS,
  INBOX_VARIANTS,
  SIDEBAR_VARIANTS,
  useHomeVariantSetting,
  useInboxVariant,
  useSampleDataSetting,
  useSidebarVariant,
  useSwitcherOpen,
  type HomeVariant,
  type InboxVariant,
  type SidebarVariant,
} from '@/shared/lib/prototype-settings';

function Row<T extends string>({
  label,
  value,
  options,
  onChange,
}: Readonly<{
  label: string;
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (value: T) => void;
}>) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 text-xs text-muted-foreground">
        {label}
      </span>
      <Tabs value={value} onValueChange={(next) => onChange(next as T)}>
        <TabsList className="max-w-[calc(100vw-10rem)]">
          {options.map((option) => (
            <TabsTrigger key={option.id} value={option.id}>
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}

export function PrototypeSwitcherToggle() {
  const [isOpen, setOpen] = useSwitcherOpen();
  return (
    <Button
      variant="outline"
      size="sm"
      aria-pressed={isOpen}
      onClick={() => setOpen(!isOpen)}
    >
      <SlidersHorizontal />
      Varianten
    </Button>
  );
}

export function PrototypeSwitcher() {
  const [isOpen, setOpen] = useSwitcherOpen();
  const [variant, setVariant] = useHomeVariantSetting();
  const [useSampleData, setUseSampleData] = useSampleDataSetting();
  const [sidebarVariant, setSidebarVariant] = useSidebarVariant();
  const [inboxVariant, setInboxVariant] = useInboxVariant();

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-1.5 rounded-xl border bg-background/90 p-2 shadow-lg backdrop-blur">
      <Row<HomeVariant>
        label="Startseite"
        value={variant}
        options={HOME_VARIANTS}
        onChange={setVariant}
      />
      <Row<SidebarVariant>
        label="Seitenleiste"
        value={sidebarVariant}
        options={SIDEBAR_VARIANTS}
        onChange={setSidebarVariant}
      />
      <Row<InboxVariant>
        label="Posteingang"
        value={inboxVariant}
        options={INBOX_VARIANTS}
        onChange={setInboxVariant}
      />
      {useSampleData && <SampleControls />}
      <div className="flex items-center justify-between gap-2 pl-26">
        <div className="flex items-center gap-2">
          <Switch
            id="home-sample-data"
            checked={useSampleData}
            onCheckedChange={setUseSampleData}
          />
          <Label htmlFor="home-sample-data" className="text-xs">
            Beispieldaten
          </Label>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground"
          onClick={() => setOpen(false)}
        >
          Schließen
          <ChevronDown />
        </Button>
      </div>
    </div>,
    document.body,
  );
}
