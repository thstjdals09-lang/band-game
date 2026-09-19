// Route map + per-route meta (screen layer, dock state). Single source for AppShell + navigation rules.
import { matchPath } from 'react-router-dom';
import type { ReactElement } from 'react';

import { NewGameScreen } from '@/screens/start/NewGame';
import { BasecampHomeScreen } from '@/screens/home/BasecampHome';
import { OpportunityInboxScreen } from '@/screens/home/OpportunityInbox';
import { LineupScreen } from '@/screens/band/Lineup';
import { MembersScreen } from '@/screens/band/Members';
import { MemberDetailScreen } from '@/screens/band/MemberDetail';
import { ChemistryScreen } from '@/screens/band/Chemistry';
import { SongsScreen } from '@/screens/band/Songs';
import { AuditionScreen } from '@/screens/audition/Audition';
import { CandidateDetailScreen } from '@/screens/audition/CandidateDetail';
import { CompareScreen } from '@/screens/audition/Compare';
import { ContractScreen } from '@/screens/audition/Contract';
import { ScheduleScreen } from '@/screens/schedule/Schedule';
import { WeekResolutionScreen } from '@/screens/schedule/WeekResolution';
import { PerformancePrepScreen } from '@/screens/performance/PerformancePrep';
import { PerformanceScreen } from '@/screens/performance/Performance';
import { PerformanceResultScreen } from '@/screens/performance/PerformanceResult';
import { ManagementScreen } from '@/screens/management/Management';
import { FinanceScreen } from '@/screens/management/Finance';
import { FacilitiesScreen } from '@/screens/management/Facilities';
import { FacilityBuildScreen } from '@/screens/management/FacilityBuild';
import { ContractsScreen } from '@/screens/management/Contracts';
import { OutsideScreen } from '@/screens/outside/Outside';
import { LocalVenuesScreen } from '@/screens/outside/LocalVenues';
import {
  FansChartsScreen, CareerArchiveScreen, PublicProfileScreen, HistoryScreen,
  RivalsScreen, RankingsScreen, LabelsScreen, WorldOverseasScreen, StaffScreen, EquipmentScreen,
} from '@/screens/future/FutureScreens';
import { DevToolsScreen } from '@/screens/dev/DevTools';
import { WorldLabScreen } from '@/screens/dev/WorldLab';

export type DockId = 'band' | 'schedule' | 'audition' | 'management' | 'outside';
export type ScreenLayer = 'world' | 'panel' | 'immersive';

export interface RouteMeta {
  layer: ScreenLayer;
  dock?: DockId;        // which dock item is active (none on HOME)
  topLevel?: boolean;   // Close -> HOME
  requiresSave?: boolean; // default true
  title: string;
  status: 'implemented' | 'shell';
}

export interface RouteDef { path: string; meta: RouteMeta; element: ReactElement }

export const DOCK_ITEMS: { id: DockId; label: string; path: string; iconKey: string }[] = [
  { id: 'band', label: '밴드', path: '/band', iconKey: 'ICON_DOCK_BAND' },
  { id: 'schedule', label: '일정', path: '/schedule', iconKey: 'ICON_DOCK_SCHEDULE' },
  { id: 'audition', label: '오디션', path: '/audition', iconKey: 'ICON_DOCK_AUDITION' },
  { id: 'management', label: '경영', path: '/management', iconKey: 'ICON_DOCK_MANAGEMENT' },
  { id: 'outside', label: '외부', path: '/outside', iconKey: 'ICON_DOCK_OUTSIDE' },
];

const panel = (dock: DockId, title: string, topLevel = false): RouteMeta => ({ layer: 'panel', dock, topLevel, title, status: 'implemented' });
const shell = (dock: DockId, title: string): RouteMeta => ({ layer: 'panel', dock, title, status: 'shell' });
const immersive = (title: string): RouteMeta => ({ layer: 'immersive', title, status: 'implemented' });

