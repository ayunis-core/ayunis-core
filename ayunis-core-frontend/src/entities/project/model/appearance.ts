import {
  Ambulance,
  Archive,
  Baby,
  BarChart3,
  Bike,
  BookOpen,
  Briefcase,
  Building2,
  Bus,
  Calculator,
  Calendar,
  Car,
  ClipboardList,
  Clock,
  Dog,
  Droplet,
  Dumbbell,
  Euro,
  FileCheck,
  FileText,
  Files,
  Flame,
  FolderOpen,
  Gavel,
  GraduationCap,
  Hammer,
  Handshake,
  HeartHandshake,
  IdCard,
  Inbox,
  Key,
  Landmark,
  Leaf,
  Library,
  Lightbulb,
  Lock,
  Mail,
  Map,
  MapPin,
  Megaphone,
  Music,
  Package,
  Palette,
  Phone,
  PiggyBank,
  Presentation,
  Receipt,
  Recycle,
  Scale,
  Server,
  ShieldCheck,
  Siren,
  Stamp,
  Store,
  TrafficCone,
  TreeDeciduous,
  TrendingUp,
  Trophy,
  Truck,
  UserCheck,
  Users,
  Utensils,
  Vote,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export const PROJECT_ICON_OPTIONS = [
  {
    key: 'folder',
    icon: FolderOpen,
    label: 'Ordner',
  },
  { key: 'file', icon: FileText, label: 'Dokumente' },
  { key: 'files', icon: Files, label: 'Unterlagen' },
  {
    key: 'filecheck',
    icon: FileCheck,
    label: 'Prüfung',
  },
  {
    key: 'clipboard',
    icon: ClipboardList,
    label: 'Checkliste',
  },
  {
    key: 'archive',
    icon: Archive,
    label: 'Archiv',
  },
  {
    key: 'inbox',
    icon: Inbox,
    label: 'Posteingang',
  },
  { key: 'mail', icon: Mail, label: 'Post' },
  {
    key: 'stamp',
    icon: Stamp,
    label: 'Amtsstempel',
  },
  {
    key: 'idcard',
    icon: IdCard,
    label: 'Ausweise',
  },
  {
    key: 'landmark',
    icon: Landmark,
    label: 'Rathaus',
  },
  {
    key: 'building',
    icon: Building2,
    label: 'Gebäude',
  },
  { key: 'map', icon: Map, label: 'Karte' },
  { key: 'mappin', icon: MapPin, label: 'Standort' },
  {
    key: 'users',
    icon: Users,
    label: 'Personen',
  },
  {
    key: 'usercheck',
    icon: UserCheck,
    label: 'Bürgerbüro',
  },
  {
    key: 'handshake',
    icon: Handshake,
    label: 'Verträge',
  },
  {
    key: 'social',
    icon: HeartHandshake,
    label: 'Soziales',
  },
  {
    key: 'baby',
    icon: Baby,
    label: 'Kinderbetreuung',
  },
  {
    key: 'school',
    icon: GraduationCap,
    label: 'Schule',
  },
  {
    key: 'library',
    icon: Library,
    label: 'Bibliothek',
  },
  {
    key: 'book',
    icon: BookOpen,
    label: 'Satzungen',
  },
  { key: 'scale', icon: Scale, label: 'Recht' },
  {
    key: 'gavel',
    icon: Gavel,
    label: 'Beschlüsse',
  },
  {
    key: 'shield',
    icon: ShieldCheck,
    label: 'Ordnungsamt',
  },
  {
    key: 'lock',
    icon: Lock,
    label: 'Datenschutz',
  },
  { key: 'key', icon: Key, label: 'Zugänge' },
  { key: 'siren', icon: Siren, label: 'Einsatz' },
  {
    key: 'ambulance',
    icon: Ambulance,
    label: 'Rettungsdienst',
  },
  {
    key: 'flame',
    icon: Flame,
    label: 'Feuerwehr',
  },
  {
    key: 'package',
    icon: Package,
    label: 'Beschaffung',
  },
  {
    key: 'store',
    icon: Store,
    label: 'Gewerbe',
  },
  {
    key: 'briefcase',
    icon: Briefcase,
    label: 'Wirtschaft',
  },
  { key: 'truck', icon: Truck, label: 'Fuhrpark' },
  {
    key: 'wrench',
    icon: Wrench,
    label: 'Bauhof',
  },
  { key: 'hammer', icon: Hammer, label: 'Bau' },
  {
    key: 'cone',
    icon: TrafficCone,
    label: 'Baustelle',
  },
  { key: 'bus', icon: Bus, label: 'Nahverkehr' },
  { key: 'bike', icon: Bike, label: 'Radverkehr' },
  {
    key: 'car',
    icon: Car,
    label: 'Kfz-Zulassung',
  },
  {
    key: 'receipt',
    icon: Receipt,
    label: 'Abrechnung',
  },
  { key: 'euro', icon: Euro, label: 'Finanzen' },
  {
    key: 'calculator',
    icon: Calculator,
    label: 'Kalkulation',
  },
  {
    key: 'piggy',
    icon: PiggyBank,
    label: 'Haushalt',
  },
  {
    key: 'chart',
    icon: BarChart3,
    label: 'Auswertung',
  },
  {
    key: 'trend',
    icon: TrendingUp,
    label: 'Entwicklung',
  },
  {
    key: 'calendar',
    icon: Calendar,
    label: 'Termine',
  },
  { key: 'clock', icon: Clock, label: 'Fristen' },
  {
    key: 'recycle',
    icon: Recycle,
    label: 'Abfall',
  },
  {
    key: 'tree',
    icon: TreeDeciduous,
    label: 'Grünflächen',
  },
  { key: 'leaf', icon: Leaf, label: 'Umwelt' },
  { key: 'droplet', icon: Droplet, label: 'Wasser' },
  { key: 'dog', icon: Dog, label: 'Hundesteuer' },
  { key: 'palette', icon: Palette, label: 'Kultur' },
  {
    key: 'music',
    icon: Music,
    label: 'Veranstaltung',
  },
  { key: 'sport', icon: Dumbbell, label: 'Sport' },
  {
    key: 'trophy',
    icon: Trophy,
    label: 'Wettbewerb',
  },
  { key: 'vote', icon: Vote, label: 'Wahlen' },
  {
    key: 'server',
    icon: Server,
    label: 'IT',
  },
  { key: 'idea', icon: Lightbulb, label: 'Idee' },
  {
    key: 'megaphone',
    icon: Megaphone,
    label: 'Öffentlichkeit',
  },
  {
    key: 'presentation',
    icon: Presentation,
    label: 'Sitzung',
  },
  {
    key: 'utensils',
    icon: Utensils,
    label: 'Gastronomie',
  },
  { key: 'phone', icon: Phone, label: 'Bürgertelefon' },
] as const satisfies readonly {
  key: string;
  icon: LucideIcon;
  label: string;
}[];

export type ProjectIconKey = (typeof PROJECT_ICON_OPTIONS)[number]['key'];

export const PROJECT_ICONS = Object.fromEntries(
  PROJECT_ICON_OPTIONS.map((option) => [option.key, option.icon]),
) as Record<ProjectIconKey, LucideIcon>;

export type ProjectColorKey =
  'violet' | 'blue' | 'teal' | 'green' | 'amber' | 'rose';

export type ProjectColor = ProjectColorKey | `#${string}`;

export const PROJECT_COLOR_ORDER: ProjectColorKey[] = [
  'violet',
  'blue',
  'teal',
  'green',
  'amber',
  'rose',
];

export const PROJECT_COLOR_LABELS: Record<ProjectColorKey, string> = {
  violet: 'Violett',
  blue: 'Blau',
  teal: 'Türkis',
  green: 'Grün',
  amber: 'Bernstein',
  rose: 'Rosé',
};

export const PROJECT_COLOR_TEXTS: Record<ProjectColorKey, string> = {
  violet: 'text-violet-600 dark:text-violet-300',
  blue: 'text-blue-600 dark:text-blue-300',
  teal: 'text-teal-600 dark:text-teal-300',
  green: 'text-green-600 dark:text-green-300',
  amber: 'text-amber-600 dark:text-amber-300',
  rose: 'text-rose-600 dark:text-rose-300',
};

export const PROJECT_COLOR_TINTS: Record<ProjectColorKey, string> = {
  violet:
    'bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300',
  teal: 'bg-teal-50 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300',
  green: 'bg-green-50 text-green-700 dark:bg-green-400/10 dark:text-green-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300',
  rose: 'bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300',
};

export const PROJECT_COLOR_SWATCHES: Record<ProjectColorKey, string> = {
  violet: 'bg-violet-500',
  blue: 'bg-blue-500',
  teal: 'bg-teal-500',
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
};

export const DEFAULT_CUSTOM_COLOR = '#6b5bd6';

export function isCustomColor(color: ProjectColor): color is `#${string}` {
  return color.startsWith('#');
}

export function isLightColor(hex: string): boolean {
  const value = hex.replace('#', '');
  if (value.length !== 6) return false;
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 > 150;
}

export function defaultProjectColor(name: string): ProjectColorKey {
  let hash = 0;
  for (const char of name.trim()) {
    hash = (hash + char.codePointAt(0)!) % 997;
  }
  return PROJECT_COLOR_ORDER[hash % PROJECT_COLOR_ORDER.length];
}
