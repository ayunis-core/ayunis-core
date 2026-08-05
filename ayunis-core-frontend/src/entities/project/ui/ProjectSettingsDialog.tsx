import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/shadcn/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui/shadcn/tabs';
import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import { Textarea } from '@/shared/ui/shadcn/textarea';
import { ProjectAppearancePicker } from './ProjectAppearancePicker';
import { Label } from '@/shared/ui/shadcn/label';
import { Switch } from '@/shared/ui/shadcn/switch';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/shared/ui/shadcn/item';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/shadcn/select';
import { Trash2 } from 'lucide-react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { CURRENT_USER, type MockProject } from '../model/mock';
import { FEATURES } from '../model/iteration';
import {
  removeProject,
  updateProjectDetails,
  updateProjectSettings,
} from '../model/store';

interface ProjectSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: MockProject;
}

export function ProjectSettingsDialog({
  open,
  onOpenChange,
  project,
}: Readonly<ProjectSettingsDialogProps>) {
  const [icon, setIcon] = useState(project.icon);
  const [color, setColor] = useState(project.color);
  const [name, setName] = useState(project.name);
  const [instructions, setInstructions] = useState(project.instructions ?? '');
  const [allowPrivateChats, setAllowPrivateChats] = useState(
    project.allowPrivateChats,
  );
  const [allowContentSharing, setAllowContentSharing] = useState(
    project.allowContentSharing ?? true,
  );
  const [enforceAnonymization, setEnforceAnonymization] = useState(
    project.enforceAnonymization ?? false,
  );
  const [retentionEnabled, setRetentionEnabled] = useState(
    project.autoDeleteDays !== undefined,
  );
  const [retentionDays, setRetentionDays] = useState(
    String(project.autoDeleteDays ?? 30),
  );

  const navigate = useNavigate();
  const location = useLocation();
  const { confirm } = useConfirmation();
  const isOwner = project.ownerId === CURRENT_USER.id;

  function handleSave() {
    updateProjectDetails(project.id, {
      name: name.trim(),
      icon,
      color,
      instructions: instructions.trim() || undefined,
    });
    updateProjectSettings(project.id, {
      allowPrivateChats,
      allowContentSharing,
      enforceAnonymization,
      autoDeleteDays: retentionEnabled ? Number(retentionDays) : undefined,
    });
    onOpenChange(false);
  }

  function handleDelete() {
    confirm({
      title: 'Projekt löschen',
      description: `Möchten Sie das Projekt „${project.name}“ wirklich löschen? Skills und Wissensdatenbanken bleiben erhalten, das Projekt und seine Chats werden entfernt.`,
      confirmText: 'Löschen',
      variant: 'destructive',
      onConfirm: () => {
        removeProject(project.id);
        onOpenChange(false);
        if (location.pathname.startsWith(`/projects/${project.id}`)) {
          void navigate({ to: '/projects' });
        }
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Projekteinstellungen</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">Allgemein</TabsTrigger>
            {FEATURES.settings && (
              <>
                <TabsTrigger value="chats">Chats</TabsTrigger>
                <TabsTrigger value="retention">Datenaufbewahrung</TabsTrigger>
              </>
            )}
          </TabsList>

          <div className="min-h-[300px] py-1">
            <TabsContent value="general" className="mt-4 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="settings-project-name">Name</Label>
                <Input
                  id="settings-project-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="settings-project-instructions">
                  Beschreibung
                </Label>
                <Textarea
                  id="settings-project-instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Beschreiben Sie Ihr Projekt, Ihre Ziele, Ihr Thema usw."
                  rows={3}
                />
              </div>
              <ProjectAppearancePicker
                icon={icon}
                color={color}
                onIconChange={setIcon}
                onColorChange={setColor}
              />
              {isOwner && (
                <Item variant="outline" size="sm">
                  <ItemContent>
                    <ItemTitle>Projekt löschen</ItemTitle>
                    <ItemDescription>
                      Entfernt das Projekt und seine Chats endgültig
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={handleDelete}
                      aria-label="Projekt löschen"
                    >
                      <Trash2 />
                    </Button>
                  </ItemActions>
                </Item>
              )}
            </TabsContent>

            <TabsContent value="chats" className="mt-4 flex flex-col gap-2">
              <SettingRow
                title="Private Chats erlauben"
                description="Mitglieder können eigene Chats in diesem Projekt führen — nur für sie sichtbar"
                checked={allowPrivateChats}
                onCheckedChange={setAllowPrivateChats}
              />
              <SettingRow
                title="Inhalte teilen erlauben"
                description="Mitglieder können Inhalte aus ihren Chats mit dem Projekt teilen — sichtbar für alle Mitglieder"
                checked={allowContentSharing}
                onCheckedChange={setAllowContentSharing}
              />
              <SettingRow
                title="Anonymisierung erzwingen"
                description="Personenbezogene Daten werden in allen Chats dieses Projekts automatisch unkenntlich gemacht"
                checked={enforceAnonymization}
                onCheckedChange={setEnforceAnonymization}
              />
            </TabsContent>

            <TabsContent value="retention" className="mt-4 flex flex-col gap-2">
              <Item variant="outline" size="sm" className="items-start">
                <ItemContent>
                  <ItemTitle>Alte Chats automatisch löschen</ItemTitle>
                  <ItemDescription>
                    Unterhaltungen nach einer Zeit der Inaktivität entfernen
                  </ItemDescription>
                  {retentionEnabled && (
                    <div className="mt-3 flex flex-col gap-2">
                      <Label>Löschen nach</Label>
                      <Select
                        value={retentionDays}
                        onValueChange={setRetentionDays}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">
                            30 Tagen Inaktivität
                          </SelectItem>
                          <SelectItem value="60">
                            60 Tagen Inaktivität
                          </SelectItem>
                          <SelectItem value="90">
                            90 Tagen Inaktivität
                          </SelectItem>
                          <SelectItem value="180">
                            180 Tagen Inaktivität
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Der Chat, seine Nachrichten und darin erstellte
                        Dokumente werden unwiderruflich entfernt —
                        Wissensdatenbanken, Skills und Einstellungen sind nicht
                        betroffen.
                      </p>
                    </div>
                  )}
                </ItemContent>
                <ItemActions>
                  <Switch
                    checked={retentionEnabled}
                    onCheckedChange={setRetentionEnabled}
                    aria-label="Alte Chats automatisch löschen"
                  />
                </ItemActions>
              </Item>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SettingRow({
  title,
  description,
  checked,
  onCheckedChange,
}: Readonly<{
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}>) {
  return (
    <Item variant="outline" size="sm">
      <ItemContent>
        <ItemTitle>{title}</ItemTitle>
        <ItemDescription>{description}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Switch
          checked={checked}
          onCheckedChange={onCheckedChange}
          aria-label={title}
        />
      </ItemActions>
    </Item>
  );
}
