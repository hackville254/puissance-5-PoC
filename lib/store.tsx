import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { createInitialState } from './mocks';
import { nowISODateTime } from './format';
import type {
  AppState,
  ChecklistTemplate,
  Incident,
  IncidentStatus,
  Inspection,
  PlannedControl,
  Role,
  Severity,
  Site,
  ThemeMode
} from './models';
import { canPerform } from './models';
import {
  MAX_PHOTOS_PER_INSPECTION,
  normalizeInspectionPhoto,
  normalizeLoadedState,
  normalizePlannedControl,
  normalizeSite,
  normalizeTemplate,
  sanitizeForPersist
} from './state';
import { getItem, removeItem, setItem } from './storage';

const STORAGE_KEY = 'p5_app_state_v1';

type Action =
  | { type: 'signIn'; userName: string; role: Role }
  | { type: 'signOut' }
  | { type: 'setThemeMode'; mode: ThemeMode }
  | { type: 'setRole'; role: Role }
  | { type: 'setSelectedDate'; date: string }
  | { type: 'upsertSite'; site: Site }
  | { type: 'deleteSite'; siteId: string }
  | { type: 'upsertPlannedControl'; control: PlannedControl }
  | { type: 'deletePlannedControl'; controlId: string }
  | { type: 'upsertTemplate'; template: ChecklistTemplate }
  | { type: 'deleteTemplate'; templateId: string }
  | { type: 'startInspection'; plannedControlId: string }
  | { type: 'toggleChecklist'; inspectionId: string; itemId: string }
  | { type: 'setInspectionRating'; inspectionId: string; rating: number }
  | { type: 'setInspectionNotes'; inspectionId: string; notes: string }
  | { type: 'setInspectionPeople'; inspectionId: string; evaluatorName: string; evaluatedAgentName: string }
  | { type: 'addInspectionPhoto'; inspectionId: string; photo: Inspection['photos'][number] }
  | { type: 'deleteInspectionPhoto'; inspectionId: string; photoId: string }
  | {
      type: 'setInspectionCertifications';
      inspectionId: string;
      patch: Partial<Inspection['certifications']>;
    }
  | { type: 'completeInspection'; inspectionId: string }
  | { type: 'deleteInspection'; inspectionId: string }
  | { type: 'createIncident'; siteId: string; severity: Severity; occurredAt: string; dueDate?: string; title: string; description: string; assignedTo?: string }
  | { type: 'updateIncident'; incidentId: string; patch: Partial<Pick<Incident, 'severity' | 'occurredAt' | 'dueDate' | 'title' | 'description' | 'assignedTo'>> }
  | { type: 'setIncidentStatus'; incidentId: string; status: IncidentStatus }
  | { type: 'deleteIncident'; incidentId: string }
  | { type: 'reset' };

function uuid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sanitizeText(value: string, max: number) {
  return value.trim().slice(0, max);
}

