import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { Card } from '@ayunis/ui/components/card';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { Separator } from '@ayunis/ui/components/separator';
import { Tabs, TabsList, TabsTrigger } from '@ayunis/ui/components/tabs';
import { ScreenShell } from './ScreenShell';

function ChoiceRow({
  label,
  value,
  options,
  onChange,
}: Readonly<{
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}>) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Tabs value={value} onValueChange={onChange}>
        <TabsList>
          {options.map((option) => (
            <TabsTrigger key={option} value={option}>
              {option}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}

export function RoutineScreen({
  onDone,
  onBack,
}: Readonly<{ onDone: () => void; onBack: () => void }>) {
  const [frequency, setFrequency] = useState('Wöchentlich');
  const [day, setDay] = useState('Mo');
  const [time, setTime] = useState('8:00');

  return (
    <ScreenShell
      title="Routinen arbeiten nach Zeitplan."
      hint="Ayunis Core erledigt die Aufgabe regelmäßig und meldet Relevantes in Ihren Posteingang. Diese passt zu Ihren Aufgaben:"
      nextLabel="Routine einrichten"
      secondary={{ label: 'Überspringen', onClick: onDone }}
      onNext={onDone}
      onBack={onBack}
    >
      <Card className="bg-background w-[36rem] max-w-full gap-0 py-0 text-left">
        <Item className="px-5 py-4">
          <ItemMedia variant="icon">
            <CalendarClock />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Überblick neuer Bürgeranfragen</ItemTitle>
            <ItemDescription>
              Fasst die Anfragen zusammen und markiert dringende.
            </ItemDescription>
          </ItemContent>
        </Item>
        <Separator />
        <ChoiceRow
          label="Wie oft"
          value={frequency}
          options={['Täglich', 'Wöchentlich', 'Monatlich']}
          onChange={setFrequency}
        />
        {frequency === 'Wöchentlich' && (
          <ChoiceRow
            label="Tag"
            value={day}
            options={['Mo', 'Di', 'Mi', 'Do', 'Fr']}
            onChange={setDay}
          />
        )}
        <ChoiceRow
          label="Uhrzeit"
          value={time}
          options={['7:00', '8:00', '9:00']}
          onChange={setTime}
        />
        <Separator />
        <div className="text-muted-foreground flex justify-between px-5 py-3 text-sm">
          <span>Ergebnis</span>
          <span className="text-foreground">Im Posteingang</span>
        </div>
      </Card>
    </ScreenShell>
  );
}
