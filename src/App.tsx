import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  ArrowLeft,
  BarChart3,
  BatteryFull,
  BellRing,
  Building2,
  Clock,
  Coins,
  Crosshair,
  Eye,
  Layers,
  Map as MapIcon,
  Menu,
  Minus,
  Navigation,
  Plane,
  Play,
  Plus,
  Radar,
  RefreshCw,
  RotateCcw,
  Route,
  Save,
  ScrollText,
  Search,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  Smartphone,
  Swords,
  Timer,
  Trash2,
  Undo2,
  Volume2,
  VolumeX,
  Wifi,
  Wrench,
  X,
} from 'lucide-react';
import {
  AirDefenseIcon,
  AirfieldIcon,
  BuildingIcon,
  MunitionIcon,
  RussianAircraftIcon,
  ShipIcon,
} from './components/MunitionIcon';
import { MobileHud } from './components/MobileHud';
import {
  TacticalMap,
  type MapStats,
  type MapStyleId,
  type PendingPlacement,
  type PlacedAirDefense,
  type PlacedAirfield,
  type PlacedBuilding,
  type PlacedLauncher,
  type RoutePoint,
  type SelectedFlightInfo,
  type TacticalEventPayload,
  type TelegramIntelPayload,
} from './components/TacticalMap';
import {
  ALL_AIRCRAFT,
  RUSSIAN_AIRBASE_PRESETS,
  RUSSIAN_AIRCRAFT_BY_ID,
  UKRAINIAN_AIRBASE_PRESETS,
  type RussianAirbasePreset,
  type RussianAircraftId,
} from './data/airfields';
import {
  AI_FIRST_WAVE_PREP_SEC,
  AI_LAUNCHER_KILL_BOUNTY,
  AI_STARTING_MONEY,
  INITIAL_AI_BUILDINGS,
  INITIAL_AI_ENEMY_BUILDINGS,
  createInitialAiAirfields,
  createInitialAiBuildings,
  createInitialEnemyAiBuildings,
  generateAiWaveOrders,
  getAiBuildingBounty,
  type AiAirfieldSortieOrder,
  type AiWaveStrikeOrder,
  type AiWaveType,
} from './data/aiScenario';
import {
  AIR_DEFENSE_BY_ID,
  AIR_DEFENSE_SYSTEMS,
  BUILDING_BY_ID,
  BUILDINGS,
  MUNITION_BY_ID,
  MUNITIONS,
  UA_AIRFIELD_AI_COST,
  type AirDefenseId,
  type AltitudeMode,
  type BuildingId,
  type MunitionId,
} from './data/munitions';
import { isPointInOccupiedTerritory } from './utils/frontline2026';
import { getTerritoryAt } from './utils/geoBoundaries';
import {
  APP_LANG_OPTIONS,
  formatSavedAtLabel,
  formatSimClock,
  formatSimDateShort,
  formatSimTimeShort,
  getAircraftLocalized,
  getBuildingLocalized,
  getMunitionLocalized,
  getPvoLocalized,
  getUiText,
  loadAppLang,
  saveAppLang,
  type AppLang,
} from './utils/i18n';
import { soundFx } from './utils/soundFx';
import {
  RUSSIA_TELEGRAM_CHANNELS,
  UKRAINE_TELEGRAM_CHANNELS,
  buildTelegramMessageText,
  computeCompassDirectionRu,
  formatOblastShortLabel,
  getTelegramChannelByOblast,
  type TelegramPost,
} from './utils/telegramIntel';
import {
  clearSandboxSave,
  computeSandboxFingerprint,
  countSandboxUnits,
  loadSandboxState,
  saveSandboxState,
  type SandboxSaveData,
} from './utils/sandboxStorage';

type GameMode = 'sandbox' | 'ai';
type GameScreen = 'menu' | 'playing' | 'gameover';
type CatalogFilter = 'all' | 'strike' | 'pvo' | 'infra' | 'units' | 'settings';
type DrawerTab = 'stats' | 'log';
type JournalFilter = 'all' | 'intercept' | 'impact' | 'miss' | 'launch';

interface TacticalEventEntry extends TacticalEventPayload {
  id: string;
  timestampMs: number;
  simTimeMinutes: number;
}

const MANUAL_AIRFIELD_SQUADRONS: RussianAircraftId[][] = [
  ['mig31k', 'su57-x69'],
  ['tu95', 'tu160'],
  ['tu22m3', 'mig31k'],
  ['su57-x69', 'tu22m3'],
  ['tu160', 'tu95'],
];
const MANUAL_UA_AIRFIELD_SQUADRONS: RussianAircraftId[][] = [
  ['su24m', 'f16am'],
  ['mig29ua', 'su24m'],
  ['f16am', 'mig29ua'],
];

function detectMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  return w < 768 || (coarse && w < 960 && h < 1024);
}
const INITIAL_SIM_MINUTES = 120; // 23 ноя 2026 · 02:00 (Д.1)
const SIM_MINUTES_PER_REAL_SEC = 10; // 10 минут игровых = 1 секунда в реальной жизни

function findLastTelegramPost(posts: TelegramPost[], oblast: string): TelegramPost | undefined {
  for (let i = posts.length - 1; i >= 0; i -= 1) {
    if (posts[i].oblast === oblast) return posts[i];
  }
  return undefined;
}

const EMPTY_STATS: MapStats = {
  activeFlights: 0,
  activeDrones: 0,
  activeMissiles: 0,
  activeAircraft: 0,
  totalLaunches: 0,
  explosions: 0,
  intercepts: 0,
  misses: 0,
  destroyedByStrikes: 0,
  droneAlertRaions: 0,
  missileAlertRaions: 0,
};