function isISODate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isHHMM(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function timeToMinutes(value: string) {
  if (!isHHMM(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function hasValidControlWindow(control: PlannedControl) {
  const start = timeToMinutes(control.startTime);
  const end = timeToMinutes(control.endTime);
  return start !== null && end !== null && end > start;
}

function sanitizeCertificationsPatch(
  patch: Partial<Inspection['certifications']>
): Partial<Inspection['certifications']> {
  const next: Partial<Inspection['certifications']> = {};
  if (typeof patch.gpsVerified === 'boolean') next.gpsVerified = patch.gpsVerified;
  if (typeof patch.timeStamped === 'boolean') next.timeStamped = patch.timeStamped;
  if (typeof patch.qrScanned === 'boolean') next.qrScanned = patch.qrScanned;
  if (typeof patch.networkVerified === 'boolean') next.networkVerified = patch.networkVerified;
  if (typeof patch.photoCertified === 'boolean') next.photoCertified = patch.photoCertified;
  if (typeof patch.lastDistanceMeters === 'number' && Number.isFinite(patch.lastDistanceMeters)) {
    next.lastDistanceMeters = clamp(Math.round(patch.lastDistanceMeters), 0, 5000);
  }
  if ('lastDistanceMeters' in patch && patch.lastDistanceMeters === undefined) next.lastDistanceMeters = undefined;
  if (typeof patch.lastNetworkType === 'string') next.lastNetworkType = sanitizeText(patch.lastNetworkType, 32) || undefined;
  if ('lastNetworkType' in patch && patch.lastNetworkType === undefined) next.lastNetworkType = undefined;
  if (typeof patch.lastQrValue === 'string') next.lastQrValue = sanitizeText(patch.lastQrValue, 120) || undefined;
  if ('lastQrValue' in patch && patch.lastQrValue === undefined) next.lastQrValue = undefined;
  return next;
}

function sanitizeIncidentPatch(
  patch: Partial<Pick<Incident, 'severity' | 'occurredAt' | 'dueDate' | 'title' | 'description' | 'assignedTo'>>
) {
  const next: Partial<Pick<Incident, 'severity' | 'occurredAt' | 'dueDate' | 'title' | 'description' | 'assignedTo'>> = {};
  if (patch.severity === 'critique' || patch.severity === 'majeure' || patch.severity === 'mineure') next.severity = patch.severity;
  if (typeof patch.occurredAt === 'string') {
    const occurredAt = sanitizeText(patch.occurredAt, 40);
    if (occurredAt) next.occurredAt = occurredAt;
  }
  if ('dueDate' in patch) {
    if (typeof patch.dueDate === 'string') {
      const dueDate = sanitizeText(patch.dueDate, 10);
      next.dueDate = isISODate(dueDate) ? dueDate : undefined;
    } else {
      next.dueDate = undefined;
    }
  }
  if (typeof patch.title === 'string') {
    const title = sanitizeText(patch.title, 80);
    if (title) next.title = title;
  }
  if (typeof patch.description === 'string') {
    const description = sanitizeText(patch.description, 600);
    if (description) next.description = description;
  }
  if ('assignedTo' in patch) {
    if (typeof patch.assignedTo === 'string') next.assignedTo = sanitizeText(patch.assignedTo, 64) || undefined;
    else next.assignedTo = undefined;
  }
  return next;
}

function hasCompletionPrereqs(inspection: Inspection, control: PlannedControl, template: ChecklistTemplate) {
  const criticalIds = template.items.filter(item => item.critical).map(item => item.id);
  const criticalOk = criticalIds.every(itemId => inspection.checklist[itemId] === true);
  const beforeCount = inspection.photos.filter(photo => photo.kind === 'before').length;
  const afterCount = inspection.photos.filter(photo => photo.kind === 'after').length;
  const photosOk = control.type === 'beforeAfter' ? beforeCount > 0 && afterCount > 0 : inspection.photos.length > 0;
  const allPhotosCertified = inspection.photos.length > 0 && inspection.photos.every(photo => photo.certified);
  return Boolean(
    inspection.rating > 0 &&
      criticalOk &&
      photosOk &&
      inspection.certifications.gpsVerified &&
      inspection.certifications.timeStamped &&
      inspection.certifications.qrScanned &&
      inspection.certifications.networkVerified &&
      inspection.certifications.photoCertified &&
      allPhotosCertified
  );
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'signIn': {
      const userName = sanitizeText(action.userName, 64);
      if (!userName) return state;
      const token = uuid('sess');
      return {
        ...state,
        session: {
          token,
          userName
        },
        role: action.role
      };
    }
    case 'signOut':
      return {
        ...state,
        session: { token: null, userName: '' },
        role: 'controller'
      };
    case 'setThemeMode':
      return { ...state, themeMode: action.mode };
    case 'setRole':
      if (!canPerform(state.role, 'switch_roles')) return state;
      return { ...state, role: action.role };
    case 'setSelectedDate':
      if (!isISODate(action.date.trim())) return state;
      return { ...state, selectedDate: action.date };
    case 'upsertSite': {
      if (!canPerform(state.role, 'manage_sites')) return state;
      const next = normalizeSite(action.site);
      if (!next) return state;
      const exists = state.sites.some(s => s.id === next.id);
      const sites = exists ? state.sites.map(s => (s.id === next.id ? next : s)) : [next, ...state.sites];
      return { ...state, sites };
    }
    case 'deleteSite': {
      if (!canPerform(state.role, 'manage_sites')) return state;
      const siteId = action.siteId;
      const plannedToDelete = state.plannedControls.filter(c => c.siteId === siteId).map(c => c.id);
      return {
        ...state,
        sites: state.sites.filter(s => s.id !== siteId),
        plannedControls: state.plannedControls.filter(c => c.siteId !== siteId),
        inspections: state.inspections.filter(i => !plannedToDelete.includes(i.plannedControlId)),
        incidents: state.incidents.filter(inc => inc.siteId !== siteId)
      };
    }
    case 'upsertPlannedControl': {
      if (!canPerform(state.role, 'plan_controls')) return state;
      const next = normalizePlannedControl(action.control, new Set(state.sites.map(site => site.id)));
      if (!next || !hasValidControlWindow(next)) return state;
      const exists = state.plannedControls.some(c => c.id === next.id);
      const plannedControls = exists
        ? state.plannedControls.map(c => (c.id === next.id ? next : c))
        : [next, ...state.plannedControls];
      return { ...state, plannedControls };
    }
    case 'deletePlannedControl': {
      if (!canPerform(state.role, 'plan_controls')) return state;
      const controlId = action.controlId;
      return {
        ...state,
        plannedControls: state.plannedControls.filter(c => c.id !== controlId),
        inspections: state.inspections.filter(i => i.plannedControlId !== controlId)
      };
    }
    case 'upsertTemplate': {
      if (!canPerform(state.role, 'manage_templates')) return state;
      const next = normalizeTemplate(action.template);
      if (!next) return state;
      const exists = state.templates.some(t => t.id === next.id);
      const templates = exists ? state.templates.map(t => (t.id === next.id ? next : t)) : [next, ...state.templates];
      return { ...state, templates };
    }
    case 'deleteTemplate': {
      if (!canPerform(state.role, 'manage_templates')) return state;
      const templateId = action.templateId;
      const templates = state.templates.filter(t => t.id !== templateId);
      if (templates.length === 0) return state;
      const fallback = templates[0];
      const inspections = fallback ? state.inspections.map(i => (i.templateId === templateId ? { ...i, templateId: fallback.id } : i)) : state.inspections;
      return { ...state, templates, inspections };
    }
    case 'startInspection': {
      if (!canPerform(state.role, 'run_inspections')) return state;
      const existing = state.inspections.find(i => i.plannedControlId === action.plannedControlId);
      if (existing) return state;
      const planned = state.plannedControls.find(c => c.id === action.plannedControlId);
      if (!planned) return state;
      const template = state.templates[0];
      if (!template) return state;
      const checklist = Object.fromEntries(template.items.map(it => [it.id, false]));
      const inspection: Inspection = {
        id: uuid('insp'),
        plannedControlId: action.plannedControlId,
        templateId: template.id,
        createdAt: nowISODateTime(),
        evaluatorName: state.session.userName || 'Utilisateur',
        evaluatedAgentName: planned.assigneeName || 'Agent',
        checklist,
        rating: 0,
        notes: '',
        photos: [],
        certifications: {
          gpsVerified: false,
          timeStamped: true,
          qrScanned: false,
          networkVerified: false,
          photoCertified: false
        }
      };
      return {
        ...state,
        plannedControls: state.plannedControls.map(c =>
          c.id === action.plannedControlId ? { ...c, status: 'inProgress' } : c
        ),
        inspections: [inspection, ...state.inspections]
      };
    }
    case 'toggleChecklist':
      if (!canPerform(state.role, 'run_inspections')) return state;
      if (!state.inspections.some(i => i.id === action.inspectionId && action.itemId in i.checklist)) return state;
      return {
        ...state,
        inspections: state.inspections.map(i =>
          i.id === action.inspectionId ? { ...i, checklist: { ...i.checklist, [action.itemId]: !i.checklist[action.itemId] } } : i
        )
      };
    case 'setInspectionRating':
      if (!canPerform(state.role, 'run_inspections')) return state;
      return {
        ...state,
        inspections: state.inspections.map(i => (i.id === action.inspectionId ? { ...i, rating: clamp(action.rating, 0, 5) } : i))
      };
    case 'setInspectionNotes':
      if (!canPerform(state.role, 'run_inspections')) return state;
      return {
        ...state,
        inspections: state.inspections.map(i => (i.id === action.inspectionId ? { ...i, notes: sanitizeText(action.notes, 1200) } : i))
      };
    case 'setInspectionPeople':
      if (!canPerform(state.role, 'run_inspections')) return state;
      return {
        ...state,
        inspections: state.inspections.map(i =>
          i.id === action.inspectionId
            ? {
                ...i,
                evaluatorName: action.evaluatorName.trim().slice(0, 64) || 'Utilisateur',
                evaluatedAgentName: action.evaluatedAgentName.trim().slice(0, 64) || 'Agent'
              }
            : i
        )
      };
    case 'addInspectionPhoto':
      if (!canPerform(state.role, 'run_inspections')) return state;
      if (!normalizeInspectionPhoto(action.photo)) return state;
      return {
        ...state,
        inspections: state.inspections.map(i =>
          i.id === action.inspectionId
            ? {
                ...i,
                photos: [action.photo, ...i.photos.filter(photo => photo.id !== action.photo.id)].slice(0, MAX_PHOTOS_PER_INSPECTION),
                certifications: {
                  ...i.certifications,
                  photoCertified: [action.photo, ...i.photos.filter(photo => photo.id !== action.photo.id)]
                    .slice(0, MAX_PHOTOS_PER_INSPECTION)
                    .every(photo => photo.certified)
                }
              }
            : i
        )
      };
    case 'deleteInspectionPhoto':
      if (!canPerform(state.role, 'run_inspections')) return state;
      return {
        ...state,
        inspections: state.inspections.map(i =>
          i.id === action.inspectionId
            ? {
                ...i,
                photos: i.photos.filter(p => p.id !== action.photoId),
                certifications: {
                  ...i.certifications,
                  photoCertified: i.photos.filter(p => p.id !== action.photoId).every(p => p.certified)
                }
              }
            : i
        )
      };
    case 'setInspectionCertifications':
      if (!canPerform(state.role, 'run_inspections')) return state;
      if (Object.keys(sanitizeCertificationsPatch(action.patch)).length === 0) return state;
      return {
        ...state,
        inspections: state.inspections.map(i =>
          i.id === action.inspectionId
            ? { ...i, certifications: { ...i.certifications, ...sanitizeCertificationsPatch(action.patch) } }
            : i
        )
      };
    case 'completeInspection': {
      if (!canPerform(state.role, 'run_inspections')) return state;
      const inspection = state.inspections.find(i => i.id === action.inspectionId);
      if (!inspection) return state;
      const control = state.plannedControls.find(c => c.id === inspection.plannedControlId);
      const template = state.templates.find(t => t.id === inspection.templateId);
      if (!control || !template || !hasCompletionPrereqs(inspection, control, template)) return state;
      return {
        ...state,
        plannedControls: state.plannedControls.map(c =>
          c.id === inspection.plannedControlId ? { ...c, status: 'done' } : c
        ),
        inspections: state.inspections.map(i =>
          i.id === action.inspectionId ? { ...i, completedAt: nowISODateTime() } : i
        )
      };
    }
    case 'deleteInspection': {
      if (!canPerform(state.role, 'delete_reports')) return state;
      const inspection = state.inspections.find(i => i.id === action.inspectionId);
      if (!inspection) return state;
      return {
        ...state,
        plannedControls: state.plannedControls.map(c =>
          c.id === inspection.plannedControlId ? { ...c, status: 'planned' } : c
        ),
        inspections: state.inspections.filter(i => i.id !== action.inspectionId)
      };
    }
    case 'createIncident': {
      if (!canPerform(state.role, 'manage_incidents')) return state;
      if (!state.sites.some(site => site.id === action.siteId)) return state;
      const title = sanitizeText(action.title, 80);
      const description = sanitizeText(action.description, 600);
      if (!title || !description) return state;
      const now = nowISODateTime();
      const incident: Incident = {
        id: uuid('inc'),
        siteId: action.siteId,
        createdAt: now,
        occurredAt: sanitizeText(action.occurredAt, 40) || now,
        dueDate: action.dueDate && isISODate(action.dueDate.trim()) ? action.dueDate.trim().slice(0, 10) : undefined,
        severity: action.severity,
        status: 'ouvert',
        title,
        description,
        assignedTo: action.assignedTo ? sanitizeText(action.assignedTo, 64) || undefined : undefined
      };
      return { ...state, incidents: [incident, ...state.incidents] };
    }
    case 'updateIncident':
      if (!canPerform(state.role, 'manage_incidents')) return state;
      if (Object.keys(sanitizeIncidentPatch(action.patch)).length === 0) return state;
      return {
        ...state,
        incidents: state.incidents.map(inc =>
          inc.id === action.incidentId ? { ...inc, ...sanitizeIncidentPatch(action.patch) } : inc
        )
      };
    case 'setIncidentStatus':
      if (!canPerform(state.role, 'manage_incidents')) return state;
      return {
        ...state,
        incidents: state.incidents.map(inc => (inc.id === action.incidentId ? { ...inc, status: action.status } : inc))
      };
    case 'deleteIncident':
      if (!canPerform(state.role, 'manage_incidents')) return state;
      return { ...state, incidents: state.incidents.filter(inc => inc.id !== action.incidentId) };
    case 'reset':
      return createInitialState();
    default:
      return state;
  }
}

interface StoreValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  ready: boolean;
  reset: () => void;
  clearCache: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => createInitialState());
  const [ready, setReady] = useState(false);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await getItem(STORAGE_KEY);
        if (!raw) {
          if (!cancelled) setReady(true);
          return;
        }
        const parsed = JSON.parse(raw) as unknown;
        if (!cancelled) {
          setState(current => normalizeLoadedState(current, parsed));
          setReady(true);
        }
      } catch {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      const next = sanitizeForPersist(state);
      void setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => void removeItem(STORAGE_KEY));
    }, 700);
  }, [ready, state]);

  const dispatch = useCallback((action: Action) => {
    setState(prev => reducer(prev, action));
  }, []);

  const reset = useCallback(() => dispatch({ type: 'reset' }), [dispatch]);

  const clearCache = useCallback(async () => {
    await removeItem(STORAGE_KEY);
    dispatch({ type: 'reset' });
  }, [dispatch]);

  const value = useMemo<StoreValue>(() => ({ state, dispatch, ready, reset, clearCache }), [state, dispatch, ready, reset, clearCache]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('AppStoreProvider missing');
  return ctx;
}
