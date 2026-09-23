import {
  AlarmClock,
  Award,
  Ban,
  Bike,
  BookOpen,
  Brain,
  Briefcase,
  Coffee,
  Compass,
  Dumbbell,
  Flag,
  Flame,
  FolderKanban,
  Footprints,
  Gem,
  GlassWater,
  GraduationCap,
  HeartPulse,
  Layers,
  Leaf,
  Moon,
  Music,
  Palette,
  Pill,
  Rocket,
  Salad,
  Shield,
  Smartphone,
  Sparkles,
  Star,
  Sun,
  Target,
  Timer,
  Trophy,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react'

/**
 * Central icon registry. Habits, attributes and achievements store an icon
 * *key* (string) rather than a component, so it round-trips through Dexie.
 * Unknown/legacy keys (e.g. emoji saved before this registry existed) are
 * handled by the <Icon> component itself, not here.
 */
export const ICON_REGISTRY = {
  target: Target,
  flame: Flame,
  droplet: GlassWater,
  book: BookOpen,
  dumbbell: Dumbbell,
  run: Footprints,
  bike: Bike,
  moon: Moon,
  sun: Sun,
  pill: Pill,
  salad: Salad,
  coffee: Coffee,
  brain: Brain,
  heart: HeartPulse,
  ban: Ban,
  smartphone: Smartphone,
  music: Music,
  palette: Palette,
  leaf: Leaf,
  briefcase: Briefcase,
  graduation: GraduationCap,
  wallet: Wallet,
  timer: Timer,
  alarm: AlarmClock,
  zap: Zap,
  sparkles: Sparkles,
  star: Star,
  trophy: Trophy,
  shield: Shield,
  gem: Gem,
  award: Award,
  compass: Compass,
  flag: Flag,
  folder: FolderKanban,
  rocket: Rocket,
  layers: Layers,
} as const satisfies Record<string, LucideIcon>

export type IconKey = keyof typeof ICON_REGISTRY

export const HABIT_ICON_KEYS: IconKey[] = [
  'target',
  'droplet',
  'book',
  'dumbbell',
  'run',
  'bike',
  'moon',
  'sun',
  'pill',
  'salad',
  'coffee',
  'brain',
  'heart',
  'ban',
  'smartphone',
  'music',
  'palette',
  'leaf',
  'briefcase',
  'graduation',
  'wallet',
]

export const ATTRIBUTE_ICON_KEYS: IconKey[] = [
  'heart',
  'brain',
  'dumbbell',
  'briefcase',
  'wallet',
  'palette',
  'leaf',
  'star',
]

export const PROJECT_ICON_KEYS: IconKey[] = [
  'folder',
  'rocket',
  'layers',
  'briefcase',
  'target',
  'flag',
  'compass',
  'graduation',
  'palette',
  'wallet',
  'trophy',
  'gem',
]

export const DEFAULT_ICON_KEY: IconKey = 'target'
export const DEFAULT_PROJECT_ICON_KEY: IconKey = 'folder'

export function resolveIcon(key: string): LucideIcon | null {
  return (ICON_REGISTRY as Record<string, LucideIcon>)[key] ?? null
}
