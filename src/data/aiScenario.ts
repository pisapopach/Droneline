import {
  RUSSIAN_AIRBASE_PRESETS,
  RUSSIAN_AIRCRAFT_BY_ID,
  type RussianAircraftId,
} from './airfields';
import {
  BUILDING_BY_ID,
  type AltitudeMode,
  type BuildingId,
  type MunitionId,
} from './munitions';
import {
  computeBearingDeg,
  haversineDistanceKm,
  isBlackOrAzovSeaPoint,
  isFlightPathAllowed,
} from '../utils/geoBoundaries';
import { isFactionPlacementAllowed } from '../utils/frontline2026';

export type AiWaveType = 'daily' | 'medium_massive' | 'massive';

export interface AiDirectorOptions {
  currentDay: number;
  waveType: AiWaveType;
  forceDailyKab: boolean;
}

export interface InitialBuildingTemplate {
  id: string;
  label: string;
  buildingId: BuildingId;
  lat: number;
  lng: number;
}

export interface AiLaunchOrigin {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface AiLauncherSpawn {
  id: string;
  munitionId: MunitionId;
  lat: number;
  lng: number;
  ammo: number;
  headingDeg: number;
  originName: string;
  isNavalShip?: boolean;
}

export interface AiWaveStrikeOrder {
  launcherId: string;
  munitionId: MunitionId;
  lowAltitude?: boolean;
  altitudeMode?: AltitudeMode;
  climbAtProgress?: number;
  postClimbAltitudeMode?: AltitudeMode;
  waypoints: Array<{ lat: number; lng: number }>;
  targetBuildingId?: string;
  targetPvoId?: string;
  delaySec: number;
  originName: string;
}

export interface AiAirfieldSortieOrder {
  airfieldPresetId: string;
  aircraftId: RussianAircraftId;
  missileCount: number;
  launchPoint: { lat: number; lng: number };
  missileWaypoints: Array<{ lat: number; lng: number }>;
  targetBuildingId?: string;
  targetPvoId?: string;
  delaySec: number;
}

export const AI_STARTING_MONEY = 950;
export const AI_FIRST_WAVE_PREP_SEC = 10;
export const AI_LAUNCHER_KILL_BOUNTY = 90;

export function getAiBuildingBounty(buildingId: BuildingId): number {
  const maxHp = BUILDING_BY_ID[buildingId].maxHp;
  return Math.max(120, Math.round(maxHp * 0.9));
}

export const INITIAL_AI_BUILDINGS: InitialBuildingTemplate[] = [
  { id: 'ai_bldg_kyiv', label: 'Киев (ТЭС)', buildingId: 'power-plant', lat: 50.4501, lng: 30.5234 },
  { id: 'ai_bldg_kharkiv', label: 'Харьков (Завод)', buildingId: 'factory', lat: 49.9935, lng: 36.2304 },
  { id: 'ai_bldg_dnipro', label: 'Днепр (Склад БК)', buildingId: 'ammo-depot', lat: 48.4647, lng: 35.0462 },
  { id: 'ai_bldg_odesa', label: 'Одесса (Порт)', buildingId: 'port', lat: 46.4825, lng: 30.7233 },
  { id: 'ai_bldg_zap', label: 'Запорожье (Меткомбинат)', buildingId: 'metallurgy', lat: 47.8388, lng: 35.1396 },
  { id: 'ai_bldg_kremenchuk', label: 'Кременчуг (НПЗ)', buildingId: 'oil-depot', lat: 49.0658, lng: 33.41 },
  { id: 'ai_bldg_lviv', label: 'Львов (Ж/Д узел)', buildingId: 'railway-hub', lat: 49.8397, lng: 24.0297 },
  { id: 'ai_bldg_mykolaiv', label: 'Николаев (Порт)', buildingId: 'port', lat: 46.975, lng: 31.9946 },
  { id: 'ai_bldg_vinnytsia', label: 'Винница (Штаб / КП)', buildingId: 'command-center', lat: 49.2331, lng: 28.4682 },
  { id: 'ai_bldg_poltava', label: 'Полтава (Воен. база)', buildingId: 'military-base', lat: 49.5883, lng: 34.5514 },
  { id: 'ai_bldg_kryvyi', label: 'Кривой Рог (Меткомбинат)', buildingId: 'metallurgy', lat: 47.9105, lng: 33.3918 },
  { id: 'ai_bldg_chernihiv', label: 'Чернигов (Воен. база)', buildingId: 'military-base', lat: 51.4982, lng: 31.2893 },
  { id: 'ai_bldg_sumy', label: 'Сумы (Заправка)', buildingId: 'gas-station', lat: 50.9077, lng: 34.7981 },
  { id: 'ai_bldg_cherkasy', label: 'Черкассы (Мост)', buildingId: 'bridge', lat: 49.4444, lng: 32.0598 },
  { id: 'ai_bldg_zhytomyr', label: 'Житомир (Склад БК)', buildingId: 'ammo-depot', lat: 50.2547, lng: 28.6587 },
  { id: 'ai_bldg_khmel', label: 'Хмельницкий (ТЭС)', buildingId: 'power-plant', lat: 49.4229, lng: 26.9871 },
  { id: 'ai_bldg_rivne', label: 'Ровно (Ж/Д узел)', buildingId: 'railway-hub', lat: 50.6199, lng: 26.2516 },
  { id: 'ai_bldg_ivano', label: 'Ивано-Франковск (Квартал)', buildingId: 'residential', lat: 48.9226, lng: 24.7111 },
];

export const INITIAL_AI_ENEMY_BUILDINGS: InitialBuildingTemplate[] = [
  { id: 'ai_ru_belgorod', label: 'Белгород (НПЗ)', buildingId: 'oil-depot', lat: 50.595, lng: 36.587 },
  { id: 'ai_ru_kursk', label: 'Курск (Склад БК)', buildingId: 'ammo-depot', lat: 51.737, lng: 36.187 },
  { id: 'ai_ru_voronezh', label: 'Воронеж (Воен. база)', buildingId: 'military-base', lat: 51.672, lng: 39.184 },
  { id: 'ai_ru_bryansk', label: 'Брянск (Завод)', buildingId: 'factory', lat: 53.243, lng: 34.363 },
  { id: 'ai_ru_millerovo', label: 'Миллерово (Воен. база)', buildingId: 'military-base', lat: 48.953, lng: 40.297 },
  { id: 'ai_ru_primorsko', label: 'Приморско-Ахтарск (Склад БК)', buildingId: 'ammo-depot', lat: 46.048, lng: 38.175 },
  { id: 'ai_ru_novorossiysk', label: 'Новороссийск (Порт)', buildingId: 'port', lat: 44.723, lng: 37.768 },
  { id: 'ai_ru_tuapse', label: 'Туапсе (НПЗ)', buildingId: 'oil-depot', lat: 44.105, lng: 39.077 },
  { id: 'ai_ru_taganrog', label: 'Таганрог (Ж/Д узел)', buildingId: 'railway-hub', lat: 47.236, lng: 38.896 },
  { id: 'ai_ru_rostov', label: 'Ростов-на-Дону (Штаб / КП)', buildingId: 'command-center', lat: 47.235, lng: 39.701 },
  { id: 'ai_ru_melitopol', label: 'Мелитополь (Воен. база)', buildingId: 'military-base', lat: 46.849, lng: 35.365 },
  { id: 'ai_ru_engels', label: 'Энгельс (ТЭС)', buildingId: 'power-plant', lat: 51.495, lng: 46.122 },
];

export const AI_LAUNCH_ORIGINS: AiLaunchOrigin[] = [
  { id: 'kursk', name: 'Курская обл.', lat: 51.7373, lng: 36.1873 },
  { id: 'millerovo', name: 'Миллерово', lat: 48.9531, lng: 40.2966 },
  { id: 'voronezh', name: 'Воронеж', lat: 51.672, lng: 39.1843 },
  { id: 'melitopol', name: 'Мелитополь', lat: 46.8489, lng: 35.3653 },
  { id: 'bryansk', name: 'Брянск', lat: 53.2435, lng: 34.3634 },
  { id: 'primorsko', name: 'Приморско-Ахтарск', lat: 46.08, lng: 38.22 },
];

const AI_KAB_FRONTLINE_ORIGINS: AiLaunchOrigin[] = [
  { id: 'kab_belgorod', name: 'Белгородское напр.', lat: 50.45, lng: 36.75 },
  { id: 'kab_tokmak', name: 'Запорожское напр.', lat: 47.34, lng: 35.58 },
  { id: 'kab_donetsk', name: 'Донецкое напр.', lat: 47.92, lng: 37.68 },
  { id: 'kab_sumy_border', name: 'Сумское приграничье', lat: 51.25, lng: 35.15 },
];

const AI_BLACK_SEA_SHIP_SPOTS: AiLaunchOrigin[] = [
  { id: 'ship_novoross', name: 'Чёрное море (Новороссийск)', lat: 44.28, lng: 37.18 },
  { id: 'ship_crimea_s', name: 'Чёрное море (ЮБК)', lat: 43.92, lng: 34.25 },
  { id: 'ship_crimea_w', name: 'Чёрное море (акватория)', lat: 44.32, lng: 32.25 },
];

const AI_STANDOFF_LAUNCH_POINTS: Record<
  string,
  { aircraftId: RussianAircraftId; launchPoint: { lat: number; lng: number } }
> = {
  savasleyka: { aircraftId: 'mig31k', launchPoint: { lat: 52.85, lng: 41.2 } },
  engels: { aircraftId: 'tu95', launchPoint: { lat: 51.35, lng: 43.4 } },
  shaykovka: { aircraftId: 'tu22m3', launchPoint: { lat: 53.1, lng: 34.8 } },
  baltimore: { aircraftId: 'su57-x69', launchPoint: { lat: 51.1, lng: 38.2 } },
  mozdok: { aircraftId: 'tu22m3', launchPoint: { lat: 45.6, lng: 42.1 } },
};

const SAFE_CORRIDOR_WAYPOINTS: Array<{ lat: number; lng: number }> = [
  { lat: 50.65, lng: 32.15 },
  { lat: 49.55, lng: 34.45 },
  { lat: 48.75, lng: 32.65 },
  { lat: 47.45, lng: 33.85 },
];

export function buildDynamicAiRedirectWaypoints(
  startLat: number,
  startLng: number,
  targetLat: number,
  targetLng: number,
  preferDogleg: boolean,
): Array<{ lat: number; lng: number }> | null {
  const directOk = isFlightPathAllowed(startLat, startLng, targetLat, targetLng).allowed;
  if (directOk && !preferDogleg) {
    return [
      { lat: startLat, lng: startLng },
      { lat: targetLat, lng: targetLng },
    ];
  }

  const shuffledCorridors = [...SAFE_CORRIDOR_WAYPOINTS].sort(() => Math.random() - 0.5);
  for (const mid of shuffledCorridors) {
    const midPt = {
      lat: mid.lat + (Math.random() - 0.5) * 0.45,
      lng: mid.lng + (Math.random() - 0.5) * 0.55,
    };
    const seg1 = isFlightPathAllowed(startLat, startLng, midPt.lat, midPt.lng).allowed;
    const seg2 = isFlightPathAllowed(midPt.lat, midPt.lng, targetLat, targetLng).allowed;
    if (seg1 && seg2) {
      return [{ lat: startLat, lng: startLng }, midPt, { lat: targetLat, lng: targetLng }];
    }
  }

  if (directOk) {
    return [
      { lat: startLat, lng: startLng },
      { lat: targetLat, lng: targetLng },
    ];
  }
  return null;
}

export function createInitialAiBuildings() {
  return INITIAL_AI_BUILDINGS.map((tpl) => {
    const spec = BUILDING_BY_ID[tpl.buildingId];
    return {
      id: tpl.id,
      buildingId: tpl.buildingId,
      lat: tpl.lat,
      lng: tpl.lng,
      hp: spec.maxHp,
      maxHp: spec.maxHp,
      isAi: false,
    };
  });
}

export function createInitialEnemyAiBuildings() {
  return INITIAL_AI_ENEMY_BUILDINGS.map((tpl) => {
    const spec = BUILDING_BY_ID[tpl.buildingId];
    return {
      id: tpl.id,
      buildingId: tpl.buildingId,
      lat: tpl.lat,
      lng: tpl.lng,
      hp: spec.maxHp,
      maxHp: spec.maxHp,
      isAi: true,
    };
  });
}

export function createInitialAiAirfields() {
  const aiPresetIds = new Set(['savasleyka', 'engels', 'shaykovka', 'baltimore', 'mozdok']);
  return RUSSIAN_AIRBASE_PRESETS.filter((p) => aiPresetIds.has(p.id)).map((preset) => {
    const acSpec = RUSSIAN_AIRCRAFT_BY_ID[preset.defaultAircraftId];
    return {
      id: `ai_af_${preset.id}`,
      name: preset.name,
      presetId: preset.id,
      faction: 'RU' as const,
      lat: preset.lat,
      lng: preset.lng,
      selectedAircraftId: preset.defaultAircraftId,
      availableAircraftIds: preset.availableAircraftIds,
      salvoCount: Math.min(2, acSpec.missileCount),
      isAi: true,
    };
  });
}

function jitterLauncherCoords(origin: AiLaunchOrigin): { lat: number; lng: number } {
  for (let i = 0; i < 8; i++) {
    const lat = origin.lat + (Math.random() - 0.5) * 0.36;
    const lng = origin.lng + (Math.random() - 0.5) * 0.46;
    if (isFactionPlacementAllowed('RU', lat, lng).allowed) {
      return { lat, lng };
    }
  }
  return { lat: origin.lat, lng: origin.lng };
}

function jitterSeaShipCoords(): { originName: string; lat: number; lng: number } | null {
  const spots = [...AI_BLACK_SEA_SHIP_SPOTS].sort(() => Math.random() - 0.5);
  for (const spot of spots) {
    for (let i = 0; i < 6; i++) {
      const lat = spot.lat + (Math.random() - 0.5) * 0.35;
      const lng = spot.lng + (Math.random() - 0.5) * 0.5;
      if (isBlackOrAzovSeaPoint(lat, lng)) {
        return { originName: spot.name, lat, lng };
      }
    }
    if (isBlackOrAzovSeaPoint(spot.lat, spot.lng)) {
      return { originName: spot.name, lat: spot.lat, lng: spot.lng };
    }
  }
  return null;
}

function randomShahedAltitude(): {
  altitudeMode: AltitudeMode;
  climbAtProgress?: number;
  postClimbAltitudeMode?: AltitudeMode;
} {
  const r = Math.random();
  const altMode: AltitudeMode = r < 0.36 ? 'ultra-low' : r < 0.78 ? 'low' : 'normal';
  const willClimb = altMode === 'ultra-low' && Math.random() < 0.85;
  return {
    altitudeMode: altMode,
    climbAtProgress: willClimb ? 0.42 + Math.random() * 0.32 : undefined,
    postClimbAltitudeMode: willClimb ? (Math.random() < 0.72 ? 'normal' : 'low') : undefined,
  };
}

/**
 * AI Director:
 * - 'daily': starts with few Shaheds (1-2 early -> scales up gently over time) + daily frontline КАБ when due.
 *   NEVER launches cruise/ballistic missiles on normal days.
 * - 'medium_massive': 3-5 Shaheds + Black Sea Kalibr ship + S-8000 Banderol / Iskander + tactical sortie.
 * - 'massive' (max once per 3-5 game weeks = 21-35 game days): 6-8 Shaheds + Black Sea Kalibr ship +
 *   S-8000 Banderol + Iskander-M + strategic Kh-101 / Kinzhal airfield sorties.
 */
export function generateAiWaveOrders(
  waveNumber: number,
  buildings: Array<{ id: string; lat: number; lng: number }>,
  pvoUnits: Array<{ id: string; lat: number; lng: number; isRadar?: boolean }>,
  options: AiDirectorOptions = { currentDay: 1, waveType: 'daily', forceDailyKab: waveNumber === 1 },
): {
  launchers: AiLauncherSpawn[];
  orders: AiWaveStrikeOrder[];
  airfieldSorties: AiAirfieldSortieOrder[];
  nextIntervalSec: number;
  waveType: AiWaveType;
  spawnedKab: boolean;
} {
  if (buildings.length === 0) {
    return {
      launchers: [],
      orders: [],
      airfieldSorties: [],
      nextIntervalSec: 22,
      waveType: options.waveType,
      spawnedKab: false,
    };
  }

  const { waveType, currentDay, forceDailyKab } = options;
  const orders: AiWaveStrikeOrder[] = [];
  const launchers: AiLauncherSpawn[] = [];
  const airfieldSorties: AiAirfieldSortieOrder[] = [];
  const combatPvo = pvoUnits.filter((p) => !p.isRadar);
  let spawnedKab = false;

  const plan: Array<{
    munitionId: MunitionId;
    altitudeMode: AltitudeMode;
    climbAtProgress?: number;
    postClimbAltitudeMode?: AltitudeMode;
  }> = [];

  // 1. Shahed count by wave type & progression (few at first, growing over days)
  let shahedCount = 1;
  if (waveType === 'massive') {
    shahedCount = 6 + Math.floor(Math.random() * 3); // 6-8
  } else if (waveType === 'medium_massive') {
    shahedCount = 3 + Math.floor(Math.random() * 3); // 3-5
  } else {
    if (waveNumber === 1) {
      shahedCount = 1;
    } else if (waveNumber === 2) {
      shahedCount = 2;
    } else if (waveNumber <= 5) {
      shahedCount = 2 + (Math.random() < 0.45 ? 1 : 0);
    } else {
      shahedCount = Math.min(5, 2 + Math.floor((waveNumber + currentDay) / 5));
    }
  }

  for (let i = 0; i < shahedCount; i++) {
    const canJet = waveNumber >= 2 && (i === shahedCount - 1 || waveType !== 'daily');
    const isJet = canJet && Math.random() < (waveType === 'daily' ? 0.28 : 0.38);
    const altCfg =
      waveNumber === 1 && i === 0
        ? {
            altitudeMode: 'ultra-low' as AltitudeMode,
            climbAtProgress: 0.54,
            postClimbAltitudeMode: 'normal' as AltitudeMode,
          }
        : randomShahedAltitude();
    plan.push({
      munitionId: isJet ? 'shahed-238' : 'shahed-136',
      ...altCfg,
    });
  }

  // 2. Missiles ONLY during 'medium_massive' or 'massive' attacks
  let kalibrShipCount = 0;
  if (waveType === 'medium_massive') {
    kalibrShipCount = 2 + Math.floor(Math.random() * 2); // 2-3 Kalibr from sea ship
    plan.push({ munitionId: 'banderol', altitudeMode: Math.random() < 0.5 ? 'low' : 'normal' });
    if (Math.random() < 0.65) {
      plan.push({ munitionId: 'banderol', altitudeMode: 'normal' });
    }
    if (Math.random() < 0.7) {
      plan.push({ munitionId: 'iskander', altitudeMode: 'normal' });
    }
  } else if (waveType === 'massive') {
    kalibrShipCount = 4 + Math.floor(Math.random() * 3); // 4-6 Kalibr from Black Sea ship
    plan.push({ munitionId: 'banderol', altitudeMode: 'low' });
    plan.push({ munitionId: 'banderol', altitudeMode: 'normal' });
    plan.push({ munitionId: 'iskander', altitudeMode: 'normal' });
    plan.push({ munitionId: 'iskander', altitudeMode: 'normal' });
  }

  const waveOrigins = [...AI_LAUNCH_ORIGINS].sort(() => Math.random() - 0.5);
  const launcherMap = new Map<string, AiLauncherSpawn>();

  plan.forEach((item, idx) => {
    const shouldTargetPvo =
      waveNumber >= 2 &&
      combatPvo.length > 0 &&
      Math.random() < (idx === plan.length - 1 ? 0.32 : 0.18);

    let targetLat = buildings[0].lat;
    let targetLng = buildings[0].lng;
    let targetBuildingId: string | undefined;
    let targetPvoId: string | undefined;

    if (shouldTargetPvo) {
      const chosenPvo = combatPvo[Math.floor(Math.random() * combatPvo.length)];
      targetLat = chosenPvo.lat;
      targetLng = chosenPvo.lng;
      targetPvoId = chosenPvo.id;
    } else {
      const chosenBldg = buildings[Math.floor(Math.random() * buildings.length)];
      targetLat = chosenBldg.lat;
      targetLng = chosenBldg.lng;
      targetBuildingId = chosenBldg.id;
    }

    const isDrone = item.munitionId === 'shahed-136' || item.munitionId === 'shahed-238';
    const originIdx = idx % Math.min(2, waveOrigins.length);
    const baseOrigin = waveOrigins[originIdx];
    const groupKey = `${baseOrigin.id}_${item.munitionId}`;

    let assignedLauncher = launcherMap.get(groupKey);
    if (!assignedLauncher) {
      const coords = jitterLauncherCoords(baseOrigin);
      assignedLauncher = {
        id: `ai_lnch_${waveNumber}_${launchers.length}_${Math.random().toString(36).slice(2, 6)}`,
        munitionId: item.munitionId,
        lat: coords.lat,
        lng: coords.lng,
        ammo: 0,
        headingDeg: computeBearingDeg(coords.lat, coords.lng, targetLat, targetLng),
        originName: baseOrigin.name,
      };
      launcherMap.set(groupKey, assignedLauncher);
      launchers.push(assignedLauncher);
    }

    const route = buildDynamicAiRedirectWaypoints(
      assignedLauncher.lat,
      assignedLauncher.lng,
      targetLat,
      targetLng,
      isDrone && Math.random() < 0.65,
    );

    if (route) {
      assignedLauncher.ammo += 1;
      orders.push({
        launcherId: assignedLauncher.id,
        munitionId: item.munitionId,
        lowAltitude: item.altitudeMode !== 'normal',
        altitudeMode: item.altitudeMode,
        climbAtProgress: item.climbAtProgress,
        postClimbAltitudeMode: item.postClimbAltitudeMode,
        waypoints: route,
        targetBuildingId,
        targetPvoId,
        delaySec: 2.8 + idx * (isDrone ? 1.3 : 1.0),
        originName: assignedLauncher.originName,
      });
    }
  });

  // 3. Naval Ship in Black Sea launching Kalibr missiles (strictly sea-based)
  if (kalibrShipCount > 0) {
    const seaSpot = jitterSeaShipCoords();
    if (seaSpot) {
      const shipId = `ai_ship_${waveNumber}_${Math.random().toString(36).slice(2, 6)}`;
      const firstBldg = buildings[Math.floor(Math.random() * buildings.length)];
      const shipSpawn: AiLauncherSpawn = {
        id: shipId,
        munitionId: 'kalibr',
        lat: seaSpot.lat,
        lng: seaSpot.lng,
        ammo: 0,
        headingDeg: computeBearingDeg(seaSpot.lat, seaSpot.lng, firstBldg.lat, firstBldg.lng),
        originName: seaSpot.originName,
        isNavalShip: true,
      };
      launchers.push(shipSpawn);

      for (let k = 0; k < kalibrShipCount; k++) {
        const chosenBldg = buildings[Math.floor(Math.random() * buildings.length)];
        const route = buildDynamicAiRedirectWaypoints(
          seaSpot.lat,
          seaSpot.lng,
          chosenBldg.lat,
          chosenBldg.lng,
          Math.random() < 0.55,
        );
        if (route) {
          shipSpawn.ammo += 1;
          orders.push({
            launcherId: shipId,
            munitionId: 'kalibr',
            lowAltitude: false,
            altitudeMode: 'normal',
            waypoints: route,
            targetBuildingId: chosenBldg.id,
            delaySec: 3.1 + k * 0.9,
            originName: seaSpot.originName,
          });
        }
      }
    }
  }

  // 4. Daily frontline КАБ attack (at least once every game day)
  if (forceDailyKab) {
    let bestOrigin: AiLaunchOrigin | null = null;
    let bestBldg: { id: string; lat: number; lng: number } | null = null;
    let bestDist = Infinity;

    for (const kabOrg of AI_KAB_FRONTLINE_ORIGINS) {
      for (const b of buildings) {
        const d = haversineDistanceKm(kabOrg.lat, kabOrg.lng, b.lat, b.lng);
        if (d <= 72 && d < bestDist && isFlightPathAllowed(kabOrg.lat, kabOrg.lng, b.lat, b.lng).allowed) {
          bestDist = d;
          bestOrigin = kabOrg;
          bestBldg = b;
        }
      }
    }

    if (bestOrigin && bestBldg) {
      const coords = jitterLauncherCoords(bestOrigin);
      const kabDist = haversineDistanceKm(coords.lat, coords.lng, bestBldg.lat, bestBldg.lng);
      if (kabDist <= 74 && isFlightPathAllowed(coords.lat, coords.lng, bestBldg.lat, bestBldg.lng).allowed) {
        const kabLauncherId = `ai_kab_${waveNumber}_${Math.random().toString(36).slice(2, 6)}`;
        launchers.push({
          id: kabLauncherId,
          munitionId: 'kab',
          lat: coords.lat,
          lng: coords.lng,
          ammo: 1,
          headingDeg: computeBearingDeg(coords.lat, coords.lng, bestBldg.lat, bestBldg.lng),
          originName: bestOrigin.name,
        });
        orders.push({
          launcherId: kabLauncherId,
          munitionId: 'kab',
          altitudeMode: 'normal',
          waypoints: [
            { lat: coords.lat, lng: coords.lng },
            { lat: bestBldg.lat, lng: bestBldg.lng },
          ],
          targetBuildingId: bestBldg.id,
          delaySec: 3.2,
          originName: bestOrigin.name,
        });
        spawnedKab = true;
      }
    }
  }

  // 5. Airfield sorties ONLY in medium_massive or massive raids (plus strategic Kh-101 / Kinzhal)
  if (waveType === 'massive') {
    const massiveSortieIds: string[] = ['engels', 'savasleyka'];
    for (let sIdx = 0; sIdx < massiveSortieIds.length; sIdx++) {
      const chosenPresetId = massiveSortieIds[sIdx];
      const sortieCfg = AI_STANDOFF_LAUNCH_POINTS[chosenPresetId];
      if (!sortieCfg) continue;
      const acSpec = RUSSIAN_AIRCRAFT_BY_ID[sortieCfg.aircraftId];
      const chosenBldg = buildings[Math.floor(Math.random() * buildings.length)];
      const mRoute = buildDynamicAiRedirectWaypoints(
        sortieCfg.launchPoint.lat,
        sortieCfg.launchPoint.lng,
        chosenBldg.lat,
        chosenBldg.lng,
        true,
      );
      if (mRoute) {
        airfieldSorties.push({
          airfieldPresetId: chosenPresetId,
          aircraftId: sortieCfg.aircraftId,
          missileCount: Math.min(chosenPresetId === 'engels' ? 3 : 2, acSpec.missileCount),
          launchPoint: sortieCfg.launchPoint,
          missileWaypoints: mRoute,
          targetBuildingId: chosenBldg.id,
          delaySec: 1.5 + sIdx * 2.2,
        });
      }
    }
  } else if (waveType === 'medium_massive') {
    const medPresetIds = ['baltimore', 'shaykovka', 'engels'];
    const chosenPresetId = medPresetIds[waveNumber % medPresetIds.length];
    const sortieCfg = AI_STANDOFF_LAUNCH_POINTS[chosenPresetId];
    if (sortieCfg) {
      const acSpec = RUSSIAN_AIRCRAFT_BY_ID[sortieCfg.aircraftId];
      const chosenBldg = buildings[Math.floor(Math.random() * buildings.length)];
      const mRoute = buildDynamicAiRedirectWaypoints(
        sortieCfg.launchPoint.lat,
        sortieCfg.launchPoint.lng,
        chosenBldg.lat,
        chosenBldg.lng,
        true,
      );
      if (mRoute) {
        airfieldSorties.push({
          airfieldPresetId: chosenPresetId,
          aircraftId: sortieCfg.aircraftId,
          missileCount: Math.min(2, acSpec.missileCount),
          launchPoint: sortieCfg.launchPoint,
          missileWaypoints: mRoute,
          targetBuildingId: chosenBldg.id,
          delaySec: 1.8,
        });
      }
    }
  }

  const validLaunchers = launchers.filter((l) => l.ammo > 0);
  const nextIntervalSec =
    waveType === 'massive'
      ? 26
      : waveType === 'medium_massive'
        ? 23
        : Math.max(17, 24 - Math.floor(waveNumber * 0.4));
  return {
    launchers: validLaunchers,
    orders,
    airfieldSorties,
    nextIntervalSec,
    waveType,
    spawnedKab,
  };
}
