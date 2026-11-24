import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  ArrowLeft,
  BarChart3,
  BellRing,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Crosshair,
  Eye,
  Layers,
  Map as MapIcon,
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
  Swords,
  Trash2,
  Undo2,
  Volume2,
  VolumeX,
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
} from './MunitionIcon';
import type {
  MapStats,
  MapStyleId,
  PendingPlacement,
  PlacedAirDefense,
  PlacedAirfield,
  PlacedBuilding,
  PlacedLauncher,
  RoutePoint,
  SelectedFlightInfo,
  TacticalEventPayload,
} from './TacticalMap';
import {
  ALL_AIRCRAFT,
  RUSSIAN_AIRBASE_PRESETS,
  RUSSIAN_AIRCRAFT_BY_ID,
  UKRAINIAN_AIRBASE_PRESETS,
  type RussianAirbasePreset,
  type RussianAircraftId,
} from '../data/airfields';
import { INITIAL_AI_BUILDINGS } from '../data/aiScenario';
import {
  AIR_DEFENSE_BY_ID,
  AIR_DEFENSE_SYSTEMS,
  BUILDING_BY_ID,
  BUILDINGS,
  MUNITION_BY_ID,
  MUNITIONS,
  type AirDefenseId,
  type AltitudeMode,
  type BuildingId,
  type MunitionId,
} from '../data/munitions';
import { isPointInOccupiedTerritory } from '../utils/frontline2026';
import { getTerritoryAt } from '../utils/geoBoundaries';
import { soundFx } from '../utils/soundFx';
import {
  RUSSIA_TELEGRAM_CHANNELS,
  UKRAINE_TELEGRAM_CHANNELS,
  computeCompassDirectionRu,
  formatOblastShortLabel,
  getTelegramChannelByOblast,
  type TelegramPost,
} from '../utils/telegramIntel';

export interface MobileTacticalEventEntry extends TacticalEventPayload {
  id: string;
  timestampMs: number;
  simTimeMinutes: number;
}

type MobileSheet = 'none' | 'catalog' | 'telegram' | 'stats';
type MobileCatalogTab = 'strike' | 'pvo' | 'infra' | 'units' | 'settings';

interface MobileHudProps {
  gameMode: 'sandbox' | 'ai';
  gameScreen: 'playing' | 'gameover';
  simTimeMinutes: number;
  formatSimDateShort: (m: number) => string;
  formatSimTimeShort: (m: number) => string;
  formatSimClock: (m: number) => string;
  money: number;
  aiIncomePerSec: number;
  aiWaveNumber: number;
  aiWaveCountdownSec: number;
  aiSurvivedSec: number;
  timeScale: number;
  onChangeTimeScale: (mult: number) => void;
  muted: boolean;
  onToggleMute: () => void;
  showFrontline: boolean;
  onToggleFrontline: () => void;
  showRaions: boolean;
  onToggleRaions: () => void;
  showLabels: boolean;
  onToggleLabels: () => void;
  mapStyle: MapStyleId;
  onChangeMapStyle: (style: MapStyleId) => void;
  onReturnToMenu: () => void;
  onSaveSandbox?: () => void;
  onClearAll: () => void;
  onStartAiAgain: () => void;

  stats: MapStats;
  buildingsIntegrityPct: number;
  interceptAccuracyPct: number;

  launchers: PlacedLauncher[];
  playerLaunchers: PlacedLauncher[];
  airfields: PlacedAirfield[];
  playerAirfields: PlacedAirfield[];
  airDefenses: PlacedAirDefense[];
  buildings: PlacedBuilding[];

  pendingPlacement: PendingPlacement | null;
  onCancelPending: () => void;
  onSelectStrikeCatalog: (id: MunitionId) => void;
  onSelectPvoCatalog: (id: AirDefenseId) => void;
  onSelectInfraCatalog: (id: BuildingId) => void;
  onStartNavalShipPlacement: () => void;
  onStartManualAirfieldPlacement: () => void;
  onStartManualUaAirfieldPlacement: () => void;
  onDeployPresetAirbase: (preset: RussianAirbasePreset) => void;

  selectedLauncher: PlacedLauncher | null;
  selectedSpec: (typeof MUNITIONS)[number] | null;
  onSelectLauncher: (id: string | null) => void;
  onRemoveLauncher: (id: string) => void;

  selectedAirfield: PlacedAirfield | null;
  selectedAircraftSpec: (typeof ALL_AIRCRAFT)[number] | null;
  selectedAircraftMissileSpec: (typeof MUNITIONS)[number] | null;
  airfieldLaunchPoint: RoutePoint | null;
  airfieldMissileWaypoints: RoutePoint[];
  airfieldModalStep: 'aircraft' | 'missiles' | null;
  onSetAirfieldModalStep: (step: 'aircraft' | 'missiles' | null) => void;
  onCancelAirfieldSelection: () => void;
  onSelectAirfield: (id: string | null) => void;
  onChangeAirfieldAircraft: (airfieldId: string, aircraftId: RussianAircraftId) => void;
  onChangeAirfieldSalvo: (airfieldId: string, count: number) => void;
  onRemoveAirfield: (id: string) => void;
  onLaunchAirfield: () => void;
  onUndoAirfieldWaypoint: () => void;
  onResetAirfieldPoints: () => void;

  su57DropPoint: RoutePoint | null;
  onResetSu57DropPoint: () => void;
  isPlottingRoute: boolean;
  onSetIsPlottingRoute: (v: boolean) => void;
  routeWaypoints: RoutePoint[];
  onUndoRouteWaypoint: () => void;
  onClearRouteWaypoints: () => void;
  effectiveRouteLaunchCount: number;
  onChangeRouteLaunchCount: (next: number) => void;
  routeAltitudeMode: AltitudeMode;
  onChangeRouteAltitudeMode: (mode: AltitudeMode) => void;
  onLaunchRoute: () => void;

  selectedFlight: SelectedFlightInfo | null;
  followCamActive: boolean;
  onExitFollowCam: () => void;
  onDetonateFlight: () => void;
  onDeselectFlight: () => void;
  isPlottingFlightRoute: boolean;
  onSetIsPlottingFlightRoute: (v: boolean) => void;
  flightRouteWaypoints: RoutePoint[];
  onUndoFlightRouteWaypoint: () => void;
  onClearFlightRouteWaypoints: () => void;
  onApplyFlightRoute: () => void;
  onSetFlightAltitude: (id: string, mode: AltitudeMode) => void;
  onMobileSteerChange: (dir: -1 | 0 | 1) => void;

  onFocusCoords: (coords: { lat: number; lng: number; zoom?: number }) => void;
  onRemovePvo: (id: string) => void;
  onReloadPvo: (id: string) => void;
  onRepairPvo: (id: string) => void;
  onRemoveBuilding: (id: string) => void;

  buildingScale: number;
  onChangeBuildingScale: (v: number) => void;
  sirenEnabled: boolean;
  onToggleSiren: () => void;
  sirenVolume: number;
  onChangeSirenVolume: (v: number) => void;
  droneVolume: number;
  onChangeDroneVolume: (v: number) => void;
  missileVolume: number;
  onChangeMissileVolume: (v: number) => void;
  alertHoldoverSec: number;
  onChangeAlertHoldoverSec: (v: number) => void;
  alertRadiusKm: number;
  onChangeAlertRadiusKm: (v: number) => void;

  telegramOpen: boolean;
  onSetTelegramOpen: (open: boolean) => void;
  telegramCountryFilter: 'UA' | 'RU';
  onChangeTelegramCountryFilter: (country: 'UA' | 'RU') => void;
  telegramUnreadUa: number;
  telegramUnreadRu: number;
  selectedTelegramOblast: string | null;
  onSelectTelegramOblast: (oblast: string | null) => void;
  onOpenTelegramChannel: (oblast: string) => void;
  telegramSearch: string;
  onChangeTelegramSearch: (q: string) => void;
  telegramPosts: MobileTacticalEventEntry[] extends never ? never : TelegramPost[];
  telegramUnreadByOblast: Record<string, number>;
  totalTelegramUnread: number;
  onMarkAllTelegramRead: () => void;
  onClearChannelPosts: (oblast: string) => void;

  eventLog: MobileTacticalEventEntry[];
  onClearEventLog: () => void;
  warning: string | null;
}

const MAP_STYLE_OPTIONS: Array<{ id: MapStyleId; label: string }> = [
  { id: 'arcgis-sat', label: 'Спутник' },
  { id: 'google-sat', label: 'Спутник 2' },
  { id: 'arcgis-topo', label: 'Рельеф' },
];

function findLastPost(posts: TelegramPost[], oblast: string): TelegramPost | undefined {
  for (let i = posts.length - 1; i >= 0; i -= 1) {
    if (posts[i].oblast === oblast) return posts[i];
  }
  return undefined;
}

