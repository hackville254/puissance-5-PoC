export type Role = 'agent' | 'controller' | 'ops' | 'client';

export type ThemeMode = 'system' | 'light' | 'dark';

export type ControlType = 'quality' | 'beforeAfter';

export type ControlStatus = 'planned' | 'inProgress' | 'done';

export type Severity = 'critique' | 'majeure' | 'mineure';

export type IncidentStatus = 'ouvert' | 'en_cours' | 'clos';

export type ISODateTime = string;

export type ISODate = string;

export interface Site {
  id: string;
  name: string;
  address: string;
  city: string;
  tags: string[];
  lat: number;
  lng: number;
  geofenceRadiusM: number;
}

export interface ChecklistItem {
  id: string;
  label: string;
  critical?: boolean;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  items: ChecklistItem[];
}

export interface PlannedControl {
  id: string;
  siteId: string;
  date: ISODate;
  startTime: string;
  endTime: string;
  type: ControlType;
  status: ControlStatus;
  assigneeName: string;
}

export interface InspectionPhoto {
  id: string;
  kind: 'before' | 'after';
  uri: string;
  capturedAt: ISODateTime;
  lat?: number;
  lng?: number;
  distanceMeters?: number;
  fileHash?: string;
  signature?: string;
  certified: boolean;
}

export interface IncidentPhoto {
  id: string;
  uri: string;
  capturedAt: ISODateTime;
  lat?: number;
  lng?: number;
  fileHash?: string;
  signature?: string;
  certified: boolean;
}

export interface Inspection {
  id: string;
  plannedControlId: string;
  templateId: string;
  createdAt: ISODateTime;
  completedAt?: ISODateTime;
  evaluatorName: string;
  evaluatedAgentName: string;
  checklist: Record<string, boolean>;
  rating: number;
  notes: string;
  photos: InspectionPhoto[];
  certifications: {
    gpsVerified: boolean;
    timeStamped: boolean;
    qrScanned: boolean;
    networkVerified: boolean;
    photoCertified: boolean;
    lastDistanceMeters?: number;
    lastNetworkType?: string;
    lastQrValue?: string;
  };
}

export interface Incident {
  id: string;
  siteId: string;
  createdAt: ISODateTime;
  occurredAt: ISODateTime;
  dueDate?: ISODate;
  severity: Severity;
  status: IncidentStatus;
  title: string;
  description: string;
  assignedTo?: string;
  photos: IncidentPhoto[];
}

export interface Session {
  token: string | null;
  userName: string;
}

export interface AppState {
  session: Session;
  role: Role;
  themeMode: ThemeMode;
  sites: Site[];
  templates: ChecklistTemplate[];
  plannedControls: PlannedControl[];
  inspections: Inspection[];
  incidents: Incident[];
  selectedDate: ISODate;
}

export const ROLE_LABELS: Record<Role, string> = {
  agent: 'Agent',
  controller: 'Contrôleur',
  ops: 'Exploitation',
  client: 'Client'
};

export type Capability =
  | 'manage_sites'
  | 'manage_templates'
  | 'plan_controls'
  | 'run_inspections'
  | 'manage_incidents'
  | 'delete_reports'
  | 'switch_roles';

export function canPerform(role: Role, capability: Capability): boolean {
  switch (capability) {
    case 'manage_sites':
      return role === 'ops';
    case 'manage_templates':
      return role === 'controller' || role === 'ops';
    case 'plan_controls':
      return role === 'controller' || role === 'ops';
    case 'run_inspections':
      return role === 'agent' || role === 'controller' || role === 'ops';
    case 'manage_incidents':
      return role === 'agent' || role === 'controller' || role === 'ops';
    case 'delete_reports':
      return role === 'controller' || role === 'ops';
    case 'switch_roles':
      return role === 'ops';
  }
}

export function defaultRouteForRole(role: Role): '/' | '/controls' | '/reports' {
  switch (role) {
    case 'client':
      return '/reports';
    case 'agent':
      return '/controls';
    case 'controller':
      return '/controls';
    case 'ops':
      return '/';
  }
}

function normalizePathname(pathname: string): string {
  const clean = pathname.split('?')[0]?.split('#')[0] ?? '';
  if (!clean) return '/';
  if (clean.length > 1 && clean.endsWith('/')) return clean.slice(0, -1);
  return clean;
}

export type RouteKey =
  | 'home'
  | 'profile'
  | 'controls:list'
  | 'controls:detail'
  | 'controls:plan'
  | 'incidents:list'
  | 'incidents:detail'
  | 'incidents:edit'
  | 'planning'
  | 'sites'
  | 'templates'
  | 'reports'
  | 'unknown';

export function routeKeyForPathname(pathname: string): RouteKey {
  const p = normalizePathname(pathname);
  if (p === '/') return 'home';
  if (p === '/profile') return 'profile';
  if (p === '/controls') return 'controls:list';
  if (p === '/controls/new') return 'controls:plan';
  if (p.startsWith('/controls/edit/')) return 'controls:plan';
  if (p.startsWith('/controls/')) return 'controls:detail';
  if (p === '/incidents') return 'incidents:list';
  if (p === '/incidents/new') return 'incidents:edit';
  if (p.startsWith('/incidents/edit/')) return 'incidents:edit';
  if (p.startsWith('/incidents/')) return 'incidents:detail';
  if (p === '/planning') return 'planning';
  if (p === '/sites' || p.startsWith('/sites/')) return 'sites';
  if (p === '/templates' || p.startsWith('/templates/')) return 'templates';
  if (p === '/reports' || p.startsWith('/reports/')) return 'reports';
  return 'unknown';
}

export function canAccessPathname(role: Role, pathname: string): boolean {
  const key = routeKeyForPathname(pathname);
  switch (key) {
    case 'home':
    case 'profile':
      return true;
    case 'controls:list':
    case 'controls:detail':
      return role === 'agent' || role === 'controller' || role === 'ops';
    case 'controls:plan':
      return canPerform(role, 'plan_controls');
    case 'incidents:list':
    case 'incidents:detail':
      return role === 'agent' || role === 'controller' || role === 'ops';
    case 'incidents:edit':
      return canPerform(role, 'manage_incidents');
    case 'planning':
      return role === 'agent' || role === 'controller' || role === 'ops';
    case 'sites':
      return role === 'controller' || role === 'ops';
    case 'templates':
      return role === 'controller' || role === 'ops';
    case 'reports':
      return role === 'controller' || role === 'ops' || role === 'client';
    case 'unknown':
      return false;
  }
}