export const ROUTES: RouteDef[] = [
  { path: '/start', meta: { layer: 'immersive', requiresSave: false, title: 'NEW GAME', status: 'implemented' }, element: <NewGameScreen /> },
  { path: '/', meta: { layer: 'world', title: 'BASECAMP HOME', status: 'implemented' }, element: <BasecampHomeScreen /> },
  { path: '/inbox', meta: { layer: 'panel', title: 'OPPORTUNITY INBOX', status: 'implemented' }, element: <OpportunityInboxScreen /> },

  // BAND
  { path: '/band', meta: panel('band', 'BAND / LINEUP', true), element: <LineupScreen /> },
  { path: '/band/lineup', meta: panel('band', 'BAND / LINEUP', true), element: <LineupScreen /> },
  { path: '/band/members', meta: panel('band', 'BAND / MEMBERS', true), element: <MembersScreen /> },
  { path: '/band/members/:id', meta: panel('band', 'MEMBER DETAIL'), element: <MemberDetailScreen /> },
  { path: '/band/chemistry', meta: panel('band', 'BAND / CHEMISTRY', true), element: <ChemistryScreen /> },
  { path: '/band/songs', meta: panel('band', 'BAND / SONGS', true), element: <SongsScreen /> },
  { path: '/band/fans', meta: shell('band', 'FANS & CHARTS'), element: <FansChartsScreen /> },
  { path: '/band/archive', meta: shell('band', 'CAREER ARCHIVE'), element: <CareerArchiveScreen /> },
  { path: '/band/profile', meta: shell('band', 'PUBLIC PROFILE'), element: <PublicProfileScreen /> },
  { path: '/band/history', meta: shell('band', 'HISTORY'), element: <HistoryScreen /> },

  // AUDITION
  { path: '/audition', meta: panel('audition', 'AUDITION', true), element: <AuditionScreen /> },
  { path: '/audition/candidate/:id', meta: immersive('CANDIDATE DETAIL'), element: <CandidateDetailScreen /> },
  { path: '/audition/compare', meta: panel('audition', 'COMPARE'), element: <CompareScreen /> },
  { path: '/audition/contract/:id', meta: immersive('CONTRACT'), element: <ContractScreen /> },

  // SCHEDULE
  { path: '/schedule', meta: panel('schedule', 'SCHEDULE', true), element: <ScheduleScreen /> },
  { path: '/schedule/resolution', meta: immersive('WEEK RESOLUTION'), element: <WeekResolutionScreen /> },

  // PERFORMANCE
  { path: '/performance/prep', meta: panel('outside', 'PERFORMANCE PREP'), element: <PerformancePrepScreen /> },
  { path: '/performance/live', meta: immersive('PERFORMANCE'), element: <PerformanceScreen /> },
  { path: '/performance/result', meta: immersive('PERFORMANCE RESULT'), element: <PerformanceResultScreen /> },

  // MANAGEMENT
  { path: '/management', meta: panel('management', 'MANAGEMENT', true), element: <ManagementScreen /> },
  { path: '/management/finance', meta: panel('management', 'FINANCE'), element: <FinanceScreen /> },
  { path: '/management/facilities', meta: panel('management', 'FACILITIES'), element: <FacilitiesScreen /> },
  { path: '/management/facilities/build/:id', meta: panel('management', 'FACILITY BUILD'), element: <FacilityBuildScreen /> },
  { path: '/management/contracts', meta: panel('management', 'CONTRACTS'), element: <ContractsScreen /> },
  { path: '/management/staff', meta: shell('management', 'STAFF'), element: <StaffScreen /> },
  { path: '/management/equipment', meta: shell('management', 'EQUIPMENT'), element: <EquipmentScreen /> },

  // OUTSIDE
  { path: '/outside', meta: panel('outside', 'OUTSIDE', true), element: <OutsideScreen /> },
  { path: '/outside/venues', meta: panel('outside', 'LOCAL VENUES'), element: <LocalVenuesScreen /> },
  { path: '/outside/rivals', meta: shell('outside', 'RIVALS'), element: <RivalsScreen /> },
  { path: '/outside/rankings', meta: shell('outside', 'RANKINGS'), element: <RankingsScreen /> },
  { path: '/outside/labels', meta: shell('outside', 'LABELS'), element: <LabelsScreen /> },
  { path: '/outside/world', meta: shell('outside', 'WORLD / OVERSEAS'), element: <WorldOverseasScreen /> },

  // DEV (prototype only)
  { path: '/dev', meta: { layer: 'panel', title: 'DEV TOOLS', status: 'implemented', requiresSave: false }, element: <DevToolsScreen /> },
  { path: '/dev/world', meta: { layer: 'panel', title: 'ISOMETRIC WORLD LAB', status: 'implemented' }, element: <WorldLabScreen /> },
];

const FALLBACK: RouteMeta = { layer: 'panel', title: '', status: 'shell' };

export function getRouteMeta(pathname: string): RouteMeta {
  for (const r of ROUTES) {
    if (matchPath({ path: r.path, end: true }, pathname)) return r.meta;
  }
  return FALLBACK;
}