export function MobileHud(props: MobileHudProps) {
  const {
    gameMode,
    gameScreen,
    simTimeMinutes,
    formatSimDateShort,
    formatSimTimeShort,
    formatSimClock,
    money,
    aiIncomePerSec,
    aiWaveNumber,
    aiWaveCountdownSec,
    aiSurvivedSec,
    timeScale,
    onChangeTimeScale,
    muted,
    onToggleMute,
    showFrontline,
    onToggleFrontline,
    showRaions,
    onToggleRaions,
    showLabels,
    onToggleLabels,
    mapStyle,
    onChangeMapStyle,
    onReturnToMenu,
    onSaveSandbox,
    onClearAll,
    onStartAiAgain,
    stats,
    buildingsIntegrityPct,
    interceptAccuracyPct,
    launchers,
    playerLaunchers,
    airfields,
    playerAirfields,
    airDefenses,
    buildings,
    pendingPlacement,
    onCancelPending,
    onSelectStrikeCatalog,
    onSelectPvoCatalog,
    onSelectInfraCatalog,
    onStartNavalShipPlacement,
    onStartManualAirfieldPlacement,
    onStartManualUaAirfieldPlacement,
    onDeployPresetAirbase,
    selectedLauncher,
    selectedSpec,
    onSelectLauncher,
    onRemoveLauncher,
    selectedAirfield,
    selectedAircraftSpec,
    selectedAircraftMissileSpec,
    airfieldLaunchPoint,
    airfieldMissileWaypoints,
    airfieldModalStep,
    onSetAirfieldModalStep,
    onCancelAirfieldSelection,
    onSelectAirfield,
    onChangeAirfieldAircraft,
    onChangeAirfieldSalvo,
    onRemoveAirfield,
    onLaunchAirfield,
    onUndoAirfieldWaypoint,
    onResetAirfieldPoints,
    su57DropPoint,
    onResetSu57DropPoint,
    isPlottingRoute,
    onSetIsPlottingRoute,
    routeWaypoints,
    onUndoRouteWaypoint,
    onClearRouteWaypoints,
    effectiveRouteLaunchCount,
    onChangeRouteLaunchCount,
    routeAltitudeMode,
    onChangeRouteAltitudeMode,
    onLaunchRoute,
    selectedFlight,
    followCamActive,
    onExitFollowCam,
    onDetonateFlight,
    onDeselectFlight,
    isPlottingFlightRoute,
    onSetIsPlottingFlightRoute,
    flightRouteWaypoints,
    onUndoFlightRouteWaypoint,
    onClearFlightRouteWaypoints,
    onApplyFlightRoute,
    onSetFlightAltitude,
    onMobileSteerChange,
    onFocusCoords,
    onRemovePvo,
    onReloadPvo,
    onRepairPvo,
    onRemoveBuilding,
    buildingScale,
    onChangeBuildingScale,
    sirenEnabled,
    onToggleSiren,
    sirenVolume,
    onChangeSirenVolume,
    droneVolume,
    onChangeDroneVolume,
    missileVolume,
    onChangeMissileVolume,
    alertHoldoverSec,
    onChangeAlertHoldoverSec,
    alertRadiusKm,
    onChangeAlertRadiusKm,
    telegramOpen,
    onSetTelegramOpen,
    telegramCountryFilter,
    onChangeTelegramCountryFilter,
    telegramUnreadUa,
    telegramUnreadRu,
    selectedTelegramOblast,
    onSelectTelegramOblast,
    onOpenTelegramChannel,
    telegramSearch,
    onChangeTelegramSearch,
    telegramPosts,
    telegramUnreadByOblast,
    totalTelegramUnread,
    onMarkAllTelegramRead,
    onClearChannelPosts,
    eventLog,
    onClearEventLog,
    warning,
  } = props;

  const [activeSheet, setActiveSheet] = useState<MobileSheet>('none');
  const [catalogTab, setCatalogTab] = useState<MobileCatalogTab>(
    gameMode === 'ai' ? 'pvo' : 'strike',
  );
  const [statsTab, setStatsTab] = useState<'stats' | 'log'>('stats');
  const [journalFilter, setJournalFilter] = useState<'all' | 'intercept' | 'impact' | 'miss' | 'launch'>('all');
  const [layersPopoverOpen, setLayersPopoverOpen] = useState<boolean>(false);
  const [airfieldPresetsExpanded, setAirfieldPresetsExpanded] = useState<boolean>(false);
  const [uaAirfieldPresetsExpanded, setUaAirfieldPresetsExpanded] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCatalogTab(gameMode === 'ai' ? 'pvo' : 'strike');
    setJournalFilter('all');
    setActiveSheet('none');
  }, [gameMode]);

  useEffect(() => {
    const isTgOpen = activeSheet === 'telegram';
    if (telegramOpen !== isTgOpen) {
      onSetTelegramOpen(isTgOpen);
    }
  }, [activeSheet, telegramOpen, onSetTelegramOpen]);

  useEffect(() => {
    if (activeSheet === 'telegram' && selectedTelegramOblast) {
      chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [activeSheet, selectedTelegramOblast, telegramPosts.length]);

  useEffect(() => {
    if (!selectedFlight) {
      onMobileSteerChange(0);
    }
  }, [selectedFlight, onMobileSteerChange]);

  const cycleTimeScale = () => {
    soundFx.playUiClick('tab');
    const order = [0.5, 1, 2, 4];
    const idx = order.indexOf(timeScale);
    onChangeTimeScale(order[(idx + 1) % order.length]);
  };

  const openSheet = (sheet: MobileSheet) => {
    soundFx.playUiClick(sheet === 'none' ? 'back' : 'tab');
    setLayersPopoverOpen(false);
    setActiveSheet((prev) => (prev === sheet && sheet !== 'none' ? 'none' : sheet));
  };

  const activeTelegramChannel = selectedTelegramOblast
    ? getTelegramChannelByOblast(selectedTelegramOblast)
    : null;
  const activeTelegramMessages = selectedTelegramOblast
    ? telegramPosts.filter((p) => p.oblast === selectedTelegramOblast)
    : [];
  const activeCountryChannels =
    telegramCountryFilter === 'RU' ? RUSSIA_TELEGRAM_CHANNELS : UKRAINE_TELEGRAM_CHANNELS;
  const filteredChannels = activeCountryChannels.filter((ch) => {
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
    const la = findLastPost(telegramPosts, a.oblast)?.timestampMs ?? 0;
    const lb = findLastPost(telegramPosts, b.oblast)?.timestampMs ?? 0;
    return lb - la;
  });

  const pendingStrikeSpec =
    pendingPlacement?.kind === 'strike' ? MUNITION_BY_ID[pendingPlacement.id] : null;
  const pendingPvoSpec =
    pendingPlacement?.kind === 'pvo' ? AIR_DEFENSE_BY_ID[pendingPlacement.id] : null;
  const pendingInfraSpec =
    pendingPlacement?.kind === 'infra' ? BUILDING_BY_ID[pendingPlacement.id] : null;
  const pendingAirfield = pendingPlacement?.kind === 'airfield';
  const pendingAirfieldUa = pendingPlacement?.kind === 'airfield-ua';
  const pendingShip = pendingPlacement?.kind === 'ship';

  const hasContextualDeck =
    activeSheet === 'none' &&
    Boolean(
      pendingPlacement ||
        selectedFlight ||
        (selectedSpec && selectedLauncher) ||
        (selectedAirfield && selectedAircraftSpec && selectedAircraftMissileSpec),
    );

  const selectedAirfieldAllowedIds: RussianAircraftId[] = (() => {
    if (!selectedAirfield) return [];
    if (selectedAirfield.availableAircraftIds?.length) {
      return selectedAirfield.availableAircraftIds;
    }
    if (selectedAirfield.presetId) {
      const preset =
        RUSSIAN_AIRBASE_PRESETS.find((p) => p.id === selectedAirfield.presetId) ??
        UKRAINIAN_AIRBASE_PRESETS.find((p) => p.id === selectedAirfield.presetId);
      if (preset) return preset.availableAircraftIds;
    }
    return [selectedAirfield.selectedAircraftId];
  })();
  const airfieldAircraftOptions = ALL_AIRCRAFT.filter((ac) =>
    selectedAirfieldAllowedIds.includes(ac.id),
  );

  const totalAlerts = stats.droneAlertRaions + stats.missileAlertRaions;
  const playerUnitsCount =
    playerAirfields.length + playerLaunchers.length + airDefenses.length + buildings.length;
  const damagedPvosCount = airDefenses.filter((p) => p.hp < p.maxHp).length;
  const lowAmmoPvosCount = airDefenses.filter(
    (p) => !AIR_DEFENSE_BY_ID[p.airDefenseId].isRadar && p.ammo === 0,
  ).length;
  const visibleJournalEntries = eventLog.filter((ev) => {
    if (gameMode === 'ai' && ev.kind === 'launch') return false;
    if (journalFilter === 'all') return true;
    return ev.kind === journalFilter;
  });

  return (
    <>
      {/* 1. Compact Mobile Top Bar (44px) */}
      <header className="fixed top-0 left-0 right-0 z-30 flex h-11 items-center justify-between gap-1.5 border-b border-slate-800 bg-[#0A111C]/96 px-2 backdrop-blur-md">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={() => {
              soundFx.playUiClick('back');
              onReturnToMenu();
            }}
            aria-label="В главное меню"
            className="flex h-9 min-w-[38px] items-center justify-center rounded-lg border border-slate-800 bg-[#0E1726] px-2 text-slate-200 active:bg-slate-800 cursor-pointer shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {gameMode === 'ai' ? (
            <div className="flex items-center gap-2 min-w-0 font-mono-tabular text-xs">
              <span className="flex items-center gap-1 font-bold text-amber-300 whitespace-nowrap">
                <Coins className="h-3.5 w-3.5 shrink-0" />${Math.floor(money)}
                <span className="text-[10px] font-semibold text-emerald-400">
                  +{aiIncomePerSec}
                </span>
              </span>
              <span className="text-slate-600" aria-hidden="true">
                ·
              </span>
              <span className="text-slate-300 truncate">
                В#{aiWaveNumber} ·{' '}
                <strong className="text-sky-300">{Math.ceil(aiWaveCountdownSec)}с</strong>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0 font-mono-tabular text-[11px]">
              <Clock className="h-3.5 w-3.5 text-sky-400 shrink-0" />
              <span className="font-semibold text-slate-100 truncate">
                {formatSimDateShort(simTimeMinutes)} · {formatSimTimeShort(simTimeMinutes)}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={cycleTimeScale}
            aria-label="Скорость симуляции"
            className="flex h-9 min-w-[40px] items-center justify-center rounded-lg border border-slate-800 bg-[#0E1726] px-2 font-mono-tabular text-xs font-bold text-sky-300 active:bg-slate-800 cursor-pointer"
          >
            {timeScale}×
          </button>

          <button
            type="button"
            onClick={() => {
              soundFx.playUiClick('toggle');
              onToggleMute();
            }}
            aria-label={muted ? 'Включить звук' : 'Выключить звук'}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-[#0E1726] text-slate-200 active:bg-slate-800 cursor-pointer"
          >
            {muted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => {
              soundFx.playUiClick('back');
              onClearAll();
            }}
            aria-label={gameMode === 'ai' ? 'Начать заново' : 'Очистить карту'}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-[#0E1726] text-slate-200 active:bg-red-950/60 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* 2. Top-Left Map Layers Button & Quick Popover (unobtrusive over map) */}
      <div className="fixed top-14 left-2.5 z-20 flex flex-col items-start gap-2">
        <button
          type="button"
          onClick={() => {
            soundFx.playUiClick('toggle');
            setLayersPopoverOpen((v) => !v);
          }}
          aria-label="Слои карты и время"
          className={`flex h-11 w-11 items-center justify-center rounded-xl border backdrop-blur-md transition-colors cursor-pointer ${
            layersPopoverOpen
              ? 'border-sky-400 bg-sky-500/25 text-sky-100'
              : 'border-slate-700/90 bg-[#0A111C]/92 text-slate-200'
          }`}
        >
          <Layers className="h-5 w-5" />
        </button>

        {layersPopoverOpen && (
          <div className="w-64 rounded-2xl border border-slate-700 bg-[#0A111C]/96 p-3 space-y-2.5 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-semibold text-slate-100">Слои и время</span>
              <span className="font-mono-tabular text-[11px] text-sky-300">
                {formatSimClock(simTimeMinutes)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  soundFx.playUiClick('toggle');
                  onToggleFrontline();
                }}
                className={`flex min-h-[40px] flex-col items-center justify-center gap-0.5 rounded-lg border text-[11px] font-medium cursor-pointer ${
                  showFrontline
                    ? 'border-red-500/60 bg-red-500/15 text-rose-200'
                    : 'border-slate-800 bg-[#0E1726] text-slate-300'
                }`}
              >
                <Swords className="h-3.5 w-3.5" />
                <span>Фронт</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFx.playUiClick('toggle');
                  onToggleRaions();
                }}
                className={`flex min-h-[40px] flex-col items-center justify-center gap-0.5 rounded-lg border text-[11px] font-medium cursor-pointer ${
                  showRaions
                    ? 'border-amber-500/60 bg-amber-500/15 text-amber-200'
                    : 'border-slate-800 bg-[#0E1726] text-slate-300'
                }`}
              >
                <MapIcon className="h-3.5 w-3.5" />
                <span>Регионы</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFx.playUiClick('toggle');
                  onToggleLabels();
                }}
                className={`flex min-h-[40px] flex-col items-center justify-center gap-0.5 rounded-lg border text-[11px] font-medium cursor-pointer ${
                  showLabels
                    ? 'border-sky-500/60 bg-sky-500/15 text-sky-200'
                    : 'border-slate-800 bg-[#0E1726] text-slate-300'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Названия</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-800">
              {MAP_STYLE_OPTIONS.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    soundFx.playUiClick('tab');
                    onChangeMapStyle(st.id);
                  }}
                  className={`min-h-[38px] rounded-lg border text-xs font-medium cursor-pointer ${
                    mapStyle === st.id
                      ? 'border-sky-500/60 bg-sky-500/20 text-sky-100'
                      : 'border-slate-800 bg-[#0E1726] text-slate-300'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Mobile Warning Toast */}
      {warning && (
        <div className="pointer-events-none fixed top-14 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm">
          <div className="rounded-xl border border-red-500/75 bg-red-950/95 px-3.5 py-2 text-center text-xs font-medium text-red-100 shadow-lg">
            {warning}
          </div>
        </div>
      )}

      {/* 4. Mobile Thumb-Zone Contextual Action Deck (docked right above the 56px bottom nav) */}
      {hasContextualDeck && (
        <div className="fixed bottom-14 left-0 right-0 z-25 border-t border-slate-700/90 bg-[#0A111C]/96 px-3 py-2.5 backdrop-blur-md shadow-2xl">
          {pendingPlacement ? (
            <div className="flex items-center justify-between gap-2.5">
              <div className="min-w-0 flex-1 text-xs leading-snug text-slate-200">
                {pendingShip ? (
                  <>
                    Нажмите на <strong className="text-sky-300">Чёрное / Азовское море</strong> для
                    установки корабля «Калибр»
                  </>
                ) : pendingAirfield ? (
                  <>
                    Нажмите на <strong className="text-amber-300">РФ / оккуп. зону</strong> для
                    аэродрома ВКС
                  </>
                ) : pendingAirfieldUa ? (
                  <>
                    Нажмите на{' '}
                    <strong className="text-sky-300">подконтрольную Украину</strong> для
                    аэродрома ВСУ
                  </>
                ) : pendingStrikeSpec ? (
                  <>
                    Нажмите на карту для{' '}
                    <strong className="text-amber-300">{pendingStrikeSpec.shortName}</strong>
                  </>
                ) : pendingPvoSpec ? (
                  <>
                    Установить{' '}
                    <strong className="text-emerald-300">{pendingPvoSpec.shortName}</strong> (
                    {pendingPvoSpec.rangeKm} км) — нажмите на карту
                  </>
                ) : pendingInfraSpec ? (
                  <>
                    Установить{' '}
                    <strong className="text-sky-300">{pendingInfraSpec.shortName}</strong> —
                    нажмите на карту
                  </>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  soundFx.playUiClick('back');
                  onCancelPending();
                }}
                className="min-h-[44px] shrink-0 rounded-xl border border-slate-700 bg-[#0E1726] px-4 text-xs font-semibold text-slate-200 active:bg-slate-800 cursor-pointer"
              >
                Отмена
              </button>
            </div>
          ) : selectedFlight ? (
            (() => {
              const fltName = selectedFlight.carrierAircraftId
                ? RUSSIAN_AIRCRAFT_BY_ID[selectedFlight.carrierAircraftId].shortName
                : MUNITION_BY_ID[selectedFlight.munitionId].shortName;
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
                  ? 'Сверхнизко (вне РЛС)'
                  : selectedFlight.altitudeMode === 'low'
                    ? 'Низко (РЛС)'
                    : 'Обычная';

              if (isAiReadOnly) {
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1.5 min-w-0 truncate font-medium text-slate-100">
                        <Eye className="h-4 w-4 text-sky-300 shrink-0" />
                        <strong style={{ color: fltAccent }}>{fltName}</strong>
                        <span className="font-mono-tabular text-slate-300">
                          · ~{Math.round(selectedFlight.remainingKm)} км · {obsHeightLabel}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {followCamActive && (
                        <button
                          type="button"
                          onClick={() => {
                            soundFx.playUiClick('back');
                            onExitFollowCam();
                          }}
                          className="flex-1 min-h-[44px] rounded-xl border border-sky-400/60 bg-sky-500/15 text-xs font-semibold text-sky-200 cursor-pointer"
                        >
                          Выйти из камеры
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          soundFx.playUiClick('back');
                          onDeselectFlight();
                        }}
                        className="flex-1 min-h-[44px] rounded-xl border border-slate-700 bg-[#0E1726] text-xs font-semibold text-slate-200 cursor-pointer"
                      >
                        Снять выбор
                      </button>
                    </div>
                  </div>
                );
              }

              if (isPlottingFlightRoute) {
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-200">
                        Курс (<strong style={{ color: fltAccent }}>{fltName}</strong>) · нажмите на
                        карту
                      </span>
                      <span className="font-mono-tabular font-bold text-amber-300">
                        Точек: {flightRouteWaypoints.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        disabled={flightRouteWaypoints.length === 0}
                        onClick={() => {
                          soundFx.playUiClick('confirm');
                          onApplyFlightRoute();
                        }}
                        className="min-h-[44px] rounded-xl bg-amber-500 disabled:opacity-40 text-xs font-bold text-slate-950 cursor-pointer"
                      >
                        Применить
                      </button>
                      <button
                        type="button"
                        disabled={flightRouteWaypoints.length === 0}
                        onClick={() => {
                          soundFx.playUiClick('back');
                          onUndoFlightRouteWaypoint();
                        }}
                        className="min-h-[44px] rounded-xl border border-slate-700 bg-[#0E1726] disabled:opacity-40 text-xs font-semibold text-slate-200 cursor-pointer"
                      >
                        Назад
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          soundFx.playUiClick('back');
                          onSetIsPlottingFlightRoute(false);
                          onClearFlightRouteWaypoints();
                        }}
                        className="min-h-[44px] rounded-xl border border-slate-700 bg-[#0E1726] text-xs font-semibold text-slate-300 cursor-pointer"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                );
              }

              const curAlt: AltitudeMode =
                selectedFlight.altitudeMode ?? (selectedFlight.lowAltitude ? 'low' : 'normal');

              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <Navigation className="h-3.5 w-3.5 text-sky-300 shrink-0" />
                      <strong style={{ color: fltAccent }}>{fltName}</strong>
                      <span className="font-mono-tabular text-slate-300">
                        · ~{Math.round(selectedFlight.remainingKm)} км
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {followCamActive && (
                        <button
                          type="button"
                          onClick={() => {
                            soundFx.playUiClick('back');
                            onExitFollowCam();
                          }}
                          className="rounded-lg border border-sky-400/60 bg-sky-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-sky-200 cursor-pointer"
                        >
                          Камера ✕
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          soundFx.playUiClick('tap');
                          onSetIsPlottingFlightRoute(true);
                          onClearFlightRouteWaypoints();
                        }}
                        className="rounded-lg border border-amber-400/60 bg-amber-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-amber-200 cursor-pointer"
                      >
                        Точки
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          soundFx.playUiClick('back');
                          onDeselectFlight();
                        }}
                        aria-label="Снять выбор цели"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-[#0E1726] text-slate-300 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {canAdjustAlt && (
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: 'normal', label: 'Обычная' },
                          { id: 'low', label: 'Низко' },
                          { id: 'ultra-low', label: 'Очень низко' },
                        ] as Array<{ id: AltitudeMode; label: string }>
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => onSetFlightAltitude(selectedFlight.id, opt.id)}
                          className={`min-h-[38px] rounded-lg border text-[11px] font-semibold cursor-pointer ${
                            curAlt === opt.id
                              ? opt.id === 'ultra-low'
                                ? 'border-emerald-400 bg-emerald-500/25 text-emerald-100'
                                : opt.id === 'low'
                                  ? 'border-cyan-400 bg-cyan-500/25 text-cyan-100'
                                  : 'border-sky-400 bg-sky-500/25 text-sky-100'
                              : 'border-slate-800 bg-[#080D16] text-slate-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {isSteerable && (
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          onMobileSteerChange(-1);
                        }}
                        onPointerUp={() => onMobileSteerChange(0)}
                        onPointerCancel={() => onMobileSteerChange(0)}
                        onPointerLeave={() => onMobileSteerChange(0)}
                        className="min-h-[48px] flex items-center justify-center gap-1 rounded-xl border border-sky-500/60 bg-sky-500/20 active:bg-sky-500/40 text-sm font-bold text-sky-100 touch-none select-none cursor-pointer"
                      >
                        <ChevronLeft className="h-5 w-5" />
                        <span>Лево</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundFx.playUiClick('confirm');
                          onDetonateFlight();
                        }}
                        className="min-h-[48px] flex items-center justify-center rounded-xl border border-rose-500/75 bg-rose-500/25 active:bg-rose-500/45 text-sm font-bold text-rose-100 cursor-pointer"
                      >
                        Подрыв
                      </button>

                      <button
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          onMobileSteerChange(1);
                        }}
                        onPointerUp={() => onMobileSteerChange(0)}
                        onPointerCancel={() => onMobileSteerChange(0)}
                        onPointerLeave={() => onMobileSteerChange(0)}
                        className="min-h-[48px] flex items-center justify-center gap-1 rounded-xl border border-sky-500/60 bg-sky-500/20 active:bg-sky-500/40 text-sm font-bold text-sky-100 touch-none select-none cursor-pointer"
                      >
                        <span>Право</span>
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })()
          ) : selectedSpec && selectedLauncher ? (
            isPlottingRoute ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-medium text-slate-100">
                    Маршрут (<strong style={{ color: selectedSpec.accentColor }}>{selectedSpec.shortName}</strong>) ·{' '}
                    <span className="font-mono-tabular text-amber-300">Точек: {routeWaypoints.length}</span>
                  </span>
                  {selectedLauncher.ammo > 1 && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={effectiveRouteLaunchCount <= 1}
                        onClick={() => onChangeRouteLaunchCount(Math.max(1, effectiveRouteLaunchCount - 1))}
                        aria-label="Меньше целей"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-[#0E1726] disabled:opacity-35 text-slate-200 cursor-pointer"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="font-mono-tabular text-xs font-bold text-amber-300 min-w-8 text-center">
                        {effectiveRouteLaunchCount}/{selectedLauncher.ammo}
                      </span>
                      <button
                        type="button"
                        disabled={effectiveRouteLaunchCount >= selectedLauncher.ammo}
                        onClick={() =>
                          onChangeRouteLaunchCount(Math.min(selectedLauncher.ammo, effectiveRouteLaunchCount + 1))
                        }
                        aria-label="Больше целей"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-[#0E1726] disabled:opacity-35 text-slate-200 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {selectedSpec.canFlyLow && (
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'normal', label: 'Обычная' },
                        { id: 'low', label: 'Низко' },
                        { id: 'ultra-low', label: 'Очень низко' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onChangeRouteAltitudeMode(opt.id)}
                        className={`min-h-[38px] rounded-lg border text-[11px] font-semibold cursor-pointer ${
                          routeAltitudeMode === opt.id
                            ? 'border-sky-400 bg-sky-500/20 text-sky-100'
                            : 'border-slate-800 bg-[#080D16] text-slate-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={routeWaypoints.length === 0 || selectedLauncher.ammo <= 0}
                    onClick={onLaunchRoute}
                    className="min-h-[44px] flex items-center justify-center gap-1 rounded-xl bg-amber-500 disabled:opacity-40 text-xs font-bold text-slate-950 cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>Пуск (×{effectiveRouteLaunchCount})</span>
                  </button>
                  <button
                    type="button"
                    disabled={routeWaypoints.length === 0}
                    onClick={onUndoRouteWaypoint}
                    className="min-h-[44px] rounded-xl border border-slate-700 bg-[#0E1726] disabled:opacity-40 text-xs font-semibold text-slate-200 cursor-pointer"
                  >
                    Назад
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSetIsPlottingRoute(false);
                      onClearRouteWaypoints();
                      onChangeRouteLaunchCount(1);
                    }}
                    className="min-h-[44px] rounded-xl border border-slate-700 bg-[#0E1726] text-xs font-semibold text-slate-300 cursor-pointer"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-medium text-slate-100">
                    {selectedLauncher.isNavalShip ? 'Корабль' : 'ПУ'} ·{' '}
                    <strong style={{ color: selectedSpec.accentColor }}>{selectedSpec.shortName}</strong>{' '}
                    <span className="font-mono-tabular text-slate-300">
                      ({selectedLauncher.ammo}/{selectedLauncher.maxAmmo})
                    </span>
                    {selectedSpec.id === 'su57-kab' && !su57DropPoint
                      ? ' · Нажмите точку сброса'
                      : selectedSpec.id === 'su57-kab' && su57DropPoint
                        ? ' · Выберите цель ≤75 км'
                        : selectedSpec.id === 'kab'
                          ? ' · Цель ≤75 км'
                          : ' · Нажмите цель на карте'}
                  </span>
                </div>

                {selectedSpec.canFlyLow && selectedLauncher.ammo > 0 && (
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'normal', label: 'Обычная' },
                        { id: 'low', label: 'Низко' },
                        { id: 'ultra-low', label: 'Очень низко' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onChangeRouteAltitudeMode(opt.id)}
                        className={`min-h-[38px] rounded-lg border text-[11px] font-semibold cursor-pointer ${
                          routeAltitudeMode === opt.id
                            ? 'border-sky-400 bg-sky-500/20 text-sky-100'
                            : 'border-slate-800 bg-[#080D16] text-slate-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {selectedSpec.id === 'su57-kab' && su57DropPoint && (
                    <button
                      type="button"
                      onClick={onResetSu57DropPoint}
                      className="flex-1 min-h-[44px] rounded-xl border border-sky-400/60 bg-sky-500/15 text-xs font-semibold text-sky-200 cursor-pointer"
                    >
                      Сбросить точку
                    </button>
                  )}
                  {selectedLauncher.ammo > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        onResetSu57DropPoint();
                        onSetIsPlottingRoute(true);
                        onClearRouteWaypoints();
                        onChangeRouteLaunchCount(1);
                      }}
                      className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl border border-amber-400/60 bg-amber-500/15 text-xs font-semibold text-amber-200 cursor-pointer"
                    >
                      <Route className="h-4 w-4" />
                      <span>Маршрут</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onResetSu57DropPoint();
                      onSelectLauncher(null);
                    }}
                    className="flex-1 min-h-[44px] rounded-xl border border-slate-700 bg-[#0E1726] text-xs font-semibold text-slate-200 cursor-pointer"
                  >
                    Снять выбор
                  </button>
                </div>
              </div>
            )
          ) : selectedAirfield && selectedAircraftSpec && selectedAircraftMissileSpec ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate font-medium text-slate-100">
                  <strong
                    className={
                      selectedAirfield.faction === 'UA' ? 'text-sky-300' : 'text-amber-300'
                    }
                  >
                    {selectedAirfield.name}
                  </strong>{' '}
                  · {selectedAircraftSpec.shortName} ({selectedAirfield.salvoCount}×{' '}
                  {selectedAircraftMissileSpec.shortName})
                </span>
                <span className="font-mono-tabular text-[11px] text-rose-300 shrink-0">
                  {airfieldLaunchPoint
                    ? `Цели: ${airfieldMissileWaypoints.length}`
                    : 'Точка пуска'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onSetAirfieldModalStep('aircraft')}
                  className="flex-1 min-h-[44px] flex items-center justify-center gap-1 rounded-xl border border-amber-400/60 bg-amber-500/15 text-xs font-semibold text-amber-200 cursor-pointer"
                >
                  <Plane className="h-3.5 w-3.5" />
                  <span>Борт</span>
                </button>
                {airfieldLaunchPoint && (
                  <>
                    <button
                      type="button"
                      disabled={airfieldMissileWaypoints.length === 0}
                      onClick={onLaunchAirfield}
                      className="flex-1 min-h-[44px] rounded-xl bg-amber-500 disabled:opacity-40 text-xs font-bold text-slate-950 cursor-pointer"
                    >
                      Пуск
                    </button>
                    <button
                      type="button"
                      disabled={airfieldMissileWaypoints.length === 0}
                      onClick={onUndoAirfieldWaypoint}
                      aria-label="Удалить последнюю точку"
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-[#0E1726] disabled:opacity-40 text-slate-200 cursor-pointer"
                    >
                      <Undo2 className="h-4 w-4" />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onResetAirfieldPoints();
                    onSetAirfieldModalStep(null);
                    onSelectAirfield(null);
                  }}
                  aria-label="Снять выбор аэродрома"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-[#0E1726] text-slate-300 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* 5. Slide-Up Bottom Sheets (Catalog / Telegram / Stats) */}
      {activeSheet !== 'none' && (
        <div
          onClick={() => openSheet('none')}
          className="fixed inset-0 top-11 bottom-14 z-35 flex flex-col justify-end bg-slate-950/60 backdrop-blur-[2px]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[82vh] min-h-[55vh] w-full flex-col rounded-t-2xl border-t border-slate-700 bg-[#0A111C] overflow-hidden shadow-2xl"
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-2 pb-1 shrink-0 bg-[#080D16]">
              <span className="h-1 w-10 rounded-full bg-slate-600" />
            </div>

            {activeSheet === 'catalog' && (
              <>
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 bg-[#070B12] px-4 py-2 shrink-0">
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-slate-100 truncate">
                      Вооружение и карта
                    </h2>
                    <p className="text-[10.5px] font-mono-tabular text-slate-400">
                      {gameMode === 'ai'
                        ? `Бюджет $${Math.floor(money)} · В строю ${playerUnitsCount} ед.`
                        : `Развёрнуто ${playerUnitsCount} ед.`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {gameMode === 'sandbox' && onSaveSandbox && (
                      <button
                        type="button"
                        onClick={() => {
                          soundFx.playUiClick('confirm');
                          onSaveSandbox();
                        }}
                        disabled={playerUnitsCount === 0}
                        className={`flex h-10 items-center gap-1.5 rounded border px-2.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                          playerUnitsCount === 0
                            ? 'border-slate-800 bg-[#0A111C] text-slate-600 cursor-not-allowed'
                            : 'border-emerald-600/50 bg-emerald-950/35 text-emerald-200 active:bg-emerald-900/50 cursor-pointer'
                        }`}
                      >
                        <Save className="h-3.5 w-3.5" />
                        <span>Сохранить</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openSheet('none')}
                      aria-label="Закрыть каталог"
                      className="flex h-10 w-10 items-center justify-center rounded border border-slate-800 bg-[#0E1726] text-slate-300 cursor-pointer shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Sheet Category Sub-Tabs */}
                <div
                  className={`grid border-b border-slate-800 bg-[#070B12] divide-x divide-slate-800/80 shrink-0 ${
                    gameMode === 'ai' ? 'grid-cols-4' : 'grid-cols-5'
                  }`}
                >
                  {(
                    gameMode === 'ai'
                      ? ([
                          { id: 'pvo', label: 'ППО' },
                          { id: 'infra', label: 'Объекты' },
                          { id: 'units', label: `Карта (${playerUnitsCount})` },
                          { id: 'settings', label: 'Тревога' },
                        ] as const)
                      : ([
                          { id: 'strike', label: 'Удар' },
                          { id: 'pvo', label: 'ППО' },
                          { id: 'infra', label: 'Здания' },
                          { id: 'units', label: `Карта (${playerUnitsCount})` },
                          { id: 'settings', label: 'Тревога' },
                        ] as const)
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        soundFx.playUiClick('tab');
                        setCatalogTab(t.id);
                      }}
                      className={`min-h-[44px] px-1 text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        catalogTab === t.id
                          ? 'bg-[#101A2B] text-white border-b-2 border-sky-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="tac-scroll flex-1 overflow-y-auto p-3.5 space-y-4">
                  {gameMode === 'sandbox' && catalogTab === 'strike' && (
                    <>
                      {/* RU Carriers: Airfields & Naval Ship */}
                      <div className="space-y-1.5">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Носители РФ · Авиация и флот
                          </span>
                          <span className="font-mono-tabular text-[10.5px] text-amber-300">
                            КР / КАБ
                          </span>
                        </div>

                        <div className="border border-slate-800/90 rounded bg-[#070B12] divide-y divide-slate-800/80 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => {
                              soundFx.playUiClick('toggle');
                              setAirfieldPresetsExpanded((v) => !v);
                            }}
                            className="w-full min-h-[56px] flex items-center gap-3 px-3 py-2.5 text-left active:bg-[#0D1522] cursor-pointer"
                          >
                            <AirfieldIcon className="w-12 h-8 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-amber-100 truncate">
                                  Аэродромы ВКС РФ
                                </span>
                                <span className="font-mono-tabular text-[11px] font-semibold text-amber-300 whitespace-nowrap shrink-0">
                                  {airfieldPresetsExpanded
                                    ? 'Скрыть'
                                    : `${RUSSIAN_AIRBASE_PRESETS.length} баз`}
                                </span>
                              </div>
                              <div className="mt-0.5 text-[11px] text-slate-400 truncate">
                                Ту-95МС, Ту-160, МиГ-31К, Су-57 · Х-101 / Кинжал
                              </div>
                            </div>
                          </button>

                          {airfieldPresetsExpanded && (
                            <div className="bg-[#06090F] divide-y divide-slate-800/70">
                              {RUSSIAN_AIRBASE_PRESETS.map((preset) => {
                                const isPlaced = airfields.some((a) => a.presetId === preset.id);
                                const aircraft = RUSSIAN_AIRCRAFT_BY_ID[preset.defaultAircraftId];
                                const missile = MUNITION_BY_ID[aircraft.missileId];
                                const rosterNames = preset.availableAircraftIds
                                  .map((id) => RUSSIAN_AIRCRAFT_BY_ID[id].shortName)
                                  .join(' / ');
                                return (
                                  <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => {
                                      onDeployPresetAirbase(preset);
                                      setActiveSheet('none');
                                    }}
                                    className={`w-full min-h-[52px] flex items-center justify-between gap-2 px-3 py-2 text-left cursor-pointer ${
                                      isPlaced ? 'bg-amber-500/12' : 'active:bg-[#0D1522]'
                                    }`}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <Plane
                                          className="h-3.5 w-3.5 shrink-0"
                                          style={{ color: aircraft.accentColor }}
                                        />
                                        <span className="text-xs font-semibold text-slate-100 truncate">
                                          {preset.name}
                                        </span>
                                        <span className="text-[10.5px] text-slate-500 truncate">
                                          {preset.region}
                                        </span>
                                      </div>
                                      <div className="mt-0.5 font-mono-tabular text-[10.5px] text-slate-400 truncate">
                                        {rosterNames} · {aircraft.missileCount}× {missile.shortName}
                                      </div>
                                    </div>
                                    <span
                                      className={`font-mono-tabular text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                                        isPlaced ? 'text-amber-300' : 'text-sky-300'
                                      }`}
                                    >
                                      {isPlaced ? 'Перейти' : 'На карту'}
                                    </span>
                                  </button>
                                );
                              })}

                              <button
                                type="button"
                                onClick={() => {
                                  onStartManualAirfieldPlacement();
                                  setActiveSheet('none');
                                }}
                                className="w-full min-h-[44px] px-3 py-2 text-left text-xs font-semibold text-slate-200 active:bg-[#0D1522] cursor-pointer"
                              >
                                + Разместить произвольный аэродром РФ
                              </button>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              onStartNavalShipPlacement();
                              setActiveSheet('none');
                            }}
                            className={`w-full min-h-[56px] flex items-center gap-3 px-3 py-2.5 text-left cursor-pointer ${
                              pendingShip ? 'bg-sky-500/16' : 'active:bg-[#0D1522]'
                            }`}
                          >
                            <ShipIcon className="w-12 h-8 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-sky-100 truncate">
                                  Корабль ВМФ РФ
                                </span>
                                <span className="font-mono-tabular text-[11px] font-semibold text-amber-300 whitespace-nowrap shrink-0">
                                  {pendingShip ? 'В море…' : '8× Калибр'}
                                </span>
                              </div>
                              <div className="mt-0.5 text-[11px] text-slate-400 truncate">
                                Чёрное и Азовское море · Морской ракетоносец
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* RU Strike */}
                      <div className="space-y-1.5">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            РФ и оккуп. · БПЛА и ракеты
                          </span>
                          <span className="font-mono-tabular text-[10.5px] text-rose-300">
                            Наземные ПУ
                          </span>
                        </div>
                        <div className="border border-slate-800/90 rounded bg-[#070B12] divide-y divide-slate-800/80 overflow-hidden">
                          {MUNITIONS.filter(
                            (m) => m.faction !== 'UA' && !m.airLaunchedOnly && !m.seaLaunchedOnly,
                          ).map((item) => {
                            const isPending =
                              pendingPlacement?.kind === 'strike' &&
                              pendingPlacement.id === item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  onSelectStrikeCatalog(item.id);
                                  setActiveSheet('none');
                                }}
                                className={`w-full min-h-[58px] flex items-center gap-3 px-3 py-2.5 text-left cursor-pointer ${
                                  isPending ? 'bg-amber-500/14' : 'active:bg-[#0D1522]'
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
                                      {isPending ? 'На карту' : `-${item.damage} HP`}
                                    </span>
                                  </div>
                                  <div className="mt-0.5 font-mono-tabular text-[11px] text-slate-400 truncate">
                                    {item.category} · {item.realSpeedKmh} км/ч · Б/К {item.maxAmmo}
                                    {item.maxRangeKm
                                      ? ` · ≤${item.maxRangeKm} км`
                                      : item.kabMaxRangeKm
                                        ? ` · КАБ ≤${item.kabMaxRangeKm} км`
                                        : ''}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* UA Strike + UA Airfields */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-300">
                            ВСУ · Авиация, БПЛА и ракеты
                          </span>
                          <span className="font-mono-tabular text-[10.5px] text-sky-400 whitespace-nowrap">
                            Территория UA
                          </span>
                        </div>

                        <div className="border border-slate-800/90 rounded bg-[#070B12] divide-y divide-slate-800/80 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => {
                              soundFx.playUiClick('toggle');
                              setUaAirfieldPresetsExpanded((v) => !v);
                            }}
                            className="w-full min-h-[56px] flex items-center gap-3 px-3 py-2.5 text-left active:bg-[#0D1522] cursor-pointer"
                          >
                            <AirfieldIcon className="w-12 h-8 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-sky-100 truncate">
                                  Аэродромы ВСУ
                                </span>
                                <span className="font-mono-tabular text-[11px] font-semibold text-sky-300 whitespace-nowrap shrink-0">
                                  {uaAirfieldPresetsExpanded
                                    ? 'Скрыть'
                                    : `${UKRAINIAN_AIRBASE_PRESETS.length} баз`}
                                </span>
                              </div>
                              <div className="mt-0.5 text-[11px] text-slate-400 truncate">
                                Су-24М, F-16AM, МиГ-29 · Storm Shadow / AASM
                              </div>
                            </div>
                          </button>

                          {uaAirfieldPresetsExpanded && (
                            <div className="bg-[#06090F] divide-y divide-slate-800/70">
                              {UKRAINIAN_AIRBASE_PRESETS.map((preset) => {
                                const isPlaced = airfields.some((a) => a.presetId === preset.id);
                                const aircraft = RUSSIAN_AIRCRAFT_BY_ID[preset.defaultAircraftId];
                                const missile = MUNITION_BY_ID[aircraft.missileId];
                                const rosterNames = preset.availableAircraftIds
                                  .map((id) => RUSSIAN_AIRCRAFT_BY_ID[id].shortName)
                                  .join(' / ');
                                return (
                                  <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => {
                                      onDeployPresetAirbase(preset);
                                      setActiveSheet('none');
                                    }}
                                    className={`w-full min-h-[52px] flex items-center justify-between gap-2 px-3 py-2 text-left cursor-pointer ${
                                      isPlaced ? 'bg-sky-500/14' : 'active:bg-[#0D1522]'
                                    }`}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <Plane
                                          className="h-3.5 w-3.5 shrink-0"
                                          style={{ color: aircraft.accentColor }}
                                        />
                                        <span className="text-xs font-semibold text-slate-100 truncate">
                                          {preset.name}
                                        </span>
                                        <span className="text-[10.5px] text-slate-500 truncate">
                                          {preset.region}
                                        </span>
                                      </div>
                                      <div className="mt-0.5 font-mono-tabular text-[10.5px] text-slate-400 truncate">
                                        {rosterNames} · {aircraft.missileCount}× {missile.shortName}
                                      </div>
                                    </div>
                                    <span
                                      className={`font-mono-tabular text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                                        isPlaced ? 'text-sky-300' : 'text-blue-300'
                                      }`}
                                    >
                                      {isPlaced ? 'Перейти' : 'На карту'}
                                    </span>
                                  </button>
                                );
                              })}

                              <button
                                type="button"
                                onClick={() => {
                                  onStartManualUaAirfieldPlacement();
                                  setActiveSheet('none');
                                }}
                                className="w-full min-h-[44px] px-3 py-2 text-left text-xs font-semibold text-slate-200 active:bg-[#0D1522] cursor-pointer"
                              >
                                + Разместить произвольный аэродром ВСУ
                              </button>
                            </div>
                          )}

                          {MUNITIONS.filter((m) => m.faction === 'UA' && !m.airLaunchedOnly).map(
                            (item) => {
                              const isPending =
                                pendingPlacement?.kind === 'strike' &&
                                pendingPlacement.id === item.id;
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    onSelectStrikeCatalog(item.id);
                                    setActiveSheet('none');
                                  }}
                                  className={`w-full min-h-[58px] flex items-center gap-3 px-3 py-2.5 text-left cursor-pointer ${
                                    isPending ? 'bg-sky-500/16' : 'active:bg-[#0D1522]'
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
                                          isPending ? 'text-sky-300' : 'text-rose-300'
                                        }`}
                                      >
                                        {isPending ? 'На карту UA' : `-${item.damage} HP`}
                                      </span>
                                    </div>
                                    <div className="mt-0.5 font-mono-tabular text-[11px] text-slate-400 truncate">
                                      {item.category} · {item.realSpeedKmh} км/ч · Б/К {item.maxAmmo}
                                    </div>
                                  </div>
                                </button>
                              );
                            },
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {catalogTab === 'pvo' && (
                    <div className="space-y-1.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Средства ППО и РЛС
                        </span>
                        <span className="font-mono-tabular text-[10.5px] text-emerald-400">
                          Автоперехват
                        </span>
                      </div>
                      <div className="border border-slate-800/90 rounded bg-[#070B12] divide-y divide-slate-800/80 overflow-hidden">
                        {AIR_DEFENSE_SYSTEMS.map((pvo) => {
                          const isPending =
                            pendingPlacement?.kind === 'pvo' && pendingPlacement.id === pvo.id;
                          const cantAfford = gameMode === 'ai' && money < pvo.cost;
                          return (
                            <button
                              key={pvo.id}
                              type="button"
                              onClick={() => {
                                onSelectPvoCatalog(pvo.id);
                                if (!cantAfford) setActiveSheet('none');
                              }}
                              className={`w-full min-h-[60px] flex items-center gap-3 px-3 py-2.5 text-left cursor-pointer ${
                                isPending
                                  ? 'bg-emerald-500/14'
                                  : cantAfford
                                    ? 'opacity-50'
                                    : 'active:bg-[#0D1522]'
                              }`}
                            >
                              <AirDefenseIcon id={pvo.id} className="w-12 h-8 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-slate-100 truncate">
                                    {pvo.name}
                                  </span>
                                  {isPending ? (
                                    <span className="font-mono-tabular text-[11px] font-semibold text-emerald-300 whitespace-nowrap shrink-0">
                                      На карту
                                    </span>
                                  ) : (
                                    <span
                                      className={`font-mono-tabular text-xs font-bold whitespace-nowrap shrink-0 ${
                                        gameMode === 'ai'
                                          ? cantAfford
                                            ? 'text-red-400'
                                            : 'text-amber-300'
                                          : 'text-slate-300'
                                      }`}
                                    >
                                      {gameMode === 'ai' ? `$${pvo.cost}` : `${pvo.maxHp} HP`}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-0.5 font-mono-tabular text-[11px] text-slate-400 truncate">
                                  {pvo.isRadar
                                    ? `РЛС обзор ${pvo.rangeKm} км · +45% дальности ППО`
                                    : `R ${pvo.rangeKm} км · Б/К ${pvo.maxAmmo} ${
                                        pvo.id === 'mg-pickup'
                                          ? 'патр.'
                                          : pvo.isGun
                                            ? 'очер.'
                                            : 'ракет'
                                      } · ${pvo.cooldownSec}с`}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {catalogTab === 'infra' && (
                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          {gameMode === 'ai'
                            ? 'Защищаемые объекты'
                            : 'Инфраструктура и объекты'}
                        </span>
                        <span className="font-mono-tabular text-[10.5px] text-amber-300">
                          {gameMode === 'ai'
                            ? `+$${aiIncomePerSec}/с`
                            : `${BUILDINGS.length} типов`}
                        </span>
                      </div>

                      <div className="border border-slate-800/90 rounded bg-[#070B12] p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-200">
                            Масштаб объектов на карте
                          </span>
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
                          onChange={(e) => onChangeBuildingScale(Number(e.target.value) / 100)}
                          style={{ '--slider-accent': '#38BDF8' } as CSSProperties}
                          className="tac-slider"
                        />
                        <div className="grid grid-cols-3 border border-slate-800 rounded overflow-hidden divide-x divide-slate-800">
                          {[0.75, 1, 1.5].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => onChangeBuildingScale(preset)}
                              className={`min-h-[36px] text-[11px] font-mono-tabular font-medium cursor-pointer ${
                                Math.abs(buildingScale - preset) < 0.02
                                  ? 'bg-sky-500/20 text-sky-200'
                                  : 'bg-[#0A111C] text-slate-400'
                              }`}
                            >
                              {Math.round(preset * 100)}%
                            </button>
                          ))}
                        </div>
                      </div>

                      {gameMode === 'sandbox' ? (
                        <div className="border border-slate-800/90 rounded bg-[#070B12] divide-y divide-slate-800/80 overflow-hidden">
                          {BUILDINGS.map((bldg) => {
                            const isPending =
                              pendingPlacement?.kind === 'infra' &&
                              pendingPlacement.id === bldg.id;
                            return (
                              <button
                                key={bldg.id}
                                type="button"
                                onClick={() => {
                                  onSelectInfraCatalog(bldg.id);
                                  setActiveSheet('none');
                                }}
                                className={`w-full min-h-[58px] flex items-center gap-3 px-3 py-2.5 text-left cursor-pointer ${
                                  isPending ? 'bg-sky-500/14' : 'active:bg-[#0D1522]'
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
                                      {isPending ? 'На карту' : `${bldg.maxHp} HP`}
                                    </span>
                                  </div>
                                  <div className="mt-0.5 text-[11px] text-slate-400 truncate">
                                    {bldg.category} · {bldg.summary}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="border border-slate-800/90 rounded bg-[#070B12] divide-y divide-slate-800/80 overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-2 text-xs">
                            <span className="text-slate-400">Объектов в строю</span>
                            <strong className="font-mono-tabular text-emerald-300">
                              {buildings.length}/{INITIAL_AI_BUILDINGS.length} (
                              {buildingsIntegrityPct}%)
                            </strong>
                          </div>
                          {buildings.map((b, idx) => {
                            const spec = BUILDING_BY_ID[b.buildingId];
                            return (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => {
                                  onFocusCoords({ lat: b.lat, lng: b.lng });
                                  setActiveSheet('none');
                                }}
                                className="w-full min-h-[48px] flex items-center justify-between gap-2 px-3 py-2 text-left active:bg-[#0D1522] cursor-pointer"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Building2
                                    className="h-4 w-4 shrink-0"
                                    style={{ color: spec.accentColor }}
                                  />
                                  <span className="text-xs font-semibold text-slate-100 truncate">
                                    #{idx + 1} · {spec.name}
                                  </span>
                                </div>
                                <span className="font-mono-tabular text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                                  {Math.ceil(b.hp)}/{b.maxHp} HP · +${spec.incomePerSec}/с
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {catalogTab === 'units' && (
                    <div className="space-y-2.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Развёрнуто на карте
                        </span>
                        <span className="font-mono-tabular text-[11px] font-semibold text-slate-300">
                          {playerUnitsCount} ед.
                        </span>
                      </div>

                      {playerUnitsCount === 0 ? (
                        <p className="border border-slate-800/80 rounded bg-[#070B12] p-3 text-xs text-slate-400">
                          Выберите ППО, объект или пусковую установку и разместите на карте.
                        </p>
                      ) : (
                        <div className="border border-slate-800/90 rounded divide-y divide-slate-800/80 overflow-hidden bg-[#070B12]">
                          {playerAirfields.map((af) => {
                            const acSpec = RUSSIAN_AIRCRAFT_BY_ID[af.selectedAircraftId];
                            return (
                              <div
                                key={af.id}
                                className="flex items-center justify-between gap-2 px-3 py-2"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectAirfield(af.id);
                                    onFocusCoords({ lat: af.lat, lng: af.lng });
                                    setActiveSheet('none');
                                  }}
                                  className="flex flex-1 min-h-[44px] items-center gap-2.5 text-left min-w-0 cursor-pointer"
                                >
                                  <Plane
                                    className="h-4 w-4 shrink-0"
                                    style={{ color: acSpec.accentColor }}
                                  />
                                  <div className="min-w-0">
                                    <div className="text-xs font-semibold text-slate-100 truncate">
                                      {af.name} · {acSpec.shortName}
                                    </div>
                                    <div className="font-mono-tabular text-[11px] text-slate-400 truncate">
                                      {af.faction === 'UA' ? 'ВСУ' : 'РФ'} · {af.salvoCount}×{' '}
                                      {MUNITION_BY_ID[acSpec.missileId].shortName}
                                    </div>
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onRemoveAirfield(af.id)}
                                  aria-label="Удалить аэродром"
                                  className="flex h-10 w-10 items-center justify-center rounded text-slate-400 active:text-red-300 cursor-pointer shrink-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            );
                          })}

                          {playerLaunchers.map((l, idx) => {
                            const spec = MUNITION_BY_ID[l.munitionId];
                            const territory = getTerritoryAt(l.lat, l.lng);
                            const occupied =
                              territory === 'UA' && isPointInOccupiedTerritory(l.lat, l.lng);
                            return (
                              <div
                                key={l.id}
                                className="flex items-center justify-between gap-2 px-3 py-2"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectLauncher(l.id);
                                    onFocusCoords({ lat: l.lat, lng: l.lng });
                                    setActiveSheet('none');
                                  }}
                                  className="flex flex-1 min-h-[44px] items-center gap-2.5 text-left min-w-0 cursor-pointer"
                                >
                                  <Crosshair
                                    className="h-4 w-4 shrink-0"
                                    style={{ color: spec.accentColor }}
                                  />
                                  <div className="min-w-0">
                                    <div className="text-xs font-semibold text-slate-100 truncate">
                                      {l.isNavalShip
                                        ? `Корабль #${idx + 1} · ${spec.shortName}`
                                        : `ПУ #${idx + 1} · ${spec.shortName}`}
                                    </div>
                                    <div className="text-[11px] font-mono-tabular text-slate-400 truncate">
                                      {l.isNavalShip
                                        ? 'Море'
                                        : occupied
                                          ? 'Оккуп.'
                                          : territory === 'UA'
                                            ? 'Украина'
                                            : 'Россия'}{' '}
                                      · {l.ammo}/{l.maxAmmo}
                                    </div>
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onRemoveLauncher(l.id)}
                                  aria-label="Удалить ПУ"
                                  className="flex h-10 w-10 items-center justify-center rounded text-slate-400 active:text-red-300 cursor-pointer shrink-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            );
                          })}

                          {airDefenses.map((p, idx) => {
                            const spec = AIR_DEFENSE_BY_ID[p.airDefenseId];
                            const reloadCost = Math.round(spec.cost * 0.35);
                            const repairCost = Math.round(spec.cost * 0.25);
                            return (
                              <div key={p.id} className="px-3 py-2 space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onFocusCoords({ lat: p.lat, lng: p.lng });
                                      setActiveSheet('none');
                                    }}
                                    className="flex flex-1 min-h-[44px] items-center gap-2.5 text-left min-w-0 cursor-pointer"
                                  >
                                    <Shield
                                      className="h-4 w-4 shrink-0"
                                      style={{ color: spec.accentColor }}
                                    />
                                    <div className="min-w-0">
                                      <div className="text-xs font-semibold text-slate-100 truncate">
                                        ППО #{idx + 1} · {spec.shortName}
                                      </div>
                                      <div className="text-[11px] font-mono-tabular text-slate-400 truncate">
                                        {spec.isRadar
                                          ? `РЛС · ${Math.ceil(p.hp)}/${p.maxHp} HP`
                                          : `${p.ammo}/${p.maxAmmo} · ${Math.ceil(p.hp)}/${p.maxHp} HP`}
                                      </div>
                                    </div>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onRemovePvo(p.id)}
                                    aria-label="Удалить ППО"
                                    className="flex h-10 w-10 items-center justify-center rounded text-slate-400 active:text-red-300 cursor-pointer shrink-0"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                                {((!spec.isRadar && p.ammo < p.maxAmmo) || p.hp < p.maxHp) && (
                                  <div className="flex items-center gap-2">
                                    {!spec.isRadar && p.ammo < p.maxAmmo && (
                                      <button
                                        type="button"
                                        onClick={() => onReloadPvo(p.id)}
                                        className="flex-1 min-h-[40px] flex items-center justify-center gap-1 rounded border border-sky-500/45 bg-sky-500/15 text-xs font-semibold text-sky-200 cursor-pointer"
                                      >
                                        <RefreshCw className="h-3.5 w-3.5" />
                                        <span>Б/К {gameMode === 'ai' ? `$${reloadCost}` : ''}</span>
                                      </button>
                                    )}
                                    {p.hp < p.maxHp && (
                                      <button
                                        type="button"
                                        onClick={() => onRepairPvo(p.id)}
                                        className="flex-1 min-h-[40px] flex items-center justify-center gap-1 rounded border border-emerald-500/45 bg-emerald-500/15 text-xs font-semibold text-emerald-200 cursor-pointer"
                                      >
                                        <Wrench className="h-3.5 w-3.5" />
                                        <span>
                                          Ремонт {gameMode === 'ai' ? `$${repairCost}` : ''}
                                        </span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {buildings.map((b, idx) => {
                            const spec = BUILDING_BY_ID[b.buildingId];
                            return (
                              <div
                                key={b.id}
                                className="flex items-center justify-between gap-2 px-3 py-2"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    onFocusCoords({ lat: b.lat, lng: b.lng });
                                    setActiveSheet('none');
                                  }}
                                  className="flex flex-1 min-h-[44px] items-center gap-2.5 text-left min-w-0 cursor-pointer"
                                >
                                  <Building2
                                    className="h-4 w-4 shrink-0"
                                    style={{ color: spec.accentColor }}
                                  />
                                  <div className="min-w-0">
                                    <div className="text-xs font-semibold text-slate-100 truncate">
                                      #{idx + 1} · {spec.name}
                                    </div>
                                    <div className="text-[11px] font-mono-tabular text-slate-400 truncate">
                                      {Math.ceil(b.hp)}/{b.maxHp} HP
                                      {gameMode === 'ai' ? ` · +$${spec.incomePerSec}/с` : ''}
                                    </div>
                                  </div>
                                </button>
                                {gameMode !== 'ai' && (
                                  <button
                                    type="button"
                                    onClick={() => onRemoveBuilding(b.id)}
                                    aria-label="Удалить объект"
                                    className="flex h-10 w-10 items-center justify-center rounded text-slate-400 active:text-red-300 cursor-pointer shrink-0"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {catalogTab === 'settings' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#080D16] p-3">
                        <div>
                          <div className="text-xs font-semibold text-slate-100">
                            Сирена воздушной тревоги
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Автозапуск при входе целей в районы
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={onToggleSiren}
                          className={`min-h-[40px] min-w-[64px] rounded-xl border px-3 text-xs font-bold cursor-pointer ${
                            sirenEnabled
                              ? 'border-emerald-400 bg-emerald-500/25 text-emerald-100'
                              : 'border-slate-700 bg-slate-800 text-slate-300'
                          }`}
                        >
                          {sirenEnabled ? 'ВКЛ' : 'ВЫКЛ'}
                        </button>
                      </div>

                      <div className="rounded-xl border border-slate-800 bg-[#080D16] p-3 space-y-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-300">Громкость сирены</span>
                            <span className="font-mono-tabular text-amber-300">
                              {Math.round(sirenVolume * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={Math.round(sirenVolume * 100)}
                            onChange={(e) => onChangeSirenVolume(Number(e.target.value) / 100)}
                            style={{ '--slider-accent': '#F59E0B' } as CSSProperties}
                            className="tac-slider"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-300">Звук БПЛА (Шахеды)</span>
                            <span className="font-mono-tabular text-amber-300">
                              {Math.round(droneVolume * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={Math.round(droneVolume * 100)}
                            onChange={(e) => onChangeDroneVolume(Number(e.target.value) / 100)}
                            style={{ '--slider-accent': '#F59E0B' } as CSSProperties}
                            className="tac-slider"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-300">Ракеты и перехваты</span>
                            <span className="font-mono-tabular text-sky-300">
                              {Math.round(missileVolume * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={Math.round(missileVolume * 100)}
                            onChange={(e) => onChangeMissileVolume(Number(e.target.value) / 100)}
                            style={{ '--slider-accent': '#38BDF8' } as CSSProperties}
                            className="tac-slider"
                          />
                        </div>

                        <div className="space-y-1 pt-1 border-t border-slate-800">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-300">Задержка отбоя тревоги</span>
                            <span className="font-mono-tabular text-amber-300">
                              {alertHoldoverSec} с
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={60}
                            step={1}
                            value={alertHoldoverSec}
                            onChange={(e) => onChangeAlertHoldoverSec(Number(e.target.value))}
                            style={{ '--slider-accent': '#F59E0B' } as CSSProperties}
                            className="tac-slider"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-300">Радиус включения тревоги</span>
                            <span className="font-mono-tabular text-sky-300">
                              {alertRadiusKm} км
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={200}
                            step={5}
                            value={alertRadiusKm}
                            onChange={(e) => onChangeAlertRadiusKm(Number(e.target.value))}
                            style={{ '--slider-accent': '#38BDF8' } as CSSProperties}
                            className="tac-slider"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {activeSheet === 'telegram' && (
              <div className="flex flex-1 min-h-0 flex-col bg-[#0E1621]">
                {selectedTelegramOblast && activeTelegramChannel ? (
                  <>
                    <div className="flex items-center justify-between gap-2 border-b border-[#1E2C3A] bg-[#17212B] px-3 py-2 shrink-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={() => {
                            soundFx.playUiClick('back');
                            onSelectTelegramOblast(null);
                          }}
                          aria-label="Назад к каналам"
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#232E3C] text-slate-100 shrink-0 cursor-pointer"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </button>
                        <img
                          src={activeTelegramChannel.avatarUrl}
                          alt={activeTelegramChannel.title}
                          className="h-9 w-9 rounded-full object-cover border border-slate-600 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-white">
                            {activeTelegramChannel.title}
                          </div>
                          <div className="truncate text-[10.5px] text-slate-400">
                            {activeTelegramChannel.subscribersLabel} · {activeTelegramChannel.handle}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {activeTelegramMessages.length > 0 && (
                          <button
                            type="button"
                            onClick={() => onClearChannelPosts(selectedTelegramOblast)}
                            className="min-h-[38px] rounded-lg px-2.5 text-[11px] font-medium text-slate-300 active:bg-[#232E3C] cursor-pointer"
                          >
                            Очистить
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openSheet('none')}
                          aria-label="Закрыть Telegram"
                          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div
                      className="tac-scroll flex-1 overflow-y-auto p-3 space-y-2.5"
                      style={{
                        backgroundColor: '#0E1621',
                        backgroundImage:
                          'radial-gradient(rgba(56, 163, 232, 0.06) 1px, transparent 1px)',
                        backgroundSize: '18px 18px',
                      }}
                    >
                      {activeTelegramMessages.length === 0 ? (
                        <div className="mx-auto mt-6 max-w-[260px] rounded-xl bg-[#182533] px-4 py-3 text-center text-xs text-slate-300">
                          Сообщений пока нет. Когда БПЛА или ракета войдут в область, канал сразу
                          опубликует курс.
                        </div>
                      ) : (
                        activeTelegramMessages.map((post) => (
                          <div key={post.id} className="flex items-end gap-2">
                            <img
                              src={activeTelegramChannel.avatarUrl}
                              alt=""
                              className="h-6 w-6 rounded-full object-cover shrink-0 mb-0.5"
                            />
                            <div className="flex-1 min-w-0 rounded-xl rounded-bl-xs bg-[#182533] border border-[#223244] px-3 py-2 space-y-1">
                              <div className="text-[11px] font-semibold text-[#64B5F6] truncate">
                                {activeTelegramChannel.title}
                              </div>
                              <div className="text-xs text-slate-100 leading-snug whitespace-pre-line">
                                {post.text}
                              </div>
                              <div className="flex items-center justify-between gap-2 pt-0.5 text-[10.5px] text-slate-400">
                                {post.eventKind === 'alert_off' ? (
                                  <span className="truncate font-semibold text-emerald-300">
                                    Отбой тревоги
                                  </span>
                                ) : post.eventKind === 'alert_on' ||
                                  post.eventKind === 'alert_upgrade' ? (
                                  <span
                                    className={`truncate font-semibold ${
                                      post.alertSubtype === 'drone'
                                        ? 'text-amber-300'
                                        : 'text-rose-300'
                                    }`}
                                  >
                                    {post.alertSubtype === 'ballistic'
                                      ? 'Тревога: Баллистика'
                                      : post.alertSubtype === 'aircraft'
                                        ? 'Тревога: Ракетоноситель'
                                        : post.alertSubtype === 'missile'
                                          ? 'Тревога: Ракетная'
                                          : 'Тревога: БПЛА'}
                                  </span>
                                ) : post.eventKind === 'intercepted' ? (
                                  <span className="truncate font-semibold text-emerald-300">
                                    {activeTelegramChannel.country === 'RU' ? 'Сбито ПВО' : 'Сбито ППО'}:{' '}
                                    {post.nearCity ?? post.raionName ?? post.oblast}
                                  </span>
                                ) : post.eventKind === 'dorozvedka' ? (
                                  <span className="truncate font-semibold text-sky-300">
                                    Дорозведка: {formatOblastShortLabel(post.oblast)}
                                  </span>
                                ) : post.eventKind === 'explosion' ? (
                                  <span className="truncate font-semibold text-orange-300">
                                    Взрыв: {post.nearCity ?? post.raionName ?? post.oblast}
                                  </span>
                                ) : post.targetCity ? (
                                  <span className="truncate font-semibold text-rose-300">
                                    На цель: {post.targetCity}
                                  </span>
                                ) : post.transitOblast ? (
                                  <span className="truncate text-sky-300">
                                    Транзит → {formatOblastShortLabel(post.transitOblast)}
                                  </span>
                                ) : (
                                  <span className="truncate text-slate-300">
                                    Курс:{' '}
                                    {post.bearingDeg !== undefined
                                      ? `на ${computeCompassDirectionRu(post.bearingDeg)}`
                                      : post.raionName ?? 'в области'}
                                  </span>
                                )}
                                <span className="font-mono-tabular text-slate-300 shrink-0">
                                  {formatSimTimeShort(post.simTimeMinutes)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="border-b border-[#1E2C3A] bg-[#17212B] px-3.5 py-2.5 space-y-2 shrink-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-white">Telegram · Каналы ПВО</span>
                        <div className="flex items-center gap-1.5">
                          {totalTelegramUnread > 0 && (
                            <button
                              type="button"
                              onClick={onMarkAllTelegramRead}
                              className="min-h-[36px] rounded-lg px-2.5 text-xs font-medium text-[#64B5F6] cursor-pointer"
                            >
                              Прочитать все
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openSheet('none')}
                            aria-label="Закрыть Telegram"
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 rounded-xl bg-[#0E1621] p-1 border border-[#242F3D]">
                        <button
                          type="button"
                          onClick={() => {
                            soundFx.playUiClick('tab');
                            onChangeTelegramCountryFilter('UA');
                          }}
                          className={`min-h-[38px] flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            telegramCountryFilter === 'UA'
                              ? 'bg-[#24A1DE] text-slate-950'
                              : 'text-slate-300'
                          }`}
                        >
                          <span>Украина</span>
                          {telegramUnreadUa > 0 && (
                            <span
                              className={`rounded px-1.5 font-mono-tabular text-[10px] font-bold ${
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
                            onChangeTelegramCountryFilter('RU');
                          }}
                          className={`min-h-[38px] flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            telegramCountryFilter === 'RU'
                              ? 'bg-[#24A1DE] text-slate-950'
                              : 'text-slate-300'
                          }`}
                        >
                          <span>Россия</span>
                          {telegramUnreadRu > 0 && (
                            <span
                              className={`rounded px-1.5 font-mono-tabular text-[10px] font-bold ${
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
                        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          value={telegramSearch}
                          onChange={(e) => onChangeTelegramSearch(e.target.value)}
                          placeholder={
                            telegramCountryFilter === 'RU'
                              ? 'Поиск каналов РФ...'
                              : 'Поиск каналов Украины...'
                          }
                          className="w-full min-h-[40px] rounded-xl bg-[#242F3D] pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#24A1DE]"
                        />
                      </div>
                    </div>

                    <div className="tac-scroll flex-1 overflow-y-auto bg-[#17212B] divide-y divide-[#1E2C3A]/80">
                      {filteredChannels.map((ch) => {
                        const unread = telegramUnreadByOblast[ch.oblast] ?? 0;
                        const lastPost = findLastPost(telegramPosts, ch.oblast);
                        return (
                          <button
                            key={ch.oblast}
                            type="button"
                            onClick={() => {
                              soundFx.playUiClick('tap');
                              onOpenTelegramChannel(ch.oblast);
                            }}
                            className="flex w-full min-h-[58px] items-center gap-3 px-3.5 py-2 text-left active:bg-[#202B36] cursor-pointer"
                          >
                            <img
                              src={ch.avatarUrl}
                              alt={ch.title}
                              className="h-10 w-10 rounded-full object-cover border border-slate-600/50 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate text-xs font-semibold text-white">
                                  {ch.title}
                                </span>
                                {lastPost && (
                                  <span className="font-mono-tabular text-[10.5px] text-slate-400 shrink-0">
                                    {formatSimTimeShort(lastPost.simTimeMinutes)}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between gap-2 mt-0.5">
                                <span className="truncate text-[11px] text-slate-300">
                                  {lastPost ? lastPost.text : `${ch.oblast} · тихо`}
                                </span>
                                {unread > 0 && (
                                  <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-[#2AABEE] px-1.5 font-mono-tabular text-[10px] font-bold text-slate-950 shrink-0">
                                    {unread}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeSheet === 'stats' && (
              <>
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 bg-[#070B12] px-4 py-2 shrink-0">
                  <div>
                    <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
                      {gameMode === 'ai' ? 'Оперативный учёт ППО' : 'Учёт симуляции'}
                    </div>
                    <h2 className="text-sm font-bold text-slate-100">Сводка и журнал</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => openSheet('none')}
                    aria-label="Закрыть сводку"
                    className="flex h-10 w-10 items-center justify-center rounded border border-slate-800 bg-[#0E1726] text-slate-300 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 border-b border-slate-800 bg-[#070B12] divide-x divide-slate-800/80 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playUiClick('tab');
                      setStatsTab('stats');
                    }}
                    className={`min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer ${
                      statsTab === 'stats'
                        ? 'bg-[#101A2B] text-white border-b-2 border-sky-400'
                        : 'text-slate-400'
                    }`}
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span>Сводка</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playUiClick('tab');
                      setStatsTab('log');
                    }}
                    className={`min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer ${
                      statsTab === 'log'
                        ? 'bg-[#101A2B] text-white border-b-2 border-sky-400'
                        : 'text-slate-400'
                    }`}
                  >
                    <ScrollText className="h-4 w-4" />
                    <span>Журнал ({visibleJournalEntries.length})</span>
                  </button>
                </div>

                {statsTab === 'stats' ? (
                  <div className="tac-scroll flex-1 overflow-y-auto p-3.5 space-y-3">
                    <div className="border border-slate-800/90 rounded bg-[#070B12] p-3 space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                          Эффективность ППО
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
                        <span>
                          Перехвачено:{' '}
                          <strong className="text-emerald-300">{stats.intercepts}</strong>
                        </span>
                        <span>
                          Промахи: <strong className="text-amber-300">{stats.misses}</strong>
                        </span>
                      </div>
                    </div>

                    {gameMode === 'ai' ? (
                      <div className="grid grid-cols-2 border border-slate-800/90 rounded bg-[#070B12] divide-x divide-y divide-slate-800/80 overflow-hidden">
                        <div className="p-3">
                          <div className="text-[11px] text-slate-400">Волна обороны</div>
                          <div className="font-mono-tabular text-lg font-bold text-sky-300">
                            #{aiWaveNumber}
                          </div>
                        </div>
                        <div className="p-3">
                          <div className="text-[11px] text-slate-400">Сбито в воздухе</div>
                          <div className="font-mono-tabular text-lg font-bold text-emerald-300">
                            {stats.intercepts}
                          </div>
                        </div>
                        <div className="p-3">
                          <div className="text-[11px] text-slate-400">Пропущено ударов</div>
                          <div className="font-mono-tabular text-lg font-bold text-rose-300">
                            {stats.explosions}
                          </div>
                        </div>
                        <div className="p-3">
                          <div className="text-[11px] text-slate-400">Живучесть</div>
                          <div className="font-mono-tabular text-lg font-bold text-amber-300">
                            {buildingsIntegrityPct}%
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 border border-slate-800/90 rounded bg-[#070B12] divide-x divide-y divide-slate-800/80 overflow-hidden">
                        <div className="p-3">
                          <div className="text-[11px] text-slate-400">Всего запусков</div>
                          <div className="font-mono-tabular text-lg font-bold text-slate-100">
                            {stats.totalLaunches}
                          </div>
                        </div>
                        <div className="p-3">
                          <div className="text-[11px] text-slate-400">Сбито в воздухе</div>
                          <div className="font-mono-tabular text-lg font-bold text-emerald-300">
                            {stats.intercepts}
                          </div>
                        </div>
                        <div className="p-3">
                          <div className="text-[11px] text-slate-400">Прилётов / Взрывов</div>
                          <div className="font-mono-tabular text-lg font-bold text-rose-300">
                            {stats.explosions}
                          </div>
                        </div>
                        <div className="p-3">
                          <div className="text-[11px] text-slate-400">Поражено ПУ и ППО</div>
                          <div className="font-mono-tabular text-lg font-bold text-sky-300">
                            {stats.destroyedByStrikes}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="border border-slate-800/90 rounded bg-[#070B12] divide-y divide-slate-800/80">
                      <div className="flex items-center justify-between px-3 py-2 text-xs">
                        <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                          <Radar className="h-3.5 w-3.5 text-sky-400" />
                          <span>Обстановка на радарах</span>
                        </span>
                        <strong className="font-mono-tabular text-sky-300">
                          {stats.activeFlights}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between px-3 py-1.5 text-xs">
                        <span className="text-slate-400">БПЛА</span>
                        <span className="font-mono-tabular text-amber-300">
                          {stats.activeDrones}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-3 py-1.5 text-xs">
                        <span className="text-slate-400">Ракеты и КАБ</span>
                        <span className="font-mono-tabular text-rose-300">
                          {stats.activeMissiles}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-3 py-1.5 text-xs">
                        <span className="text-slate-400">Авиация</span>
                        <span className="font-mono-tabular text-slate-200">
                          {stats.activeAircraft}
                        </span>
                      </div>
                    </div>

                    <div className="border border-slate-800/90 rounded bg-[#070B12] divide-y divide-slate-800/80">
                      <div className="flex justify-between px-3 py-2 text-xs">
                        <span className="text-slate-400">Объекты в строю</span>
                        <strong className="font-mono-tabular text-emerald-300">
                          {gameMode === 'ai'
                            ? `${buildings.length}/${INITIAL_AI_BUILDINGS.length} (${buildingsIntegrityPct}%)`
                            : `${buildings.length} (${buildingsIntegrityPct}%)`}
                        </strong>
                      </div>
                      <div className="flex justify-between px-3 py-2 text-xs">
                        <span className="text-slate-400">Средства ППО и РЛС</span>
                        <strong className="font-mono-tabular text-emerald-300">
                          {airDefenses.length}
                          {(damagedPvosCount > 0 || lowAmmoPvosCount > 0) && (
                            <span className="text-amber-300">
                              {' '}
                              ({damagedPvosCount > 0 ? `${damagedPvosCount} повр.` : ''}
                              {damagedPvosCount > 0 && lowAmmoPvosCount > 0 ? ' · ' : ''}
                              {lowAmmoPvosCount > 0 ? `${lowAmmoPvosCount} б/к` : ''})
                            </span>
                          )}
                        </strong>
                      </div>
                      {gameMode === 'ai' && (
                        <div className="flex justify-between px-3 py-2 text-xs">
                          <span className="text-slate-400">Доход от объектов</span>
                          <strong className="font-mono-tabular text-amber-300">
                            +${aiIncomePerSec}/с
                          </strong>
                        </div>
                      )}
                      <div className="flex justify-between px-3 py-2 text-xs">
                        <span className="text-slate-400">Тревога (БПЛА / Ракеты)</span>
                        <strong className="font-mono-tabular">
                          <span className="text-yellow-300">{stats.droneAlertRaions}</span>
                          {' / '}
                          <span className="text-red-400">{stats.missileAlertRaions}</span>
                        </strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between gap-1.5 px-3 py-2 border-b border-slate-800 bg-[#070B12] shrink-0">
                      <div className="flex items-center gap-1 min-w-0 overflow-x-auto">
                        {(
                          [
                            { id: 'all', label: 'Все' },
                            { id: 'intercept', label: 'Сбития' },
                            { id: 'impact', label: 'Прилёты' },
                            { id: 'miss', label: 'Промахи' },
                            ...(gameMode === 'sandbox'
                              ? [{ id: 'launch' as const, label: 'Пуски' }]
                              : []),
                          ] as Array<{
                            id: 'all' | 'intercept' | 'impact' | 'miss' | 'launch';
                            label: string;
                          }>
                        ).map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => {
                              soundFx.playUiClick('tab');
                              setJournalFilter(f.id);
                            }}
                            className={`min-h-[34px] px-2.5 text-[11px] font-medium rounded-xs whitespace-nowrap cursor-pointer transition-colors ${
                              journalFilter === f.id
                                ? 'bg-sky-500/20 text-sky-200 border border-sky-500/45'
                                : 'text-slate-400 border border-transparent'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                      {eventLog.length > 0 && (
                        <button
                          type="button"
                          onClick={onClearEventLog}
                          className="min-h-[34px] rounded-xs border border-slate-800 bg-[#0E1726] px-2.5 text-[11px] font-medium text-slate-300 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Очистить
                        </button>
                      )}
                    </div>

                    <div className="tac-scroll flex-1 overflow-y-auto divide-y divide-slate-800/80">
                      {visibleJournalEntries.length === 0 ? (
                        <p className="p-4 text-xs text-slate-400 leading-relaxed">
                          Дежурный журнал чист — перехваты ППО, промахи и зафиксированные удары
                          появятся здесь в реальном времени.
                        </p>
                      ) : (
                        visibleJournalEntries.map((ev) => {
                          const spec = MUNITION_BY_ID[ev.munitionId];
                          const meta =
                            ev.kind === 'intercept'
                              ? {
                                  tag: 'СБИТО',
                                  tagClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
                                }
                              : ev.kind === 'miss'
                                ? {
                                    tag: 'ПРОМАХ',
                                    tagClass: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
                                  }
                                : ev.kind === 'impact'
                                  ? {
                                      tag: 'ПРИЛЁТ',
                                      tagClass: 'bg-rose-500/15 text-rose-300 border-rose-500/35',
                                    }
                                  : {
                                      tag: 'ПУСК',
                                      tagClass: 'bg-sky-500/15 text-sky-300 border-sky-500/35',
                                    };
                          return (
                            <div key={ev.id} className="flex items-start gap-2.5 px-3.5 py-2.5">
                              <span className="font-mono-tabular text-[11px] font-semibold text-slate-400 pt-0.5 shrink-0">
                                {formatSimTimeShort(ev.simTimeMinutes)}
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
                        })
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* 6. Fixed Bottom Tab Bar (56px, thumb-zone anchor) */}
      <nav
        aria-label="Мобильная навигация"
        className="fixed bottom-0 left-0 right-0 z-30 grid h-14 grid-cols-4 border-t border-slate-800 bg-[#0A111C]/96 backdrop-blur-md"
      >
        <button
          type="button"
          onClick={() => openSheet('none')}
          className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] cursor-pointer ${
            activeSheet === 'none' ? 'text-sky-300' : 'text-slate-400'
          }`}
        >
          <div className="relative">
            <MapIcon className="h-5 w-5" />
            {totalAlerts > 0 && (
              <span className="absolute -top-1 -right-2.5 font-mono-tabular text-[9px] font-bold text-amber-300">
                {totalAlerts}
              </span>
            )}
          </div>
          <span className="text-[10.5px] font-medium">Карта</span>
        </button>

        <button
          type="button"
          onClick={() => openSheet('catalog')}
          className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] cursor-pointer ${
            activeSheet === 'catalog' ? 'text-sky-300' : 'text-slate-400'
          }`}
        >
          <SlidersHorizontal className="h-5 w-5" />
          <span className="text-[10.5px] font-medium">Техника</span>
        </button>

        <button
          type="button"
          onClick={() => openSheet('telegram')}
          className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] cursor-pointer ${
            activeSheet === 'telegram' ? 'text-sky-300' : 'text-slate-400'
          }`}
        >
          <div className="relative">
            <BellRing className="h-5 w-5" />
            {totalTelegramUnread > 0 && (
              <span className="absolute -top-1 -right-3 flex h-4 min-w-4 items-center justify-center rounded bg-[#2AABEE] px-1 font-mono-tabular text-[9px] font-bold text-slate-950">
                {totalTelegramUnread > 99 ? '99+' : totalTelegramUnread}
              </span>
            )}
          </div>
          <span className="text-[10.5px] font-medium">Telegram</span>
        </button>

        <button
          type="button"
          onClick={() => openSheet('stats')}
          className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] cursor-pointer ${
            activeSheet === 'stats' ? 'text-sky-300' : 'text-slate-400'
          }`}
        >
          <BarChart3 className="h-5 w-5" />
          <span className="text-[10.5px] font-medium">Сводка</span>
        </button>
      </nav>

      {/* 7. Mobile Airfield Aircraft & Salvo Selector Sheet */}
      {selectedAirfield &&
        selectedAircraftSpec &&
        selectedAircraftMissileSpec &&
        airfieldModalStep !== null && (
          <div
            onClick={onCancelAirfieldSelection}
            className="fixed inset-0 z-40 flex items-end bg-slate-950/70 backdrop-blur-xs"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-h-[82vh] flex flex-col rounded-t-2xl border-t border-slate-700 bg-[#0A111C] overflow-hidden"
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-4 py-3 bg-[#080D16]">
                <div className="min-w-0">
                  <div
                    className={`text-[11px] font-mono-tabular truncate ${
                      selectedAirfield.faction === 'UA' ? 'text-sky-300' : 'text-amber-300'
                    }`}
                  >
                    {selectedAirfield.faction === 'UA' ? 'Аэродром ВСУ' : 'Аэродром'} «{selectedAirfield.name}»
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 truncate">
                    {airfieldModalStep === 'aircraft'
                      ? `Самолёты базы (${airfieldAircraftOptions.length})`
                      : `${selectedAircraftSpec.name} — Сколько ${selectedAircraftSpec.missileId === 'aasm-hammer' ? 'бомб' : 'ракет'}?`}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {airfieldModalStep === 'missiles' && (
                    <button
                      type="button"
                      onClick={() => onSetAirfieldModalStep('aircraft')}
                      className="min-h-[38px] rounded border border-slate-700 bg-[#0E1726] px-3 text-xs font-medium text-slate-200 cursor-pointer"
                    >
                      ← Борта
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onCancelAirfieldSelection}
                    aria-label="Закрыть меню аэродрома"
                    className="flex h-10 w-10 items-center justify-center rounded border border-slate-700 bg-[#0E1726] text-slate-300 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {airfieldModalStep === 'aircraft' ? (
                <div className="tac-scroll flex-1 overflow-y-auto divide-y divide-slate-800">
                  {airfieldAircraftOptions.map((ac) => {
                    const mSpec = MUNITION_BY_ID[ac.missileId];
                    const isCurrent = selectedAirfield.selectedAircraftId === ac.id;
                    const isUa = selectedAirfield.faction === 'UA';
                    return (
                      <button
                        key={ac.id}
                        type="button"
                        onClick={() => onChangeAirfieldAircraft(selectedAirfield.id, ac.id)}
                        className={`w-full min-h-[64px] flex items-center gap-3 px-3.5 py-2.5 text-left cursor-pointer ${
                          isCurrent
                            ? isUa
                              ? 'bg-sky-500/16'
                              : 'bg-amber-500/14'
                            : 'bg-[#070B12]'
                        }`}
                      >
                        <RussianAircraftIcon id={ac.id} className="w-14 h-9 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-slate-100 truncate">
                              {ac.name}
                            </span>
                            <span
                              className={`font-mono-tabular text-xs font-semibold shrink-0 ${
                                isUa ? 'text-sky-300' : 'text-amber-300'
                              }`}
                            >
                              до {ac.missileCount}× {mSpec.shortName}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {ac.role} · -{mSpec.damage} HP
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    {Array.from(
                      { length: selectedAircraftSpec.missileCount },
                      (_, idx) => idx + 1,
                    ).map((count) => {
                      const isBomb = selectedAircraftMissileSpec.id === 'aasm-hammer';
                      const missileWord = isBomb
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
                            onChangeAirfieldSalvo(selectedAirfield.id, count);
                            onSetAirfieldModalStep(null);
                          }}
                          className={`min-h-[56px] flex flex-col items-start justify-center rounded-xl border px-3.5 py-2 text-left cursor-pointer ${
                            isSelectedCount
                              ? isUa
                                ? 'border-sky-400 bg-sky-500/20 text-white'
                                : 'border-amber-400 bg-amber-500/20 text-white'
                              : 'border-slate-800 bg-[#080D16] text-slate-200'
                          }`}
                        >
                          <span
                            className={`text-sm font-bold font-mono-tabular ${
                              isUa ? 'text-sky-300' : 'text-amber-300'
                            }`}
                          >
                            {count} {missileWord}
                          </span>
                          <span className="text-[11px] text-rose-300 font-mono-tabular">
                            -{totalDmg} HP
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      {/* 8. Mobile Game Over Modal */}
      {gameScreen === 'gameover' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-red-500/50 bg-[#0A111C] overflow-hidden">
            <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3.5 bg-[#080D16]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/45 bg-red-500/15 text-red-300 shrink-0">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-red-400">
                  Оборона прорвана
                </div>
                <h2 className="font-display text-xl font-bold text-white">
                  Все объекты уничтожены
                </h2>
              </div>
            </div>
            <div className="p-4 space-y-3.5">
              <div className="grid grid-cols-2 rounded-xl border border-slate-800 bg-[#080D16] divide-x divide-y divide-slate-800 text-center">
                <div className="p-2.5">
                  <div className="text-[11px] text-slate-400">Волны</div>
                  <div className="font-mono-tabular text-lg font-bold text-sky-300">
                    {aiWaveNumber}
                  </div>
                </div>
                <div className="p-2.5">
                  <div className="text-[11px] text-slate-400">Сбито</div>
                  <div className="font-mono-tabular text-lg font-bold text-emerald-300">
                    {stats.intercepts}
                  </div>
                </div>
                <div className="p-2.5">
                  <div className="text-[11px] text-slate-400">Точность</div>
                  <div className="font-mono-tabular text-lg font-bold text-slate-100">
                    {interceptAccuracyPct}%
                  </div>
                </div>
                <div className="p-2.5">
                  <div className="text-[11px] text-slate-400">Выживание</div>
                  <div className="font-mono-tabular text-lg font-bold text-amber-300">
                    {Math.floor(aiSurvivedSec)}с
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={onStartAiAgain}
                  className="min-h-[48px] flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Заново</span>
                </button>
                <button
                  type="button"
                  onClick={onReturnToMenu}
                  className="min-h-[48px] rounded-xl border border-slate-700 bg-[#0E1726] text-slate-200 font-semibold text-sm cursor-pointer"
                >
                  В меню
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
