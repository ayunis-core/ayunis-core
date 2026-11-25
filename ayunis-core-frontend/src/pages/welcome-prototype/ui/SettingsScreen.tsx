import { useState } from 'react';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { Switch } from '@ayunis/ui/components/switch';
import { ScreenShell } from './ScreenShell';

export interface OrgSettings {
  internet: boolean;
  personalContext: boolean;
}

const ROWS: ReadonlyArray<{
  key: keyof OrgSettings;
  title: string;
  description: string;
}> = [
  {
    key: 'internet',
    title: 'Im Internet recherchieren',
    description: 'Für aktuelle Informationen, zum Beispiel neue Vorschriften.',
  },
  {
    key: 'personalContext',
    title: 'Persönlichen Kontext nutzen',
    description:
      'Antworten berücksichtigen Funktion und Aufgaben der Mitarbeitenden.',
  },
];

export function SettingsScreen({
  onDone,
  onBack,
}: Readonly<{
  onDone: (settings: OrgSettings) => void;
  onBack: () => void;
}>) {
  const [settings, setSettings] = useState<OrgSettings>({
    internet: true,
    personalContext: true,
  });

  return (
    <ScreenShell
      title="Was darf Ayunis Core?"
      hint="Sie können das jederzeit in den Einstellungen ändern."
      onNext={() => onDone(settings)}
      onBack={onBack}
    >
      <div className="flex w-[34rem] max-w-full flex-col gap-2">
        {ROWS.map((row) => (
          <Item
            key={row.key}
            variant="outline"
            className="bg-background text-left"
            asChild
          >
            <label className="cursor-pointer">
              <ItemContent>
                <ItemTitle>{row.title}</ItemTitle>
                <ItemDescription>{row.description}</ItemDescription>
              </ItemContent>
              <ItemActions>
                <Switch
                  checked={settings[row.key]}
                  onCheckedChange={(checked) =>
                    setSettings((current) => ({
                      ...current,
                      [row.key]: checked,
                    }))
                  }
                />
              </ItemActions>
            </label>
          </Item>
        ))}
      </div>
    </ScreenShell>
  );
}
