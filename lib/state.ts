import { todayISODate } from './format';
import type {
  AppState,
  ChecklistItem,
  ChecklistTemplate,
  ControlStatus,
  ControlType,
  Incident,
  IncidentPhoto,
  IncidentStatus,
  Inspection,
  InspectionPhoto,
  PlannedControl,
  Severity,
  Site,
  ThemeMode
} from './models';

const MAX_SITES = 100;
const MAX_TEMPLATES = 50;
const MAX_PLANNED_CONTROLS = 365;
const MAX_INCIDENTS = 500;
const MAX_INSPECTIONS = 250;
export const MAX_PHOTOS_PER_INSPECTION = 12;
export const MAX_PHOTOS_PER_INCIDENT = 8;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown, fallback = '', max = 256) {
  return typeof value === 'string' ? value.trim().slice(0, max) : fallback;
}

function readOptionalString(value: unknown, max = 256) {
  const next = readString(value, '', max);
  return next || undefined;
}

function readNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function readArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function readThemeMode(value: unknown, fallback: ThemeMode): ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark' ? value : fallback;
}

function readControlType(value: unknown, fallback: ControlType): ControlType {
  return value === 'quality' || value === 'beforeAfter' ? value : fallback;
}

function readControlStatus(value: unknown, fallback: ControlStatus): ControlStatus {
  return value === 'planned' || value === 'inProgress' || value === 'done' ? value : fallback;
}

function readSeverity(value: unknown, fallback: Severity): Severity {
  return value === 'critique' || value === 'majeure' || value === 'mineure' ? value : fallback;
}