export default function App() {
  const [lang, setLang] = useState<AppLang>(() => loadAppLang());
  const t = getUiText(lang);
  const handleChangeLang = useCallback((nextLang: AppLang) => {
    setLang(nextLang);
    saveAppLang(nextLang);
    soundFx.playUiClick('tap');
  }, []);

  const [gameScreen, setGameScreen] = useState<GameScreen>('menu');
  const [menuStep, setMenuStep] = useState<'title' | 'modes'>('title');
  const [gameMode, setGameMode] = useState<GameMode>('sandbox');
  const [aiOutcome, setAiOutcome] = useState<'defeat' | 'victory'>('defeat');
  const [savedSandbox, setSavedSandbox] = useState<SandboxSaveData | null>(() => loadSandboxState());
  const [sandboxExitPromptOpen, setSandboxExitPromptOpen] = useState<boolean>(false);
  const [restoreStatsTrigger, setRestoreStatsTrigger] = useState<{
    seq: number;
    stats: MapStats;
  } | null>(null);
  const lastSavedFingerprintRef = useRef<string | null>(null);

  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter>('all');
  const [pendingPlacement, setPendingPlacement] = useState<PendingPlacement | null>(null);
  const [launchers, setLaunchers] = useState<PlacedLauncher[]>([]);
  const [airfields, setAirfields] = useState<PlacedAirfield[]>([]);
  const [airDefenses, setAirDefenses] = useState<PlacedAirDefense[]>([]);
  const [buildings, setBuildings] = useState<PlacedBuilding[]>([]);

  const [selectedLauncherId, setSelectedLauncherId] = useState<string | null>(null);
  const [selectedAirfieldId, setSelectedAirfieldId] = useState<string | null>(null);
  const [airfieldLaunchPoint, setAirfieldLaunchPoint] = useState<RoutePoint | null>(null);
  const [airfieldMissileWaypoints, setAirfieldMissileWaypoints] = useState<RoutePoint[]>([]);
  const [launchAirfieldSignal, setLaunchAirfieldSignal] = useState<number>(0);
  const [airfieldMenuOpen, setAirfieldMenuOpen] = useState<boolean>(false);
  const [uaAirfieldMenuOpen, setUaAirfieldMenuOpen] = useState<boolean>(false);
  const [airfieldModalStep, setAirfieldModalStep] = useState<'aircraft' | 'missiles' | null>(null);
  const [su57DropPoint, setSu57DropPoint] = useState<RoutePoint | null>(null);

  const [isMobile, setIsMobile] = useState<boolean>(() => detectMobileViewport());
  const [mobileSteerDir, setMobileSteerDir] = useState<-1 | 0 | 1>(0);

  // Mid-flight dynamic route steering & Shahed nose follow-cam
  const [selectedFlight, setSelectedFlight] = useState<SelectedFlightInfo | null>(null);
  const [followCamActive, setFollowCamActive] = useState<boolean>(false);
  const [exitFollowCamSignal, setExitFollowCamSignal] = useState<number>(0);
  const [detonateFlightSignal, setDetonateFlightSignal] = useState<number>(0);
  const [isPlottingFlightRoute, setIsPlottingFlightRoute] = useState<boolean>(false);
  const [flightRouteWaypoints, setFlightRouteWaypoints] = useState<RoutePoint[]>([]);
  const [applyFlightRouteSignal, setApplyFlightRouteSignal] = useState<number>(0);
  const [flightAltitudeCommand, setFlightAltitudeCommand] = useState<{
    id: string;
    altitudeMode: AltitudeMode;
    seq: number;
  } | null>(null);

  // Drawer: Statistics & Event Log + Smartphone Telegram Monitor
  const [eventLog, setEventLog] = useState<TacticalEventEntry[]>([]);
  const [eventDrawerOpen, setEventDrawerOpen] = useState<boolean>(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('stats');
  const [journalFilter, setJournalFilter] = useState<JournalFilter>('all');
  const [telegramOpen, setTelegramOpen] = useState<boolean>(false);
  const [phoneScreen, setPhoneScreen] = useState<'telegram' | 'home'>('telegram');
  const [telegramCountryFilter, setTelegramCountryFilter] = useState<'UA' | 'RU'>('UA');
  const [selectedTelegramOblast, setSelectedTelegramOblast] = useState<string | null>(null);
  const [telegramSearch, setTelegramSearch] = useState<string>('');
  const [telegramPosts, setTelegramPosts] = useState<TelegramPost[]>([]);
  const [telegramUnreadByOblast, setTelegramUnreadByOblast] = useState<Record<string, number>>({});
  const telegramChatEndRef = useRef<HTMLDivElement | null>(null);

  // Launcher route plotting
  const [isPlottingRoute, setIsPlottingRoute] = useState<boolean>(false);
  const [routeWaypoints, setRouteWaypoints] = useState<RoutePoint[]>([]);
  const [routeLaunchCount, setRouteLaunchCount] = useState<number>(1);
  const [routeAltitudeMode, setRouteAltitudeMode] = useState<AltitudeMode>('normal');
  const [launchRouteSignal, setLaunchRouteSignal] = useState<number>(0);

  // AI Mode Economy, Airbases & Wave State
  const [money, setMoney] = useState<number>(AI_STARTING_MONEY);
  const [aiWaveNumber, setAiWaveNumber] = useState<number>(0);
  const [aiWaveCountdownSec, setAiWaveCountdownSec] = useState<number>(AI_FIRST_WAVE_PREP_SEC);
  const [aiWaveSignal, setAiWaveSignal] = useState<number>(0);
  const [pendingAiWaveOrders, setPendingAiWaveOrders] = useState<AiWaveStrikeOrder[]>([]);
  const [pendingAiSorties, setPendingAiSorties] = useState<AiAirfieldSortieOrder[]>([]);
  const [aiSurvivedSec, setAiSurvivedSec] = useState<number>(0);
  const [simTimeMinutes, setSimTimeMinutes] = useState<number>(INITIAL_SIM_MINUTES);

  const [buildingScale, setBuildingScale] = useState<number>(1);
  const [timeScale, setTimeScale] = useState<number>(1);
  const [mapStyle, setMapStyle] = useState<MapStyleId>('arcgis-sat');
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showRaions, setShowRaions] = useState<boolean>(true);
  const [showFrontline, setShowFrontline] = useState<boolean>(true);
  const [sirenEnabled, setSirenEnabled] = useState<boolean>(true);
  const [sirenVolume, setSirenVolume] = useState<number>(0.65);
  const [droneVolume, setDroneVolume] = useState<number>(0.75);
  const [missileVolume, setMissileVolume] = useState<number>(0.75);
  const [alertHoldoverSec, setAlertHoldoverSec] = useState<number>(6);
  const [alertRadiusKm, setAlertRadiusKm] = useState<number>(50);
  const [muted, setMuted] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [clearSignal, setClearSignal] = useState<number>(0);
  const [focusCoords, setFocusCoords] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
  } | null>(null);
  const [stats, setStats] = useState<MapStats>(EMPTY_STATS);
  const [warning, setWarning] = useState<string | null>(null);
  const warningTimerRef = useRef<number | null>(null);

  const langRef = useRef(lang);
  langRef.current = lang;
  const gameModeRef = useRef(gameMode);
  gameModeRef.current = gameMode;
  const moneyRef = useRef(money);
  moneyRef.current = money;
  const launchersRef = useRef(launchers);
  launchersRef.current = launchers;
  const airfieldsRef = useRef(airfields);
  airfieldsRef.current = airfields;
  const buildingsRef = useRef(buildings);
  buildingsRef.current = buildings;
  const airDefensesRef = useRef(airDefenses);
  airDefensesRef.current = airDefenses;
  const timeScaleRef = useRef(timeScale);
  timeScaleRef.current = timeScale;
  const simTimeMinutesRef = useRef(simTimeMinutes);
  simTimeMinutesRef.current = simTimeMinutes;
  const aiWaveNumberRef = useRef(aiWaveNumber);
  aiWaveNumberRef.current = aiWaveNumber;
  const aiWaveCountdownRef = useRef(aiWaveCountdownSec);
  const lastKabDayRef = useRef(0);
  const lastMediumDayRef = useRef(0);
  const nextMassiveDayRef = useRef(6);
  const aiHadPlayerBuildingsRef = useRef(false);
  const aiHadEnemyBuildingsRef = useRef(false);
  const telegramOpenRef = useRef(telegramOpen);
  telegramOpenRef.current = telegramOpen;
  const selectedTelegramOblastRef = useRef(selectedTelegramOblast);
  selectedTelegramOblastRef.current = selectedTelegramOblast;

  const showWarning = useCallback((msg: string) => {
    setWarning(msg);
    if (warningTimerRef.current) {
      window.clearTimeout(warningTimerRef.current);
    }
    warningTimerRef.current = window.setTimeout(() => {
      setWarning(null);
    }, 3200);
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(detectMobileViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!selectedFlight) {
      setMobileSteerDir(0);
    }
  }, [selectedFlight]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundFx.setMuted(next);
      return next;
    });
  }, []);

  useEffect(() => {
    soundFx.setSirenEnabled(sirenEnabled);
  }, [sirenEnabled]);

  useEffect(() => {
    soundFx.setSirenVolume(sirenVolume);
  }, [sirenVolume]);

  useEffect(() => {
    soundFx.setDroneVolume(droneVolume);
  }, [droneVolume]);

  useEffect(() => {
    soundFx.setMissileVolume(missileVolume);
  }, [missileVolume]);

  // In-game clock: 3 in-game minutes = 1 real second (scaled by timeScale)
  useEffect(() => {
    if (gameScreen !== 'playing') return;
    const tickMs = 250;
    const id = window.setInterval(() => {
      setSimTimeMinutes((prev) => prev + SIM_MINUTES_PER_REAL_SEC * (tickMs / 1000) * timeScaleRef.current);
    }, tickMs);
    return () => window.clearInterval(id);
  }, [gameScreen]);

  // AI Mode Economy (+$/sec per surviving player building), launcher deployment & Wave Director loop
  useEffect(() => {
    if (gameScreen !== 'playing' || gameMode !== 'ai') return;
    const tickMs = 250;
    const id = window.setInterval(() => {
      const currentPlayerBuildings = buildingsRef.current.filter((b) => !b.isAi);
      if (currentPlayerBuildings.length === 0) return;
      const now = Date.now();
      const simDt = (tickMs / 1000) * timeScaleRef.current;
      const currentIncomePerSec = currentPlayerBuildings.reduce(
        (sum, b) => sum + BUILDING_BY_ID[b.buildingId].incomePerSec,
        0,
      );
      if (currentIncomePerSec > 0) {
        setMoney((prev) => prev + currentIncomePerSec * simDt);
      }
      setAiSurvivedSec((prev) => prev + simDt);

      // Remove depleted AI launchers ~7s after their final launch
      setLaunchers((prev) => {
        const hasExpired = prev.some(
          (l) => l.isAi && l.ammo <= 0 && l.lastLaunchAt > 0 && now - l.lastLaunchAt >= 7000,
        );
        if (!hasExpired) return prev;
        return prev.filter(
          (l) => !(l.isAi && l.ammo <= 0 && l.lastLaunchAt > 0 && now - l.lastLaunchAt >= 7000),
        );
      });

      aiWaveCountdownRef.current -= simDt;
      if (aiWaveCountdownRef.current <= 0) {
        const nextWave = aiWaveNumberRef.current + 1;
        const currentDay = Math.floor(Math.max(0, simTimeMinutesRef.current) / 1440) + 1;
        let waveType: AiWaveType = 'daily';
        if (currentDay >= nextMassiveDayRef.current) {
          waveType = 'massive';
          // Maximum once every 3-5 game weeks (21-35 game days)
          nextMassiveDayRef.current = currentDay + 21 + Math.floor(Math.random() * 15);
          lastMediumDayRef.current = currentDay;
        } else if (
          currentDay >= 3 &&
          currentDay - lastMediumDayRef.current >= 3 &&
          Math.random() < 0.45
        ) {
          waveType = 'medium_massive';
          lastMediumDayRef.current = currentDay;
        }
        const forceDailyKab = currentDay > lastKabDayRef.current;

        const pvoSummary = airDefensesRef.current.map((p) => ({
          id: p.id,
          lat: p.lat,
          lng: p.lng,
          isRadar: Boolean(AIR_DEFENSE_BY_ID[p.airDefenseId].isRadar),
        }));
        const {
          launchers: waveLaunchers,
          orders,
          airfieldSorties,
          nextIntervalSec,
          spawnedKab,
        } = generateAiWaveOrders(nextWave, currentPlayerBuildings, pvoSummary, {
          currentDay,
          waveType,
          forceDailyKab,
        });
        if (spawnedKab) {
          lastKabDayRef.current = currentDay;
        }
        aiWaveNumberRef.current = nextWave;
        setAiWaveNumber(nextWave);
        aiWaveCountdownRef.current = nextIntervalSec;
        setAiWaveCountdownSec(nextIntervalSec);

        if (waveType === 'massive') {
          showWarning(
            langRef.current === 'uk'
              ? 'Увага: зафіксовано масовану ракетно-дронову атаку!'
              : langRef.current === 'en'
                ? 'Warning: Massive missile & UAV strike detected!'
                : 'Внимание: фиксируется массированная ракетно-дроновая атака!',
          );
        } else if (waveType === 'medium_massive') {
          showWarning(
            langRef.current === 'uk'
              ? 'Увага: комбінований ракетно-дроновий удар ворога!'
              : langRef.current === 'en'
                ? 'Warning: Combined enemy missile & UAV strike incoming!'
                : 'Внимание: комбинированный ракетно-дроновый удар противника!',
          );
        }

        if (waveLaunchers.length > 0) {
          const placedAiLaunchers: PlacedLauncher[] = waveLaunchers.map((wl) => ({
            id: wl.id,
            munitionId: wl.munitionId,
            lat: wl.lat,
            lng: wl.lng,
            ammo: wl.ammo,
            maxAmmo: wl.ammo,
            lastLaunchAt: 0,
            headingDeg: wl.headingDeg,
            isAi: true,
            isNavalShip: wl.isNavalShip,
          }));
          setLaunchers((prev) => [...prev, ...placedAiLaunchers]);
        }

        if (orders.length > 0 || airfieldSorties.length > 0) {
          setPendingAiWaveOrders(orders);
          setPendingAiSorties(airfieldSorties);
          setAiWaveSignal((n) => n + 1);
        }
      } else {
        setAiWaveCountdownSec(Math.max(0, aiWaveCountdownRef.current));
      }
    }, tickMs);
    return () => window.clearInterval(id);
  }, [gameScreen, gameMode, showWarning]);

  // Track AI mode Defeat / Victory when all friendly or all enemy buildings are destroyed
  useEffect(() => {
    if (gameScreen !== 'playing' || gameMode !== 'ai') return;
    const alivePlayer = buildings.filter((b) => !b.isAi).length;
    const aliveEnemy = buildings.filter((b) => Boolean(b.isAi)).length;
    if (alivePlayer > 0) {
      aiHadPlayerBuildingsRef.current = true;
    }
    if (aliveEnemy > 0) {
      aiHadEnemyBuildingsRef.current = true;
    }
    if (aiHadPlayerBuildingsRef.current && alivePlayer === 0) {
      setPendingPlacement(null);
      setSelectedFlight(null);
      setIsPlottingFlightRoute(false);
      setFlightRouteWaypoints([]);
      setAiOutcome('defeat');
      setGameScreen('gameover');
    } else if (aiHadEnemyBuildingsRef.current && aliveEnemy === 0) {
      setPendingPlacement(null);
      setSelectedFlight(null);
      setIsPlottingFlightRoute(false);
      setFlightRouteWaypoints([]);
      setAiOutcome('victory');
      setGameScreen('gameover');
    }
  }, [gameScreen, gameMode, buildings]);

  const handleStartGame = (mode: GameMode) => {
    aiHadPlayerBuildingsRef.current = false;
    aiHadEnemyBuildingsRef.current = false;
    setAiOutcome('defeat');
    lastSavedFingerprintRef.current = null;
    setSandboxExitPromptOpen(false);
    setLaunchers([]);
    setAirDefenses([]);
    setPendingPlacement(null);
    setSelectedLauncherId(null);
    setSelectedAirfieldId(null);
    setSelectedFlight(null);
    setMobileSteerDir(0);
    setFollowCamActive(false);
    setFlightAltitudeCommand(null);
    setIsPlottingFlightRoute(false);
    setFlightRouteWaypoints([]);
    setAirfieldLaunchPoint(null);
    setAirfieldMissileWaypoints([]);
    setAirfieldModalStep(null);
    setSu57DropPoint(null);
    setIsPlottingRoute(false);
    setRouteWaypoints([]);
    setRouteLaunchCount(1);
    setEventLog([]);
    setJournalFilter('all');
    setTelegramOpen(false);
    setSelectedTelegramOblast(null);
    setTelegramSearch('');
    setTelegramPosts([]);
    setTelegramUnreadByOblast({});
    setPendingAiWaveOrders([]);
    setPendingAiSorties([]);
    setStats(EMPTY_STATS);
    setSimTimeMinutes(INITIAL_SIM_MINUTES);
    setClearSignal((n) => n + 1);

    setGameMode(mode);
    setGameScreen('playing');

    if (mode === 'ai') {
      const initialBuildings = createInitialAiBuildings();
      const initialEnemyBuildings = createInitialEnemyAiBuildings();
      const initialAiAirfields = createInitialAiAirfields();
      aiHadPlayerBuildingsRef.current = initialBuildings.length > 0;
      aiHadEnemyBuildingsRef.current = initialEnemyBuildings.length > 0;
      setBuildings([...initialBuildings, ...initialEnemyBuildings]);
      setAirfields(initialAiAirfields);
      setMoney(AI_STARTING_MONEY);
      aiWaveNumberRef.current = 0;
      setAiWaveNumber(0);
      lastKabDayRef.current = 0;
      lastMediumDayRef.current = 0;
      nextMassiveDayRef.current = 4 + Math.floor(Math.random() * 8);
      aiWaveCountdownRef.current = AI_FIRST_WAVE_PREP_SEC;
      setAiWaveCountdownSec(AI_FIRST_WAVE_PREP_SEC);
      setAiSurvivedSec(0);
      setCatalogFilter('pvo');
      setSidebarOpen(true);
      setShowRaions(true);
      setShowFrontline(true);
      setFocusCoords({ lat: 48.9, lng: 31.4, zoom: 6 });
    } else {
      setAirfields([]);
      setBuildings([]);
      setCatalogFilter('all');
      setSidebarOpen(true);
      setFocusCoords({ lat: 49.4, lng: 34.8, zoom: 5 });
    }
    soundFx.playUiClick('confirm');
  };

  const handleReturnToMenu = () => {
    aiHadPlayerBuildingsRef.current = false;
    aiHadEnemyBuildingsRef.current = false;
    setAiOutcome('defeat');
    lastSavedFingerprintRef.current = null;
    setSandboxExitPromptOpen(false);
    setLaunchers([]);
    setAirfields([]);
    setAirDefenses([]);
    setBuildings([]);
    setPendingPlacement(null);
    setSelectedLauncherId(null);
    setSelectedAirfieldId(null);
    setSelectedFlight(null);
    setMobileSteerDir(0);
    setFollowCamActive(false);
    setFlightAltitudeCommand(null);
    setIsPlottingFlightRoute(false);
    setFlightRouteWaypoints([]);
    setAirfieldLaunchPoint(null);
    setAirfieldMissileWaypoints([]);
    setAirfieldModalStep(null);
    setSu57DropPoint(null);
    setIsPlottingRoute(false);
    setRouteWaypoints([]);
    setRouteLaunchCount(1);
    setPendingAiWaveOrders([]);
    setPendingAiSorties([]);
    setEventLog([]);
    setJournalFilter('all');
    setTelegramOpen(false);
    setSelectedTelegramOblast(null);
    setTelegramSearch('');
    setTelegramPosts([]);
    setTelegramUnreadByOblast({});
    setStats(EMPTY_STATS);
    setSimTimeMinutes(INITIAL_SIM_MINUTES);
    setClearSignal((n) => n + 1);
    setMenuStep('title');
    setGameScreen('menu');
  };

  const handleSaveCurrentSandbox = (options?: { silent?: boolean }): boolean => {
    const cleanLaunchers = launchers.filter((l) => !l.isAi);
    const cleanAirfields = airfields.filter((a) => !a.isAi);
    const cleanBuildings = buildings.filter((b) => !b.isAi);
    const totalUnits = countSandboxUnits({
      launchers: cleanLaunchers,
      airfields: cleanAirfields,
      airDefenses,
      buildings: cleanBuildings,
    });
    if (totalUnits === 0) {
      clearSandboxSave();
      setSavedSandbox(null);
      lastSavedFingerprintRef.current = null;
      if (!options?.silent) {
        showWarning(
          lang === 'uk'
            ? 'На мапі немає об’єктів для збереження'
            : lang === 'en'
              ? 'No objects on map to save'
              : 'На карте нет объектов для сохранения',
        );
      }
      return false;
    }

    const payload: SandboxSaveData = {
      version: 1,
      savedAt: Date.now(),
      simTimeMinutes,
      buildingScale,
      mapStyle,
      showFrontline,
      showRaions,
      showLabels,
      launchers: cleanLaunchers,
      airfields: cleanAirfields,
      airDefenses,
      buildings: cleanBuildings,
      stats: {
        totalLaunches: stats.totalLaunches,
        explosions: stats.explosions,
        intercepts: stats.intercepts,
        misses: stats.misses,
        destroyedByStrikes: stats.destroyedByStrikes,
      },
      eventLog: eventLog.slice(0, 40),
    };
    const savedOk = saveSandboxState(payload);
    if (!savedOk) {
      if (!options?.silent) {
        showWarning(
          lang === 'uk'
            ? 'Не вдалося зберегти розстановку в пам’ять браузера'
            : lang === 'en'
              ? 'Failed to save layout to browser storage'
              : 'Не удалось сохранить расстановку в память браузера',
        );
      }
      return false;
    }
    setSavedSandbox(payload);
    lastSavedFingerprintRef.current = computeSandboxFingerprint({
      launchers: cleanLaunchers,
      airfields: cleanAirfields,
      airDefenses,
      buildings: cleanBuildings,
      buildingScale,
    });
    if (!options?.silent) {
      soundFx.playUiClick('confirm');
      showWarning(
        lang === 'uk'
          ? 'Розстановку пісочниці збережено'
          : lang === 'en'
            ? 'Sandbox layout saved'
            : 'Расстановка песочницы сохранена',
      );
    }
    return true;
  };

  const handleRequestReturnToMenu = () => {
    if (gameMode === 'sandbox' && gameScreen === 'playing') {
      const unitCount = countSandboxUnits({
        launchers,
        airfields,
        airDefenses,
        buildings,
      });
      const currentFp = computeSandboxFingerprint({
        launchers,
        airfields,
        airDefenses,
        buildings,
        buildingScale,
      });
      if (unitCount > 0 && currentFp !== lastSavedFingerprintRef.current) {
        setSandboxExitPromptOpen(true);
        return;
      }
    }
    handleReturnToMenu();
  };

  const handleResumeSavedSandbox = () => {
    const save = savedSandbox ?? loadSandboxState();
    if (!save) {
      handleStartGame('sandbox');
      return;
    }
    aiHadPlayerBuildingsRef.current = false;
    aiHadEnemyBuildingsRef.current = false;
    setAiOutcome('defeat');
    setSandboxExitPromptOpen(false);
    setPendingPlacement(null);
    setSelectedLauncherId(null);
    setSelectedAirfieldId(null);
    setSelectedFlight(null);
    setMobileSteerDir(0);
    setFollowCamActive(false);
    setFlightAltitudeCommand(null);
    setIsPlottingFlightRoute(false);
    setFlightRouteWaypoints([]);
    setAirfieldLaunchPoint(null);
    setAirfieldMissileWaypoints([]);
    setAirfieldModalStep(null);
    setSu57DropPoint(null);
    setIsPlottingRoute(false);
    setRouteWaypoints([]);
    setRouteLaunchCount(1);
    setJournalFilter('all');
    setTelegramOpen(false);
    setSelectedTelegramOblast(null);
    setTelegramSearch('');
    setTelegramPosts([]);
    setTelegramUnreadByOblast({});
    setPendingAiWaveOrders([]);
    setPendingAiSorties([]);
    setClearSignal((n) => n + 1);

    setGameMode('sandbox');
    setLaunchers(save.launchers);
    setAirfields(save.airfields);
    setAirDefenses(save.airDefenses);
    setBuildings(save.buildings);
    setBuildingScale(save.buildingScale);
    setSimTimeMinutes(save.simTimeMinutes);
    setMapStyle(save.mapStyle);
    setShowFrontline(save.showFrontline);
    setShowRaions(save.showRaions);
    setShowLabels(save.showLabels);
    setEventLog(save.eventLog);

    const restoredStats: MapStats = {
      ...EMPTY_STATS,
      ...save.stats,
    };
    setStats(restoredStats);
    setRestoreStatsTrigger((prev) => ({
      seq: (prev?.seq ?? 0) + 1,
      stats: restoredStats,
    }));
    lastSavedFingerprintRef.current = computeSandboxFingerprint({
      launchers: save.launchers,
      airfields: save.airfields,
      airDefenses: save.airDefenses,
      buildings: save.buildings,
      buildingScale: save.buildingScale,
    });

    const allUnits = [
      ...save.launchers,
      ...save.airfields,
      ...save.airDefenses,
      ...save.buildings,
    ];
    if (allUnits.length > 0) {
      const avgLat = allUnits.reduce((sum, u) => sum + u.lat, 0) / allUnits.length;
      const avgLng = allUnits.reduce((sum, u) => sum + u.lng, 0) / allUnits.length;
      setFocusCoords({ lat: avgLat, lng: avgLng, zoom: allUnits.length === 1 ? 7 : 6 });
    } else {
      setFocusCoords({ lat: 49.4, lng: 34.8, zoom: 5 });
    }

    setCatalogFilter('all');
    setSidebarOpen(true);
    setGameScreen('playing');
    soundFx.playUiClick('confirm');
  };

  const handleDeleteSavedSandbox = () => {
    clearSandboxSave();
    setSavedSandbox(null);
    lastSavedFingerprintRef.current = null;
    soundFx.playUiClick('back');
  };

  const handleCancelAirfieldSelection = useCallback(() => {
    setAirfieldModalStep(null);
    setAirfieldLaunchPoint(null);
    setAirfieldMissileWaypoints([]);
    setSelectedAirfieldId(null);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (sandboxExitPromptOpen) {
          setSandboxExitPromptOpen(false);
        } else if (pendingPlacement) {
          setPendingPlacement(null);
        } else if (airfieldModalStep === 'missiles') {
          setAirfieldModalStep('aircraft');
        } else if (airfieldModalStep === 'aircraft') {
          handleCancelAirfieldSelection();
        } else if (isPlottingFlightRoute) {
          setIsPlottingFlightRoute(false);
          setFlightRouteWaypoints([]);
        } else if (selectedFlight) {
          setSelectedFlight(null);
        } else if (isPlottingRoute) {
          setIsPlottingRoute(false);
          setRouteWaypoints([]);
          setRouteLaunchCount(1);
        } else if (airfieldMissileWaypoints.length > 0) {
          setAirfieldMissileWaypoints([]);
        } else if (airfieldLaunchPoint) {
          setAirfieldLaunchPoint(null);
        } else if (selectedAirfieldId) {
          setSelectedAirfieldId(null);
        } else if (su57DropPoint) {
          setSu57DropPoint(null);
        } else if (selectedLauncherId) {
          setSelectedLauncherId(null);
        } else if (selectedTelegramOblast) {
          setSelectedTelegramOblast(null);
        } else if (telegramOpen) {
          setTelegramOpen(false);
        }
      } else if (
        e.key === 'Enter' &&
        selectedFlight &&
        isPlottingFlightRoute &&
        flightRouteWaypoints.length > 0
      ) {
        setApplyFlightRouteSignal((n) => n + 1);
      } else if (e.key === 'Enter' && isPlottingRoute && routeWaypoints.length > 0) {
        setLaunchRouteSignal((n) => n + 1);
      } else if (
        e.key === 'Enter' &&
        selectedAirfieldId &&
        airfieldLaunchPoint &&
        airfieldMissileWaypoints.length > 0
      ) {
        setLaunchAirfieldSignal((n) => n + 1);
      } else if (
        (e.key === 'm' || e.key === 'M') &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        toggleMute();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    sandboxExitPromptOpen,
    pendingPlacement,
    airfieldModalStep,
    isPlottingFlightRoute,
    flightRouteWaypoints.length,
    selectedFlight,
    isPlottingRoute,
    routeWaypoints.length,
    airfieldMissileWaypoints.length,
    airfieldLaunchPoint,
    selectedAirfieldId,
    su57DropPoint,
    selectedLauncherId,
    selectedTelegramOblast,
    telegramOpen,
    toggleMute,
    handleCancelAirfieldSelection,
  ]);

  const clearSelectionModes = () => {
    setSelectedLauncherId(null);
    setSelectedAirfieldId(null);
    setSelectedFlight(null);
    setMobileSteerDir(0);
    setIsPlottingFlightRoute(false);
    setFlightRouteWaypoints([]);
    setAirfieldLaunchPoint(null);
    setAirfieldMissileWaypoints([]);
    setAirfieldModalStep(null);
    setSu57DropPoint(null);
    setIsPlottingRoute(false);
    setRouteWaypoints([]);
    setRouteLaunchCount(1);
  };

  const handleSelectStrikeCatalog = (id: MunitionId) => {
    const spec = MUNITION_BY_ID[id];
    const isAlreadyPending = pendingPlacement?.kind === 'strike' && pendingPlacement.id === id;
    if (gameMode === 'ai') {
      if (spec.faction !== 'UA' || spec.airLaunchedOnly) {
        soundFx.playBlocked();
        return;
      }
      const strikeCost = spec.cost ?? 0;
      if (!isAlreadyPending && strikeCost > 0 && money < strikeCost) {
        soundFx.playBlocked();
        showWarning(
          lang === 'uk'
            ? `Недостатньо коштів: потрібно $${strikeCost} (доступно $${Math.floor(money)})`
            : lang === 'en'
              ? `Insufficient funds: need $${strikeCost} ($${Math.floor(money)} available)`
              : `Недостаточно средств: нужно $${strikeCost} (доступно $${Math.floor(money)})`,
        );
        return;
      }
    }
    clearSelectionModes();
    setPendingPlacement((prev) =>
      prev?.kind === 'strike' && prev.id === id ? null : { kind: 'strike', id },
    );
    soundFx.playSelectLauncher();
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleSelectPvoCatalog = (id: AirDefenseId) => {
    const spec = AIR_DEFENSE_BY_ID[id];
    const isAlreadyPending = pendingPlacement?.kind === 'pvo' && pendingPlacement.id === id;
    if (!isAlreadyPending && gameMode === 'ai' && money < spec.cost) {
      soundFx.playBlocked();
      showWarning(
        lang === 'uk'
          ? `Недостатньо коштів: потрібно $${spec.cost} (доступно $${Math.floor(money)})`
          : lang === 'en'
            ? `Insufficient funds: need $${spec.cost} ($${Math.floor(money)} available)`
            : `Недостаточно средств: нужно $${spec.cost} (доступно $${Math.floor(money)})`,
      );
      return;
    }
    clearSelectionModes();
    setPendingPlacement((prev) =>
      prev?.kind === 'pvo' && prev.id === id ? null : { kind: 'pvo', id },
    );
    soundFx.playSelectLauncher();
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleSelectInfraCatalog = (id: BuildingId) => {
    clearSelectionModes();
    setPendingPlacement((prev) =>
      prev?.kind === 'infra' && prev.id === id ? null : { kind: 'infra', id },
    );
    soundFx.playSelectLauncher();
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleStartManualAirfieldPlacement = () => {
    clearSelectionModes();
    setPendingPlacement((prev) => (prev?.kind === 'airfield' ? null : { kind: 'airfield' }));
    soundFx.playUiClick('tap');
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleStartManualUaAirfieldPlacement = () => {
    const isAlreadyPending = pendingPlacement?.kind === 'airfield-ua';
    if (!isAlreadyPending && gameMode === 'ai' && money < UA_AIRFIELD_AI_COST) {
      soundFx.playBlocked();
      showWarning(
        lang === 'uk'
          ? `Для розгортання аеродрому ЗСУ потрібно $${UA_AIRFIELD_AI_COST}`
          : lang === 'en'
            ? `Need $${UA_AIRFIELD_AI_COST} to deploy a UA airbase`
            : `Для развёртывания аэродрома ВСУ нужно $${UA_AIRFIELD_AI_COST}`,
      );
      return;
    }
    clearSelectionModes();
    setPendingPlacement((prev) => (prev?.kind === 'airfield-ua' ? null : { kind: 'airfield-ua' }));
    soundFx.playUiClick('tap');
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleStartNavalShipPlacement = () => {
    clearSelectionModes();
    setPendingPlacement((prev) => (prev?.kind === 'ship' ? null : { kind: 'ship' }));
    soundFx.playUiClick('tap');
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handlePlaceNavalShip = useCallback((lat: number, lng: number) => {
    const newShip: PlacedLauncher = {
      id: `ship_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      munitionId: 'kalibr',
      lat,
      lng,
      ammo: 8,
      maxAmmo: 8,
      lastLaunchAt: 0,
      headingDeg: 0,
      isNavalShip: true,
    };
    setLaunchers((prev) => [...prev, newShip]);
    setPendingPlacement(null);
    setSelectedLauncherId(null);
  }, []);

  const handleDeployPresetAirbase = (preset: RussianAirbasePreset) => {
    setPendingPlacement(null);
    clearSelectionModes();

    const existing = airfields.find((a) => a.presetId === preset.id);
    if (existing) {
      setFocusCoords({ lat: existing.lat, lng: existing.lng, zoom: 6 });
      soundFx.playSelectLauncher();
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
      return;
    }

    if (gameMode === 'ai') {
      if (preset.faction !== 'UA') {
        soundFx.playBlocked();
        return;
      }
      if (money < UA_AIRFIELD_AI_COST) {
        soundFx.playBlocked();
        showWarning(
          lang === 'uk'
            ? `Для розгортання аеродрому ЗСУ потрібно $${UA_AIRFIELD_AI_COST}`
            : lang === 'en'
              ? `Need $${UA_AIRFIELD_AI_COST} to deploy a UA airbase`
              : `Для развёртывания аэродрома ВСУ нужно $${UA_AIRFIELD_AI_COST}`,
        );
        return;
      }
      setMoney((prev) => Math.max(0, prev - UA_AIRFIELD_AI_COST));
    }

    const defaultSpec = RUSSIAN_AIRCRAFT_BY_ID[preset.defaultAircraftId];
    const newAirfield: PlacedAirfield = {
      id: `af_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: preset.name,
      presetId: preset.id,
      faction: preset.faction,
      lat: preset.lat,
      lng: preset.lng,
      selectedAircraftId: preset.defaultAircraftId,
      availableAircraftIds: preset.availableAircraftIds,
      salvoCount: defaultSpec.missileCount,
    };
    setAirfields((prev) => [...prev, newAirfield]);
    setFocusCoords({ lat: preset.lat, lng: preset.lng, zoom: 6 });
    soundFx.playPlaceLauncher();
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handlePlaceAirfield = useCallback(
    (lat: number, lng: number, faction: 'RU' | 'UA' = 'RU') => {
      if (gameModeRef.current === 'ai' && faction === 'UA') {
        if (moneyRef.current < UA_AIRFIELD_AI_COST) {
          soundFx.playBlocked();
          showWarning(
            langRef.current === 'uk'
              ? `Для розгортання аеродрому ЗСУ потрібно $${UA_AIRFIELD_AI_COST}`
              : langRef.current === 'en'
                ? `Need $${UA_AIRFIELD_AI_COST} to deploy a UA airbase`
                : `Для развёртывания аэродрома ВСУ нужно $${UA_AIRFIELD_AI_COST}`,
          );
          setPendingPlacement(null);
          return;
        }
        setMoney((prev) => Math.max(0, prev - UA_AIRFIELD_AI_COST));
      }
      const id = `af_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setAirfields((prev) => {
        const isUa = faction === 'UA';
        const sameFactionCount = prev.filter((a) => (a.faction ?? 'RU') === faction).length;
        const squadrons = isUa ? MANUAL_UA_AIRFIELD_SQUADRONS : MANUAL_AIRFIELD_SQUADRONS;
        const roster = squadrons[sameFactionCount % squadrons.length];
        const defaultAircraftId = roster[0];
        const defaultSpec = RUSSIAN_AIRCRAFT_BY_ID[defaultAircraftId];
        const curText = getUiText(langRef.current);
        return [
          ...prev,
          {
            id,
            name: isUa
              ? `${curText.airfieldBasePrefixUa} #${sameFactionCount + 1}`
              : `${curText.airfieldBasePrefixRu} #${sameFactionCount + 1}`,
            faction,
            lat,
            lng,
            selectedAircraftId: defaultAircraftId,
            availableAircraftIds: roster,
            salvoCount: defaultSpec.missileCount,
          },
        ];
      });
      setPendingPlacement(null);
      setSelectedLauncherId(null);
      setSelectedFlight(null);
      setIsPlottingFlightRoute(false);
      setFlightRouteWaypoints([]);
      setSu57DropPoint(null);
      setAirfieldLaunchPoint(null);
      setAirfieldMissileWaypoints([]);
      setSelectedAirfieldId(null);
      setAirfieldModalStep(null);
    },
    [showWarning],
  );

  const handleSelectAirfield = useCallback((id: string | null) => {
    setPendingPlacement(null);
    setSelectedLauncherId(null);
    setSelectedFlight(null);
    setIsPlottingFlightRoute(false);
    setFlightRouteWaypoints([]);
    setSu57DropPoint(null);
    setIsPlottingRoute(false);
    setRouteWaypoints([]);
    setRouteLaunchCount(1);
    setAirfieldLaunchPoint(null);
    setAirfieldMissileWaypoints([]);
    setSelectedAirfieldId(id);
    setAirfieldModalStep(id ? 'aircraft' : null);
  }, []);

  const handleAddAirfieldWaypoint = useCallback((lat: number, lng: number) => {
    setAirfieldMissileWaypoints((prev) => [...prev, { lat, lng }]);
  }, []);

  const handleAirfieldLaunched = useCallback(() => {
    setAirfieldLaunchPoint(null);
    setAirfieldMissileWaypoints([]);
  }, []);

  const handleSelectFlight = useCallback((info: SelectedFlightInfo | null) => {
    if (info) {
      setPendingPlacement(null);
      setSelectedLauncherId(null);
      setSelectedAirfieldId(null);
      setAirfieldLaunchPoint(null);
      setAirfieldMissileWaypoints([]);
      setAirfieldModalStep(null);
      setSu57DropPoint(null);
      setIsPlottingRoute(false);
      setRouteWaypoints([]);
      setRouteLaunchCount(1);
      setSelectedFlight((prev) => {
        if (!prev || prev.id !== info.id) {
          setIsPlottingFlightRoute(false);
          setFlightRouteWaypoints([]);
        }
        return info;
      });
    } else {
      setSelectedFlight(null);
      setIsPlottingFlightRoute(false);
      setFlightRouteWaypoints([]);
    }
  }, []);

  const handleAddFlightWaypoint = useCallback((lat: number, lng: number) => {
    setFlightRouteWaypoints((prev) => [...prev, { lat, lng }]);
  }, []);

  const handleFlightRouteApplied = useCallback(() => {
    setIsPlottingFlightRoute(false);
    setFlightRouteWaypoints([]);
  }, []);

  const handleChangeAirfieldAircraft = (airfieldId: string, aircraftId: RussianAircraftId) => {
    const spec = RUSSIAN_AIRCRAFT_BY_ID[aircraftId];
    setAirfields((prev) =>
      prev.map((a) => {
        if (a.id !== airfieldId) return a;
        if (a.availableAircraftIds && !a.availableAircraftIds.includes(aircraftId)) return a;
        return { ...a, selectedAircraftId: aircraftId, salvoCount: spec.missileCount };
      }),
    );
    setAirfieldLaunchPoint(null);
    setAirfieldMissileWaypoints([]);
    setAirfieldModalStep('missiles');
    soundFx.playSelectLauncher();
  };

  const handleChangeAirfieldSalvo = (airfieldId: string, nextCount: number) => {
    setAirfields((prev) =>
      prev.map((a) => {
        if (a.id !== airfieldId) return a;
        const spec = RUSSIAN_AIRCRAFT_BY_ID[a.selectedAircraftId];
        return {
          ...a,
          salvoCount: Math.max(1, Math.min(spec.missileCount, nextCount)),
        };
      }),
    );
    soundFx.playSelectLauncher();
  };

  const handleRemoveAirfield = (id: string) => {
    const target = airfieldsRef.current.find((a) => a.id === id && !a.isAi);
    if (target && gameModeRef.current === 'ai' && target.faction === 'UA') {
      const refund = Math.round(UA_AIRFIELD_AI_COST * 0.5);
      setMoney((prev) => prev + refund);
    }
    setAirfields((prev) => prev.filter((a) => !(a.id === id && !a.isAi)));
    if (selectedAirfieldId === id) {
      setSelectedAirfieldId(null);
      setAirfieldLaunchPoint(null);
      setAirfieldMissileWaypoints([]);
      setAirfieldModalStep(null);
    }
  };

  const handlePlaceStrikeLauncher = useCallback(
    (munitionId: MunitionId, lat: number, lng: number) => {
      const spec = MUNITION_BY_ID[munitionId];
      if (gameModeRef.current === 'ai') {
        const strikeCost = spec.cost ?? 0;
        if (strikeCost > 0 && moneyRef.current < strikeCost) {
          soundFx.playBlocked();
          showWarning(
            langRef.current === 'uk'
              ? `Недостатньо коштів: потрібно $${strikeCost}`
              : langRef.current === 'en'
                ? `Insufficient funds: need $${strikeCost}`
                : `Недостаточно средств: нужно $${strikeCost}`,
          );
          setPendingPlacement(null);
          return;
        }
        if (strikeCost > 0) {
          setMoney((prev) => Math.max(0, prev - strikeCost));
        }
      }
      const newLauncher: PlacedLauncher = {
        id: `lnch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        munitionId,
        lat,
        lng,
        ammo: spec.maxAmmo,
        maxAmmo: spec.maxAmmo,
        lastLaunchAt: 0,
        headingDeg: 45,
      };
      setLaunchers((prev) => [...prev, newLauncher]);
      setPendingPlacement(null);
      setSelectedLauncherId(null);
    },
    [showWarning],
  );

  const handlePlaceAirDefense = useCallback(
    (airDefenseId: AirDefenseId, lat: number, lng: number) => {
      const spec = AIR_DEFENSE_BY_ID[airDefenseId];
      if (gameModeRef.current === 'ai') {
        if (moneyRef.current < spec.cost) {
          soundFx.playBlocked();
          showWarning(
            langRef.current === 'uk'
              ? `Недостатньо коштів: потрібно $${spec.cost}`
              : langRef.current === 'en'
                ? `Insufficient funds: need $${spec.cost}`
                : `Недостаточно средств: нужно $${spec.cost}`,
          );
          setPendingPlacement(null);
          return;
        }
        setMoney((prev) => Math.max(0, prev - spec.cost));
      }
      const newPvo: PlacedAirDefense = {
        id: `pvo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        airDefenseId,
        lat,
        lng,
        ammo: spec.maxAmmo,
        maxAmmo: spec.maxAmmo,
        hp: spec.maxHp,
        maxHp: spec.maxHp,
        headingDeg: 0,
      };
      setAirDefenses((prev) => [...prev, newPvo]);
      setPendingPlacement(null);
    },
    [showWarning],
  );

  const handlePlaceBuilding = useCallback((buildingId: BuildingId, lat: number, lng: number) => {
    const spec = BUILDING_BY_ID[buildingId];
    const newBuilding: PlacedBuilding = {
      id: `bldg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      buildingId,
      lat,
      lng,
      hp: spec.maxHp,
      maxHp: spec.maxHp,
    };
    setBuildings((prev) => [...prev, newBuilding]);
    setPendingPlacement(null);
  }, []);

  const handleSelectLauncher = useCallback((id: string | null) => {
    setPendingPlacement(null);
    setSelectedAirfieldId(null);
    setSelectedFlight(null);
    setIsPlottingFlightRoute(false);
    setFlightRouteWaypoints([]);
    setAirfieldLaunchPoint(null);
    setAirfieldMissileWaypoints([]);
    setAirfieldModalStep(null);
    setSu57DropPoint(null);
    setIsPlottingRoute(false);
    setRouteWaypoints([]);
    setRouteLaunchCount(1);
    setSelectedLauncherId(id);
  }, []);

  const handleLaunchStarted = useCallback((launcherId: string, headingDeg: number) => {
    const now = Date.now();
    setLaunchers((prev) =>
      prev.map((l) =>
        l.id === launcherId
          ? { ...l, ammo: Math.max(0, l.ammo - 1), lastLaunchAt: now, headingDeg }
          : l,
      ),
    );
  }, []);

  const handlePvoFired = useCallback((pvoId: string, headingDeg: number) => {
    setAirDefenses((prev) =>
      prev.map((p) =>
        p.id === pvoId ? { ...p, ammo: Math.max(0, p.ammo - 1), headingDeg } : p,
      ),
    );
  }, []);

  const handleAddWaypoint = useCallback((lat: number, lng: number) => {
    setRouteWaypoints((prev) => [...prev, { lat, lng }]);
  }, []);

  const handleRouteLaunched = useCallback(() => {
    setIsPlottingRoute(false);
    setRouteWaypoints([]);
    setRouteLaunchCount(1);
  }, []);

  const handleRemoveLauncher = useCallback((id: string) => {
    const target = launchersRef.current.find((l) => l.id === id && !l.isAi);
    if (target && gameModeRef.current === 'ai') {
      const cost = MUNITION_BY_ID[target.munitionId].cost ?? 0;
      if (cost > 0) {
        setMoney((prev) => prev + Math.round(cost * 0.5));
      }
    }
    setLaunchers((prev) => prev.filter((l) => !(l.id === id && !l.isAi)));
    setSelectedLauncherId((prev) => {
      if (prev === id) {
        setIsPlottingRoute(false);
        setRouteWaypoints([]);
        setRouteLaunchCount(1);
        return null;
      }
      return prev;
    });
  }, []);

  const handleReloadLauncher = useCallback(
    (id: string) => {
      const target = launchersRef.current.find((l) => l.id === id && !l.isAi);
      if (!target || target.ammo >= target.maxAmmo) return;
      const spec = MUNITION_BY_ID[target.munitionId];
      const reloadCost = Math.round((spec.cost ?? 150) * 0.35);
      if (gameModeRef.current === 'ai') {
        if (moneyRef.current < reloadCost) {
          soundFx.playBlocked();
          showWarning(
            langRef.current === 'uk'
              ? `Для поповнення Б/К потрібно $${reloadCost}`
              : langRef.current === 'en'
                ? `Need $${reloadCost} to reload launcher`
                : `Для пополнения Б/К нужно $${reloadCost}`,
          );
          return;
        }
        setMoney((prev) => Math.max(0, prev - reloadCost));
      }
      setLaunchers((prev) =>
        prev.map((l) => (l.id === id ? { ...l, ammo: l.maxAmmo } : l)),
      );
      soundFx.playPlaceLauncher();
    },
    [showWarning],
  );

  const handleRemovePvo = useCallback((id: string) => {
    const target = airDefensesRef.current.find((p) => p.id === id);
    if (target && gameModeRef.current === 'ai') {
      const refund = Math.round(AIR_DEFENSE_BY_ID[target.airDefenseId].cost * 0.5);
      setMoney((prev) => prev + refund);
    }
    setAirDefenses((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleReloadPvo = useCallback(
    (id: string) => {
      const target = airDefensesRef.current.find((p) => p.id === id);
      if (!target) return;
      const spec = AIR_DEFENSE_BY_ID[target.airDefenseId];
      if (target.ammo >= target.maxAmmo) return;
      const reloadCost = Math.round(spec.cost * 0.35);
      if (gameModeRef.current === 'ai') {
        if (moneyRef.current < reloadCost) {
          soundFx.playBlocked();
          showWarning(
            langRef.current === 'uk'
              ? `Для поповнення Б/К потрібно $${reloadCost}`
              : langRef.current === 'en'
                ? `Need $${reloadCost} to reload`
                : `Для пополнения Б/К нужно $${reloadCost}`,
          );
          return;
        }
        setMoney((prev) => Math.max(0, prev - reloadCost));
      }
      setAirDefenses((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ammo: p.maxAmmo } : p)),
      );
      soundFx.playPlaceLauncher();
    },
    [showWarning],
  );

  const handleRepairPvo = useCallback(
    (id: string) => {
      const target = airDefensesRef.current.find((p) => p.id === id);
      if (!target) return;
      const spec = AIR_DEFENSE_BY_ID[target.airDefenseId];
      if (target.hp >= target.maxHp) return;
      const repairCost = Math.round(spec.cost * 0.25);
      if (gameModeRef.current === 'ai') {
        if (moneyRef.current < repairCost) {
          soundFx.playBlocked();
          showWarning(
            langRef.current === 'uk'
              ? `Для ремонту ППО потрібно $${repairCost}`
              : langRef.current === 'en'
                ? `Need $${repairCost} to repair`
                : `Для ремонта ППО нужно $${repairCost}`,
          );
          return;
        }
        setMoney((prev) => Math.max(0, prev - repairCost));
      }
      setAirDefenses((prev) =>
        prev.map((p) => (p.id === id ? { ...p, hp: p.maxHp } : p)),
      );
      soundFx.playPlaceLauncher();
    },
    [showWarning],
  );

  const handleRemoveBuilding = useCallback((id: string) => {
    if (gameModeRef.current === 'ai') return;
    setBuildings((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const handleUnitsDestroyed = useCallback((launcherIds: string[], pvoIds: string[]) => {
    if (launcherIds.length > 0) {
      const removed = new Set(launcherIds);
      if (gameModeRef.current === 'ai') {
        const enemyKills = launchersRef.current.filter(
          (l) => removed.has(l.id) && Boolean(l.isAi),
        ).length;
        if (enemyKills > 0) {
          setMoney((prev) => prev + enemyKills * AI_LAUNCHER_KILL_BOUNTY);
        }
      }
      setLaunchers((prev) => prev.filter((l) => !removed.has(l.id)));
      setSelectedLauncherId((prevSelected) => {
        if (prevSelected && removed.has(prevSelected)) {
          setIsPlottingRoute(false);
          setRouteWaypoints([]);
          return null;
        }
        return prevSelected;
      });
    }
    if (pvoIds.length > 0) {
      const removedPvo = new Set(pvoIds);
      setAirDefenses((prev) => prev.filter((p) => !removedPvo.has(p.id)));
    }
  }, []);

  const handleAirDefensesDamaged = useCallback(
    (updates: Array<{ id: string; hp: number }>) => {
      if (updates.length === 0) return;
      const updateMap = new Map(updates.map((u) => [u.id, u.hp]));
      setAirDefenses((prev) =>
        prev
          .map((p) => {
            const nextHp = updateMap.get(p.id);
            return nextHp === undefined ? p : { ...p, hp: nextHp };
          })
          .filter((p) => p.hp > 0),
      );
    },
    [],
  );

  const handleBuildingsDamaged = useCallback(
    (updates: Array<{ id: string; hp: number }>) => {
      if (updates.length === 0) return;
      const updateMap = new Map(updates.map((u) => [u.id, u.hp]));
      if (gameModeRef.current === 'ai') {
        let totalBounty = 0;
        for (const b of buildingsRef.current) {
          if (!b.isAi || b.hp <= 0) continue;
          const nextHp = updateMap.get(b.id);
          if (nextHp !== undefined && nextHp <= 0) {
            totalBounty += getAiBuildingBounty(b.buildingId);
          }
        }
        if (totalBounty > 0) {
          setMoney((prev) => prev + totalBounty);
        }
      }
      setBuildings((prev) =>
        prev
          .map((b) => {
            const nextHp = updateMap.get(b.id);
            return nextHp === undefined ? b : { ...b, hp: nextHp };
          })
          .filter((b) => b.hp > 0),
      );
    },
    [],
  );

  const handleTacticalEvent = useCallback((payload: TacticalEventPayload) => {
    const entry: TacticalEventEntry = {
      ...payload,
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestampMs: Date.now(),
      simTimeMinutes: simTimeMinutesRef.current,
    };
    setEventLog((prev) => [entry, ...prev].slice(0, 40));
  }, []);

  const handleTelegramIntel = useCallback((intel: TelegramIntelPayload) => {
    const chMeta = getTelegramChannelByOblast(intel.oblast);
    if (!chMeta) return;
    const text = buildTelegramMessageText({
      country: chMeta.country,
      count: intel.count,
      munitionId: intel.munitionId,
      carrierAircraftId: intel.carrierAircraftId,
      targetCity: intel.targetCity,
      nearCity: intel.nearCity,
      transitOblast: intel.transitOblast,
      targetBuildingName: intel.targetBuildingName,
      altitudeMode: intel.altitudeMode,
      eventKind: intel.eventKind,
      alertSubtype: intel.alertSubtype,
      alertRaionNames: intel.alertRaionNames,
      bearingDeg: intel.bearingDeg,
      raionName: intel.raionName,
    });
    const viewsNum = (4.2 + Math.random() * 28.5).toFixed(1);
    const post: TelegramPost = {
      id: `tg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      oblast: intel.oblast,
      country: chMeta.country,
      count: intel.count,
      munitionId: intel.munitionId,
      carrierAircraftId: intel.carrierAircraftId,
      targetCity: intel.targetCity,
      nearCity: intel.nearCity,
      raionName: intel.raionName,
      transitOblast: intel.transitOblast,
      targetBuildingName: intel.targetBuildingName,
      bearingDeg: intel.bearingDeg,
      altitudeMode: intel.altitudeMode,
      eventKind: intel.eventKind,
      alertSubtype: intel.alertSubtype,
      text,
      viewsLabel: `${viewsNum}K`,
      simTimeMinutes: simTimeMinutesRef.current,
      timestampMs: Date.now(),
    };
    setTelegramPosts((prev) => [...prev.slice(-179), post]);
    if (!(telegramOpenRef.current && selectedTelegramOblastRef.current === intel.oblast)) {
      setTelegramUnreadByOblast((prev) => ({
        ...prev,
        [intel.oblast]: (prev[intel.oblast] ?? 0) + 1,
      }));
    }
  }, []);

  const handleOpenTelegramChannel = (oblast: string) => {
    setSelectedTelegramOblast(oblast);
    setTelegramUnreadByOblast((prev) => {
      if (!prev[oblast]) return prev;
      const next = { ...prev };
      delete next[oblast];
      return next;
    });
  };

  useEffect(() => {
    if (telegramOpen && selectedTelegramOblast) {
      telegramChatEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [telegramOpen, selectedTelegramOblast, telegramPosts.length]);

  const handleClearAll = () => {
    if (gameMode === 'ai') {
      handleStartGame('ai');
      return;
    }
    lastSavedFingerprintRef.current = null;
    setSandboxExitPromptOpen(false);
    setLaunchers([]);
    setAirfields([]);
    setAirDefenses([]);
    setBuildings([]);
    setPendingPlacement(null);
    clearSelectionModes();
    setMobileSteerDir(0);
    setFollowCamActive(false);
    setFlightAltitudeCommand(null);
    setEventLog([]);
    setTelegramPosts([]);
    setTelegramUnreadByOblast({});
    setSelectedTelegramOblast(null);
    setStats(EMPTY_STATS);
    setSimTimeMinutes(INITIAL_SIM_MINUTES);
    setClearSignal((n) => n + 1);
  };

  const pendingStrikeSpec =
    pendingPlacement?.kind === 'strike' ? getMunitionLocalized(pendingPlacement.id, lang) : null;
  const pendingPvoSpec =
    pendingPlacement?.kind === 'pvo' ? getPvoLocalized(pendingPlacement.id, lang) : null;
  const pendingInfraSpec =
    pendingPlacement?.kind === 'infra' ? getBuildingLocalized(pendingPlacement.id, lang) : null;
  const pendingAirfield = pendingPlacement?.kind === 'airfield';
  const pendingAirfieldUa = pendingPlacement?.kind === 'airfield-ua';
  const pendingShip = pendingPlacement?.kind === 'ship';

  const selectedLauncher = selectedLauncherId
    ? launchers.find((l) => l.id === selectedLauncherId) ?? null
    : null;
  const selectedSpec = selectedLauncher
    ? getMunitionLocalized(selectedLauncher.munitionId, lang)
    : null;
  const selectedAirfield = selectedAirfieldId
    ? airfields.find((a) => a.id === selectedAirfieldId) ?? null
    : null;
  const selectedAircraftSpec = selectedAirfield
    ? getAircraftLocalized(selectedAirfield.selectedAircraftId, lang)
    : null;
  const selectedAircraftMissileSpec = selectedAircraftSpec
    ? getMunitionLocalized(selectedAircraftSpec.missileId, lang)
    : null;
  const effectiveRouteLaunchCount = selectedLauncher
    ? Math.max(1, Math.min(routeLaunchCount, Math.max(1, selectedLauncher.ammo)))
    : 1;
  const playerAirfields = airfields.filter((a) => !a.isAi);
  const playerLaunchers = launchers.filter((l) => !l.isAi);
  const playerBuildings = buildings.filter((b) => !b.isAi);
  const aiEnemyBuildings = buildings.filter((b) => Boolean(b.isAi));

  const aiIncomePerSec =
    gameMode === 'ai'
      ? playerBuildings.reduce((sum, b) => sum + BUILDING_BY_ID[b.buildingId].incomePerSec, 0)
      : 0;

  const playerUnitsCount =
    playerLaunchers.length + playerAirfields.length + airDefenses.length + playerBuildings.length;

  const totalBuildingsMaxHp = playerBuildings.reduce((sum, b) => sum + b.maxHp, 0);
  const totalBuildingsHp = playerBuildings.reduce((sum, b) => sum + Math.max(0, b.hp), 0);
  const buildingsIntegrityPct =
    totalBuildingsMaxHp > 0 ? Math.round((totalBuildingsHp / totalBuildingsMaxHp) * 100) : 0;

  const interceptAttempts = stats.intercepts + stats.misses;
  const interceptAccuracyPct =
    interceptAttempts > 0 ? Math.round((stats.intercepts / interceptAttempts) * 100) : 0;

  const totalTelegramUnread = Object.values(telegramUnreadByOblast).reduce((sum, n) => sum + n, 0);
  const telegramUnreadUa = UKRAINE_TELEGRAM_CHANNELS.reduce(
    (sum, ch) => sum + (telegramUnreadByOblast[ch.oblast] ?? 0),
    0,
  );
  const telegramUnreadRu = RUSSIA_TELEGRAM_CHANNELS.reduce(
    (sum, ch) => sum + (telegramUnreadByOblast[ch.oblast] ?? 0),
    0,
  );
  const activeTelegramChannel = selectedTelegramOblast
    ? getTelegramChannelByOblast(selectedTelegramOblast)
    : null;
  const activeTelegramMessages = selectedTelegramOblast
    ? telegramPosts.filter((p) => p.oblast === selectedTelegramOblast)
    : [];
  const activeCountryChannels =
    telegramCountryFilter === 'RU' ? RUSSIA_TELEGRAM_CHANNELS : UKRAINE_TELEGRAM_CHANNELS;
  const filteredTelegramChannels = activeCountryChannels.filter((ch) => {
    const q = telegramSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      ch.title.toLowerCase().includes(q) ||
      ch.oblast.toLowerCase().includes(q) ||
      ch.handle.toLowerCase().includes(q)
    );
  }).sort((a, b) => {
    const ua = telegramUnreadByOblast[a.oblast] ?? 0;
    const ub = telegramUnreadByOblast[b.oblast] ?? 0;
    if (ua !== ub) return ub - ua;
    const la = findLastTelegramPost(telegramPosts, a.oblast)?.timestampMs ?? 0;
    const lb = findLastTelegramPost(telegramPosts, b.oblast)?.timestampMs ?? 0;
    return lb - la;
  });

  if (gameScreen === 'menu') {
    return (
      <div
        className={`relative flex w-screen flex-col items-center justify-center bg-[#10130F] text-[#ECE8DD] select-none px-4 py-6 ${
          isMobile ? 'min-h-[100dvh] overflow-y-auto' : 'h-screen overflow-hidden'
        }`}
      >
        {/* Atmospheric Military Topographic & Radar Cartography Backdrop */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 42%, rgba(44, 56, 38, 0.42) 0%, rgba(16, 19, 15, 0.94) 68%, #0B0D0A 100%)',
          }}
        />
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-30"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          {/* Coordinate Grid */}
          <defs>
            <pattern id="menuTopoGrid" width="72" height="72" patternUnits="userSpaceOnUse">
              <path d="M 72 0 L 0 0 0 72" stroke="#3B4735" strokeWidth="0.7" strokeOpacity="0.45" />
            </pattern>
            <radialGradient id="menuRadarSweep" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#DF9A2B" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#DF9A2B" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1440" height="900" fill="url(#menuTopoGrid)" />

          {/* Topographic Contour Lines */}
          <path
            d="M-60 210 C 210 155, 360 290, 620 235 C 880 180, 1080 90, 1500 175"
            stroke="#596950"
            strokeWidth="1"
            strokeOpacity="0.45"
          />
          <path
            d="M-60 265 C 240 215, 420 355, 670 290 C 930 225, 1110 150, 1500 235"
            stroke="#596950"
            strokeWidth="0.85"
            strokeOpacity="0.35"
          />
          <path
            d="M-60 660 C 260 600, 480 715, 760 645 C 1020 580, 1210 665, 1500 615"
            stroke="#596950"
            strokeWidth="1"
            strokeOpacity="0.4"
          />
          <path
            d="M-60 725 C 280 675, 510 770, 790 705 C 1050 645, 1230 715, 1500 670"
            stroke="#596950"
            strokeWidth="0.8"
            strokeOpacity="0.3"
          />

          {/* Subtle Airspace Range Arcs */}
          <circle cx="720" cy="450" r="210" stroke="#7A8A6E" strokeWidth="0.9" strokeOpacity="0.35" strokeDasharray="4 6" />
          <circle cx="720" cy="450" r="350" stroke="#7A8A6E" strokeWidth="0.85" strokeOpacity="0.28" />
          <circle cx="720" cy="450" r="490" stroke="#7A8A6E" strokeWidth="0.75" strokeOpacity="0.2" strokeDasharray="8 8" />
          <path d="M 720 450 L 968 202 A 350 350 0 0 1 1070 450 Z" fill="url(#menuRadarSweep)" />
          <line x1="720" y1="60" x2="720" y2="840" stroke="#4D5B45" strokeWidth="0.7" strokeOpacity="0.3" />
          <line x1="220" y1="450" x2="1220" y2="450" stroke="#4D5B45" strokeWidth="0.7" strokeOpacity="0.3" />
        </svg>

        {/* Top-right Language Switcher in Menu */}
        <div
          className="absolute top-4 right-4 z-20 flex items-center border border-[#343E2F] bg-[#161B14]/95 divide-x divide-[#2D3629] shadow-lg"
          role="group"
          aria-label={t.languageLabel}
        >
          {APP_LANG_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleChangeLang(opt.id)}
              className={`px-2.5 py-1.5 text-[11px] font-mono-tabular font-bold transition-colors cursor-pointer ${
                lang === opt.id
                  ? 'bg-[#DF9A2B] text-[#111410]'
                  : 'text-[#A3AE9C] hover:text-[#F4EFE4] hover:bg-[#1E251B]'
              }`}
            >
              {opt.short}
            </button>
          ))}
        </div>

        {menuStep === 'title' ? (
          <div className="relative z-10 flex w-full max-w-lg flex-col items-center border border-[#343E2F] bg-[#161B14]/95 px-8 py-11 text-center shadow-2xl">
            {/* Corner Cartographic Framing Brackets */}
            <span aria-hidden="true" className="pointer-events-none absolute top-0 left-0 h-3.5 w-3.5 border-t-2 border-l-2 border-[#DF9A2B]" />
            <span aria-hidden="true" className="pointer-events-none absolute top-0 right-0 h-3.5 w-3.5 border-t-2 border-r-2 border-[#DF9A2B]" />
            <span aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 h-3.5 w-3.5 border-b-2 border-l-2 border-[#DF9A2B]" />
            <span aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 h-3.5 w-3.5 border-b-2 border-r-2 border-[#DF9A2B]" />

            {/* Hand-crafted Military Air-Defense Crest */}
            <div className="mb-5 flex items-center justify-center">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                <circle cx="32" cy="32" r="28" stroke="#44523D" strokeWidth="1.2" />
                <circle cx="32" cy="32" r="20" stroke="#DF9A2B" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="3 3" />
                <path d="M32 6 V14 M32 50 V58 M6 32 H14 M50 32 H58" stroke="#8C9B82" strokeWidth="1.4" />
                <path d="M21 39 L32 16 L43 39 L32 34 Z" fill="#DF9A2B" fillOpacity="0.18" stroke="#DF9A2B" strokeWidth="1.6" strokeLinejoin="round" />
                <circle cx="32" cy="32" r="2.6" fill="#ECE8DD" />
              </svg>
            </div>

            <h1
              className="font-display text-4xl sm:text-5xl font-bold uppercase tracking-wide text-[#F4EFE4]"
              style={{ textWrap: 'balance' }}
            >
              {t.appName}
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[#A3AE9C]">
              {t.tagline}
            </p>

            <button
              type="button"
              onClick={() => {
                soundFx.playUiClick('confirm');
                setMenuStep('modes');
              }}
              className="mt-8 w-full max-w-[270px] flex items-center justify-center gap-2.5 bg-[#DF9A2B] hover:bg-[#EDA938] text-[#111410] font-bold text-base tracking-wide px-8 py-3.5 shadow-[0_3px_0_#915F12] active:translate-y-[1px] transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <Play className="h-4 w-4 fill-current shrink-0" />
              <span>{t.playBtn}</span>
            </button>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5 text-xs text-[#889481]">
              <span>{t.featurePvo}</span>
              <span aria-hidden="true">·</span>
              <span>{t.featureAir}</span>
              <span aria-hidden="true">·</span>
              <span>{t.featureManual}</span>
            </div>
          </div>
        ) : (
          <div className="relative z-10 w-full max-w-3xl border border-[#343E2F] bg-[#161B14]/95 shadow-2xl">
            <span aria-hidden="true" className="pointer-events-none absolute top-0 left-0 h-3 w-3 border-t-2 border-l-2 border-[#DF9A2B]" />
            <span aria-hidden="true" className="pointer-events-none absolute top-0 right-0 h-3 w-3 border-t-2 border-r-2 border-[#DF9A2B]" />
            <span aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-[#DF9A2B]" />
            <span aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-[#DF9A2B]" />

            {/* Top Navigation Row */}
            <div className="flex items-center justify-between gap-4 border-b border-[#2D3629] px-6 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playUiClick('back');
                    setMenuStep('title');
                  }}
                  aria-label={t.back}
                  className="flex h-9 w-9 items-center justify-center border border-[#3B4735] bg-[#1E251B] hover:border-[#DF9A2B] text-[#E6E2D6] transition-colors shrink-0 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-[#F4EFE4] truncate">
                    {t.chooseMode}
                  </h1>
                  <p className="text-xs text-[#9AA593] truncate">
                    {t.chooseModeSub}
                  </p>
                </div>
              </div>
            </div>

            {/* Two Distinct Tactical Mode Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-6">
              {savedSandbox ? (
                <div className="flex flex-col items-start border border-[#6CA69C]/65 bg-[#1A211B] p-5 text-left">
                  <div className="w-full pb-4 mb-4 border-b border-[#2C362E] flex items-center justify-between gap-3">
                    <svg width="46" height="32" viewBox="0 0 46 32" fill="none" aria-hidden="true">
                      <path d="M3 26 H43" stroke="#4D5F53" strokeWidth="1.2" />
                      <path d="M8 26 L18 14 L25 26" stroke="#6CA69C" strokeWidth="1.4" fill="none" />
                      <path d="M18 14 Q29 4 40 12" stroke="#6CA69C" strokeWidth="1.3" strokeDasharray="3 2" />
                      <circle cx="40" cy="12" r="2.2" fill="#ECE8DD" />
                    </svg>
                    <span className="text-[11px] font-mono-tabular text-[#6CA69C] whitespace-nowrap shrink-0">
                      {t.sandboxSavedPrefix} {formatSavedAtLabel(savedSandbox.savedAt, lang)}
                    </span>
                  </div>

                  <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-[#F4EFE4]">
                    {t.sandboxTitle}
                  </h2>

                  <p className="mt-1.5 text-xs leading-relaxed text-[#A5B09F]">
                    {t.sandboxSavedDesc}
                  </p>

                  <div className="mt-3 w-full grid grid-cols-2 gap-x-3 gap-y-1 border border-[#2C362E] bg-[#131914] px-3 py-2 text-[11px] font-mono-tabular text-[#C9D6CE]">
                    <span>
                      {t.launchersShort}: <strong className="text-[#F4EFE4]">{savedSandbox.launchers.length}</strong>
                    </span>
                    <span>
                      {t.pvoShort}: <strong className="text-[#6CA69C]">{savedSandbox.airDefenses.length}</strong>
                    </span>
                    <span>
                      {t.objectsShort}: <strong className="text-[#F4EFE4]">{savedSandbox.buildings.length}</strong>
                    </span>
                    <span>
                      {t.airfieldsShort}: <strong className="text-[#F4EFE4]">{savedSandbox.airfields.length}</strong>
                    </span>
                  </div>

                  <div className="mt-4 w-full flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleResumeSavedSandbox}
                      className="w-full flex items-center justify-center gap-1.5 bg-[#6CA69C] hover:bg-[#7DB8AE] text-[#0E1310] font-bold text-xs px-3 py-2.5 transition-colors cursor-pointer"
                    >
                      <span>{t.sandboxResumeBtn}</span>
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleStartGame('sandbox')}
                        className="flex items-center justify-center border border-[#354238] bg-[#141A15] hover:border-[#6CA69C] text-[#DCE6DF] text-xs font-semibold px-2.5 py-2 transition-colors cursor-pointer"
                      >
                        {t.sandboxNewMapBtn}
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteSavedSandbox}
                        className="flex items-center justify-center gap-1 border border-[#3E2C2A] bg-[#1A1515] hover:border-red-500/70 text-rose-300 text-xs font-semibold px-2.5 py-2 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3 shrink-0" />
                        <span>{t.deleteBtn}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleStartGame('sandbox')}
                  className="group flex flex-col items-start border border-[#354238] bg-[#1A211B] hover:bg-[#202922] hover:border-[#6CA69C] p-5 text-left transition-all hover:-translate-y-0.5 cursor-pointer"
                >
                  <div className="w-full pb-4 mb-4 border-b border-[#2C362E] flex items-center justify-between gap-3">
                    <svg width="46" height="32" viewBox="0 0 46 32" fill="none" aria-hidden="true">
                      <path d="M3 26 H43" stroke="#4D5F53" strokeWidth="1.2" />
                      <path d="M8 26 L18 14 L25 26" stroke="#6CA69C" strokeWidth="1.4" fill="none" />
                      <path d="M18 14 Q29 4 40 12" stroke="#6CA69C" strokeWidth="1.3" strokeDasharray="3 2" />
                      <circle cx="40" cy="12" r="2.2" fill="#ECE8DD" />
                    </svg>
                    <span className="text-xs font-semibold text-[#6CA69C] group-hover:underline whitespace-nowrap shrink-0">
                      {t.sandboxOpenMap}
                    </span>
                  </div>

                  <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-[#F4EFE4]">
                    {t.sandboxTitle}
                  </h2>

                  <p className="mt-2 text-xs leading-relaxed text-[#A5B09F]">
                    {t.sandboxDesc}
                  </p>

                  <div className="mt-5 pt-3 border-t border-[#2C362E] w-full flex items-center gap-2 text-[11px] font-mono-tabular text-[#8EA39A]">
                    <span>{t.sandboxTag1}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#6CA69C]">{t.sandboxTag2}</span>
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleStartGame('ai')}
                className="group flex flex-col items-start border border-[#3D372B] bg-[#1D1D16] hover:bg-[#25241B] hover:border-[#DF9A2B] p-5 text-left transition-all hover:-translate-y-0.5 cursor-pointer"
              >
                <div className="w-full pb-4 mb-4 border-b border-[#333025] flex items-center justify-between gap-3">
                  <svg width="46" height="32" viewBox="0 0 46 32" fill="none" aria-hidden="true">
                    <path d="M4 27 H42" stroke="#5A5342" strokeWidth="1.2" />
                    <path d="M10 27 A13 13 0 0 1 36 27" stroke="#DF9A2B" strokeWidth="1.4" strokeDasharray="3 2" />
                    <path d="M38 6 L28 16" stroke="#D1513E" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="28" cy="16" r="2.4" fill="#D1513E" />
                    <rect x="19" y="19" width="8" height="8" stroke="#ECE8DD" strokeWidth="1.2" />
                  </svg>
                  <span className="text-xs font-semibold text-[#DF9A2B] group-hover:underline whitespace-nowrap shrink-0">
                    {t.aiStartBtn}
                  </span>
                </div>

                <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-[#F4EFE4]">
                  {t.aiTitle}
                </h2>

                <p className="mt-2 text-xs leading-relaxed text-[#AEA99A]">
                  {t.aiDesc(INITIAL_AI_BUILDINGS.length, INITIAL_AI_ENEMY_BUILDINGS.length)}
                </p>

                <div className="mt-5 pt-3 border-t border-[#333025] w-full flex items-center gap-2 text-[11px] font-mono-tabular text-[#B6AD96]">
                  <span>{t.aiStartBudget(AI_STARTING_MONEY)}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#DF9A2B]">{t.aiIncomeTag}</span>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const sandboxExitModal = sandboxExitPromptOpen ? (
    <div
      onClick={() => setSandboxExitPromptOpen(false)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sandbox-exit-modal-title"
        className="w-full max-w-md rounded border border-slate-700 bg-[#0A111C] shadow-2xl overflow-hidden text-slate-100"
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 bg-[#070B12] px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <Save className="h-4 w-4 text-emerald-400 shrink-0" />
            <h2
              id="sandbox-exit-modal-title"
              className="text-sm font-bold text-slate-100 truncate"
            >
              {t.exitModalTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setSandboxExitPromptOpen(false)}
            aria-label={t.cancelBtn}
            className="flex h-7 w-7 items-center justify-center rounded border border-slate-800 bg-[#0E1726] text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-3.5">
          <p className="text-xs leading-relaxed text-slate-300">
            {t.exitModalBody}
          </p>

          <div className="grid grid-cols-2 gap-2 rounded border border-slate-800 bg-[#070B12] px-3 py-2.5 text-xs font-mono-tabular text-slate-300">
            <span>
              {t.launchersShort}: <strong className="text-slate-100">{playerLaunchers.length}</strong>
            </span>
            <span>
              {t.pvoShort}: <strong className="text-emerald-300">{airDefenses.length}</strong>
            </span>
            <span>
              {t.objectsShort}: <strong className="text-slate-100">{playerBuildings.length}</strong>
            </span>
            <span>
              {t.airfieldsShort}: <strong className="text-slate-100">{playerAirfields.length}</strong>
            </span>
          </div>

          <div className="flex flex-col gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => {
                handleSaveCurrentSandbox({ silent: true });
                handleReturnToMenu();
              }}
              className="w-full flex items-center justify-center gap-2 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm py-2.5 px-4 transition-colors cursor-pointer"
            >
              <Save className="h-4 w-4 shrink-0" />
              <span>{t.saveAndExit}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundFx.playUiClick('back');
                handleReturnToMenu();
              }}
              className="w-full flex items-center justify-center rounded border border-red-500/45 bg-red-950/30 hover:bg-red-950/55 hover:border-red-400 text-rose-200 font-semibold text-sm py-2.5 px-4 transition-colors cursor-pointer"
            >
              {t.exitWithoutSave}
            </button>
            <button
              type="button"
              onClick={() => setSandboxExitPromptOpen(false)}
              className="w-full flex items-center justify-center rounded border border-slate-700 bg-[#0E1726] hover:border-slate-500 text-slate-200 font-medium text-sm py-2 px-4 transition-colors cursor-pointer"
            >
              {t.cancelBtn}
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  if (isMobile) {
    return (
      <div className="flex h-[100dvh] w-screen flex-col bg-[#070B12] text-slate-100 select-none overflow-hidden">
        <main className="relative flex-1 min-w-0 h-full">
          <TacticalMap
            isMobile={true}
            mobileSteerDir={mobileSteerDir}
            gameMode={gameMode}
            launchers={launchers}
            airfields={airfields}
            airDefenses={airDefenses}
            buildings={buildings}
            pendingPlacement={pendingPlacement}
            selectedLauncherId={selectedLauncherId}
            selectedAirfieldId={selectedAirfieldId}
            selectedFlightId={selectedFlight?.id ?? null}
            airfieldLaunchPoint={airfieldLaunchPoint}
            airfieldMissileWaypoints={airfieldMissileWaypoints}
            launchAirfieldSignal={launchAirfieldSignal}
            su57DropPoint={su57DropPoint}
            isPlottingRoute={isPlottingRoute}
            routeWaypoints={routeWaypoints}
            routeLaunchCount={effectiveRouteLaunchCount}
            routeAltitudeMode={routeAltitudeMode}
            launchRouteSignal={launchRouteSignal}
            isPlottingFlightRoute={isPlottingFlightRoute}
            flightRouteWaypoints={flightRouteWaypoints}
            applyFlightRouteSignal={applyFlightRouteSignal}
            flightAltitudeCommand={flightAltitudeCommand}
            exitFollowCamSignal={exitFollowCamSignal}
            detonateFlightSignal={detonateFlightSignal}
            aiWaveSignal={aiWaveSignal}
            pendingAiWaveOrders={pendingAiWaveOrders}
            pendingAiSorties={pendingAiSorties}
            buildingScale={buildingScale}
            timeScale={timeScale}
            mapStyle={mapStyle}
            showLabels={showLabels}
            showRaions={showRaions}
            showFrontline={showFrontline}
            alertRadiusKm={alertRadiusKm}
            alertHoldoverSec={alertHoldoverSec}
            clearSignal={clearSignal}
            restoreStatsTrigger={restoreStatsTrigger}
            focusCoords={focusCoords}
            onChangeMapStyle={setMapStyle}
            onPlaceStrikeLauncher={handlePlaceStrikeLauncher}
            onPlaceNavalShip={handlePlaceNavalShip}
            onPlaceAirfield={handlePlaceAirfield}
            onPlaceAirDefense={handlePlaceAirDefense}
            onPlaceBuilding={handlePlaceBuilding}
            onSelectLauncher={handleSelectLauncher}
            onSelectAirfield={handleSelectAirfield}
            onSelectFlight={handleSelectFlight}
            onFollowCamChange={setFollowCamActive}
            onAddFlightWaypoint={handleAddFlightWaypoint}
            onFlightRouteApplied={handleFlightRouteApplied}
            onSetAirfieldLaunchPoint={setAirfieldLaunchPoint}
            onAddAirfieldWaypoint={handleAddAirfieldWaypoint}
            onAirfieldLaunched={handleAirfieldLaunched}
            onAiWaveOrdersConsumed={() => {
              setPendingAiWaveOrders([]);
              setPendingAiSorties([]);
            }}
            onRemoveLauncher={handleRemoveLauncher}
            onRemoveAirfield={handleRemoveAirfield}
            onRemovePvo={handleRemovePvo}
            onRemoveBuilding={handleRemoveBuilding}
            onSetSu57DropPoint={setSu57DropPoint}
            onCancelPending={() => setPendingPlacement(null)}
            onAddWaypoint={handleAddWaypoint}
            onRouteLaunched={handleRouteLaunched}
            onLaunchStarted={handleLaunchStarted}
            onPvoFired={handlePvoFired}
            onUnitsDestroyed={handleUnitsDestroyed}
            onAirDefensesDamaged={handleAirDefensesDamaged}
            onBuildingsDamaged={handleBuildingsDamaged}
            onTacticalEvent={handleTacticalEvent}
            onTelegramIntel={handleTelegramIntel}
            onWarning={showWarning}
            onStatsChange={setStats}
          />
          <MobileHud
            lang={lang}
            onChangeLang={handleChangeLang}
            gameMode={gameMode}
            gameScreen={gameScreen === 'gameover' ? 'gameover' : 'playing'}
            aiOutcome={aiOutcome}
            simTimeMinutes={simTimeMinutes}
            formatSimDateShort={(m) => formatSimDateShort(m, lang)}
            formatSimTimeShort={formatSimTimeShort}
            formatSimClock={(m) => formatSimClock(m, lang)}
            money={money}
            aiIncomePerSec={aiIncomePerSec}
            aiWaveNumber={aiWaveNumber}
            aiWaveCountdownSec={aiWaveCountdownSec}
            aiSurvivedSec={aiSurvivedSec}
            timeScale={timeScale}
            onChangeTimeScale={setTimeScale}
            muted={muted}
            onToggleMute={toggleMute}
            showFrontline={showFrontline}
            onToggleFrontline={() => setShowFrontline((v) => !v)}
            showRaions={showRaions}
            onToggleRaions={() => setShowRaions((v) => !v)}
            showLabels={showLabels}
            onToggleLabels={() => setShowLabels((v) => !v)}
            mapStyle={mapStyle}
            onChangeMapStyle={setMapStyle}
            onReturnToMenu={handleRequestReturnToMenu}
            onSaveSandbox={() => handleSaveCurrentSandbox()}
            onClearAll={handleClearAll}
            onStartAiAgain={() => handleStartGame('ai')}
            stats={stats}
            buildingsIntegrityPct={buildingsIntegrityPct}
            interceptAccuracyPct={interceptAccuracyPct}
            launchers={launchers}
            playerLaunchers={playerLaunchers}
            airfields={airfields}
            playerAirfields={playerAirfields}
            airDefenses={airDefenses}
            buildings={buildings}
            pendingPlacement={pendingPlacement}
            onCancelPending={() => setPendingPlacement(null)}
            onSelectStrikeCatalog={handleSelectStrikeCatalog}
            onSelectPvoCatalog={handleSelectPvoCatalog}
            onSelectInfraCatalog={handleSelectInfraCatalog}
            onStartNavalShipPlacement={handleStartNavalShipPlacement}
            onStartManualAirfieldPlacement={handleStartManualAirfieldPlacement}
            onStartManualUaAirfieldPlacement={handleStartManualUaAirfieldPlacement}
            onDeployPresetAirbase={handleDeployPresetAirbase}
            selectedLauncher={selectedLauncher}
            selectedSpec={selectedSpec}
            onSelectLauncher={handleSelectLauncher}
            onRemoveLauncher={handleRemoveLauncher}
            onReloadLauncher={handleReloadLauncher}
            selectedAirfield={selectedAirfield}
            selectedAircraftSpec={selectedAircraftSpec}
            selectedAircraftMissileSpec={selectedAircraftMissileSpec}
            airfieldLaunchPoint={airfieldLaunchPoint}
            airfieldMissileWaypoints={airfieldMissileWaypoints}
            airfieldModalStep={airfieldModalStep}
            onSetAirfieldModalStep={setAirfieldModalStep}
            onCancelAirfieldSelection={handleCancelAirfieldSelection}
            onSelectAirfield={handleSelectAirfield}
            onChangeAirfieldAircraft={handleChangeAirfieldAircraft}
            onChangeAirfieldSalvo={handleChangeAirfieldSalvo}
            onRemoveAirfield={handleRemoveAirfield}
            onLaunchAirfield={() => setLaunchAirfieldSignal((n) => n + 1)}
            onUndoAirfieldWaypoint={() =>
              setAirfieldMissileWaypoints((prev) => prev.slice(0, -1))
            }
            onResetAirfieldPoints={() => {
              setAirfieldLaunchPoint(null);
              setAirfieldMissileWaypoints([]);
            }}
            su57DropPoint={su57DropPoint}
            onResetSu57DropPoint={() => setSu57DropPoint(null)}
            isPlottingRoute={isPlottingRoute}
            onSetIsPlottingRoute={setIsPlottingRoute}
            routeWaypoints={routeWaypoints}
            onUndoRouteWaypoint={() => setRouteWaypoints((prev) => prev.slice(0, -1))}
            onClearRouteWaypoints={() => setRouteWaypoints([])}
            effectiveRouteLaunchCount={effectiveRouteLaunchCount}
            onChangeRouteLaunchCount={setRouteLaunchCount}
            routeAltitudeMode={routeAltitudeMode}
            onChangeRouteAltitudeMode={setRouteAltitudeMode}
            onLaunchRoute={() => setLaunchRouteSignal((n) => n + 1)}
            selectedFlight={selectedFlight}
            followCamActive={followCamActive}
            onExitFollowCam={() => setExitFollowCamSignal((n) => n + 1)}
            onDetonateFlight={() => setDetonateFlightSignal((n) => n + 1)}
            onDeselectFlight={() => {
              if (followCamActive) {
                setExitFollowCamSignal((n) => n + 1);
              }
              setFollowCamActive(false);
              setSelectedFlight(null);
              setIsPlottingFlightRoute(false);
              setFlightRouteWaypoints([]);
              setMobileSteerDir(0);
            }}
            isPlottingFlightRoute={isPlottingFlightRoute}
            onSetIsPlottingFlightRoute={(v) => {
              setIsPlottingFlightRoute(v);
              if (!v) setFlightRouteWaypoints([]);
            }}
            flightRouteWaypoints={flightRouteWaypoints}
            onUndoFlightRouteWaypoint={() =>
              setFlightRouteWaypoints((prev) => prev.slice(0, -1))
            }
            onClearFlightRouteWaypoints={() => setFlightRouteWaypoints([])}
            onApplyFlightRoute={() => setApplyFlightRouteSignal((n) => n + 1)}
            onSetFlightAltitude={(id, mode) =>
              setFlightAltitudeCommand((prev) => ({
                id,
                altitudeMode: mode,
                seq: (prev?.seq ?? 0) + 1,
              }))
            }
            onMobileSteerChange={setMobileSteerDir}
            onFocusCoords={setFocusCoords}
            onRemovePvo={handleRemovePvo}
            onReloadPvo={handleReloadPvo}
            onRepairPvo={handleRepairPvo}
            onRemoveBuilding={handleRemoveBuilding}
            buildingScale={buildingScale}
            onChangeBuildingScale={setBuildingScale}
            sirenEnabled={sirenEnabled}
            onToggleSiren={() => setSirenEnabled((v) => !v)}
            sirenVolume={sirenVolume}
            onChangeSirenVolume={setSirenVolume}
            droneVolume={droneVolume}
            onChangeDroneVolume={setDroneVolume}
            missileVolume={missileVolume}
            onChangeMissileVolume={setMissileVolume}
            alertHoldoverSec={alertHoldoverSec}
            onChangeAlertHoldoverSec={setAlertHoldoverSec}
            alertRadiusKm={alertRadiusKm}
            onChangeAlertRadiusKm={setAlertRadiusKm}
            telegramOpen={telegramOpen}
            onSetTelegramOpen={setTelegramOpen}
            telegramCountryFilter={telegramCountryFilter}
            onChangeTelegramCountryFilter={setTelegramCountryFilter}
            telegramUnreadUa={telegramUnreadUa}
            telegramUnreadRu={telegramUnreadRu}
            selectedTelegramOblast={selectedTelegramOblast}
            onSelectTelegramOblast={setSelectedTelegramOblast}
            onOpenTelegramChannel={handleOpenTelegramChannel}
            telegramSearch={telegramSearch}
            onChangeTelegramSearch={setTelegramSearch}
            telegramPosts={telegramPosts}
            telegramUnreadByOblast={telegramUnreadByOblast}
            totalTelegramUnread={totalTelegramUnread}
            onMarkAllTelegramRead={() => setTelegramUnreadByOblast({})}
            onClearChannelPosts={(oblast) =>
              setTelegramPosts((prev) => prev.filter((p) => p.oblast !== oblast))
            }
            eventLog={eventLog}
            onClearEventLog={() => setEventLog([])}
            warning={warning}
          />
          {sandboxExitModal}
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-[#070B12] text-slate-100 select-none overflow-hidden">
      {/* Top Command Bar */}
      <header className="flex h-12 items-center justify-between gap-2 border-b border-slate-800 bg-[#0A111C] px-2.5 lg:px-3 shrink-0 z-30 overflow-hidden">
        <div className="flex flex-1 items-center gap-2 min-w-0 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              soundFx.playUiClick('toggle');
              setSidebarOpen((v) => !v);
            }}
            aria-label={t.tabTech}
            className="flex h-8 w-8 items-center justify-center rounded border border-slate-800 bg-[#0E1726] text-slate-300 hover:border-slate-700 hover:text-white transition-colors shrink-0 cursor-pointer"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => {
              soundFx.playUiClick('back');
              handleRequestReturnToMenu();
            }}
            className="flex h-8 items-center gap-1.5 rounded border border-slate-800 bg-[#0E1726] hover:border-slate-700 hover:text-white px-2.5 text-xs font-medium text-slate-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>{t.menuBtn}</span>
          </button>

          <h1 className="hidden xl:block font-display text-base font-bold tracking-tight text-slate-50 truncate min-w-0 max-w-[165px] 2xl:max-w-none ml-0.5">
            {gameMode === 'ai' ? t.headerTitleAi : t.headerTitleSandbox}
          </h1>

          {/* In-Game Clock */}
          <div
            title={formatSimClock(simTimeMinutes, lang)}
            className="hidden 2xl:flex items-center gap-1.5 border-l border-slate-800 pl-2.5 ml-1 text-xs font-mono-tabular text-slate-300 whitespace-nowrap shrink-0"
          >
            <Clock className="h-3.5 w-3.5 text-sky-400 shrink-0" />
            <span className="font-semibold text-slate-100">{formatSimClock(simTimeMinutes, lang)}</span>
          </div>

          {gameMode === 'ai' ? (
            <div className="flex items-center gap-2.5 border-l border-slate-800 pl-2.5 text-xs font-mono-tabular whitespace-nowrap shrink-0">
              <span className="flex items-center gap-1 font-bold text-amber-300">
                <Coins className="h-3.5 w-3.5 shrink-0" />
                ${Math.floor(money)}
                <span className="text-[11px] font-semibold text-emerald-400">
                  +{aiIncomePerSec}{t.perSecShort}
                </span>
              </span>
              <span className="hidden md:inline text-slate-400">
                {t.objectsWord}{' '}
                <strong className="text-emerald-300">
                  {playerBuildings.length}/{INITIAL_AI_BUILDINGS.length}
                </strong>
              </span>
              <span className="hidden lg:inline text-slate-400">
                {t.waveAbbr} <strong className="text-sky-300">#{aiWaveNumber}</strong>{' '}
                <span className="text-slate-500">({Math.ceil(aiWaveCountdownSec)}{t.secShort})</span>
              </span>
              <span className="hidden 2xl:inline text-slate-400">
                {t.interceptedShort} <strong className="text-emerald-400">{stats.intercepts}</strong>
              </span>
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-2 border-l border-slate-800 pl-2.5 text-xs font-mono-tabular text-slate-400 whitespace-nowrap shrink-0">
              <span>
                {t.launchersShort} <strong className="text-slate-100">{launchers.length}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {t.pvoShort} <strong className="text-emerald-300">{airDefenses.length}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {t.targetsShort} <strong className="text-sky-300">{stats.activeFlights}</strong>
              </span>
              <span className="hidden 2xl:inline" aria-hidden="true">·</span>
              <span className="hidden 2xl:inline">
                {t.interceptedShort} <strong className="text-emerald-400">{stats.intercepts}</strong>
              </span>
              <span className="hidden 2xl:inline" aria-hidden="true">·</span>
              <span className="hidden 2xl:inline">
                {t.explosionsShort} <strong className="text-amber-300">{stats.explosions}</strong>
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 lg:gap-1.5 shrink-0">
          <div
            className="hidden sm:flex items-center rounded border border-slate-800 bg-[#080D16] p-0.5"
            role="group"
            aria-label={t.tempoWord}
          >
            {[0.5, 1, 2, 4].map((mult) => (
              <button
                key={mult}
                type="button"
                onClick={() => {
                  soundFx.playUiClick('tab');
                  setTimeScale(mult);
                }}
                className={`px-2 py-0.5 text-[11px] font-mono-tabular font-semibold rounded-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  timeScale === mult
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mult}×
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              soundFx.playUiClick('toggle');
              setShowFrontline((v) => !v);
            }}
            title={t.frontTitle}
            className={`flex h-8 items-center gap-1.5 rounded border px-2 xl:px-2.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showFrontline
                ? 'border-red-500/60 bg-red-500/12 text-rose-200'
                : 'border-slate-800 bg-[#0E1726] text-slate-300 hover:border-slate-700'
            }`}
          >
            <Swords className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden 2xl:inline">{t.frontBtn}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFx.playUiClick('toggle');
              setShowRaions((v) => !v);
            }}
            title={t.regionsTitle}
            className={`flex h-8 items-center gap-1.5 rounded border px-2 xl:px-2.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showRaions
                ? 'border-amber-500/55 bg-amber-500/10 text-amber-200'
                : 'border-slate-800 bg-[#0E1726] text-slate-300 hover:border-slate-700'
            }`}
          >
            <MapIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden 2xl:inline">{t.regionsBtn}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFx.playUiClick('toggle');
              setShowLabels((v) => !v);
            }}
            title={t.labelsBtn}
            className={`flex h-8 items-center gap-1.5 rounded border px-2 xl:px-2.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showLabels
                ? 'border-sky-500/55 bg-sky-500/10 text-sky-200'
                : 'border-slate-800 bg-[#0E1726] text-slate-300 hover:border-slate-700'
            }`}
          >
            <Layers className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden 2xl:inline">{t.labelsBtn}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFx.playUiClick('tab');
              setSidebarOpen(true);
              setCatalogFilter((prev) => (prev === 'settings' ? (gameMode === 'ai' ? 'pvo' : 'all') : 'settings'));
            }}
            title={t.alertTitle}
            className={`flex h-8 items-center gap-1.5 rounded border px-2 xl:px-2.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              catalogFilter === 'settings' && sidebarOpen
                ? 'border-rose-500/55 bg-rose-500/12 text-rose-200'
                : 'border-slate-800 bg-[#0E1726] text-slate-300 hover:border-slate-700'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden 2xl:inline">{t.alertBtn}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const idx = APP_LANG_OPTIONS.findIndex((o) => o.id === lang);
              const nextOpt = APP_LANG_OPTIONS[(idx + 1) % APP_LANG_OPTIONS.length];
              handleChangeLang(nextOpt.id);
            }}
            title={t.languageLabel}
            className="flex h-8 items-center rounded border border-slate-800 bg-[#0E1726] hover:border-sky-500/55 px-2 font-mono-tabular text-[11px] font-bold text-sky-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {APP_LANG_OPTIONS.find((o) => o.id === lang)?.short ?? 'RU'}
          </button>

          <button
            type="button"
            onClick={() => {
              soundFx.playUiClick('toggle');
              toggleMute();
            }}
            title={muted ? t.mutedBtn : t.soundBtn}
            aria-label={muted ? t.mutedBtn : t.soundBtn}
            className="flex h-8 items-center gap-1.5 rounded border border-slate-800 bg-[#0E1726] hover:border-slate-700 px-2 xl:px-2.5 text-xs font-medium text-slate-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {muted ? <VolumeX className="h-3.5 w-3.5 text-red-400 shrink-0" /> : <Volume2 className="h-3.5 w-3.5 shrink-0" />}
            <span className="hidden 2xl:inline">{muted ? t.mutedBtn : t.soundBtn}</span>
          </button>

          {gameMode === 'sandbox' && (
            <button
              type="button"
              onClick={() => handleSaveCurrentSandbox()}
              disabled={playerUnitsCount === 0}
              title={t.saveTitle}
              className={`flex h-8 items-center gap-1.5 rounded border px-2 xl:px-2.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                playerUnitsCount === 0
                  ? 'border-slate-800/60 bg-[#0A111C] text-slate-600 cursor-not-allowed'
                  : 'border-emerald-600/45 bg-emerald-950/25 hover:border-emerald-400 text-emerald-200 cursor-pointer'
              }`}
            >
              <Save className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden xl:inline">{t.saveBtn}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              soundFx.playUiClick('back');
              handleClearAll();
            }}
            title={gameMode === 'ai' ? t.restartTitle : t.clearTitle}
            className="flex h-8 items-center gap-1.5 rounded border border-slate-800 bg-[#0E1726] hover:border-red-700 hover:text-red-200 px-2 xl:px-2.5 text-xs font-medium text-slate-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden xl:inline">{gameMode === 'ai' ? t.restartBtn : t.clearBtn}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFx.playUiClick('tap');
              setTelegramOpen((v) => {
                const next = !v;
                if (next) {
                  setEventDrawerOpen(false);
                  setPhoneScreen('telegram');
                }
                return next;
              });
            }}
            title={t.phoneTitle}
            className={`flex h-8 items-center gap-1.5 rounded border px-2 xl:px-2.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              telegramOpen
                ? 'border-sky-500/65 bg-sky-500/15 text-sky-200'
                : totalTelegramUnread > 0
                  ? 'border-amber-500/55 bg-amber-500/10 text-amber-200 hover:border-amber-400'
                  : 'border-slate-800 bg-[#0E1726] text-slate-300 hover:border-slate-700'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden xl:inline">{t.phoneBtn}</span>
            {totalTelegramUnread > 0 && (
              <span className="font-mono-tabular text-[11px] font-bold text-amber-300">
                {totalTelegramUnread}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              soundFx.playUiClick('tab');
              setEventDrawerOpen((v) => {
                const next = !v;
                if (next) setTelegramOpen(false);
                return next;
              });
            }}
            title={t.statsTitle}
            className={`flex h-8 items-center gap-1.5 rounded border px-2 xl:px-2.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              eventDrawerOpen
                ? 'border-sky-500/65 bg-sky-500/15 text-sky-200'
                : 'border-slate-800 bg-[#0E1726] text-slate-300 hover:border-slate-700'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden xl:inline">{t.statsBtn}</span>
            {eventLog.length > 0 && (
              <span className="font-mono-tabular text-[11px] text-sky-300">
                {eventLog.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content: Left Tactical Panel & Map */}
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0 w-76 sm:w-80' : '-translate-x-full w-0 border-r-0'
          } absolute md:relative inset-y-0 left-0 z-30 flex flex-col border-r border-slate-800 bg-[#0A111C] transition-all duration-200 overflow-hidden shrink-0`}
        >
          {/* Category Filter Tabs (Flat operational command strip) */}
          <div className="border-b border-slate-800 bg-[#070B12] shrink-0">
            <div
              className={`grid divide-x divide-slate-800/80 ${
                gameMode === 'ai' ? 'grid-cols-5' : 'grid-cols-6'
              }`}
            >
              {(
                gameMode === 'ai'
                  ? ([
                      { id: 'strike', label: t.tabStrike },
                      { id: 'pvo', label: t.tabPvo },
                      { id: 'infra', label: t.tabObjects },
                      { id: 'units', label: `${t.tabMap} (${playerUnitsCount})` },
                      { id: 'settings', label: t.tabAlert },
                    ] as const)
                  : ([
                      { id: 'all', label: t.tabAll },
                      { id: 'strike', label: t.tabStrike },
                      { id: 'pvo', label: t.tabPvo },
                      { id: 'infra', label: t.tabInfra },
                      { id: 'units', label: `${t.tabMap} (${playerUnitsCount})` },
                      { id: 'settings', label: t.tabAlert },
                    ] as const)
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    soundFx.playUiClick('tab');
                    setCatalogFilter(tab.id);
                  }}
                  className={`py-2.5 px-1 text-[10.5px] font-semibold tracking-tight transition-colors whitespace-nowrap truncate cursor-pointer ${
                    catalogFilter === tab.id
                      ? 'bg-[#101A2B] text-white border-b-2 border-sky-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#0B121E]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="tac-scroll flex-1 overflow-y-auto p-3 space-y-4">
            {catalogFilter === 'settings' && (
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <BellRing className="h-4 w-4 text-amber-400 shrink-0" />
                    <h2 className="text-sm font-semibold text-slate-100">{t.sirensAndAlerts}</h2>
                  </div>
                  <span
                    className={`font-mono-tabular text-xs font-semibold ${
                      stats.missileAlertRaions > 0
                        ? 'text-red-400'
                        : stats.droneAlertRaions > 0
                          ? 'text-yellow-300'
                          : 'text-slate-500'
                    }`}
                  >
                    {stats.missileAlertRaions > 0
                      ? t.statusMissile
                      : stats.droneAlertRaions > 0
                        ? t.statusDrone
                        : t.statusQuiet}
                  </span>
                </div>

                {/* Language Switcher */}
                <div className="border border-slate-800 rounded bg-[#080D16] p-3 space-y-2">
                  <div className="text-xs font-semibold text-slate-100">{t.languageLabel}</div>
                  <div className="grid grid-cols-3 border border-slate-800 rounded overflow-hidden divide-x divide-slate-800">
                    {APP_LANG_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleChangeLang(opt.id)}
                        className={`py-1.5 px-1 text-[11px] font-semibold transition-colors truncate cursor-pointer ${
                          lang === opt.id
                            ? 'bg-sky-500/20 text-sky-200'
                            : 'bg-[#0A111C] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Alert Summary */}
                <div className="border border-slate-800 rounded bg-[#080D16] divide-y divide-slate-800/80">
                  <div className="flex items-center justify-between px-3 py-2 text-xs">
                    <span className="text-slate-400">{t.yellowAlert}</span>
                    <strong className="font-mono-tabular text-yellow-300">
                      {stats.droneAlertRaions} {t.raionUnit}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 text-xs">
                    <span className="text-slate-400">{t.redAlert}</span>
                    <strong className="font-mono-tabular text-red-400">
                      {stats.missileAlertRaions} {t.raionUnit}
                    </strong>
                  </div>
                </div>

                {/* Auto Siren Switch & Volume (without test buttons) */}
                <div className="border border-slate-800 rounded bg-[#080D16] p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-100">
                        {t.airRaidSiren}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {t.autoOnInRaions}
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={sirenEnabled}
                      onClick={() => {
                        soundFx.playUiClick('toggle');
                        setSirenEnabled((v) => !v);
                      }}
                      className={`relative inline-flex h-5 w-10 shrink-0 items-center rounded border transition-colors cursor-pointer ${
                        sirenEnabled
                          ? 'border-emerald-400/70 bg-emerald-500/80'
                          : 'border-slate-700 bg-slate-800'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-xs bg-white transition-transform ${
                          sirenEnabled ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="space-y-1 pt-1 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">{t.sirenVolume}</span>
                      <span className="font-mono-tabular font-semibold text-amber-300">
                        {Math.round(sirenVolume * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={Math.round(sirenVolume * 100)}
                      onChange={(e) => setSirenVolume(Number(e.target.value) / 100)}
                      style={{ '--slider-accent': '#F59E0B' } as CSSProperties}
                      className="tac-slider"
                    />
                  </div>
                </div>

                {/* Acoustic Channels */}
                <div className="border border-slate-800 rounded bg-[#080D16] p-3 space-y-3">
                  <div className="text-xs font-semibold text-slate-100">{t.targetAndPvoVolume}</div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">{t.droneVolume}</span>
                      <span className="font-mono-tabular font-semibold text-amber-300">
                        {Math.round(droneVolume * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={Math.round(droneVolume * 100)}
                      onChange={(e) => setDroneVolume(Number(e.target.value) / 100)}
                      style={{ '--slider-accent': '#F59E0B' } as CSSProperties}
                      className="tac-slider"
                    />
                  </div>

                  <div className="space-y-1 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">{t.missileAndInterceptVolume}</span>
                      <span className="font-mono-tabular font-semibold text-sky-300">
                        {Math.round(missileVolume * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={Math.round(missileVolume * 100)}
                      onChange={(e) => setMissileVolume(Number(e.target.value) / 100)}
                      style={{ '--slider-accent': '#38BDF8' } as CSSProperties}
                      className="tac-slider"
                    />
                  </div>
                </div>

                {/* Alert Holdover Delay */}
                <div className="border border-slate-800 rounded bg-[#080D16] p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-100">
                      {t.alertHoldover}
                    </span>
                    <span className="font-mono-tabular text-xs font-bold text-amber-300 whitespace-nowrap">
                      {alertHoldoverSec} {t.secShort}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={60}
                    step={1}
                    value={alertHoldoverSec}
                    onChange={(e) => setAlertHoldoverSec(Number(e.target.value))}
                    style={{ '--slider-accent': '#F59E0B' } as CSSProperties}
                    className="tac-slider"
                  />
                  <div className="grid grid-cols-4 border border-slate-800 rounded overflow-hidden divide-x divide-slate-800">
                    {[0, 5, 15, 30].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setAlertHoldoverSec(sec)}
                        className={`py-1 text-[11px] font-mono-tabular font-medium transition-colors cursor-pointer ${
                          alertHoldoverSec === sec
                            ? 'bg-amber-500/20 text-amber-200'
                            : 'bg-[#0A111C] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {sec}{t.secShort}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    {t.alertHoldoverDesc}
                  </p>
                </div>

                {/* Alert Trigger Radius */}
                <div className="border border-slate-800 rounded bg-[#080D16] p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-100">
                      {t.alertRadius}
                    </span>
                    <span className="font-mono-tabular text-xs font-bold text-sky-300 whitespace-nowrap">
                      {alertRadiusKm} {t.kmShort}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={200}
                    step={5}
                    value={alertRadiusKm}
                    onChange={(e) => setAlertRadiusKm(Number(e.target.value))}
                    style={{ '--slider-accent': '#38BDF8' } as CSSProperties}
                    className="tac-slider"
                  />
                  <div className="grid grid-cols-4 border border-slate-800 rounded overflow-hidden divide-x divide-slate-800">
                    {[0, 30, 60, 120].map((km) => (
                      <button
                        key={km}
                        type="button"
                        onClick={() => setAlertRadiusKm(km)}
                        className={`py-1 text-[11px] font-mono-tabular font-medium transition-colors cursor-pointer ${
                          alertRadiusKm === km
                            ? 'bg-sky-500/20 text-sky-200'
                            : 'bg-[#0A111C] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {km} {t.kmShort}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    {t.alertRadiusDesc}
                  </p>
                </div>
              </section>
            )}

            {/* Strike Munitions: RU+UA in Sandbox, UA in AI mode */}
            {((gameMode === 'sandbox' && (catalogFilter === 'all' || catalogFilter === 'strike')) ||
              (gameMode === 'ai' && catalogFilter === 'strike')) && (
              <section className="space-y-3.5">
                {gameMode === 'sandbox' && (
                  <>
                    {/* Russian Military Airfield & Naval Platforms */}
                    <div className="space-y-1.5">
                      <div className="flex items-baseline justify-between">
                        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          {t.ruCarriersTitle}
                        </h2>
                        <span className="text-[10.5px] font-mono-tabular text-amber-300">{t.krKabBadge}</span>
                      </div>

                      <div className="border border-slate-800/90 rounded bg-[#070B12] divide-y divide-slate-800/80 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            soundFx.playUiClick('toggle');
                            setAirfieldMenuOpen((v) => !v);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left hover:bg-[#0D1522] transition-colors cursor-pointer"
                        >
                          <AirfieldIcon className="w-12 h-8 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-amber-100 truncate">
                                {t.ruAirfieldsTitle}
                              </span>
                              <span className="text-[10.5px] font-mono-tabular text-amber-300 whitespace-nowrap shrink-0">
                                {airfieldMenuOpen ? t.hideWord : t.basesCount(RUSSIAN_AIRBASE_PRESETS.length)}
                              </span>
                            </div>
                            <div className="mt-0.5 text-[10.5px] text-slate-400 truncate">
                              Ту-95МС, Ту-160, МиГ-31К, Су-57 · Х-101 / {getMunitionLocalized('kinzhal', lang).shortName}
                            </div>
                          </div>
                        </button>

                        {airfieldMenuOpen && (
                          <div className="bg-[#06090F] divide-y divide-slate-800/70">
                            {RUSSIAN_AIRBASE_PRESETS.map((preset) => {
                              const isPlaced = airfields.some((a) => a.presetId === preset.id);
                              const aircraft = getAircraftLocalized(preset.defaultAircraftId, lang);
                              const missile = getMunitionLocalized(aircraft.missileId, lang);
                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => handleDeployPresetAirbase(preset)}
                                  className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors cursor-pointer ${
                                    isPlaced ? 'bg-amber-500/12' : 'hover:bg-[#0D1522]'
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <Plane
                                        className="h-3 w-3 shrink-0"
                                        style={{ color: aircraft.accentColor }}
                                      />
                                      <span className="text-xs font-medium text-slate-100 truncate">
                                        {preset.name}
                                      </span>
                                      <span className="text-[10px] text-slate-500 truncate">
                                        {preset.region}
                                      </span>
                                    </div>
                                    <div className="mt-0.5 text-[10.5px] font-mono-tabular text-slate-400 truncate">
                                      {preset.availableAircraftIds
                                        .map((id) => getAircraftLocalized(id, lang).shortName)
                                        .join(' / ')}{' '}
                                      · {aircraft.missileCount}× {missile.shortName}
                                    </div>
                                  </div>
                                  <span
                                    className={`text-[10.5px] font-mono-tabular font-semibold whitespace-nowrap shrink-0 ${
                                      isPlaced ? 'text-amber-300' : 'text-sky-300'
                                    }`}
                                  >
                                    {isPlaced ? t.goToWord : t.showOnMap}
                                  </span>
                                </button>
                              );
                            })}

                            <button
                              type="button"
                              onClick={handleStartManualAirfieldPlacement}
                              className={`w-full px-3 py-2 text-left text-[11px] font-semibold transition-colors cursor-pointer ${
                                pendingAirfield
                                  ? 'bg-amber-500/18 text-amber-200'
                                  : 'text-slate-300 hover:bg-[#0D1522] hover:text-amber-200'
                              }`}
                            >
                              {pendingAirfield ? t.clickRuOrOccupied : t.placeCustomRuAirfield}
                            </button>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handleStartNavalShipPlacement}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-left transition-colors cursor-pointer ${
                            pendingShip ? 'bg-sky-500/16' : 'hover:bg-[#0D1522]'
                          }`}
                        >
                          <ShipIcon className="w-12 h-8 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-sky-100 truncate">
                                {t.ruNavalShip}
                              </span>
                              <span className="font-mono-tabular text-[10.5px] font-semibold text-amber-300 whitespace-nowrap shrink-0">
                                {pendingShip ? t.inSeaWord : `8× ${getMunitionLocalized('kalibr', lang).shortName}`}
                              </span>
                            </div>
                            <div className="mt-0.5 text-[10.5px] text-slate-400 truncate">
                              {t.ruNavalShipSub}
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* RU Ground Launchers */}
                    <div className="space-y-1.5">
                      <div className="flex items-baseline justify-between">
                        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          {t.ruGroundTitle}
                        </h2>
                        <span className="text-[10.5px] font-mono-tabular text-rose-300">{t.groundLaunchersTag}</span>
                      </div>

                      <div className="border border-slate-800/90 rounded bg-[#070B12] divide-y divide-slate-800/80 overflow-hidden">
                        {MUNITIONS.filter((m) => m.faction !== 'UA' && !m.airLaunchedOnly && !m.seaLaunchedOnly).map((rawItem) => {
                          const item = getMunitionLocalized(rawItem.id, lang);
                          const isPending =
                            pendingPlacement?.kind === 'strike' && pendingPlacement.id === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSelectStrikeCatalog(item.id)}
                              className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-left transition-colors cursor-pointer ${
                                isPending ? 'bg-amber-500/14' : 'hover:bg-[#0D1522]'
                              }`}
                            >
                              <MunitionIcon id={item.id} className="w-12 h-8 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-slate-100 truncate">
                                    {item.name}
                                  </span>
                                  <span
                                    className={`font-mono-tabular text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                                      isPending ? 'text-amber-300' : 'text-rose-300'
                                    }`}
                                  >
                                    {isPending ? t.onMapWord : `-${item.damage} HP`}
                                  </span>
                                </div>
                                <div className="mt-0.5 text-[10.5px] font-mono-tabular text-slate-400 truncate">
                                  {item.category} · {item.realSpeedKmh} {t.kmhShort} · {t.ammoShort} {item.maxAmmo}
                                  {item.maxRangeKm
                                    ? ` · ≤${item.maxRangeKm} ${t.kmShort}`
                                    : item.kabMaxRangeKm
                                      ? ` · ≤${item.kabMaxRangeKm} ${t.kmShort}`
                                      : ''}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* UA Airfields & Strike (available in both Sandbox and AI mode) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-2.5 w-1.5 flex-col overflow-hidden rounded-xs shrink-0" aria-hidden="true">
                        <span className="h-1.5 w-full bg-blue-500" />
                        <span className="h-1.5 w-full bg-yellow-400" />
                      </span>
                      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-sky-300">
                        {t.uaSectionTitle}
                      </h2>
                    </div>
                    <span className="text-[10.5px] font-mono-tabular text-sky-400 whitespace-nowrap">
                      {t.uaTerritoryTag}
                    </span>
                  </div>

                  <div className="border border-slate-800/90 rounded bg-[#070B12] divide-y divide-slate-800/80 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playUiClick('toggle');
                        setUaAirfieldMenuOpen((v) => !v);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left hover:bg-[#0D1522] transition-colors cursor-pointer"
                    >
                      <AirfieldIcon className="w-12 h-8 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-sky-100 truncate">
                            {t.uaAirfieldsTitle}
                          </span>
                          <span className="text-[10.5px] font-mono-tabular text-sky-300 whitespace-nowrap shrink-0">
                            {uaAirfieldMenuOpen
                              ? t.hideWord
                              : gameMode === 'ai'
                                ? `$${UA_AIRFIELD_AI_COST}`
                                : t.basesCount(UKRAINIAN_AIRBASE_PRESETS.length)}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[10.5px] text-slate-400 truncate">
                          Су-24М, F-16AM, МиГ-29 · Storm Shadow / AASM
                        </div>
                      </div>
                    </button>

                    {uaAirfieldMenuOpen && (
                      <div className="bg-[#06090F] divide-y divide-slate-800/70">
                        {UKRAINIAN_AIRBASE_PRESETS.map((preset) => {
                          const isPlaced = airfields.some((a) => a.presetId === preset.id);
                          const aircraft = getAircraftLocalized(preset.defaultAircraftId, lang);
                          const missile = getMunitionLocalized(aircraft.missileId, lang);
                          const cantAffordAf = gameMode === 'ai' && !isPlaced && money < UA_AIRFIELD_AI_COST;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => handleDeployPresetAirbase(preset)}
                              className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors cursor-pointer ${
                                isPlaced
                                  ? 'bg-sky-500/14'
                                  : cantAffordAf
                                    ? 'opacity-50 hover:bg-[#0D1522]'
                                    : 'hover:bg-[#0D1522]'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <Plane
                                    className="h-3 w-3 shrink-0"
                                    style={{ color: aircraft.accentColor }}
                                  />
                                  <span className="text-xs font-medium text-slate-100 truncate">
                                    {preset.name}
                                  </span>
                                  <span className="text-[10px] text-slate-500 truncate">
                                    {preset.region}
                                  </span>
                                </div>
                                <div className="mt-0.5 text-[10.5px] font-mono-tabular text-slate-400 truncate">
                                  {preset.availableAircraftIds
                                    .map((id) => getAircraftLocalized(id, lang).shortName)
                                    .join(' / ')}{' '}
                                  · {aircraft.missileCount}× {missile.shortName}
                                </div>
                              </div>
                              <span
                                className={`text-[10.5px] font-mono-tabular font-semibold whitespace-nowrap shrink-0 ${
                                  isPlaced
                                    ? 'text-sky-300'
                                    : cantAffordAf
                                      ? 'text-red-400'
                                      : gameMode === 'ai'
                                        ? 'text-amber-300'
                                        : 'text-blue-300'
                                }`}
                              >
                                {isPlaced
                                  ? t.goToWord
                                  : gameMode === 'ai'
                                    ? `$${UA_AIRFIELD_AI_COST}`
                                    : t.showOnMap}
                              </span>
                            </button>
                          );
                        })}

                        <button
                          type="button"
                          onClick={handleStartManualUaAirfieldPlacement}
                          className={`w-full px-3 py-2 text-left text-[11px] font-semibold transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                            pendingAirfieldUa
                              ? 'bg-sky-500/20 text-sky-200'
                              : gameMode === 'ai' && money < UA_AIRFIELD_AI_COST
                                ? 'opacity-50 text-slate-400 hover:bg-[#0D1522]'
                                : 'text-slate-300 hover:bg-[#0D1522] hover:text-sky-200'
                          }`}
                        >
                          <span className="truncate">
                            {pendingAirfieldUa ? t.clickControlledUa : t.placeCustomUaAirfield}
                          </span>
                          {gameMode === 'ai' && !pendingAirfieldUa && (
                            <span
                              className={`font-mono-tabular shrink-0 ${
                                money < UA_AIRFIELD_AI_COST ? 'text-red-400' : 'text-amber-300'
                              }`}
                            >
                              ${UA_AIRFIELD_AI_COST}
                            </span>
                          )}
                        </button>
                      </div>
                    )}

                    {MUNITIONS.filter((m) => m.faction === 'UA' && !m.airLaunchedOnly).map((rawItem) => {
                      const item = getMunitionLocalized(rawItem.id, lang);
                      const isPending =
                        pendingPlacement?.kind === 'strike' && pendingPlacement.id === item.id;
                      const itemCost = rawItem.cost ?? 0;
                      const cantAfford = gameMode === 'ai' && itemCost > 0 && money < itemCost;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectStrikeCatalog(item.id)}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-left transition-colors cursor-pointer ${
                            isPending
                              ? 'bg-sky-500/16'
                              : cantAfford
                                ? 'opacity-50 hover:bg-[#0D1522]'
                                : 'hover:bg-[#0D1522]'
                          }`}
                        >
                          <MunitionIcon id={item.id} className="w-12 h-8 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-slate-100 truncate">
                                {item.name}
                              </span>
                              {isPending ? (
                                <span className="font-mono-tabular text-[11px] font-semibold text-sky-300 whitespace-nowrap shrink-0">
                                  {t.onUaMapWord}
                                </span>
                              ) : gameMode === 'ai' && itemCost > 0 ? (
                                <span
                                  className={`font-mono-tabular text-[11px] font-bold whitespace-nowrap shrink-0 ${
                                    cantAfford ? 'text-red-400' : 'text-amber-300'
                                  }`}
                                >
                                  ${itemCost}
                                </span>
                              ) : (
                                <span className="font-mono-tabular text-[11px] font-semibold text-rose-300 whitespace-nowrap shrink-0">
                                  -{item.damage} HP
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 text-[10.5px] font-mono-tabular text-slate-400 truncate">
                              {item.category} · {item.realSpeedKmh} {t.kmhShort} · {t.ammoShort} {item.maxAmmo}
                              {gameMode === 'ai' ? ` · -${item.damage} HP` : ''}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* ППО / Air Defense Section */}
            {(catalogFilter === 'all' || catalogFilter === 'pvo') && (
              <section className={catalogFilter === 'all' ? 'pt-3 border-t border-slate-800 space-y-1.5' : 'space-y-1.5'}>
                <div className="flex items-baseline justify-between">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {t.pvoSectionTitle}
                  </h2>
                  <span className="text-[10.5px] font-mono-tabular text-emerald-400">{t.autoInterceptTag}</span>
                </div>

                <div className="border border-slate-800/90 rounded bg-[#070B12] divide-y divide-slate-800/80 overflow-hidden">
                  {AIR_DEFENSE_SYSTEMS.map((rawPvo) => {
                    const pvo = getPvoLocalized(rawPvo.id, lang);
                    const isPending =
                      pendingPlacement?.kind === 'pvo' && pendingPlacement.id === pvo.id;
                    const cantAfford = gameMode === 'ai' && money < pvo.cost;
                    const unitWord =
                      pvo.id === 'mg-pickup'
                        ? t.roundsShort
                        : pvo.isGun
                          ? t.burstsShort
                          : t.missilesShort;
                    return (
                      <button
                        key={pvo.id}
                        type="button"
                        onClick={() => handleSelectPvoCatalog(pvo.id)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-left transition-colors cursor-pointer ${
                          isPending
                            ? 'bg-emerald-500/14'
                            : cantAfford
                              ? 'opacity-50 hover:bg-[#0D1522]'
                              : 'hover:bg-[#0D1522]'
                        }`}
                      >
                        <AirDefenseIcon id={pvo.id} className="w-12 h-8 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-100 truncate">
                              {pvo.name}
                            </span>
                            {isPending ? (
                              <span className="text-[11px] font-mono-tabular font-semibold text-emerald-300 whitespace-nowrap shrink-0">
                                {t.onMapWord}
                              </span>
                            ) : gameMode === 'ai' ? (
                              <span
                                className={`font-mono-tabular text-[11px] font-bold whitespace-nowrap shrink-0 ${
                                  cantAfford ? 'text-red-400' : 'text-amber-300'
                                }`}
                              >
                                ${pvo.cost}
                              </span>
                            ) : (
                              <span className="font-mono-tabular text-[11px] font-semibold text-slate-300 whitespace-nowrap shrink-0">
                                {pvo.maxHp} HP
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-[10.5px] font-mono-tabular text-slate-400 truncate">
                            {pvo.isRadar
                              ? t.radarOverview(pvo.rangeKm)
                              : t.pvoSpecsLine(pvo.rangeKm, pvo.maxAmmo, unitWord, pvo.cooldownSec)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Buildings & Infrastructure Objects */}
            {(catalogFilter === 'all' || catalogFilter === 'infra') && (
              <section className={catalogFilter === 'all' ? 'pt-3 border-t border-slate-800 space-y-2' : 'space-y-2'}>
                <div className="flex items-baseline justify-between">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {gameMode === 'ai' ? t.defendedObjectsTitle : t.infraAndObjectsTitle}
                  </h2>
                  <span className="text-[10.5px] font-mono-tabular text-amber-300">
                    {gameMode === 'ai' ? `+$${aiIncomePerSec}${t.perSecShort}` : t.typesCount(BUILDINGS.length)}
                  </span>
                </div>

                {/* Building Size Control */}
                <div className="border border-slate-800/90 rounded bg-[#070B12] p-2.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300 font-medium">{t.buildingScaleLabel}</span>
                    <span className="font-mono-tabular font-bold text-sky-300">
                      {Math.round(buildingScale * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={200}
                    step={5}
                    value={Math.round(buildingScale * 100)}
                    onChange={(e) => setBuildingScale(Number(e.target.value) / 100)}
                    style={{ '--slider-accent': '#38BDF8' } as CSSProperties}
                    className="tac-slider"
                  />
                  <div className="grid grid-cols-3 border border-slate-800 rounded overflow-hidden divide-x divide-slate-800">
                    {[0.75, 1, 1.5].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setBuildingScale(preset)}
                        className={`py-1 text-[10.5px] font-mono-tabular font-medium transition-colors cursor-pointer ${
                          Math.abs(buildingScale - preset) < 0.02
                            ? 'bg-sky-500/20 text-sky-200'
                            : 'bg-[#0A111C] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {Math.round(preset * 100)}%
                      </button>
                    ))}
                  </div>
                </div>

                {gameMode === 'ai' && (
                  <div className="space-y-2">
                    {/* Friendly Defended Objects */}
                    <div className="border border-slate-800/90 rounded bg-[#070B12] divide-y divide-slate-800/80 overflow-hidden">
                      {playerBuildings.map((b, idx) => {
                        const spec = getBuildingLocalized(b.buildingId, lang);
                        const tpl = INITIAL_AI_BUILDINGS.find((x) => x.id === b.id);
                        const hpRatio = Math.max(0, Math.min(1, b.hp / Math.max(1, b.maxHp)));
                        const hpColor = hpRatio > 0.55 ? '#22C55E' : hpRatio > 0.25 ? '#F59E0B' : '#EF4444';
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setFocusCoords({ lat: b.lat, lng: b.lng })}
                            className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-[#0D1624] cursor-pointer"
                          >
                            <Building2 className="h-3.5 w-3.5 shrink-0" style={{ color: spec.accentColor }} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-slate-100 truncate">
                                  #{idx + 1} · {tpl ? tpl.label : spec.name}
                                </span>
                                <span className="font-mono-tabular text-[11px] font-semibold shrink-0" style={{ color: hpColor }}>
                                  +${spec.incomePerSec}{t.perSecShort} · {Math.ceil(b.hp)}/{b.maxHp}
                                </span>
                              </div>
                              <div className="mt-1 h-1 w-full bg-slate-800 overflow-hidden">
                                <div className="h-full transition-all" style={{ width: `${Math.round(hpRatio * 100)}%`, backgroundColor: hpColor }} />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Enemy AI Targets */}
                    <div className="pt-2 border-t border-slate-800 space-y-1.5">
                      <div className="flex items-baseline justify-between">
                        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-rose-300">
                          {t.enemyTargetsTitle}
                        </h2>
                        <span className="text-[10.5px] font-mono-tabular text-rose-300">
                          {aiEnemyBuildings.length}/{INITIAL_AI_ENEMY_BUILDINGS.length}
                        </span>
                      </div>
                      <div className="border border-rose-500/25 rounded bg-[#070B12] divide-y divide-slate-800/80 overflow-hidden">
                        {aiEnemyBuildings.map((b, idx) => {
                          const spec = getBuildingLocalized(b.buildingId, lang);
                          const tpl = INITIAL_AI_ENEMY_BUILDINGS.find((x) => x.id === b.id);
                          const hpRatio = Math.max(0, Math.min(1, b.hp / Math.max(1, b.maxHp)));
                          const bounty = getAiBuildingBounty(b.buildingId);
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => setFocusCoords({ lat: b.lat, lng: b.lng, zoom: 7 })}
                              className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-rose-950/20 cursor-pointer"
                            >
                              <Crosshair className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-rose-100 truncate">
                                    #{idx + 1} · {tpl ? tpl.label : spec.name}
                                  </span>
                                  <span className="font-mono-tabular text-[11px] font-semibold text-amber-300 shrink-0">
                                    +${bounty} · {Math.ceil(b.hp)}/{b.maxHp}
                                  </span>
                                </div>
                                <div className="mt-1 h-1 w-full bg-slate-800 overflow-hidden">
                                  <div className="h-full bg-rose-500 transition-all" style={{ width: `${Math.round(hpRatio * 100)}%` }} />
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {gameMode === 'sandbox' && (
                  <div className="border border-slate-800/90 rounded bg-[#070B12] divide-y divide-slate-800/80 overflow-hidden">
                    {BUILDINGS.map((rawBldg) => {
                      const bldg = getBuildingLocalized(rawBldg.id, lang);
                      const isPending =
                        pendingPlacement?.kind === 'infra' && pendingPlacement.id === bldg.id;
                      return (
                        <button
                          key={bldg.id}
                          type="button"
                          onClick={() => handleSelectInfraCatalog(bldg.id)}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-left transition-colors cursor-pointer ${
                            isPending ? 'bg-sky-500/14' : 'hover:bg-[#0D1522]'
                          }`}
                        >
                          <BuildingIcon id={bldg.id} className="w-12 h-8 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-slate-100 truncate">
                                {bldg.name}
                              </span>
                              <span
                                className={`font-mono-tabular text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                                  isPending ? 'text-sky-300' : 'text-emerald-300'
                                }`}
                              >
                                {isPending ? t.onMapWord : `${bldg.maxHp} HP`}
                              </span>
                            </div>
                            <div className="mt-0.5 text-[10.5px] text-slate-400 truncate">
                              {bldg.category} · {bldg.summary}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* Placed Player Units List */}
            {(catalogFilter === 'units' || catalogFilter === 'all') && (
              <section
                className={
                  catalogFilter === 'units' ? 'space-y-2.5' : 'pt-3 border-t border-slate-800 space-y-2.5'
                }
              >
                <div className="flex items-baseline justify-between">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {t.deployedOnMapTitle}
                  </h2>
                  <span className="font-mono-tabular text-[11px] font-semibold text-slate-300">
                    {playerUnitsCount} {t.unitsShort}
                  </span>
                </div>

                {playerUnitsCount === 0 ? (
                  <p className="border border-slate-800/80 rounded bg-[#070B12] p-3 text-xs text-slate-500 leading-relaxed">
                    {t.emptyMapHint}
                  </p>
                ) : (
                  <div className="border border-slate-800/90 rounded divide-y divide-slate-800/80 overflow-hidden bg-[#070B12]">
                    {playerAirfields.map((af) => {
                      const acSpec = getAircraftLocalized(af.selectedAircraftId, lang);
                      const missileSpec = getMunitionLocalized(acSpec.missileId, lang);
                      const isSelected = selectedAirfieldId === af.id;
                      const isUa = af.faction === 'UA';
                      const territory = getTerritoryAt(af.lat, af.lng);
                      const occupied = territory === 'UA' && isPointInOccupiedTerritory(af.lat, af.lng);
                      const afRefund = Math.round(UA_AIRFIELD_AI_COST * 0.5);
                      return (
                        <div
                          key={af.id}
                          className={`flex items-center justify-between gap-2 px-2.5 py-2 transition-colors ${
                            isSelected
                              ? isUa
                                ? 'bg-sky-500/14'
                                : 'bg-amber-500/12'
                              : 'hover:bg-[#0D1624]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              handleSelectAirfield(af.id);
                              setFocusCoords({ lat: af.lat, lng: af.lng });
                              soundFx.playSelectLauncher();
                            }}
                            className="flex flex-1 items-center gap-2 min-w-0 text-left cursor-pointer"
                          >
                            <Plane
                              className="h-3.5 w-3.5 shrink-0"
                              style={{ color: acSpec.accentColor }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-slate-100 truncate">
                                  {af.name}
                                </span>
                                <span
                                  className={`font-mono-tabular text-[10.5px] font-semibold shrink-0 ${
                                    isUa ? 'text-sky-300' : 'text-amber-300'
                                  }`}
                                >
                                  {af.salvoCount}× {missileSpec.shortName}
                                </span>
                              </div>
                              <div className="mt-0.5 font-mono-tabular text-[10px] text-slate-400 truncate">
                                {occupied ? t.territoryOccupied : territory === 'RU' ? t.territoryRu : t.territoryUa} ·{' '}
                                {acSpec.shortName}
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveAirfield(af.id)}
                            title={
                              gameMode === 'ai' && isUa ? t.sellTooltip(afRefund) : t.deleteBtn
                            }
                            aria-label={t.deleteBtn}
                            className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:text-red-300 hover:bg-red-950/50 transition-colors shrink-0 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}

                    {playerLaunchers.map((l, idx) => {
                      const spec = getMunitionLocalized(l.munitionId, lang);
                      const isSelected = selectedLauncherId === l.id;
                      const territory = getTerritoryAt(l.lat, l.lng);
                      const occupied = territory === 'UA' && isPointInOccupiedTerritory(l.lat, l.lng);
                      const launcherCost = spec.cost ?? 0;
                      const reloadCost = Math.round((spec.cost ?? 150) * 0.35);
                      return (
                        <div
                          key={l.id}
                          className={`px-2.5 py-2 space-y-1.5 transition-colors ${
                            isSelected ? 'bg-sky-500/12' : 'hover:bg-[#0D1624]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectLauncher(l.id);
                                setFocusCoords({ lat: l.lat, lng: l.lng });
                                soundFx.playSelectLauncher();
                              }}
                              className="flex flex-1 items-center gap-2 min-w-0 text-left cursor-pointer"
                            >
                              <Crosshair
                                className="h-3.5 w-3.5 shrink-0"
                                style={{ color: spec.accentColor }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-slate-100 truncate">
                                    {l.isNavalShip
                                      ? `${t.shipLabel} #${idx + 1} · ${spec.shortName}`
                                      : `${t.launcherLabel} #${idx + 1} · ${spec.shortName}`}
                                  </span>
                                  <span
                                    className={`font-mono-tabular text-[11px] font-semibold shrink-0 ${
                                      l.ammo > 0 ? 'text-slate-200' : 'text-red-400'
                                    }`}
                                  >
                                    {l.ammo}/{l.maxAmmo}
                                  </span>
                                </div>
                                <div className="mt-1 flex items-center gap-0.5">
                                  {Array.from({ length: l.maxAmmo }).map((_, slotIdx) => (
                                    <span
                                      key={slotIdx}
                                      className="h-1 flex-1 transition-colors"
                                      style={{
                                        backgroundColor:
                                          slotIdx < l.ammo ? spec.accentColor : 'rgba(51, 65, 85, 0.7)',
                                      }}
                                    />
                                  ))}
                                </div>
                                <div className="mt-1 font-mono-tabular text-[10px] text-slate-400 truncate">
                                  {l.isNavalShip
                                    ? t.territorySea
                                    : occupied
                                      ? t.territoryOccupied
                                      : territory === 'UA'
                                        ? t.territoryUa
                                        : t.territoryRu}{' '}
                                  ·{' '}
                                  {l.ammo > 0
                                    ? `${l.lat.toFixed(2)}, ${l.lng.toFixed(2)}`
                                    : l.munitionId === 'airstrike'
                                      ? t.sortieDone
                                      : t.ammoEmpty}
                                </div>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveLauncher(l.id)}
                              title={
                                gameMode === 'ai' && launcherCost > 0
                                  ? t.sellTooltip(Math.round(launcherCost * 0.5))
                                  : t.deleteBtn
                              }
                              aria-label={t.deleteBtn}
                              className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:text-red-300 hover:bg-red-950/50 transition-colors shrink-0 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {l.ammo < l.maxAmmo && (
                            <button
                              type="button"
                              onClick={() => handleReloadLauncher(l.id)}
                              className="w-full flex items-center justify-center gap-1 rounded border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 px-2 py-1 text-[10.5px] font-medium text-sky-200 cursor-pointer"
                            >
                              <RefreshCw className="h-3 w-3" />
                              <span>{t.reloadBtn} {gameMode === 'ai' ? `($${reloadCost})` : ''}</span>
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {airDefenses.map((p, idx) => {
                      const spec = getPvoLocalized(p.airDefenseId, lang);
                      const territory = getTerritoryAt(p.lat, p.lng);
                      const hpRatio = Math.max(0, Math.min(1, p.hp / Math.max(1, p.maxHp)));
                      const hpColor =
                        hpRatio > 0.55 ? '#22C55E' : hpRatio > 0.25 ? '#F59E0B' : '#EF4444';
                      const reloadCost = Math.round(spec.cost * 0.35);
                      const repairCost = Math.round(spec.cost * 0.25);
                      return (
                        <div key={p.id} className="px-2.5 py-2 space-y-1.5 hover:bg-[#0D1624]">
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => setFocusCoords({ lat: p.lat, lng: p.lng })}
                              className="flex flex-1 items-center gap-2 min-w-0 text-left cursor-pointer"
                            >
                              <Shield
                                className="h-3.5 w-3.5 shrink-0"
                                style={{ color: spec.accentColor }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-slate-100 truncate">
                                    {t.pvoShort} #{idx + 1} · {spec.shortName}
                                  </span>
                                  {spec.isRadar ? (
                                    <span className="font-mono-tabular text-[11px] font-semibold text-cyan-300 shrink-0">
                                      {t.radarLabel} · {Math.ceil(p.hp)}/{p.maxHp}
                                    </span>
                                  ) : (
                                    <span
                                      className={`font-mono-tabular text-[11px] font-semibold shrink-0 ${
                                        p.ammo > 0 ? 'text-emerald-300' : 'text-red-400'
                                      }`}
                                    >
                                      {p.ammo}/{p.maxAmmo} · {Math.ceil(p.hp)} HP
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 h-1 w-full bg-slate-800 overflow-hidden">
                                  <div
                                    className="h-full transition-all"
                                    style={{
                                      width: `${Math.round(hpRatio * 100)}%`,
                                      backgroundColor: hpColor,
                                    }}
                                  />
                                </div>
                                <div className="mt-1 font-mono-tabular text-[10px] text-slate-400 truncate">
                                  {territory === 'UA' ? t.territoryUa : t.territoryRu} ·{' '}
                                  {spec.isRadar
                                    ? `${t.overviewWord} ${spec.rangeKm} ${t.kmShort} (+45% ${t.pvoShort})`
                                    : `${t.rangeWord} ${spec.rangeKm} ${t.kmShort}`}
                                </div>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemovePvo(p.id)}
                              title={
                                gameMode === 'ai'
                                  ? t.sellTooltip(Math.round(spec.cost * 0.5))
                                  : t.deleteBtn
                              }
                              aria-label={t.deleteBtn}
                              className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:text-red-300 hover:bg-red-950/50 transition-colors shrink-0 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {((!spec.isRadar && p.ammo < p.maxAmmo) || p.hp < p.maxHp) && (
                            <div className="flex items-center gap-1.5 pt-0.5">
                              {!spec.isRadar && p.ammo < p.maxAmmo && (
                                <button
                                  type="button"
                                  onClick={() => handleReloadPvo(p.id)}
                                  className="flex-1 flex items-center justify-center gap-1 rounded border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 px-2 py-1 text-[10.5px] font-medium text-sky-200 cursor-pointer"
                                >
                                  <RefreshCw className="h-3 w-3" />
                                  <span>{t.reloadBtn} {gameMode === 'ai' ? `($${reloadCost})` : ''}</span>
                                </button>
                              )}
                              {p.hp < p.maxHp && (
                                <button
                                  type="button"
                                  onClick={() => handleRepairPvo(p.id)}
                                  className="flex-1 flex items-center justify-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 text-[10.5px] font-medium text-emerald-200 cursor-pointer"
                                >
                                  <Wrench className="h-3 w-3" />
                                  <span>{t.repairBtn} {gameMode === 'ai' ? `($${repairCost})` : ''}</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {playerBuildings.map((b, idx) => {
                      const spec = getBuildingLocalized(b.buildingId, lang);
                      const territory = getTerritoryAt(b.lat, b.lng);
                      const hpRatio = Math.max(0, Math.min(1, b.hp / Math.max(1, b.maxHp)));
                      const hpColor =
                        hpRatio > 0.55 ? '#22C55E' : hpRatio > 0.25 ? '#F59E0B' : '#EF4444';
                      return (
                        <div
                          key={b.id}
                          className="flex items-center justify-between gap-2 px-2.5 py-2 hover:bg-[#0D1624]"
                        >
                          <button
                            type="button"
                            onClick={() => setFocusCoords({ lat: b.lat, lng: b.lng })}
                            className="flex flex-1 items-center gap-2 min-w-0 text-left cursor-pointer"
                          >
                            <Building2
                              className="h-3.5 w-3.5 shrink-0"
                              style={{ color: spec.accentColor }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-slate-100 truncate">
                                  #{idx + 1} · {spec.name}
                                </span>
                                <span
                                  className="font-mono-tabular text-[11px] font-semibold shrink-0"
                                  style={{ color: hpColor }}
                                >
                                  {gameMode === 'ai' ? `+$${spec.incomePerSec}${t.perSecShort} · ` : ''}
                                  {Math.ceil(b.hp)}/{b.maxHp}
                                </span>
                              </div>
                              <div className="mt-1 h-1 w-full bg-slate-800 overflow-hidden">
                                <div
                                  className="h-full transition-all"
                                  style={{
                                    width: `${Math.round(hpRatio * 100)}%`,
                                    backgroundColor: hpColor,
                                  }}
                                />
                              </div>
                              <div className="mt-1 font-mono-tabular text-[10px] text-slate-400 truncate">
                                {territory === 'UA' ? t.territoryUa : t.territoryRu} ·{' '}
                                {b.lat.toFixed(2)}, {b.lng.toFixed(2)}
                              </div>
                            </div>
                          </button>

                          {gameMode !== 'ai' && (
                            <button
                              type="button"
                              onClick={() => handleRemoveBuilding(b.id)}
                              aria-label={t.deleteBtn}
                              className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:text-red-300 hover:bg-red-950/50 transition-colors shrink-0 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {gameMode === 'ai' && (airfields.some((a) => a.isAi) || launchers.some((l) => l.isAi)) && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-[10.5px] font-semibold uppercase tracking-wider text-rose-300/90">
                        {lang === 'uk'
                          ? 'Техніка ШІ (на мапі)'
                          : lang === 'en'
                            ? 'AI Assets (On Map)'
                            : 'Техника ИИ (на карте)'}
                      </h3>
                      <span className="font-mono-tabular text-[10.5px] font-semibold text-rose-300">
                        {airfields.filter((a) => a.isAi).length + launchers.filter((l) => l.isAi).length} {t.unitsShort}
                      </span>
                    </div>

                    <div className="border border-rose-500/30 rounded divide-y divide-slate-800/80 overflow-hidden bg-[#070B12]">
                      {airfields
                        .filter((af) => af.isAi)
                        .map((af) => {
                          const acSpec = getAircraftLocalized(af.selectedAircraftId, lang);
                          const mSpec = getMunitionLocalized(acSpec.missileId, lang);
                          return (
                            <button
                              key={af.id}
                              type="button"
                              onClick={() => setFocusCoords({ lat: af.lat, lng: af.lng })}
                              className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-[#0D1624] cursor-pointer"
                            >
                              <Plane className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-slate-100 truncate">
                                    {af.name}
                                  </span>
                                  <span className="font-mono-tabular text-[10.5px] font-semibold text-rose-300 shrink-0">
                                    {acSpec.shortName} · {af.salvoCount}× {mSpec.shortName}
                                  </span>
                                </div>
                                <div className="mt-0.5 font-mono-tabular text-[10px] text-slate-400 truncate">
                                  {t.airfieldBasePrefixRu} · {af.lat.toFixed(2)}, {af.lng.toFixed(2)}
                                </div>
                              </div>
                            </button>
                          );
                        })}

                      {launchers
                        .filter((l) => l.isAi)
                        .map((l, idx) => {
                          const spec = getMunitionLocalized(l.munitionId, lang);
                          return (
                            <button
                              key={l.id}
                              type="button"
                              onClick={() => setFocusCoords({ lat: l.lat, lng: l.lng })}
                              className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-[#0D1624] cursor-pointer"
                            >
                              <Crosshair className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-slate-100 truncate">
                                    {l.isNavalShip ? t.shipLabel : t.launcherLabel} #{idx + 1} · {spec.shortName}
                                  </span>
                                  <span className="font-mono-tabular text-[10.5px] font-semibold text-rose-300 shrink-0">
                                    {l.ammo}/{l.maxAmmo}
                                  </span>
                                </div>
                                <div className="mt-0.5 font-mono-tabular text-[10px] text-slate-400 truncate">
                                  {l.isNavalShip ? t.territorySea : t.territoryRu} · {l.lat.toFixed(2)}, {l.lng.toFixed(2)}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>
        </aside>

        {/* Satellite Map Viewport */}
        <main className="relative flex-1 min-w-0 h-full">
          <TacticalMap
            gameMode={gameMode}
            launchers={launchers}
            airfields={airfields}
            airDefenses={airDefenses}
            buildings={buildings}
            pendingPlacement={pendingPlacement}
            selectedLauncherId={selectedLauncherId}
            selectedAirfieldId={selectedAirfieldId}
            selectedFlightId={selectedFlight?.id ?? null}
            airfieldLaunchPoint={airfieldLaunchPoint}
            airfieldMissileWaypoints={airfieldMissileWaypoints}
            launchAirfieldSignal={launchAirfieldSignal}
            su57DropPoint={su57DropPoint}
            isPlottingRoute={isPlottingRoute}
            routeWaypoints={routeWaypoints}
            routeLaunchCount={effectiveRouteLaunchCount}
            routeAltitudeMode={routeAltitudeMode}
            launchRouteSignal={launchRouteSignal}
            isPlottingFlightRoute={isPlottingFlightRoute}
            flightRouteWaypoints={flightRouteWaypoints}
            applyFlightRouteSignal={applyFlightRouteSignal}
            flightAltitudeCommand={flightAltitudeCommand}
            exitFollowCamSignal={exitFollowCamSignal}
            detonateFlightSignal={detonateFlightSignal}
            aiWaveSignal={aiWaveSignal}
            pendingAiWaveOrders={pendingAiWaveOrders}
            pendingAiSorties={pendingAiSorties}
            buildingScale={buildingScale}
            timeScale={timeScale}
            mapStyle={mapStyle}
            showLabels={showLabels}
            showRaions={showRaions}
            showFrontline={showFrontline}
            alertRadiusKm={alertRadiusKm}
            alertHoldoverSec={alertHoldoverSec}
            clearSignal={clearSignal}
            restoreStatsTrigger={restoreStatsTrigger}
            focusCoords={focusCoords}
            onChangeMapStyle={setMapStyle}
            onPlaceStrikeLauncher={handlePlaceStrikeLauncher}
            onPlaceNavalShip={handlePlaceNavalShip}
            onPlaceAirfield={handlePlaceAirfield}
            onPlaceAirDefense={handlePlaceAirDefense}
            onPlaceBuilding={handlePlaceBuilding}
            onSelectLauncher={handleSelectLauncher}
            onSelectAirfield={handleSelectAirfield}
            onSelectFlight={handleSelectFlight}
            onFollowCamChange={setFollowCamActive}
            onAddFlightWaypoint={handleAddFlightWaypoint}
            onFlightRouteApplied={handleFlightRouteApplied}
            onSetAirfieldLaunchPoint={setAirfieldLaunchPoint}
            onAddAirfieldWaypoint={handleAddAirfieldWaypoint}
            onAirfieldLaunched={handleAirfieldLaunched}
            onAiWaveOrdersConsumed={() => {
              setPendingAiWaveOrders([]);
              setPendingAiSorties([]);
            }}
            onRemoveLauncher={handleRemoveLauncher}
            onRemoveAirfield={handleRemoveAirfield}
            onRemovePvo={handleRemovePvo}
            onRemoveBuilding={handleRemoveBuilding}
            onSetSu57DropPoint={setSu57DropPoint}
            onCancelPending={() => setPendingPlacement(null)}
            onAddWaypoint={handleAddWaypoint}
            onRouteLaunched={handleRouteLaunched}
            onLaunchStarted={handleLaunchStarted}
            onPvoFired={handlePvoFired}
            onUnitsDestroyed={handleUnitsDestroyed}
            onAirDefensesDamaged={handleAirDefensesDamaged}
            onBuildingsDamaged={handleBuildingsDamaged}
            onTacticalEvent={handleTacticalEvent}
            onTelegramIntel={handleTelegramIntel}
            onWarning={showWarning}
            onStatsChange={setStats}
          />

          {/* Floating Command Bar */}
          <div className="pointer-events-none absolute top-3 left-3 right-3 z-20 flex justify-center">
            <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded border border-slate-700 bg-[#0A111C]/96 px-3 py-1.5 text-xs text-slate-200 max-w-4xl">
              {pendingShip ? (
                <>
                  <span className="font-medium">
                    {lang === 'uk' ? (
                      <>
                        Розміщення <strong className="text-sky-300">корабля ВМФ РФ</strong> (8× КР «Калібр») — натисніть на Чорне або Азовське море
                      </>
                    ) : lang === 'en' ? (
                      <>
                        Deploying <strong className="text-sky-300">RU Navy Ship</strong> (8× Kalibr) — click Black or Azov Sea
                      </>
                    ) : (
                      <>
                        Установка <strong className="text-sky-300">корабля ВМФ РФ</strong> (8× КР «Калибр») — нажмите на Чёрное или Азовское море
                      </>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playUiClick('back');
                      setPendingPlacement(null);
                    }}
                    className="rounded border border-slate-700 bg-[#0E1726] hover:border-slate-600 px-2.5 py-1 text-[11px] font-medium text-slate-300 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {t.cancelBtn}
                  </button>
                </>
              ) : pendingAirfield ? (
                <>
                  <span className="font-medium">
                    {lang === 'uk' ? (
                      <>
                        Розміщення <strong className="text-amber-300">аеродрому ПКС РФ</strong> — натисніть на територію РФ або окуп. зону
                      </>
                    ) : lang === 'en' ? (
                      <>
                        Deploying <strong className="text-amber-300">RU Airbase</strong> — click RU or occupied territory
                      </>
                    ) : (
                      <>
                        Установка <strong className="text-amber-300">аэродрома ВКС РФ</strong> — нажмите на территорию РФ или оккуп. зону
                      </>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playUiClick('back');
                      setPendingPlacement(null);
                    }}
                    className="rounded border border-slate-700 bg-[#0E1726] hover:border-slate-600 px-2.5 py-1 text-[11px] font-medium text-slate-300 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {t.cancelBtn}
                  </button>
                </>
              ) : pendingAirfieldUa ? (
                <>
                  <span className="font-medium">
                    {lang === 'uk' ? (
                      <>
                        Розміщення <strong className="text-sky-300">аеродрому ЗСУ</strong> — натисніть на підконтрольну територію України
                      </>
                    ) : lang === 'en' ? (
                      <>
                        Deploying <strong className="text-sky-300">UA Airbase</strong> — click UA-controlled territory
                      </>
                    ) : (
                      <>
                        Установка <strong className="text-sky-300">аэродрома ВСУ</strong> — нажмите на подконтрольную территорию Украины
                      </>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playUiClick('back');
                      setPendingPlacement(null);
                    }}
                    className="rounded border border-slate-700 bg-[#0E1726] hover:border-slate-600 px-2.5 py-1 text-[11px] font-medium text-slate-300 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {t.cancelBtn}
                  </button>
                </>
              ) : pendingStrikeSpec ? (
                <>
                  <span className="font-medium">
                    {lang === 'uk' ? 'Розміщення' : lang === 'en' ? 'Deploying' : 'Установка'}{' '}
                    <strong
                      className={
                        pendingStrikeSpec.faction === 'UA' ? 'text-sky-300' : 'text-amber-300'
                      }
                    >
                      {lang === 'ru' ? pendingStrikeSpec.launcherName : pendingStrikeSpec.name}
                    </strong>{' '}
                    <span className="text-rose-300 font-mono-tabular">
                      (-{pendingStrikeSpec.damage} HP)
                    </span>{' '}
                    —{' '}
                    {pendingStrikeSpec.faction === 'UA'
                      ? t.clickControlledUa
                      : t.clickRuOrOccupied}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPendingPlacement(null)}
                    className="rounded border border-slate-700 bg-[#0E1726] hover:border-slate-600 px-2.5 py-1 text-[11px] font-medium text-slate-300 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {t.cancelBtn}
                  </button>
                </>
              ) : pendingPvoSpec ? (
                <>
                  <span className="font-medium">
                    {pendingPvoSpec.isRadar ? (
                      lang === 'uk' ? (
                        <>
                          Розміщення <strong className="text-cyan-300">{pendingPvoSpec.name}</strong> (огляд {pendingPvoSpec.rangeKm} км, +45% до ППО) — натисніть на мапу
                        </>
                      ) : lang === 'en' ? (
                        <>
                          Deploying <strong className="text-cyan-300">{pendingPvoSpec.name}</strong> (scan {pendingPvoSpec.rangeKm} km, +45% ADS) — click map
                        </>
                      ) : (
                        <>
                          Установка <strong className="text-cyan-300">{pendingPvoSpec.name}</strong> (обзор {pendingPvoSpec.rangeKm} км, +45% к ППО) — нажмите на карту
                        </>
                      )
                    ) : lang === 'uk' ? (
                      <>
                        Розміщення ППО <strong className="text-emerald-300">{pendingPvoSpec.name}</strong> (радіус {pendingPvoSpec.rangeKm} км) — натисніть на мапу
                      </>
                    ) : lang === 'en' ? (
                      <>
                        Deploying ADS <strong className="text-emerald-300">{pendingPvoSpec.name}</strong> (range {pendingPvoSpec.rangeKm} km) — click map
                      </>
                    ) : (
                      <>
                        Установка ППО <strong className="text-emerald-300">{pendingPvoSpec.name}</strong> (радиус {pendingPvoSpec.rangeKm} км) — нажмите на карту
                      </>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPendingPlacement(null)}
                    className="rounded border border-slate-700 bg-[#0E1726] hover:border-slate-600 px-2.5 py-1 text-[11px] font-medium text-slate-300 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {t.cancelBtn}
                  </button>
                </>
              ) : pendingInfraSpec ? (
                <>
                  <span className="font-medium">
                    {lang === 'uk' ? 'Розміщення' : lang === 'en' ? 'Deploying' : 'Установка'}{' '}
                    <strong style={{ color: pendingInfraSpec.accentColor }}>{pendingInfraSpec.name}</strong>{' '}
                    <span className="text-emerald-300 font-mono-tabular">({pendingInfraSpec.maxHp} HP)</span> —{' '}
                    {lang === 'uk'
                      ? 'натисніть на мапу'
                      : lang === 'en'
                        ? 'click map'
                        : 'нажмите на карту'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPendingPlacement(null)}
                    className="rounded border border-slate-700 bg-[#0E1726] hover:border-slate-600 px-2.5 py-1 text-[11px] font-medium text-slate-300 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {t.cancelBtn}
                  </button>
                </>
              ) : selectedFlight ? (
                (() => {
                  const fltName = selectedFlight.carrierAircraftId
                    ? getAircraftLocalized(selectedFlight.carrierAircraftId, lang).shortName
                    : getMunitionLocalized(selectedFlight.munitionId, lang).shortName;
                  const fltAccent = selectedFlight.carrierAircraftId
                    ? RUSSIAN_AIRCRAFT_BY_ID[selectedFlight.carrierAircraftId].accentColor
                    : MUNITION_BY_ID[selectedFlight.munitionId].accentColor;
                  const fltSpec = MUNITION_BY_ID[selectedFlight.munitionId];
                  const isAiReadOnly = gameMode === 'ai' && Boolean(selectedFlight.isAiStrike);
                  const isSteerable =
                    !isAiReadOnly &&
                    !selectedFlight.carrierAircraftId &&
                    fltSpec.profile !== 'airstrike';
                  const canAdjustAlt = Boolean(
                    !isAiReadOnly && !selectedFlight.carrierAircraftId && fltSpec.canFlyLow,
                  );
                  const obsHeightLabel =
                    selectedFlight.altitudeMode === 'ultra-low'
                      ? lang === 'uk'
                        ? 'Дуже низько (поза РЛС)'
                        : lang === 'en'
                          ? 'Ultra-low (stealth)'
                          : 'Очень низко (вне РЛС)'
                      : selectedFlight.altitudeMode === 'low'
                        ? lang === 'uk'
                          ? 'Низько (РЛС)'
                          : lang === 'en'
                            ? 'Low (Radar)'
                            : 'Низко (РЛС)'
                        : lang === 'uk'
                          ? 'Звичайна'
                          : lang === 'en'
                            ? 'Normal'
                            : 'Обычная';
                  const altLabel =
                    selectedFlight.altitudeMode === 'ultra-low'
                      ? lang === 'uk'
                        ? ' · Дуже низько (поза РЛС)'
                        : lang === 'en'
                          ? ' · Ultra-low (stealth)'
                          : ' · Очень низко (вне РЛС)'
                      : selectedFlight.altitudeMode === 'low'
                        ? lang === 'uk'
                          ? ' · Низько (РЛС)'
                          : lang === 'en'
                            ? ' · Low (Radar)'
                            : ' · Низко (РЛС)'
                        : '';
                  const altOptNormal = lang === 'uk' ? 'Звичайна' : lang === 'en' ? 'Normal' : 'Обычная';
                  const altOptLow = lang === 'uk' ? 'Низько' : lang === 'en' ? 'Low' : 'Низко';
                  const altOptUltra = lang === 'uk' ? 'Дуже низько' : lang === 'en' ? 'Ultra-low' : 'Очень низко';
                  const exitCamLabel = lang === 'uk' ? 'Вийти з камери' : lang === 'en' ? 'Exit Cam' : 'Выйти из камеры';
                  const deselectLabel = lang === 'uk' ? 'Зняти вибір' : lang === 'en' ? 'Deselect' : 'Снять выбор';

                  if (isAiReadOnly) {
                    return (
                      <>
                        <span className="font-medium flex items-center gap-1.5">
                          <Eye className="h-3.5 w-3.5 text-sky-300 shrink-0" />
                          <span>
                            {lang === 'uk' ? 'Спостереження ШІ:' : lang === 'en' ? 'AI Track:' : 'Наблюдение ИИ:'}{' '}
                            <strong style={{ color: fltAccent }}>{fltName}</strong>{' '}
                            <span className="font-mono-tabular text-slate-300">
                              (~{Math.round(selectedFlight.remainingKm)} {t.kmShort} · {lang === 'uk' ? 'Висота' : lang === 'en' ? 'Alt' : 'Высота'}: {obsHeightLabel})
                            </span>
                          </span>
                        </span>

                        {followCamActive && (
                          <button
                            type="button"
                            onClick={() => {
                              soundFx.playUiClick('back');
                              setExitFollowCamSignal((n) => n + 1);
                            }}
                            className="rounded border border-sky-400/60 bg-sky-500/15 hover:bg-sky-500/25 px-2.5 py-1 text-[11px] font-semibold text-sky-200 whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            {exitCamLabel}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            soundFx.playUiClick('back');
                            if (followCamActive) {
                              setExitFollowCamSignal((n) => n + 1);
                            }
                            setFollowCamActive(false);
                            setSelectedFlight(null);
                            setIsPlottingFlightRoute(false);
                            setFlightRouteWaypoints([]);
                          }}
                          className="rounded border border-slate-700 bg-[#0E1726] hover:border-slate-600 px-2.5 py-1 text-[11px] font-medium text-slate-300 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          {deselectLabel}
                        </button>
                      </>
                    );
                  }
                  return isPlottingFlightRoute ? (
                    <>
                      <span className="font-medium flex items-center gap-1.5">
                        <Navigation className="h-3.5 w-3.5 text-amber-300 shrink-0" />
                        <span>
                          {lang === 'uk' ? 'Новий курс' : lang === 'en' ? 'New course' : 'Новый курс'} (<strong style={{ color: fltAccent }}>{fltName}</strong>) · {lang === 'uk' ? 'Точок' : lang === 'en' ? 'Points' : 'Точек'}:{' '}
                          <strong className="font-mono-tabular text-white">
                            {flightRouteWaypoints.length}
                          </strong>
                        </span>
                      </span>

                      <button
                        type="button"
                        disabled={flightRouteWaypoints.length === 0}
                        onClick={() => {
                          soundFx.playUiClick('confirm');
                          setApplyFlightRouteSignal((n) => n + 1);
                        }}
                        className="flex items-center gap-1 rounded bg-amber-500 hover:bg-amber-400 disabled:opacity-45 disabled:pointer-events-none px-2.5 py-1 text-[11px] font-semibold text-slate-950 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Play className="h-3 w-3" />
                        <span>{lang === 'uk' ? 'Застосувати курс' : lang === 'en' ? 'Apply Course' : 'Применить курс'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={flightRouteWaypoints.length === 0}
                        onClick={() => {
                          soundFx.playUiClick('back');
                          setFlightRouteWaypoints((prev) => prev.slice(0, -1));
                        }}
                        className="flex items-center gap-1 rounded border border-slate-700 bg-[#0E1726] hover:border-slate-600 disabled:opacity-40 disabled:pointer-events-none px-2 py-1 text-[11px] font-medium text-slate-300 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Undo2 className="h-3 w-3" />
                        <span>{t.back}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundFx.playUiClick('back');
                          setIsPlottingFlightRoute(false);
                          setFlightRouteWaypoints([]);
                        }}
                        className="rounded border border-slate-700 bg-[#0E1726] hover:border-slate-600 px-2 py-1 text-[11px] font-medium text-slate-300 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {t.cancelBtn}
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="font-medium flex items-center gap-1.5">
                        <Navigation className="h-3.5 w-3.5 text-sky-300 shrink-0" />
                        <span>
                          {lang === 'uk' ? 'Ціль у повітрі:' : lang === 'en' ? 'Airborne Track:' : 'Цель в воздухе:'}{' '}
                          <strong style={{ color: fltAccent }}>{fltName}</strong>{' '}
                          <span className="font-mono-tabular text-slate-400">
                            (~{Math.round(selectedFlight.remainingKm)} {t.kmShort}{altLabel})
                          </span>
                          {isSteerable ? (
                            <span className="ml-1.5 text-cyan-300">
                              · <kbd className="font-mono-tabular text-white">←</kbd>/<kbd className="font-mono-tabular text-white">→</kbd>{' '}
                              {lang === 'uk' ? 'або' : lang === 'en' ? 'or' : 'или'}{' '}
                              <kbd className="font-mono-tabular text-white">A</kbd>/<kbd className="font-mono-tabular text-white">D</kbd> ·{' '}
                              <kbd className="font-mono-tabular text-white">{lang === 'en' ? 'Space' : lang === 'uk' ? 'Пробіл' : 'Пробел'}</kbd>{' '}
                              {lang === 'uk' ? 'підрив' : lang === 'en' ? 'detonate' : 'подрыв'}
                            </span>
                          ) : (
                            lang === 'uk'
                              ? ' — натисніть на мапу для зміни курсу'
                              : lang === 'en'
                                ? ' — click map to redirect'
                                : ' — кликните на карту для смены курса'
                          )}
                        </span>
                      </span>

                      {canAdjustAlt && (
                        <div className="flex items-center gap-1 rounded border border-slate-700 bg-[#080D16] px-1.5 py-0.5 shrink-0">
                          <span className="text-[10px] text-slate-400 mr-0.5">
                            {lang === 'uk' ? 'Висота:' : lang === 'en' ? 'Alt:' : 'Высота:'}
                          </span>
                          {(
                            [
                              { id: 'normal', label: altOptNormal },
                              { id: 'low', label: altOptLow },
                              { id: 'ultra-low', label: altOptUltra },
                            ] as Array<{ id: AltitudeMode; label: string }>
                          ).map((opt) => {
                            const curAlt: AltitudeMode =
                              selectedFlight.altitudeMode ??
                              (selectedFlight.lowAltitude ? 'low' : 'normal');
                            const active = curAlt === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() =>
                                  setFlightAltitudeCommand((prev) => ({
                                    id: selectedFlight.id,
                                    altitudeMode: opt.id,
                                    seq: (prev?.seq ?? 0) + 1,
                                  }))
                                }
                                className={`rounded-xs px-1.5 py-0.5 text-[10px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                                  active
                                    ? opt.id === 'ultra-low'
                                      ? 'bg-emerald-500 text-slate-950'
                                      : opt.id === 'low'
                                        ? 'bg-cyan-500 text-slate-950'
                                        : 'bg-sky-500 text-slate-950'
                                    : 'text-slate-300 hover:bg-slate-800'
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {followCamActive && (
                        <button
                          type="button"
                          onClick={() => {
                            soundFx.playUiClick('back');
                            setExitFollowCamSignal((n) => n + 1);
                          }}
                          className="rounded border border-sky-400/60 bg-sky-500/15 hover:bg-sky-500/25 px-2.5 py-1 text-[11px] font-semibold text-sky-200 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          {exitCamLabel}
                        </button>
                      )}

                      {isSteerable && (
                        <button
                          type="button"
                          onClick={() => setDetonateFlightSignal((n) => n + 1)}
                          className="rounded border border-rose-500/65 bg-rose-500/20 hover:bg-rose-500/30 px-2.5 py-1 text-[11px] font-semibold text-rose-200 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          {lang === 'uk' ? 'Підрив зараз' : lang === 'en' ? 'Detonate Now' : 'Подрыв сейчас'}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          soundFx.playUiClick('tap');
                          setIsPlottingFlightRoute(true);
                          setFlightRouteWaypoints([]);
                        }}
                        className="flex items-center gap-1 rounded border border-amber-400/60 bg-amber-500/15 hover:bg-amber-500/25 px-2.5 py-1 text-[11px] font-semibold text-amber-200 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Route className="h-3.5 w-3.5" />
                        <span>{lang === 'uk' ? 'Маршрут по точках' : lang === 'en' ? 'Waypoint Route' : 'Маршрут по точкам'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundFx.playUiClick('back');
                          if (followCamActive) {
                            setExitFollowCamSignal((n) => n + 1);
                          }
                          setFollowCamActive(false);
                          setSelectedFlight(null);
                          setIsPlottingFlightRoute(false);
                          setFlightRouteWaypoints([]);
                        }}
                        className="rounded border border-slate-700 bg-[#0E1726] hover:border-slate-600 px-2.5 py-1 text-[11px] font-medium text-slate-300 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {deselectLabel}
                      </button>
                    </>
                  );
                })()
              ) : selectedSpec && selectedLauncher ? (
                isPlottingRoute ? (
                  <>
                    <span className="font-medium">
                      {lang === 'en' ? 'Route' : 'Маршрут'} (<strong style={{ color: selectedSpec.accentColor }}>{selectedSpec.shortName}</strong> ·{' '}
                      <span className="text-rose-300 font-mono-tabular">-{selectedSpec.damage} HP</span>) · {lang === 'uk' ? 'Точок' : lang === 'en' ? 'Points' : 'Точек'}:{' '}
                      <strong className="font-mono-tabular text-white">{routeWaypoints.length}</strong>
                    </span>

                    {selectedLauncher.ammo > 1 && (
                      <div className="flex items-center gap-1 rounded border border-slate-700 bg-[#080D16] px-1.5 py-0.5">
                        <span className="text-[11px] text-slate-400 mr-0.5">
                          {lang === 'uk' ? 'Цілей:' : lang === 'en' ? 'Salvo:' : 'Целей:'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setRouteLaunchCount((c) => Math.max(1, c - 1))}
                          disabled={effectiveRouteLaunchCount <= 1}
                          aria-label="-"
                          className="flex h-5 w-5 items-center justify-center rounded-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-200 cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="font-mono-tabular text-[11px] font-bold text-amber-300 min-w-6 text-center">
                          {effectiveRouteLaunchCount}/{selectedLauncher.ammo}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setRouteLaunchCount((c) => Math.min(selectedLauncher.ammo, c + 1))
                          }
                          disabled={effectiveRouteLaunchCount >= selectedLauncher.ammo}
                          aria-label="+"
                          className="flex h-5 w-5 items-center justify-center rounded-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-200 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setRouteLaunchCount(selectedLauncher.ammo)}
                          className={`ml-0.5 rounded-xs px-1.5 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer ${
                            effectiveRouteLaunchCount === selectedLauncher.ammo
                              ? 'bg-amber-500/25 text-amber-200'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {t.filterAll}
                        </button>
                      </div>
                    )}

                    {selectedSpec.canFlyLow && (
                      <div className="flex items-center rounded border border-slate-700 bg-[#080D16] divide-x divide-slate-800 overflow-hidden shrink-0">
                        {(
                          [
                            { id: 'normal', label: lang === 'uk' ? 'Звичайна' : lang === 'en' ? 'Normal' : 'Обычная' },
                            { id: 'low', label: lang === 'uk' ? 'Низько' : lang === 'en' ? 'Low' : 'Низко' },
                            { id: 'ultra-low', label: lang === 'uk' ? 'Дуже низько' : lang === 'en' ? 'Ultra-low' : 'Очень низко' },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setRouteAltitudeMode(opt.id)}
                            className={`px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                              routeAltitudeMode === opt.id
                                ? opt.id === 'ultra-low'
                                  ? 'bg-violet-500/25 text-violet-200'
                                  : opt.id === 'low'
                                    ? 'bg-cyan-500/25 text-cyan-200'
                                    : 'bg-slate-700 text-white'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={routeWaypoints.length === 0 || selectedLauncher.ammo <= 0}
                      onClick={() => setLaunchRouteSignal((n) => n + 1)}
                      className="flex items-center gap-1.5 rounded bg-amber-500 hover:bg-amber-400 disabled:opacity-45 disabled:pointer-events-none px-3 py-1 text-[11px] font-semibold text-slate-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Play className="h-3 w-3" />
                      <span>
                        {effectiveRouteLaunchCount > 1
                          ? `${lang === 'uk' ? 'Запустити' : lang === 'en' ? 'Launch' : 'Запустить'} (×${effectiveRouteLaunchCount})`
                          : lang === 'uk'
                            ? 'Запустити за маршрутом'
                            : lang === 'en'
                              ? 'Launch Route'
                              : 'Запустить по маршруту'}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={routeWaypoints.length === 0}
                      onClick={() => setRouteWaypoints((prev) => prev.slice(0, -1))}
                      className="flex items-center gap-1 rounded border border-slate-700 bg-[#0E1726] hover:border-slate-600 disabled:opacity-40 disabled:pointer-events-none px-2.5 py-1 text-[11px] font-medium text-slate-300 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Undo2 className="h-3 w-3" />
                      <span>{t.back}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsPlottingRoute(false);
                        setRouteWaypoints([]);
                        setRouteLaunchCount(1);
                      }}
                      className="rounded border border-slate-700 bg-[#0E1726] hover:border-slate-600 px-2.5 py-1 text-[11px] font-medium text-slate-300 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {t.cancelBtn}
                    </button>
                  </>
                ) : (
                  <>
                    <span className="font-medium">
                      {selectedLauncher.ammo > 0 ? (
                        selectedSpec.id === 'airstrike' ? (
                          lang === 'uk' ? (
                            <>
                              Авіаудар (<strong style={{ color: selectedSpec.accentColor }}>1 виліт · 6 бомб · -{selectedSpec.damage} HP</strong>) — оберіть ціль або прокладіть маршрут
                            </>
                          ) : lang === 'en' ? (
                            <>
                              Airstrike (<strong style={{ color: selectedSpec.accentColor }}>1 sortie · 6 bombs · -{selectedSpec.damage} HP</strong>) — pick target or plot route
                            </>
                          ) : (
                            <>
                              Авиаудар (<strong style={{ color: selectedSpec.accentColor }}>1 вылет · 6 бомб · -{selectedSpec.damage} HP/бомба</strong>) — выберите цель или проложите маршрут
                            </>
                          )
                        ) : selectedSpec.id === 'su57-kab' ? (
                          su57DropPoint ? (
                            <>
                              {lang === 'en' ? 'Su-57 → drop point set' : 'Су-57 → точка сброса задана'} ·{' '}
                              <strong className="text-rose-300">
                                {lang === 'uk'
                                  ? `Крок 2: оберіть ціль у радіусі ${selectedSpec.kabMaxRangeKm} км`
                                  : lang === 'en'
                                    ? `Step 2: select target within ${selectedSpec.kabMaxRangeKm} km`
                                    : `Шаг 2: выберите цель в радиусе ${selectedSpec.kabMaxRangeKm} км`}
                              </strong>
                            </>
                          ) : (
                            <>
                              {lang === 'en' ? 'Su-57' : 'Су-57'} (
                              <strong style={{ color: selectedSpec.accentColor }}>
                                {selectedLauncher.ammo}/{selectedLauncher.maxAmmo} · -{selectedSpec.damage} HP
                              </strong>
                              ) —{' '}
                              {lang === 'uk'
                                ? 'Крок 1: точка скидання КАБ на мапі'
                                : lang === 'en'
                                  ? 'Step 1: set KAB drop point on map'
                                  : 'Шаг 1: точка сброса КАБ на карте'}
                            </>
                          )
                        ) : selectedSpec.id === 'kab' ? (
                          <>
                            {selectedSpec.shortName} (
                            <strong style={{ color: selectedSpec.accentColor }}>
                              {selectedLauncher.ammo}/{selectedLauncher.maxAmmo} · ≤{selectedSpec.maxRangeKm} {t.kmShort}
                            </strong>
                            ) —{' '}
                            {lang === 'uk'
                              ? 'оберіть ціль усередині червоного кільця'
                              : lang === 'en'
                                ? 'select target inside red ring'
                                : 'выберите цель внутри красного кольца'}
                          </>
                        ) : (
                          <>
                            {t.launcherLabel} (
                            <strong style={{ color: selectedSpec.accentColor }}>
                              {selectedSpec.shortName} · {selectedLauncher.ammo}/{selectedLauncher.maxAmmo}
                            </strong>{' '}
                            · <span className="text-rose-300 font-mono-tabular">-{selectedSpec.damage} HP</span>) —{' '}
                            {lang === 'uk'
                              ? 'оберіть ціль або маршрут'
                              : lang === 'en'
                                ? 'click target or plot route'
                                : 'выберите цель или маршрут'}
                          </>
                        )
                      ) : (
                        <>
                          {t.ammoShort} (
                          <strong className="text-red-400">
                            {selectedSpec.shortName} · 0/{selectedLauncher.maxAmmo}
                          </strong>
                          ) — {t.ammoEmpty}
                        </>
                      )}
                    </span>

                    {selectedSpec.id === 'su57-kab' && su57DropPoint && (
                      <button
                        type="button"
                        onClick={() => setSu57DropPoint(null)}
                        className="rounded border border-sky-400/50 bg-sky-500/15 hover:bg-sky-500/25 px-2.5 py-1 text-[11px] font-medium text-sky-200 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {lang === 'uk' ? 'Скинути точку' : lang === 'en' ? 'Reset Point' : 'Сбросить точку'}
                      </button>
                    )}

                    {selectedSpec.canFlyLow && selectedLauncher.ammo > 0 && (
                      <div className="flex items-center rounded border border-slate-700 bg-[#080D16] divide-x divide-slate-800 overflow-hidden shrink-0">
                        {(
                          [
                            { id: 'normal', label: lang === 'uk' ? 'Звичайна' : lang === 'en' ? 'Normal' : 'Обычная' },
                            { id: 'low', label: lang === 'uk' ? 'Низько' : lang === 'en' ? 'Low' : 'Низко' },
                            { id: 'ultra-low', label: lang === 'uk' ? 'Дуже низько' : lang === 'en' ? 'Ultra-low' : 'Очень низко' },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setRouteAltitudeMode(opt.id)}
                            className={`px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                              routeAltitudeMode === opt.id
                                ? opt.id === 'ultra-low'
                                  ? 'bg-violet-500/25 text-violet-200'
                                  : opt.id === 'low'
                                    ? 'bg-cyan-500/25 text-cyan-200'
                                    : 'bg-slate-700 text-white'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {selectedLauncher.ammo > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSu57DropPoint(null);
                          setIsPlottingRoute(true);
                          setRouteWaypoints([]);
                          setRouteLaunchCount(1);
                        }}
                        className="flex items-center gap-1.5 rounded border border-amber-400/60 bg-amber-500/15 hover:bg-amber-500/25 px-2.5 py-1 text-[11px] font-semibold text-amber-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Route className="h-3.5 w-3.5" />
                        <span>{lang === 'uk' ? 'Прокласти маршрут' : lang === 'en' ? 'Plot Route' : 'Проложить маршрут'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setSu57DropPoint(null);
                        setSelectedLauncherId(null);
                      }}
                      className="rounded border border-slate-700 bg-[#0E1726] hover:border-slate-600 px-2.5 py-1 text-[11px] font-medium text-slate-300 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {lang === 'uk' ? 'Зняти вибір' : lang === 'en' ? 'Deselect' : 'Снять выбор'}
                    </button>
                  </>
                )
              ) : selectedAirfield && selectedAircraftSpec && selectedAircraftMissileSpec ? (
                <>
                  <span className="font-medium">
                    {selectedAirfield.faction === 'UA' ? t.airfieldBasePrefixUa : t.airfieldBasePrefixRu}{' '}
                    <strong className={selectedAirfield.faction === 'UA' ? 'text-sky-300' : 'text-amber-300'}>
                      {selectedAirfield.name}
                    </strong>{' '}
                    ·{' '}
                    <strong style={{ color: selectedAircraftSpec.accentColor }}>
                      {selectedAircraftSpec.shortName}
                    </strong>{' '}
                    ({selectedAirfield.salvoCount}× {selectedAircraftMissileSpec.shortName}){' '}
                    {airfieldLaunchPoint ? (
                      <strong className="text-rose-300">
                        {lang === 'uk'
                          ? `— Крок 2: маршрут ракет (${airfieldMissileWaypoints.length} т.)`
                          : lang === 'en'
                            ? `— Step 2: missile route (${airfieldMissileWaypoints.length} pts)`
                            : `— Шаг 2: маршрут ракет (${airfieldMissileWaypoints.length} т.)`}
                      </strong>
                    ) : (
                      <span>
                        {lang === 'uk'
                          ? '— Крок 1: точка пуску літака на мапі'
                          : lang === 'en'
                            ? '— Step 1: set aircraft launch point on map'
                            : '— Шаг 1: точка пуска самолёта на карте'}
                      </span>
                    )}
                  </span>

                  <button
                    type="button"
                    onClick={() => setAirfieldModalStep('aircraft')}
                    className="flex items-center gap-1.5 rounded border border-amber-400/55 bg-amber-500/15 hover:bg-amber-500/25 px-2.5 py-1 text-[11px] font-semibold text-amber-200 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plane className="h-3.5 w-3.5" />
                    <span>{lang === 'uk' ? 'Літак і ракети' : lang === 'en' ? 'Aircraft & Loadout' : 'Самолёт и ракеты'}</span>
                  </button>

                  {airfieldLaunchPoint && (
                    <>
                      <button
                        type="button"
                        disabled={airfieldMissileWaypoints.length === 0}
                        onClick={() => setLaunchAirfieldSignal((n) => n + 1)}
                        className="flex items-center gap-1.5 rounded bg-amber-500 hover:bg-amber-400 disabled:opacity-45 disabled:pointer-events-none px-3 py-1 text-[11px] font-semibold text-slate-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Play className="h-3 w-3" />
                        <span>{lang === 'uk' ? 'Запустити' : lang === 'en' ? 'Launch' : 'Запустить'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={airfieldMissileWaypoints.length === 0}
                        onClick={() => setAirfieldMissileWaypoints((prev) => prev.slice(0, -1))}
                        className="flex items-center gap-1 rounded border border-slate-700 bg-[#0E1726] hover:border-slate-600 disabled:opacity-40 disabled:pointer-events-none px-2.5 py-1 text-[11px] font-medium text-slate-300 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Undo2 className="h-3 w-3" />
                        <span>{t.back}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAirfieldLaunchPoint(null);
                          setAirfieldMissileWaypoints([]);
                        }}
                        className="rounded border border-sky-400/50 bg-sky-500/15 hover:bg-sky-500/25 px-2.5 py-1 text-[11px] font-medium text-sky-200 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {lang === 'uk' ? 'Змінити точку' : lang === 'en' ? 'Reset Point' : 'Изменить точку'}
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setAirfieldLaunchPoint(null);
                      setAirfieldMissileWaypoints([]);
                      setAirfieldModalStep(null);
                      setSelectedAirfieldId(null);
                    }}
                    className="rounded border border-slate-700 bg-[#0E1726] hover:border-slate-600 px-2.5 py-1 text-[11px] font-medium text-slate-300 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {lang === 'uk' ? 'Зняти вибір' : lang === 'en' ? 'Deselect' : 'Снять выбор'}
                  </button>
                </>
              ) : gameMode === 'ai' ? (
                <div className="flex flex-wrap items-center gap-2 text-slate-300">
                  <Timer className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                  <span>
                    {aiWaveNumber === 0
                      ? lang === 'uk'
                        ? `Підготовка: перша хвиля ШІ через ${Math.ceil(aiWaveCountdownSec)} с · Розмістіть Радар ППО та ППО`
                        : lang === 'en'
                          ? `Prep: first AI wave in ${Math.ceil(aiWaveCountdownSec)} s · Deploy Radar & ADS`
                          : `Подготовка: первая волна ИИ через ${Math.ceil(aiWaveCountdownSec)} с · Разместите Радар ПВО и ППО`
                      : lang === 'uk'
                        ? `Хвиля #${aiWaveNumber} · Наступна через ${Math.ceil(aiWaveCountdownSec)} с · Завдавайте ударів по цілях ШІ`
                        : lang === 'en'
                          ? `Wave #${aiWaveNumber} · Next in ${Math.ceil(aiWaveCountdownSec)} s · Strike AI targets`
                          : `Волна #${aiWaveNumber} · Следующая через ${Math.ceil(aiWaveCountdownSec)} с · Наводите удары по целям ИИ`}
                  </span>
                </div>
              ) : launchers.length > 0 || airfields.length > 0 ? (
                <span className="text-slate-300">
                  {lang === 'uk'
                    ? 'Натисніть на ПУ, аеродром або ціль у повітрі, щоб змінити маршрут у будь-який момент'
                    : lang === 'en'
                      ? 'Click any launcher, airbase, or airborne target on the map to adjust its course anytime'
                      : 'Нажмите на ПУ, аэродром или летящую цель на карте, чтобы изменить маршрут в любой момент'}
                </span>
              ) : (
                <span className="text-slate-300">
                  {lang === 'uk'
                    ? 'Оберіть БПЛА, ракету, аеродром або ППО ліворуч і встановіть на мапу'
                    : lang === 'en'
                      ? 'Select a UAV, missile, airbase, or ADS on the left and place it on the map'
                      : 'Выберите БПЛА, ракету, аэродром или ППО слева и установите на карту'}
                </span>
              )}
            </div>
          </div>

          {/* Two-Stage Airfield Menu Modal */}
          {selectedAirfield &&
            selectedAircraftSpec &&
            selectedAircraftMissileSpec &&
            airfieldModalStep !== null && (
              <div
                onClick={handleCancelAirfieldSelection}
                className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/65 p-4"
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-md rounded border border-slate-700 bg-[#0A111C] overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 bg-[#080D16]">
                    <div className="min-w-0">
                      <div
                        className={`text-[11px] font-mono-tabular font-medium truncate ${
                          selectedAirfield.faction === 'UA' ? 'text-sky-300' : 'text-amber-300'
                        }`}
                      >
                        {selectedAirfield.faction === 'UA' ? t.airfieldBasePrefixUa : t.airfieldBasePrefixRu} «{selectedAirfield.name}»
                      </div>
                      <h3 className="text-sm font-semibold text-slate-100 truncate">
                        {airfieldModalStep === 'aircraft'
                          ? lang === 'uk'
                            ? 'Оберіть літак'
                            : lang === 'en'
                              ? 'Select Aircraft'
                              : 'Выберите самолёт'
                          : `${selectedAircraftSpec.name} — ${
                              selectedAircraftSpec.missileId === 'aasm-hammer'
                                ? t.howManyBombs
                                : t.howManyMissiles
                            }`}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {airfieldModalStep === 'missiles' && (
                        <button
                          type="button"
                          onClick={() => setAirfieldModalStep('aircraft')}
                          className="rounded border border-slate-700 bg-[#0E1726] hover:border-slate-600 px-2.5 py-1 text-[11px] font-medium text-slate-200 cursor-pointer"
                        >
                          {t.boardsBack}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleCancelAirfieldSelection}
                        aria-label={t.cancelBtn}
                        className="flex h-7 w-7 items-center justify-center rounded border border-slate-700 bg-[#0E1726] hover:border-slate-600 text-slate-300 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {airfieldModalStep === 'aircraft' ? (
                    <div className="tac-scroll border-t border-slate-800 divide-y divide-slate-800 max-h-[68vh] overflow-y-auto">
                      {(selectedAirfield.availableAircraftIds &&
                      selectedAirfield.availableAircraftIds.length > 0
                        ? ALL_AIRCRAFT.filter((ac) =>
                            selectedAirfield.availableAircraftIds!.includes(ac.id),
                          )
                        : ALL_AIRCRAFT.filter(
                            (ac) => ac.faction === (selectedAirfield.faction ?? 'RU'),
                          )
                      ).map((ac) => {
                        const locAc = getAircraftLocalized(ac.id, lang);
                        const mSpec = getMunitionLocalized(ac.missileId, lang);
                        const isCurrent = selectedAirfield.selectedAircraftId === ac.id;
                        const isUa = selectedAirfield.faction === 'UA';
                        return (
                          <button
                            key={ac.id}
                            type="button"
                            onClick={() => handleChangeAirfieldAircraft(selectedAirfield.id, ac.id)}
                            className={`w-full flex items-center gap-3 p-3 text-left transition-colors cursor-pointer ${
                              isCurrent
                                ? isUa
                                  ? 'bg-sky-500/16'
                                  : 'bg-amber-500/14'
                                : 'bg-[#0A111C] hover:bg-[#0E1726]'
                            }`}
                          >
                            <div className="flex h-11 w-17 items-center justify-center rounded bg-[#070B12] border border-slate-800 shrink-0 overflow-hidden">
                              <RussianAircraftIcon id={ac.id} className="w-15 h-9" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-slate-100 truncate">
                                  {locAc.name}
                                </span>
                                <span
                                  className={`font-mono-tabular text-[11px] font-semibold shrink-0 ${
                                    isUa ? 'text-sky-300' : 'text-amber-300'
                                  }`}
                                >
                                  {t.upToWord} {ac.missileCount}× {mSpec.shortName}
                                </span>
                              </div>
                              <div className="mt-0.5 text-[11px] text-slate-400 truncate">
                                {locAc.role} · {ac.realSpeedKmh} {t.kmhShort} · -{mSpec.damage} HP
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-3 border border-slate-800 rounded bg-[#080D16] p-2.5">
                        <div className="flex h-11 w-16 items-center justify-center rounded bg-[#070B12] border border-slate-800 shrink-0 overflow-hidden">
                          <RussianAircraftIcon
                            id={selectedAircraftSpec.id}
                            className="w-14 h-9"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-100 truncate">
                            {selectedAircraftMissileSpec.name}
                          </div>
                          <div className="mt-0.5 text-[11px] font-mono-tabular text-slate-400">
                            -{selectedAircraftMissileSpec.damage} HP · {selectedAircraftMissileSpec.realSpeedKmh} {t.kmhShort}
                            {selectedAircraftMissileSpec.kabMaxRangeKm
                              ? ` · ≤${selectedAircraftMissileSpec.kabMaxRangeKm} ${t.kmShort}`
                              : ''}
                          </div>
                        </div>
                      </div>

                      <div className="text-xs font-medium text-slate-300">
                        {lang === 'uk'
                          ? 'Кількість у залпі:'
                          : lang === 'en'
                            ? 'Salvo count:'
                            : 'Количество в залпе:'}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {Array.from(
                          { length: selectedAircraftSpec.missileCount },
                          (_, idx) => idx + 1,
                        ).map((count) => {
                          const isBomb = selectedAircraftMissileSpec.id === 'aasm-hammer';
                          const missileWord =
                            lang === 'en'
                              ? isBomb
                                ? count === 1
                                  ? 'bomb'
                                  : 'bombs'
                                : count === 1
                                  ? 'missile'
                                  : 'missiles'
                              : lang === 'uk'
                                ? isBomb
                                  ? count === 1
                                    ? 'бомба'
                                    : count >= 2 && count <= 4
                                      ? 'бомби'
                                      : 'бомб'
                                  : count === 1
                                    ? 'ракета'
                                    : count >= 2 && count <= 4
                                      ? 'ракети'
                                      : 'ракет'
                                : isBomb
                                  ? count === 1
                                    ? 'бомба'
                                    : count >= 2 && count <= 4
                                      ? 'бомбы'
                                      : 'бомб'
                                  : count === 1
                                    ? 'ракета'
                                    : count >= 2 && count <= 4
                                      ? 'ракеты'
                                      : 'ракет';
                          const totalDmg = count * selectedAircraftMissileSpec.damage;
                          const isSelectedCount = selectedAirfield.salvoCount === count;
                          const isUa = selectedAirfield.faction === 'UA';
                          return (
                            <button
                              key={count}
                              type="button"
                              onClick={() => {
                                handleChangeAirfieldSalvo(selectedAirfield.id, count);
                                setAirfieldModalStep(null);
                              }}
                              className={`flex flex-col items-start rounded border px-3 py-2 text-left transition-colors cursor-pointer ${
                                isSelectedCount
                                  ? isUa
                                    ? 'border-sky-400 bg-sky-500/18 text-white'
                                    : 'border-amber-400 bg-amber-500/18 text-white'
                                  : isUa
                                    ? 'border-slate-800 bg-[#080D16] text-slate-200 hover:border-sky-400/70 hover:bg-[#0E1726]'
                                    : 'border-slate-800 bg-[#080D16] text-slate-200 hover:border-amber-400/70 hover:bg-[#0E1726]'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span
                                  className={`text-sm font-bold font-mono-tabular ${
                                    isUa ? 'text-sky-300' : 'text-amber-300'
                                  }`}
                                >
                                  {count} {missileWord}
                                </span>
                                <span className="text-[10.5px] font-mono-tabular text-slate-400">
                                  {selectedAircraftMissileSpec.shortName}
                                </span>
                              </div>
                              <div className="mt-0.5 text-[11px] text-rose-300 font-mono-tabular">
                                {t.totalDmgLabel(totalDmg)}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* Right-Side Statistics & Event Log Drawer */}
          {eventDrawerOpen && (() => {
            const visibleJournalEntries = eventLog.filter((ev) => {
              if (journalFilter === 'all') return true;
              return ev.kind === journalFilter;
            });
            const damagedPvosCount = airDefenses.filter((p) => p.hp < p.maxHp).length;
            const lowAmmoPvosCount = airDefenses.filter(
              (p) => !AIR_DEFENSE_BY_ID[p.airDefenseId].isRadar && p.ammo === 0,
            ).length;

            return (
              <div className="absolute top-13 right-3 bottom-3 w-84 sm:w-92 max-w-[calc(100vw-1.5rem)] z-30 flex flex-col rounded border border-slate-700/90 bg-[#070B12] overflow-hidden">
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-3.5 py-2.5 bg-[#0A111C] shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <BarChart3 className="h-4 w-4 text-sky-400 shrink-0" />
                    <div className="min-w-0">
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-100 truncate">
                        {t.statsDrawerTitle}
                      </h2>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playUiClick('back');
                      setEventDrawerOpen(false);
                    }}
                    aria-label={t.cancelBtn}
                    className="flex h-7 w-7 items-center justify-center rounded border border-slate-800 bg-[#0E1726] hover:border-slate-700 text-slate-300 cursor-pointer shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Tabs: Stats | Journal */}
                <div className="grid grid-cols-2 border-b border-slate-800 bg-[#0A111C] divide-x divide-slate-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playUiClick('tab');
                      setDrawerTab('stats');
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      drawerTab === 'stats'
                        ? 'bg-[#101A2B] text-white border-b-2 border-sky-400'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                    <span>{t.statsSummaryTab}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playUiClick('tab');
                      setDrawerTab('log');
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      drawerTab === 'log'
                        ? 'bg-[#101A2B] text-white border-b-2 border-sky-400'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ScrollText className="h-3.5 w-3.5" />
                    <span>{t.journalTab} ({visibleJournalEntries.length})</span>
                  </button>
                </div>

                {drawerTab === 'stats' ? (
                  <div className="tac-scroll flex-1 overflow-y-auto p-3.5 space-y-3">
                    {/* Clock & Speed Strip */}
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Clock className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                        <span>{formatSimClock(simTimeMinutes, lang)}</span>
                      </div>
                      <span className="font-mono-tabular text-[11px] text-slate-400">
                        {t.tempoWord} {timeScale}×
                      </span>
                    </div>

                    {/* Intercept Efficiency Progress Strip */}
                    <div className="border border-slate-800/90 rounded bg-[#0A111C] p-3 space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                          {t.pvoEfficiency}
                        </span>
                        <span className="font-mono-tabular text-lg font-bold text-emerald-400">
                          {interceptAccuracyPct}%
                        </span>
                      </div>
                      <div className="h-1 w-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 transition-all"
                          style={{ width: `${interceptAccuracyPct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-400">
                        <span>{t.interceptedCount}: <strong className="text-emerald-300">{stats.intercepts}</strong></span>
                        <span>{t.missesCount}: <strong className="text-amber-300">{stats.misses}</strong></span>
                      </div>
                    </div>

                    {/* Key Combat Counters Grid */}
                    {gameMode === 'ai' ? (
                      <div className="grid grid-cols-2 border border-slate-800/90 rounded overflow-hidden bg-[#0A111C] divide-x divide-y divide-slate-800/80">
                        <div className="p-2.5">
                          <div className="text-[10.5px] text-slate-400">{t.totalLaunches}</div>
                          <div className="mt-0.5 font-mono-tabular text-lg font-bold text-slate-100">
                            {stats.totalLaunches}
                          </div>
                        </div>
                        <div className="p-2.5">
                          <div className="text-[10.5px] text-slate-400">{t.shotDownInAir}</div>
                          <div className="mt-0.5 font-mono-tabular text-lg font-bold text-emerald-300">
                            {stats.intercepts}
                          </div>
                        </div>
                        <div className="p-2.5">
                          <div className="text-[10.5px] text-slate-400">{t.missedHits}</div>
                          <div className="mt-0.5 font-mono-tabular text-lg font-bold text-rose-300">
                            {stats.explosions}
                          </div>
                        </div>
                        <div className="p-2.5">
                          <div className="text-[10.5px] text-slate-400">{t.defenseWave}</div>
                          <div className="mt-0.5 font-mono-tabular text-lg font-bold text-sky-300">
                            #{aiWaveNumber}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 border border-slate-800/90 rounded overflow-hidden bg-[#0A111C] divide-x divide-y divide-slate-800/80">
                        <div className="p-2.5">
                          <div className="text-[10.5px] text-slate-400">{t.totalLaunches}</div>
                          <div className="mt-0.5 font-mono-tabular text-lg font-bold text-slate-100">
                            {stats.totalLaunches}
                          </div>
                        </div>
                        <div className="p-2.5">
                          <div className="text-[10.5px] text-slate-400">{t.shotDownInAir}</div>
                          <div className="mt-0.5 font-mono-tabular text-lg font-bold text-emerald-300">
                            {stats.intercepts}
                          </div>
                        </div>
                        <div className="p-2.5">
                          <div className="text-[10.5px] text-slate-400">{t.impactsExplosions}</div>
                          <div className="mt-0.5 font-mono-tabular text-lg font-bold text-rose-300">
                            {stats.explosions}
                          </div>
                        </div>
                        <div className="p-2.5">
                          <div className="text-[10.5px] text-slate-400">{t.destroyedUnitsLabel}</div>
                          <div className="mt-0.5 font-mono-tabular text-lg font-bold text-sky-300">
                            {stats.destroyedByStrikes}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Radar Air Picture */}
                    <div className="border border-slate-800/90 rounded bg-[#0A111C] divide-y divide-slate-800/80">
                      <div className="flex items-center justify-between px-3 py-2 text-xs">
                        <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                          <Radar className="h-3.5 w-3.5 text-sky-400" />
                          <span>{t.radarPicture}</span>
                        </span>
                        <strong className="font-mono-tabular text-sky-300">{stats.activeFlights}</strong>
                      </div>
                      <div className="flex items-center justify-between px-3 py-1.5 text-xs">
                        <span className="text-slate-400">{t.uavsWord}</span>
                        <span className="font-mono-tabular text-amber-300">{stats.activeDrones}</span>
                      </div>
                      <div className="flex items-center justify-between px-3 py-1.5 text-xs">
                        <span className="text-slate-400">{t.missilesAndKabWord}</span>
                        <span className="font-mono-tabular text-rose-300">{stats.activeMissiles}</span>
                      </div>
                      <div className="flex items-center justify-between px-3 py-1.5 text-xs">
                        <span className="text-slate-400">{t.aviationWord}</span>
                        <span className="font-mono-tabular text-slate-200">{stats.activeAircraft}</span>
                      </div>
                    </div>

                    {/* Defense Infrastructure Status */}
                    <div className="border border-slate-800/90 rounded bg-[#0A111C] divide-y divide-slate-800/80">
                      <div className="flex items-center justify-between px-3 py-2 text-xs">
                        <span className="text-slate-400">{t.objectsInOrder}</span>
                        <strong className="font-mono-tabular text-emerald-300">
                          {gameMode === 'ai'
                            ? `${playerBuildings.length}/${INITIAL_AI_BUILDINGS.length} (${buildingsIntegrityPct}%)`
                            : `${playerBuildings.length} (${buildingsIntegrityPct}%)`}
                        </strong>
                      </div>
                      {gameMode === 'ai' && (
                        <div className="flex items-center justify-between px-3 py-1.5 text-xs">
                          <span className="text-slate-400">{t.enemyObjectsShort}</span>
                          <strong className="font-mono-tabular text-rose-300">
                            {aiEnemyBuildings.length}/{INITIAL_AI_ENEMY_BUILDINGS.length}
                          </strong>
                        </div>
                      )}
                      <div className="flex items-center justify-between px-3 py-1.5 text-xs">
                        <span className="text-slate-400">{t.pvoAndRadars}</span>
                        <span className="font-mono-tabular text-emerald-300">
                          {airDefenses.length}
                          {(damagedPvosCount > 0 || lowAmmoPvosCount > 0) && (
                            <span className="text-amber-300">
                              {' '}({damagedPvosCount > 0 ? `${damagedPvosCount} ${t.damagedShort}` : ''}{damagedPvosCount > 0 && lowAmmoPvosCount > 0 ? ' · ' : ''}{lowAmmoPvosCount > 0 ? `${lowAmmoPvosCount} ${t.noAmmoShort}` : ''})
                            </span>
                          )}
                        </span>
                      </div>
                      {gameMode === 'ai' && (
                        <div className="flex items-center justify-between px-3 py-1.5 text-xs">
                          <span className="text-slate-400">{t.incomeFromObjects}</span>
                          <span className="font-mono-tabular text-amber-300">+${aiIncomePerSec}{t.perSecShort}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between px-3 py-1.5 text-xs">
                        <span className="text-slate-400">{t.alertsDroneMissile}</span>
                        <span className="font-mono-tabular text-slate-200">
                          <span className="text-yellow-300">{stats.droneAlertRaions}</span>
                          {' / '}
                          <span className="text-red-400">{stats.missileAlertRaions}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0">
                    {/* Operational Log Category Filter */}
                    <div className="flex items-center justify-between gap-1 px-2.5 py-2 border-b border-slate-800 bg-[#0A111C] shrink-0">
                      <div className="flex items-center gap-1 min-w-0 overflow-x-auto">
                        {(
                          [
                            { id: 'all', label: t.filterAll },
                            { id: 'intercept', label: t.filterIntercepts },
                            { id: 'impact', label: t.filterImpacts },
                            { id: 'miss', label: t.filterMisses },
                            { id: 'launch', label: t.filterLaunches },
                          ] as Array<{ id: JournalFilter; label: string }>
                        ).map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => {
                              soundFx.playUiClick('tab');
                              setJournalFilter(f.id);
                            }}
                            className={`px-2 py-1 text-[10.5px] font-medium rounded-xs whitespace-nowrap cursor-pointer transition-colors ${
                              journalFilter === f.id
                                ? 'bg-sky-500/20 text-sky-200 border border-sky-500/45'
                                : 'text-slate-400 hover:text-slate-200 border border-transparent'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>

                      {eventLog.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setEventLog([])}
                          className="rounded-xs border border-slate-800 bg-[#0E1726] hover:border-slate-700 px-2 py-1 text-[10.5px] font-medium text-slate-300 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          {t.clearBtn}
                        </button>
                      )}
                    </div>

                    <div className="tac-scroll flex-1 overflow-y-auto">
                      {visibleJournalEntries.length === 0 ? (
                        <p className="p-4 text-xs text-slate-500 leading-relaxed">
                          {t.journalEmpty}
                        </p>
                      ) : (
                        <div className="divide-y divide-slate-800/80">
                          {visibleJournalEntries.map((ev) => {
                            const spec = getMunitionLocalized(ev.munitionId, lang);
                            const timeStr = formatSimTimeShort(ev.simTimeMinutes);

                            const meta =
                              ev.kind === 'intercept'
                                ? {
                                    tag: t.tagIntercept,
                                    tagClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
                                  }
                                : ev.kind === 'miss'
                                  ? {
                                      tag: t.tagMiss,
                                      tagClass: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
                                    }
                                  : ev.kind === 'impact'
                                    ? {
                                        tag: t.tagImpact,
                                        tagClass: 'bg-rose-500/15 text-rose-300 border-rose-500/35',
                                      }
                                    : {
                                        tag: t.tagLaunch,
                                        tagClass: 'bg-sky-500/15 text-sky-300 border-sky-500/35',
                                      };

                            return (
                              <div
                                key={ev.id}
                                className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-[#0D1522]"
                              >
                                <span className="font-mono-tabular text-[11px] font-semibold text-slate-400 pt-0.5 shrink-0">
                                  {timeStr}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`inline-block rounded-xs border px-1.5 py-0.25 text-[9.5px] font-mono-tabular font-bold tracking-wide shrink-0 ${meta.tagClass}`}
                                    >
                                      {meta.tag}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-100 truncate">
                                      {spec.shortName}
                                    </span>
                                  </div>
                                  <div className="mt-1 text-[11px] text-slate-400 leading-snug break-words">
                                    {ev.detail}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Right-Side Smartphone + Telegram Messenger App */}
          {telegramOpen && (
            <div className="absolute top-13 right-3 w-[328px] h-[530px] max-h-[calc(100%-8.5rem)] max-w-[calc(100vw-1.5rem)] z-30 flex flex-col rounded-[22px] border-[3px] border-slate-700 bg-[#0B1018] overflow-hidden">
              {/* Smartphone Top Notch / Status Bar */}
              <div className="flex items-center justify-between bg-[#0E1621] px-4 py-1.5 text-[10px] font-mono-tabular text-slate-200 shrink-0 border-b border-slate-800/80">
                <span className="font-semibold text-white">{formatSimTimeShort(simTimeMinutes)}</span>
                <div className="h-2.5 w-14 rounded-full bg-[#05080D] border border-slate-800" />
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span>5G</span>
                  <Wifi className="h-3 w-3" />
                  <BatteryFull className="h-3.5 w-3.5 text-emerald-400" />
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playUiClick('back');
                      setTelegramOpen(false);
                    }}
                    aria-label={t.cancelBtn}
                    className="ml-1 flex h-5 w-5 items-center justify-center rounded border border-slate-700 bg-[#17212B] hover:border-slate-500 text-slate-300 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {phoneScreen === 'home' ? (
                /* Smartphone Home Screen with Telegram App Icon */
                <div
                  className="flex flex-1 min-h-0 flex-col justify-between p-5"
                  style={{
                    backgroundImage:
                      'linear-gradient(160deg, #0E1B2E 0%, #09111D 55%, #060B12 100%)',
                  }}
                >
                  <div className="mt-3 text-center">
                    <div className="font-display text-4xl font-bold tracking-tight text-white">
                      {formatSimTimeShort(simTimeMinutes)}
                    </div>
                    <div className="mt-1 text-[11px] font-mono-tabular text-sky-300/90">
                      {formatSimDateShort(simTimeMinutes, lang)}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {stats.missileAlertRaions > 0
                        ? t.tgMissileThreat(stats.missileAlertRaions)
                        : stats.droneAlertRaions > 0
                          ? t.tgDroneThreat(stats.droneAlertRaions)
                          : t.tgHomeTitle}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 my-auto py-4">
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playUiClick('tap');
                        setPhoneScreen('telegram');
                      }}
                      className="flex flex-col items-center gap-1.5 group cursor-pointer"
                    >
                      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#24A1DE] group-hover:bg-[#2AABEE] transition-colors">
                        <svg viewBox="0 0 24 24" className="h-8 w-8 text-white fill-current">
                          <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
                        </svg>
                        {totalTelegramUnread > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-md bg-rose-500 px-1 font-mono-tabular text-[10px] font-bold text-white">
                            {totalTelegramUnread > 99 ? '99+' : totalTelegramUnread}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-slate-100">Telegram</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playUiClick('tab');
                        setTelegramOpen(false);
                        setEventDrawerOpen(true);
                      }}
                      className="flex flex-col items-center gap-1.5 group cursor-pointer"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-[#17212B] group-hover:border-slate-500 text-sky-400 transition-colors">
                        <Radar className="h-7 w-7" />
                      </div>
                      <span className="text-[11px] font-medium text-slate-200">{t.tgPvoSummaryBtn}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playUiClick('tap');
                        setPhoneScreen('telegram');
                        setSelectedTelegramOblast(null);
                      }}
                      className="flex flex-col items-center gap-1.5 group cursor-pointer"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-[#17212B] group-hover:border-slate-500 text-amber-400 transition-colors">
                        <BellRing className="h-7 w-7" />
                      </div>
                      <span className="text-[11px] font-medium text-slate-200">{t.tgChannelsBtn}</span>
                    </button>
                  </div>

                  <div className="text-center text-[10px] text-slate-500">
                    {t.tgHomeHint}
                  </div>
                </div>
              ) : selectedTelegramOblast && activeTelegramChannel ? (
                /* Telegram View 2: Selected Oblast Channel Feed */
                <div className="flex flex-1 min-h-0 flex-col bg-[#0E1621]">
                  {/* Telegram Channel Header */}
                  <div className="flex items-center justify-between gap-2 border-b border-[#1E2C3A] bg-[#17212B] px-2.5 py-2 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => {
                          soundFx.playUiClick('back');
                          setSelectedTelegramOblast(null);
                        }}
                        aria-label={t.back}
                        className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[#232E3C] text-slate-200 shrink-0 cursor-pointer"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <img
                        src={activeTelegramChannel.avatarUrl}
                        alt={activeTelegramChannel.title}
                        className="h-8 w-8 rounded-full object-cover border border-slate-600/60 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="truncate text-xs font-semibold text-white">
                            {activeTelegramChannel.title}
                          </span>
                          <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            className="h-3.5 w-3.5 text-[#38A3E8] fill-current shrink-0"
                          >
                            <path d="M12 2l2.4 2.2 3.2-.3 1 3.1 2.9 1.4-1 3.1 1.6 2.8-2.4 2.2.3 3.2-3.1 1-1.4 2.9-3.1-1-2.8 1.6-2.2-2.4-3.2.3-1-3.1-2.9-1.4 1-3.1L2 12l2.4-2.2-.3-3.2 3.1-1 1.4-2.9 3.1 1L12 2zm-1.2 13.2l5.2-5.2-1.4-1.4-3.8 3.8-1.8-1.8-1.4 1.4 3.2 3.2z" />
                          </svg>
                        </div>
                        <div className="truncate text-[10px] text-slate-400">
                          {activeTelegramChannel.subscribersLabel} {t.tgSubscribers} · {activeTelegramChannel.handle}
                        </div>
                      </div>
                    </div>

                    {activeTelegramMessages.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setTelegramPosts((prev) =>
                            prev.filter((p) => p.oblast !== selectedTelegramOblast),
                          )
                        }
                        className="rounded px-2 py-1 text-[10px] font-medium text-slate-400 hover:text-slate-200 hover:bg-[#232E3C] whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {t.clearBtn}
                      </button>
                    )}
                  </div>

                  {/* Telegram Channel Feed */}
                  <div
                    className="tac-scroll flex-1 overflow-y-auto p-2.5 space-y-2.5"
                    style={{
                      backgroundColor: '#0E1621',
                      backgroundImage:
                        'radial-gradient(rgba(56, 163, 232, 0.06) 1px, transparent 1px)',
                      backgroundSize: '18px 18px',
                    }}
                  >
                    {activeTelegramMessages.length === 0 ? (
                      <div className="mx-auto mt-6 max-w-[240px] rounded-lg bg-[#182533] px-3.5 py-3 text-center text-[11px] text-slate-300">
                        {t.tgNoMessages}
                      </div>
                    ) : (
                      activeTelegramMessages.map((post) => (
                        <div key={post.id} className="flex items-end gap-1.5">
                          <img
                            src={activeTelegramChannel.avatarUrl}
                            alt=""
                            className="h-6 w-6 rounded-full object-cover shrink-0 mb-0.5"
                          />
                          <div className="flex-1 min-w-0 rounded-xl rounded-bl-xs bg-[#182533] border border-[#223244] px-3 py-2 space-y-1">
                            {/* Sender is ALWAYS the Telegram Channel */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-[11px] font-semibold text-[#64B5F6]">
                                {activeTelegramChannel.title}
                              </span>
                            </div>

                            <div className="text-[11.5px] text-slate-100 leading-snug whitespace-pre-line">
                              {post.text}
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-0.5 text-[10px] text-slate-400">
                              {post.eventKind === 'alert_off' ? (
                                <span className="truncate font-semibold text-emerald-300">
                                  {t.tgAlertOff}
                                </span>
                              ) : post.eventKind === 'alert_on' || post.eventKind === 'alert_upgrade' ? (
                                <span
                                  className={`truncate font-semibold ${
                                    post.alertSubtype === 'drone'
                                      ? 'text-amber-300'
                                      : 'text-rose-300'
                                  }`}
                                >
                                  {post.alertSubtype === 'ballistic'
                                    ? t.tgAlertBallistic
                                    : post.alertSubtype === 'aircraft'
                                      ? t.tgAlertAircraft
                                      : post.alertSubtype === 'missile'
                                        ? t.tgAlertMissile
                                        : t.tgAlertDrone}
                                </span>
                              ) : post.eventKind === 'intercepted' ? (
                                <span className="truncate font-semibold text-emerald-300">
                                  {activeTelegramChannel.country === 'RU' ? t.tgShotDownRu : t.tgShotDownUa}:{' '}
                                  {post.nearCity ?? post.raionName ?? post.oblast}
                                </span>
                              ) : post.eventKind === 'dorozvedka' ? (
                                <span className="truncate font-semibold text-sky-300">
                                  {t.tgDorozvedka}: {formatOblastShortLabel(post.oblast)}
                                </span>
                              ) : post.eventKind === 'explosion' ? (
                                <span className="truncate font-semibold text-orange-300">
                                  {t.tgExplosion}: {post.nearCity ?? post.raionName ?? post.oblast}
                                </span>
                              ) : post.targetCity ? (
                                <span className="truncate font-semibold text-rose-300">
                                  {t.tgOnTarget}: {post.targetCity}
                                </span>
                              ) : post.transitOblast ? (
                                <span className="truncate text-sky-300">
                                  {t.tgTransit} → <strong>{formatOblastShortLabel(post.transitOblast)}</strong>
                                </span>
                              ) : (
                                <span className="truncate text-slate-300">
                                  {t.tgCourse}:{' '}
                                  <strong>
                                    {post.bearingDeg !== undefined
                                      ? computeCompassDirectionRu(post.bearingDeg)
                                      : post.raionName ?? t.tgInOblast}
                                  </strong>
                                </span>
                              )}
                              <span className="flex items-center gap-1 font-mono-tabular text-slate-400 shrink-0">
                                <Eye className="h-3 w-3" />
                                <span>{post.viewsLabel}</span>
                                <span className="ml-0.5 text-slate-300">
                                  {formatSimTimeShort(post.simTimeMinutes)}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={telegramChatEndRef} />
                  </div>

                  {/* Authentic Telegram Channel Muted Bottom Bar */}
                  <div className="flex items-center justify-center border-t border-[#1E2C3A] bg-[#17212B] py-2 text-[11px] font-medium text-[#64B5F6] shrink-0">
                    {t.tgMonitoringFooter}
                  </div>
                </div>
              ) : (
                /* Telegram View 1: Chats & Channels Directory */
                <div className="flex flex-1 min-h-0 flex-col bg-[#17212B]">
                  <div className="border-b border-[#1E2C3A] bg-[#17212B] px-3 py-2.5 space-y-2 shrink-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#24A1DE] shrink-0">
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-white fill-current">
                            <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
                          </svg>
                        </div>
                        <span className="text-sm font-bold text-white">Telegram</span>
                      </div>

                      {totalTelegramUnread > 0 && (
                        <button
                          type="button"
                          onClick={() => setTelegramUnreadByOblast({})}
                          className="rounded px-2 py-1 text-[10px] font-medium text-[#64B5F6] hover:bg-[#232E3C] whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          {t.tgReadAll}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 rounded-lg bg-[#0E1621] p-0.5 border border-[#242F3D]">
                      <button
                        type="button"
                        onClick={() => {
                          soundFx.playUiClick('tab');
                          setTelegramCountryFilter('UA');
                        }}
                        className={`flex items-center justify-center gap-1.5 rounded-md py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                          telegramCountryFilter === 'UA'
                            ? 'bg-[#24A1DE] text-slate-950'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        <span>{t.tgUkraine}</span>
                        {telegramUnreadUa > 0 && (
                          <span
                            className={`rounded px-1 font-mono-tabular text-[9.5px] font-bold ${
                              telegramCountryFilter === 'UA'
                                ? 'bg-slate-950/25 text-slate-950'
                                : 'bg-[#2AABEE] text-slate-950'
                            }`}
                          >
                            {telegramUnreadUa}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          soundFx.playUiClick('tab');
                          setTelegramCountryFilter('RU');
                        }}
                        className={`flex items-center justify-center gap-1.5 rounded-md py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                          telegramCountryFilter === 'RU'
                            ? 'bg-[#24A1DE] text-slate-950'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        <span>{t.tgRussia}</span>
                        {telegramUnreadRu > 0 && (
                          <span
                            className={`rounded px-1 font-mono-tabular text-[9.5px] font-bold ${
                              telegramCountryFilter === 'RU'
                                ? 'bg-slate-950/25 text-slate-950'
                                : 'bg-[#2AABEE] text-slate-950'
                            }`}
                          >
                            {telegramUnreadRu}
                          </span>
                        )}
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={telegramSearch}
                        onChange={(e) => setTelegramSearch(e.target.value)}
                        placeholder={
                          telegramCountryFilter === 'RU'
                            ? t.tgSearchRu
                            : t.tgSearchUa
                        }
                        className="w-full rounded-lg bg-[#242F3D] pl-8 pr-2.5 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#24A1DE]"
                      />
                    </div>
                  </div>

                  <div className="tac-scroll flex-1 overflow-y-auto divide-y divide-[#1E2C3A]/80">
                    {filteredTelegramChannels.map((ch) => {
                      const unread = telegramUnreadByOblast[ch.oblast] ?? 0;
                      const lastPost = findLastTelegramPost(telegramPosts, ch.oblast);
                      return (
                        <button
                          key={ch.oblast}
                          type="button"
                          onClick={() => {
                            soundFx.playUiClick('tap');
                            handleOpenTelegramChannel(ch.oblast);
                          }}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[#202B36] cursor-pointer"
                        >
                          <img
                            src={ch.avatarUrl}
                            alt={ch.title}
                            className="h-10 w-10 rounded-full object-cover border border-slate-600/50 shrink-0"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="truncate text-xs font-semibold text-white">
                                {ch.title}
                              </span>
                              {lastPost && (
                                <span className="font-mono-tabular text-[10px] text-slate-400 shrink-0">
                                  {formatSimTimeShort(lastPost.simTimeMinutes)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-0.5">
                              <span
                                className={`truncate text-[11px] ${
                                  lastPost ? 'text-slate-300' : 'text-slate-500'
                                }`}
                              >
                                {lastPost ? lastPost.text : `${ch.oblast} · ${t.tgQuiet}`}
                              </span>
                              {unread > 0 && (
                                <span className="flex h-4 min-w-4 items-center justify-center rounded-md bg-[#2AABEE] px-1 font-mono-tabular text-[10px] font-bold text-slate-950 shrink-0">
                                  {unread}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Smartphone Home Indicator Bar */}
              <div className="flex items-center justify-center bg-[#0B1018] py-1.5 border-t border-slate-800/80 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playUiClick('tap');
                    setPhoneScreen((s) => (s === 'home' ? 'telegram' : 'home'));
                  }}
                  title={phoneScreen === 'home' ? 'Telegram' : t.tgHomeTitle}
                  className="h-1 w-20 rounded-full bg-slate-500 hover:bg-slate-300 transition-colors cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Warning Toast */}
          {warning && (
            <div className="pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 z-30">
              <div className="rounded border border-red-500/70 bg-red-950/95 px-4 py-2 text-xs font-medium text-red-100 whitespace-nowrap">
                {warning}
              </div>
            </div>
          )}

          {/* Game Over / Victory Modal (AI Mode) */}
          {gameScreen === 'gameover' && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-4">
              <div
                className={`w-full max-w-md rounded border bg-[#0A111C] overflow-hidden ${
                  aiOutcome === 'victory' ? 'border-emerald-500/55' : 'border-red-500/50'
                }`}
              >
                <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-4 bg-[#080D16]">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded border shrink-0 ${
                      aiOutcome === 'victory'
                        ? 'border-emerald-500/45 bg-emerald-500/15 text-emerald-300'
                        : 'border-red-500/45 bg-red-500/15 text-red-300'
                    }`}
                  >
                    {aiOutcome === 'victory' ? (
                      <Shield className="h-5 w-5" />
                    ) : (
                      <ShieldAlert className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div
                      className={`text-[11px] font-semibold uppercase tracking-wider ${
                        aiOutcome === 'victory' ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {aiOutcome === 'victory' ? t.victorySubtitle : t.defeatSubtitle}
                    </div>
                    <h2 className="font-display text-xl font-bold text-white">
                      {aiOutcome === 'victory' ? t.victoryTitle : t.defeatTitle}
                    </h2>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 border border-slate-800 rounded overflow-hidden bg-[#080D16] divide-x divide-y divide-slate-800 text-center">
                    <div className="p-3">
                      <div className="text-[11px] text-slate-400">{t.wavesRepelled}</div>
                      <div className="mt-0.5 font-mono-tabular text-lg font-bold text-sky-300">
                        {aiWaveNumber}
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="text-[11px] text-slate-400">{t.shotDownPvo}</div>
                      <div className="mt-0.5 font-mono-tabular text-lg font-bold text-emerald-300">
                        {stats.intercepts}
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="text-[11px] text-slate-400">{t.pvoAccuracy}</div>
                      <div className="mt-0.5 font-mono-tabular text-lg font-bold text-slate-100">
                        {interceptAccuracyPct}%
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="text-[11px] text-slate-400">{t.simTimeLabel}</div>
                      <div className="mt-0.5 font-mono-tabular text-sm font-bold text-amber-300">
                        {formatSimClock(simTimeMinutes, lang)}
                      </div>
                    </div>
                  </div>

                  <div className="text-center text-[11px] font-mono-tabular text-slate-400">
                    {t.realTimeDefense(Math.floor(aiSurvivedSec), stats.explosions)}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleStartGame('ai')}
                      className="flex items-center justify-center gap-2 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm py-2.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>{t.playAgainBtn}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRequestReturnToMenu}
                      className="flex items-center justify-center gap-2 rounded border border-slate-700 bg-[#0E1726] hover:border-slate-600 text-slate-200 font-semibold text-sm py-2.5 transition-colors cursor-pointer"
                    >
                      <span>{t.toMenuBtn}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {sandboxExitModal}
        </main>
      </div>
    </div>
  );
}
