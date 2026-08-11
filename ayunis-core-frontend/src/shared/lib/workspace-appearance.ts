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

/**
 * Administration-themed icon catalogue for workspaces. The key is what the
 * backend stores; labels are translated via the `workspaces` namespace
 * (`appearance.icons.<key>`).
 */
export const WORKSPACE_ICON_OPTIONS = [
  { key: 'folder', icon: FolderOpen },
  { key: 'file', icon: FileText },
  { key: 'files', icon: Files },
  { key: 'filecheck', icon: FileCheck },
  { key: 'clipboard', icon: ClipboardList },
  { key: 'archive', icon: Archive },
  { key: 'inbox', icon: Inbox },
  { key: 'mail', icon: Mail },
  { key: 'stamp', icon: Stamp },
  { key: 'idcard', icon: IdCard },
  { key: 'landmark', icon: Landmark },
  { key: 'building', icon: Building2 },
  { key: 'map', icon: Map },
  { key: 'mappin', icon: MapPin },
  { key: 'users', icon: Users },
  { key: 'usercheck', icon: UserCheck },
  { key: 'handshake', icon: Handshake },
  { key: 'social', icon: HeartHandshake },
  { key: 'baby', icon: Baby },
  { key: 'school', icon: GraduationCap },
  { key: 'library', icon: Library },
  { key: 'book', icon: BookOpen },
  { key: 'scale', icon: Scale },
  { key: 'gavel', icon: Gavel },
  { key: 'shield', icon: ShieldCheck },
  { key: 'lock', icon: Lock },
  { key: 'key', icon: Key },
  { key: 'siren', icon: Siren },
  { key: 'ambulance', icon: Ambulance },
  { key: 'flame', icon: Flame },
  { key: 'package', icon: Package },
  { key: 'store', icon: Store },
  { key: 'briefcase', icon: Briefcase },
  { key: 'truck', icon: Truck },
  { key: 'wrench', icon: Wrench },
  { key: 'hammer', icon: Hammer },
  { key: 'cone', icon: TrafficCone },
  { key: 'bus', icon: Bus },
  { key: 'bike', icon: Bike },
  { key: 'car', icon: Car },
  { key: 'receipt', icon: Receipt },
  { key: 'euro', icon: Euro },
  { key: 'calculator', icon: Calculator },
  { key: 'piggy', icon: PiggyBank },
  { key: 'chart', icon: BarChart3 },
  { key: 'trend', icon: TrendingUp },
  { key: 'calendar', icon: Calendar },
  { key: 'clock', icon: Clock },
  { key: 'recycle', icon: Recycle },
  { key: 'tree', icon: TreeDeciduous },
  { key: 'leaf', icon: Leaf },
  { key: 'droplet', icon: Droplet },
  { key: 'dog', icon: Dog },
  { key: 'palette', icon: Palette },
  { key: 'music', icon: Music },
  { key: 'sport', icon: Dumbbell },
  { key: 'trophy', icon: Trophy },
  { key: 'vote', icon: Vote },
  { key: 'server', icon: Server },
  { key: 'idea', icon: Lightbulb },
  { key: 'megaphone', icon: Megaphone },
  { key: 'presentation', icon: Presentation },
  { key: 'utensils', icon: Utensils },
  { key: 'phone', icon: Phone },
] as const satisfies readonly { key: string; icon: LucideIcon }[];

export type WorkspaceIconKey = (typeof WORKSPACE_ICON_OPTIONS)[number]['key'];

export const WORKSPACE_ICONS = Object.fromEntries(
  WORKSPACE_ICON_OPTIONS.map((option) => [option.key, option.icon]),
) as Record<WorkspaceIconKey, LucideIcon>;

export const DEFAULT_WORKSPACE_ICON: WorkspaceIconKey = 'folder';

export function isWorkspaceIconKey(value: string): value is WorkspaceIconKey {
  // Object.hasOwn, not `in`: the lookup table is a plain object, so `in`
  // would also match prototype keys like 'constructor' or 'toString'.
  return Object.hasOwn(WORKSPACE_ICONS, value);
}

/** Falls back to the default rather than rendering nothing for an unknown key. */
export function resolveWorkspaceIconKey(icon: string): WorkspaceIconKey {
  return isWorkspaceIconKey(icon) ? icon : DEFAULT_WORKSPACE_ICON;
}

export type WorkspaceColorKey =
  'violet' | 'blue' | 'teal' | 'green' | 'amber' | 'rose';

/** Either a palette key or a `#rrggbb` literal from the custom-colour picker. */
export type WorkspaceColor = WorkspaceColorKey | `#${string}`;

export const WORKSPACE_COLOR_ORDER: readonly WorkspaceColorKey[] = [
  'violet',
  'blue',
  'teal',
  'green',
  'amber',
  'rose',
];

export const WORKSPACE_COLOR_TEXTS: Record<WorkspaceColorKey, string> = {
  violet: 'text-violet-600 dark:text-violet-300',
  blue: 'text-blue-600 dark:text-blue-300',
  teal: 'text-teal-600 dark:text-teal-300',
  green: 'text-green-600 dark:text-green-300',
  amber: 'text-amber-600 dark:text-amber-300',
  rose: 'text-rose-600 dark:text-rose-300',
};

export const WORKSPACE_COLOR_TINTS: Record<WorkspaceColorKey, string> = {
  violet:
    'bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300',
  teal: 'bg-teal-50 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300',
  green: 'bg-green-50 text-green-700 dark:bg-green-400/10 dark:text-green-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300',
  rose: 'bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300',
};

export const WORKSPACE_COLOR_SWATCHES: Record<WorkspaceColorKey, string> = {
  violet: 'bg-violet-500',
  blue: 'bg-blue-500',
  teal: 'bg-teal-500',
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
};

export const DEFAULT_CUSTOM_WORKSPACE_COLOR = '#6b5bd6';

export function isCustomWorkspaceColor(
  color: WorkspaceColor,
): color is `#${string}` {
  return color.startsWith('#');
}

export function isWorkspaceColorKey(color: string): color is WorkspaceColorKey {
  return (WORKSPACE_COLOR_ORDER as readonly string[]).includes(color);
}

/** YIQ luminance, so the check mark on a swatch stays readable. */
export function isLightColor(hex: string): boolean {
  const value = hex.replace('#', '');
  if (value.length !== 6) return false;
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  if (Number.isNaN(red + green + blue)) return false;
  return (red * 299 + green * 587 + blue * 114) / 1000 > 150;
}

/**
 * Gives a new workspace a stable colour derived from its name, so the preview
 * is never colourless before the user picks one.
 */
export function defaultWorkspaceColor(name: string): WorkspaceColorKey {
  let hash = 0;
  for (const char of name.trim()) {
    hash = (hash + (char.codePointAt(0) ?? 0)) % 997;
  }
  return WORKSPACE_COLOR_ORDER[hash % WORKSPACE_COLOR_ORDER.length];
}