function readIncidentStatus(value: unknown, fallback: IncidentStatus): IncidentStatus {
  return value === 'ouvert' || value === 'en_cours' || value === 'clos' ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeSite(value: unknown): Site | null {
  if (!isRecord(value)) return null;
  const id = readString(value.id, '', 96);
  if (!id) return null;
  return {
    id,
    name: readString(value.name, 'Site', 64),
    address: readString(value.address, '', 128),
    city: readString(value.city, '', 64),
    tags: readArray(value.tags)
      .map(tag => readString(tag, '', 24))
      .filter(Boolean)
      .slice(0, 8),
    lat: clamp(readNumber(value.lat, 0), -90, 90),
    lng: clamp(readNumber(value.lng, 0), -180, 180),
    geofenceRadiusM: clamp(Math.round(readNumber(value.geofenceRadiusM, 120)), 10, 2000)
  };
}

function normalizeChecklistItem(value: unknown): ChecklistItem | null {
  if (!isRecord(value)) return null;
  const id = readString(value.id, '', 96);
  const label = readString(value.label, '', 80);
  if (!id || !label) return null;
  return {
    id,
    label,
    critical: readBoolean(value.critical, false)
  };
}

export function normalizeTemplate(value: unknown): ChecklistTemplate | null {
  if (!isRecord(value)) return null;
  const id = readString(value.id, '', 96);
  if (!id) return null;
  const items = readArray(value.items)
    .map(normalizeChecklistItem)
    .filter((item): item is ChecklistItem => Boolean(item))
    .slice(0, 24);
  if (items.length === 0) return null;
  return {
    id,
    name: readString(value.name, 'Liste de controle', 64),
    items
  };
}

export function normalizePlannedControl(value: unknown, siteIds: Set<string>): PlannedControl | null {
  if (!isRecord(value)) return null;
  const id = readString(value.id, '', 96);
  const siteId = readString(value.siteId, '', 96);
  if (!id || !siteId || !siteIds.has(siteId)) return null;
  return {
    id,
    siteId,
    date: readString(value.date, todayISODate(), 10),
    startTime: readString(value.startTime, '09:00', 5),
    endTime: readString(value.endTime, '09:45', 5),
    type: readControlType(value.type, 'quality'),
    status: readControlStatus(value.status, 'planned'),
    assigneeName: readString(value.assigneeName, 'Agent', 64)
  };
}

export function normalizeInspectionPhoto(value: unknown): InspectionPhoto | null {
  if (!isRecord(value)) return null;
  const id = readString(value.id, '', 96);
  const uri = readString(value.uri, '', 512);
  if (!id || !uri) return null;
  return {
    id,
    kind: value.kind === 'after' ? 'after' : 'before',
    uri,
    capturedAt: readString(value.capturedAt, new Date().toISOString(), 40),
    lat: typeof value.lat === 'number' ? clamp(value.lat, -90, 90) : undefined,
    lng: typeof value.lng === 'number' ? clamp(value.lng, -180, 180) : undefined,
    distanceMeters: typeof value.distanceMeters === 'number' ? clamp(Math.round(value.distanceMeters), 0, 5000) : undefined,
    fileHash: readOptionalString(value.fileHash, 128),
    signature: readOptionalString(value.signature, 256),
    certified: readBoolean(value.certified, false)
  };
}

export function normalizeIncidentPhoto(value: unknown): IncidentPhoto | null {
  if (!isRecord(value)) return null;
  const id = readString(value.id, '', 96);
  const uri = readString(value.uri, '', 512);
  if (!id || !uri) return null;
  return {
    id,
    uri,
    capturedAt: readString(value.capturedAt, new Date().toISOString(), 40),
    lat: typeof value.lat === 'number' ? clamp(value.lat, -90, 90) : undefined,
    lng: typeof value.lng === 'number' ? clamp(value.lng, -180, 180) : undefined,
    fileHash: readOptionalString(value.fileHash, 128),
    signature: readOptionalString(value.signature, 256),
    certified: readBoolean(value.certified, false)
  };
}

export function normalizeInspection(value: unknown, controlIds: Set<string>, templateIds: Set<string>): Inspection | null {
  if (!isRecord(value)) return null;
  const id = readString(value.id, '', 96);
  const plannedControlId = readString(value.plannedControlId, '', 96);
  const templateId = readString(value.templateId, '', 96);
  if (!id || !plannedControlId || !templateId || !controlIds.has(plannedControlId) || !templateIds.has(templateId)) return null;
  const photos = readArray(value.photos)
    .map(normalizeInspectionPhoto)
    .filter((photo): photo is InspectionPhoto => Boolean(photo))
    .slice(0, MAX_PHOTOS_PER_INSPECTION);
  const cert = isRecord(value.certifications) ? value.certifications : {};
  const checklistRecord = isRecord(value.checklist) ? value.checklist : {};
  const checklist = Object.fromEntries(
    Object.entries(checklistRecord)
      .filter(([key]) => typeof key === 'string')
      .map(([key, checked]) => [key, Boolean(checked)])
  );
  return {
    id,
    plannedControlId,
    templateId,
    createdAt: readString(value.createdAt, new Date().toISOString(), 40),
    completedAt: readOptionalString(value.completedAt, 40),
    evaluatorName: readString(value.evaluatorName, 'Utilisateur', 64),
    evaluatedAgentName: readString(value.evaluatedAgentName, 'Agent', 64),
    checklist,
    rating: clamp(readNumber(value.rating, 0), 0, 5),
    notes: readString(value.notes, '', 1200),
    photos,
    certifications: {
      gpsVerified: readBoolean(cert.gpsVerified, false),
      timeStamped: readBoolean(cert.timeStamped, true),
      qrScanned: readBoolean(cert.qrScanned, false),
      networkVerified: readBoolean(cert.networkVerified, false),
      photoCertified: photos.length > 0 ? photos.every(photo => photo.certified) : readBoolean(cert.photoCertified, false),
      lastDistanceMeters: typeof cert.lastDistanceMeters === 'number' ? clamp(Math.round(cert.lastDistanceMeters), 0, 5000) : undefined,
      lastNetworkType: readOptionalString(cert.lastNetworkType, 32),
      lastQrValue: readOptionalString(cert.lastQrValue, 120)
    }
  };
}

export function normalizeIncident(value: unknown, siteIds: Set<string>): Incident | null {
  if (!isRecord(value)) return null;
  const id = readString(value.id, '', 96);
  const siteId = readString(value.siteId, '', 96);
  if (!id || !siteId || !siteIds.has(siteId)) return null;
  const photos = readArray(value.photos)
    .map(normalizeIncidentPhoto)
    .filter((photo): photo is IncidentPhoto => Boolean(photo))
    .slice(0, MAX_PHOTOS_PER_INCIDENT);
  return {
    id,
    siteId,
    createdAt: readString(value.createdAt, new Date().toISOString(), 40),
    occurredAt: readString(value.occurredAt, readString(value.createdAt, new Date().toISOString(), 40), 40),
    dueDate: readOptionalString(value.dueDate, 10),
    severity: readSeverity(value.severity, 'majeure'),
    status: readIncidentStatus(value.status, 'ouvert'),
    title: readString(value.title, 'Incident', 80),
    description: readString(value.description, '', 600),
    assignedTo: readOptionalString(value.assignedTo, 64),
    photos
  };
}

export function sanitizeForPersist(state: AppState): AppState {
  const sites = state.sites.slice(0, MAX_SITES).map(site => normalizeSite(site)).filter((site): site is Site => Boolean(site));
  const siteIds = new Set(sites.map(site => site.id));
  const templates = state.templates
    .slice(0, MAX_TEMPLATES)
    .map(template => normalizeTemplate(template))
    .filter((template): template is ChecklistTemplate => Boolean(template));
  const templateIds = new Set(templates.map(template => template.id));
  const plannedControls = state.plannedControls
    .slice(0, MAX_PLANNED_CONTROLS)
    .map(control => normalizePlannedControl(control, siteIds))
    .filter((control): control is PlannedControl => Boolean(control));
  const controlIds = new Set(plannedControls.map(control => control.id));
  const inspections = state.inspections
    .slice(0, MAX_INSPECTIONS)
    .map(inspection => normalizeInspection(inspection, controlIds, templateIds))
    .filter((inspection): inspection is Inspection => Boolean(inspection));
  const incidents = state.incidents
    .slice(0, MAX_INCIDENTS)
    .map(incident => normalizeIncident(incident, siteIds))
    .filter((incident): incident is Incident => Boolean(incident));

  return {
    session: {
      // Do not restore authentication from local storage.
      token: null,
      userName: ''
    },
    role: 'controller',
    themeMode: readThemeMode(state.themeMode, 'system'),
    sites,
    templates,
    plannedControls,
    inspections,
    incidents,
    selectedDate: readString(state.selectedDate, todayISODate(), 10)
  };
}

export function normalizeLoadedState(base: AppState, parsed: unknown): AppState {
  if (!isRecord(parsed)) return base;
  const merged = sanitizeForPersist({
    ...base,
    themeMode: readThemeMode(parsed.themeMode, base.themeMode),
    sites: readArray(parsed.sites) as Site[],
    templates: readArray(parsed.templates) as ChecklistTemplate[],
    plannedControls: readArray(parsed.plannedControls) as PlannedControl[],
    inspections: readArray(parsed.inspections) as Inspection[],
    incidents: readArray(parsed.incidents) as Incident[],
    selectedDate: readString(parsed.selectedDate, base.selectedDate, 10)
  });
  return {
    ...base,
    ...merged
  };
}
