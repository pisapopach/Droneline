import type {
  MapStats,
  MapStyleId,
  PlacedAirDefense,
  PlacedAirfield,
  PlacedBuilding,
  PlacedLauncher,
  TacticalEventPayload,
} from '../components/TacticalMap';
import { RUSSIAN_AIRCRAFT_BY_ID } from '../data/airfields';
import { AIR_DEFENSE_BY_ID, BUILDING_BY_ID, MUNITION_BY_ID } from '../data/munitions';

export const SANDBOX_SAVE_STORAGE_KEY = 'airdef_sandbox_save_v1';

export interface SavedSandboxEvent extends TacticalEventPayload {
  id: string;
  timestampMs: number;
  simTimeMinutes: number;
}

export interface SandboxSaveData {
  version: 1;
  savedAt: number;
  simTimeMinutes: number;
  buildingScale: number;
  mapStyle: MapStyleId;
  showFrontline: boolean;
  showRaions: boolean;
  showLabels: boolean;
  launchers: PlacedLauncher[];
  airfields: PlacedAirfield[];
  airDefenses: PlacedAirDefense[];
  buildings: PlacedBuilding[];
  stats: Pick<
    MapStats,
    'totalLaunches' | 'explosions' | 'intercepts' | 'misses' | 'destroyedByStrikes'
  >;
  eventLog: SavedSandboxEvent[];
}

export function computeSandboxFingerprint(params: {
  launchers: PlacedLauncher[];
  airfields: PlacedAirfield[];
  airDefenses: PlacedAirDefense[];
  buildings: PlacedBuilding[];
  buildingScale: number;
}): string {
  const playerLaunchers = params.launchers
    .filter((l) => !l.isAi)
    .map((l) => ({
      id: l.id,
      m: l.munitionId,
      lat: Math.round(l.lat * 1e5),
      lng: Math.round(l.lng * 1e5),
      ammo: l.ammo,
      ship: Boolean(l.isNavalShip),
    }));
  const playerAirfields = params.airfields
    .filter((a) => !a.isAi)
    .map((a) => ({
      id: a.id,
      ac: a.selectedAircraftId,
      salvo: a.salvoCount,
      lat: Math.round(a.lat * 1e5),
      lng: Math.round(a.lng * 1e5),
    }));
  const pvos = params.airDefenses.map((p) => ({
    id: p.id,
    t: p.airDefenseId,
    ammo: p.ammo,
    hp: Math.round(p.hp),
    lat: Math.round(p.lat * 1e5),
    lng: Math.round(p.lng * 1e5),
  }));
  const bldgs = params.buildings.map((b) => ({
    id: b.id,
    t: b.buildingId,
    hp: Math.round(b.hp),
    lat: Math.round(b.lat * 1e5),
    lng: Math.round(b.lng * 1e5),
  }));
  return JSON.stringify({
    s: Math.round(params.buildingScale * 100),
    l: playerLaunchers,
    a: playerAirfields,
    p: pvos,
    b: bldgs,
  });
}

export function saveSandboxState(data: SandboxSaveData): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(SANDBOX_SAVE_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadSandboxState(): SandboxSaveData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SANDBOX_SAVE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SandboxSaveData>;
    if (!parsed || parsed.version !== 1) return null;

    const launchers = Array.isArray(parsed.launchers)
      ? parsed.launchers.filter(
          (l): l is PlacedLauncher =>
            Boolean(l) &&
            !l.isAi &&
            typeof l.id === 'string' &&
            typeof l.lat === 'number' &&
            typeof l.lng === 'number' &&
            Boolean(MUNITION_BY_ID[l.munitionId]),
        )
      : [];

    const airfields = Array.isArray(parsed.airfields)
      ? parsed.airfields.filter(
          (a): a is PlacedAirfield =>
            Boolean(a) &&
            !a.isAi &&
            typeof a.id === 'string' &&
            typeof a.lat === 'number' &&
            typeof a.lng === 'number' &&
            Boolean(RUSSIAN_AIRCRAFT_BY_ID[a.selectedAircraftId]),
        )
      : [];

    const airDefenses = Array.isArray(parsed.airDefenses)
      ? parsed.airDefenses.filter(
          (p): p is PlacedAirDefense =>
            Boolean(p) &&
            typeof p.id === 'string' &&
            typeof p.lat === 'number' &&
            typeof p.lng === 'number' &&
            typeof p.hp === 'number' &&
            p.hp > 0 &&
            Boolean(AIR_DEFENSE_BY_ID[p.airDefenseId]),
        )
      : [];

    const buildings = Array.isArray(parsed.buildings)
      ? parsed.buildings.filter(
          (b): b is PlacedBuilding =>
            Boolean(b) &&
            typeof b.id === 'string' &&
            typeof b.lat === 'number' &&
            typeof b.lng === 'number' &&
            typeof b.hp === 'number' &&
            b.hp > 0 &&
            Boolean(BUILDING_BY_ID[b.buildingId]),
        )
      : [];

    if (
      launchers.length === 0 &&
      airfields.length === 0 &&
      airDefenses.length === 0 &&
      buildings.length === 0
    ) {
      return null;
    }

    const eventLog = Array.isArray(parsed.eventLog)
      ? parsed.eventLog
          .filter(
            (e): e is SavedSandboxEvent =>
              Boolean(e) &&
              typeof e.id === 'string' &&
              typeof e.detail === 'string' &&
              Boolean(MUNITION_BY_ID[e.munitionId]),
          )
          .slice(0, 40)
      : [];

    const mapStyle: MapStyleId =
      parsed.mapStyle === 'google-sat' || parsed.mapStyle === 'arcgis-topo'
        ? parsed.mapStyle
        : 'arcgis-sat';

    return {
      version: 1,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
      simTimeMinutes:
        typeof parsed.simTimeMinutes === 'number' && Number.isFinite(parsed.simTimeMinutes)
          ? parsed.simTimeMinutes
          : 120,
      buildingScale:
        typeof parsed.buildingScale === 'number' &&
        parsed.buildingScale >= 0.5 &&
        parsed.buildingScale <= 2
          ? parsed.buildingScale
          : 1,
      mapStyle,
      showFrontline: typeof parsed.showFrontline === 'boolean' ? parsed.showFrontline : true,
      showRaions: typeof parsed.showRaions === 'boolean' ? parsed.showRaions : true,
      showLabels: typeof parsed.showLabels === 'boolean' ? parsed.showLabels : true,
      launchers,
      airfields,
      airDefenses,
      buildings,
      stats: {
        totalLaunches: Number(parsed.stats?.totalLaunches) || 0,
        explosions: Number(parsed.stats?.explosions) || 0,
        intercepts: Number(parsed.stats?.intercepts) || 0,
        misses: Number(parsed.stats?.misses) || 0,
        destroyedByStrikes: Number(parsed.stats?.destroyedByStrikes) || 0,
      },
      eventLog,
    };
  } catch {
    return null;
  }
}

export function clearSandboxSave(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SANDBOX_SAVE_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

export function countSandboxUnits(data: {
  launchers: PlacedLauncher[];
  airfields: PlacedAirfield[];
  airDefenses: PlacedAirDefense[];
  buildings: PlacedBuilding[];
}): number {
  return (
    data.launchers.filter((l) => !l.isAi).length +
    data.airfields.filter((a) => !a.isAi).length +
    data.airDefenses.length +
    data.buildings.length
  );
}

export function formatSavedAtLabel(savedAtMs: number): string {
  try {
    const d = new Date(savedAtMs);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}.${mm} ${hh}:${min}`;
  } catch {
    return '';
  }
}
