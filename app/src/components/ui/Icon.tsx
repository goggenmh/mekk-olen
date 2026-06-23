import {
  LayoutDashboard, Users, CalendarDays, Clock, ListChecks, Package,
  FileText, BarChart3, Settings, CalendarPlus, PackagePlus,
  DoorOpen, DoorClosed, Bell, Sun, Moon, User, Phone, Mail,
  Paperclip, LifeBuoy, ClipboardList, PenLine, FolderOpen, TimerReset, Menu,
  Smartphone, Monitor, MonitorSmartphone,
  type LucideProps,
} from 'lucide-react';
import type { ComponentType } from 'react';

const MAP: Record<string, ComponentType<LucideProps>> = {
  // hovudmeny
  dashbord: LayoutDashboard,
  ansatte: Users,
  vaktplan: CalendarDays,
  timeliste: Clock,
  oppgaver: ListChecks,
  bestilling: Package,
  dokument: FileText,
  rapporter: BarChart3,
  innstillinger: Settings,
  // hurtighandlingar
  'ny-timer': TimerReset,
  'ny-vakt': CalendarPlus,
  'ny-oppgave': ListChecks,
  'ny-bestilling': PackagePlus,
  // diverse
  open: DoorOpen,
  close: DoorClosed,
  bell: Bell,
  sun: Sun,
  moon: Moon,
  user: User,
  phone: Phone,
  mail: Mail,
  paperclip: Paperclip,
  check: ListChecks,
  menu: Menu,
  mobile: Smartphone,
  desktop: Monitor,
  auto: MonitorSmartphone,
  // dokumentkategoriar
  HMS: LifeBuoy,
  Rutine: ClipboardList,
  Avtale: PenLine,
  Skjema: FolderOpen,
  Anna: FileText,
};

export function Icon({ name, size = 18, ...rest }: { name: string; size?: number } & Omit<LucideProps, 'ref'>) {
  const Cmp = MAP[name] ?? FileText;
  return <Cmp size={size} strokeWidth={2} absoluteStrokeWidth {...rest} />;
}
