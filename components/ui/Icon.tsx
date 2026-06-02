import type { ComponentProps } from 'react';

import {
  BadgeCheck,
  Building2,
  Camera,
  Calendar,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  CircleHelp,
  Circle,
  EyeOff,
  ClipboardCheck,
  ClipboardList,
  FileText,
  House,
  List,
  Minus,
  Pencil,
  Plus,
  PlusCircle,
  Settings,
  Star,
  StarOff,
  Trash2,
  TriangleAlert,
  User,
  Video,
  X
} from 'lucide-react-native';

export type IconName =
  | 'house'
  | 'clipboard-check'
  | 'clipboard-list'
  | 'check-check'
  | 'calendar'
  | 'circle-alert'
  | 'help-circle'
  | 'triangle-alert'
  | 'badge-check'
  | 'user'
  | 'file-text'
  | 'plus'
  | 'plus-circle'
  | 'x'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-up'
  | 'chevron-down'
  | 'pencil'
  | 'trash'
  | 'list'
  | 'building'
  | 'camera'
  | 'video'
  | 'settings'
  | 'check'
  | 'minus'
  | 'circle'
  | 'eye-off'
  | 'star'
  | 'star-off';

type Props = {
  name: IconName;
  color?: string;
  size?: number;
  strokeWidth?: number;
  fill?: string;
};

const ICONS: Record<IconName, any> = {
  house: House,
  'clipboard-check': ClipboardCheck,
  'clipboard-list': ClipboardList,
  'check-check': CheckCheck,
  calendar: Calendar,
  'circle-alert': CircleAlert,
  'help-circle': CircleHelp,
  'triangle-alert': TriangleAlert,
  'badge-check': BadgeCheck,
  user: User,
  'file-text': FileText,
  plus: Plus,
  'plus-circle': PlusCircle,
  x: X,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  'chevron-down': ChevronDown,
  pencil: Pencil,
  trash: Trash2,
  list: List,
  building: Building2,
  camera: Camera,
  video: Video,
  settings: Settings,
  check: Check,
  minus: Minus,
  circle: Circle,
  'eye-off': EyeOff,
  star: Star,
  'star-off': StarOff
};

export function Icon({ name, color, size, strokeWidth, fill }: Props) {
  const Cmp = ICONS[name];
  return <Cmp color={color} size={size ?? 20} strokeWidth={strokeWidth ?? 2.25} fill={fill} />;
}

export type NativeIconProps = ComponentProps<typeof Icon>;
