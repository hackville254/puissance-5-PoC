import { addDaysISODate, nowISODateTime, todayISODate } from './format';
import type { AppState, ChecklistTemplate, Incident, PlannedControl, Site } from './models';

const baseDate = todayISODate();

const sites: Site[] = [
  {
    id: 'site_haussmann',
    name: 'Bureaux Haussmann',
    address: '14 Rue de la Paix',
    city: 'Paris',
    tags: ['Bureaux', 'Open space'],
    lat: 48.8698,
    lng: 2.3317,
    geofenceRadiusM: 120
  },
  {
    id: 'site_montparnasse',
    name: 'Immeuble Montparnasse',
    address: '19 Av. du Maine',
    city: 'Paris',
    tags: ['Immeuble', 'Halls'],
    lat: 48.843,
    lng: 2.323,
    geofenceRadiusM: 140
  },
  {
    id: 'site_vincennes',
    name: 'École Vincennes',
    address: '6 Rue des Écoles',
    city: 'Vincennes',
    tags: ['École', 'Sanitaires'],
    lat: 48.8472,
    lng: 2.437,
    geofenceRadiusM: 160
  }
];

const templateBureaux: ChecklistTemplate = {
  id: 'tpl_bureaux',
  name: 'Checklist — Bureaux',
  items: [
    { id: 'sol', label: 'Sol propre', critical: true },
    { id: 'sanitaires', label: 'Sanitaires conformes', critical: true },
    { id: 'vitrerie', label: 'Vitrerie', critical: false },
    { id: 'odeur', label: 'Odeur', critical: true },
    { id: 'consommables', label: 'Consommables', critical: true },
    { id: 'dechets', label: 'Déchets évacués', critical: true },
    { id: 'desinfection', label: 'Désinfection effectuée', critical: false }
  ]
};

const plannedControls: PlannedControl[] = [
  {
    id: 'ctrl_001',
    siteId: 'site_haussmann',
    date: baseDate,
    startTime: '08:30',
    endTime: '09:15',
    type: 'quality',
    status: 'planned',
    assigneeName: 'Agent'
  },
  {
    id: 'ctrl_002',
    siteId: 'site_montparnasse',
    date: baseDate,
    startTime: '11:00',
    endTime: '12:00',
    type: 'quality',
    status: 'planned',
    assigneeName: 'Agent'
  },
  {
    id: 'ctrl_003',
    siteId: 'site_vincennes',
    date: addDaysISODate(baseDate, 1),
    startTime: '09:00',
    endTime: '10:00',
    type: 'beforeAfter',
    status: 'planned',
    assigneeName: 'Agent'
  }
];

const incidents: Incident[] = [
  {
    id: 'inc_001',
    siteId: 'site_montparnasse',
    createdAt: nowISODateTime(),
    occurredAt: nowISODateTime(),
    dueDate: baseDate,
    severity: 'critique',
    status: 'ouvert',
    title: 'Consommable absent (papier)',
    description: 'Rupture papier sanitaire au RDC. Réappro à effectuer immédiatement.',
    assignedTo: 'Chef d’équipe'
  },
  {
    id: 'inc_002',
    siteId: 'site_haussmann',
    createdAt: nowISODateTime(),
    occurredAt: nowISODateTime(),
    severity: 'majeure',
    status: 'en_cours',
    title: 'Odeur persistante',
    description: 'Odeur signalée dans le couloir nord. Vérifier siphons / désinfection.',
    assignedTo: 'Référent site'
  }
];

export function createInitialState(): AppState {
  return {
    session: {
      token: null,
      userName: ''
    },
    role: 'controller',
    themeMode: 'system',
    sites,
    templates: [templateBureaux],
    plannedControls,
    inspections: [],
    incidents,
    selectedDate: baseDate
  };
}
