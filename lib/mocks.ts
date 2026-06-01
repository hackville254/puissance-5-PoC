import { addDaysISODate, todayISODate } from './format';
import type { AppState, ChecklistTemplate, Incident, PlannedControl, Site } from './models';

const baseDate = todayISODate();

function getTargetJuneEnd(baseISODate: string) {
  const [year, month] = baseISODate.split('-').map(Number);
  const targetYear = (month ?? 1) <= 6 ? year : year + 1;
  return `${targetYear}-06-30`;
}

function diffDays(startISODate: string, endISODate: string) {
  const [startYear, startMonth, startDay] = startISODate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endISODate.split('-').map(Number);
  const start = new Date(startYear, (startMonth ?? 1) - 1, startDay ?? 1);
  const end = new Date(endYear, (endMonth ?? 1) - 1, endDay ?? 1);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / msPerDay));
}

function weekdayIndex(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1).getDay();
}

function buildControlId(index: number) {
  return `ctrl_${String(index + 1).padStart(3, '0')}`;
}

function buildIncidentId(index: number) {
  return `inc_${String(index + 1).padStart(3, '0')}`;
}

const mockEndDate = getTargetJuneEnd(baseDate);

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

const plannedControls: PlannedControl[] = Array.from({ length: diffDays(baseDate, mockEndDate) + 1 }, (_, offset) => {
  const date = addDaysISODate(baseDate, offset);
  const day = weekdayIndex(date);
  const isSunday = day === 0;
  if (isSunday) return [];

  const siteCycle = [sites[offset % sites.length], sites[(offset + 1) % sites.length], sites[(offset + 2) % sites.length]];
  const dailyControls: PlannedControl[] = [
    {
      id: buildControlId(offset * 3),
      siteId: siteCycle[0].id,
      date,
      startTime: '08:30',
      endTime: '09:15',
      type: offset % 3 === 0 ? 'beforeAfter' : 'quality',
      status: 'planned',
      assigneeName: offset % 2 === 0 ? 'Agent Martin' : 'Agent Diallo'
    },
    {
      id: buildControlId(offset * 3 + 1),
      siteId: siteCycle[1].id,
      date,
      startTime: '11:00',
      endTime: '11:45',
      type: offset % 4 === 0 ? 'beforeAfter' : 'quality',
      status: 'planned',
      assigneeName: offset % 2 === 0 ? 'Agent Benali' : 'Agent Nguessan'
    }
  ];

  if (day !== 6) {
    dailyControls.push({
      id: buildControlId(offset * 3 + 2),
      siteId: siteCycle[2].id,
      date,
      startTime: '14:30',
      endTime: '15:30',
      type: offset % 2 === 0 ? 'quality' : 'beforeAfter',
      status: 'planned',
      assigneeName: offset % 2 === 0 ? 'Agent Kouame' : 'Agent Lopez'
    });
  }

  return dailyControls;
}).flat();

const incidents: Incident[] = Array.from({ length: 8 }, (_, index) => {
  const occurredDate = addDaysISODate(baseDate, Math.min(index * 4, diffDays(baseDate, mockEndDate)));
  const createdAt = `${occurredDate}T${index % 3 === 0 ? '08:20:00.000Z' : index % 3 === 1 ? '10:40:00.000Z' : '14:15:00.000Z'}`;
  const dueDate = addDaysISODate(occurredDate, index % 2 === 0 ? 1 : 3);
  const site = sites[index % sites.length];
  const presets = [
    {
      severity: 'critique' as const,
      status: 'ouvert' as const,
      title: 'Consommable absent (papier)',
      description: 'Rupture papier sanitaire. Reappro immediate requise.',
      assignedTo: 'Chef d equipe'
    },
    {
      severity: 'majeure' as const,
      status: 'en_cours' as const,
      title: 'Odeur persistante',
      description: 'Odeur signalee dans une zone de passage. Verification et traitement a lancer.',
      assignedTo: 'Referent site'
    },
    {
      severity: 'mineure' as const,
      status: 'ouvert' as const,
      title: 'Traces sur vitrerie',
      description: 'Retouches de finition a prevoir avant validation client.',
      assignedTo: 'Equipe vitrerie'
    },
    {
      severity: 'majeure' as const,
      status: 'clos' as const,
      title: 'Bac dechets non evacue',
      description: 'Le point de collecte etait plein. Correction terminee apres reprise.',
      assignedTo: 'Coordination terrain'
    }
  ];
  const preset = presets[index % presets.length];

  return {
    id: buildIncidentId(index),
    siteId: site.id,
    createdAt,
    occurredAt: createdAt,
    dueDate,
    severity: preset.severity,
    status: preset.status,
    title: `${preset.title} - ${site.city}`,
    description: preset.description,
    assignedTo: preset.assignedTo,
    photos: []
  };
});

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
