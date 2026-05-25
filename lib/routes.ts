import type { Href } from 'expo-router';

export const routes = {
  home: '/' as const,
  signIn: '/sign-in' as const,
  controls: '/controls' as const,
  newControl: '/controls/new' as const,
  incidents: '/incidents' as const,
  newIncident: '/incidents/new' as const,
  planning: '/planning' as const,
  profile: '/profile' as const,
  reports: '/reports' as const,
  sites: '/sites' as const,
  newSite: '/sites/new' as const,
  templates: '/templates' as const,
  newTemplate: '/templates/new' as const,
  controlDetail: (id: string) => ({ pathname: '/controls/[id]', params: { id } }) as const,
  editControl: (id: string) => ({ pathname: '/controls/edit/[id]', params: { id } }) as const,
  incidentDetail: (id: string) => ({ pathname: '/incidents/[id]', params: { id } }) as const,
  editIncident: (id: string) => ({ pathname: '/incidents/edit/[id]', params: { id } }) as const,
  siteDetail: (id: string) => ({ pathname: '/sites/[id]', params: { id } }) as const,
  templateDetail: (id: string) => ({ pathname: '/templates/[id]', params: { id } }) as const
};

export type AppHref =
  | Href
  | ReturnType<typeof routes.controlDetail>
  | ReturnType<typeof routes.editControl>
  | ReturnType<typeof routes.incidentDetail>
  | ReturnType<typeof routes.editIncident>
  | ReturnType<typeof routes.siteDetail>
  | ReturnType<typeof routes.templateDetail>;
