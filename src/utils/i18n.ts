import {
  AIR_DEFENSE_BY_ID,
  BUILDING_BY_ID,
  MUNITION_BY_ID,
  type AirDefenseId,
  type BuildingId,
  type MunitionId,
} from '../data/munitions';
import { RUSSIAN_AIRCRAFT_BY_ID, type RussianAircraftId } from '../data/airfields';

export type AppLang = 'ru' | 'uk' | 'en';

export const APP_LANG_STORAGE_KEY = 'airdef_lang_v1';

export const APP_LANG_OPTIONS: Array<{ id: AppLang; short: string; label: string }> = [
  { id: 'ru', short: 'RU', label: 'Русский' },
  { id: 'uk', short: 'UK', label: 'Українська' },
  { id: 'en', short: 'EN', label: 'English' },
];

export function loadAppLang(): AppLang {
  if (typeof window === 'undefined') return 'ru';
  try {
    const raw = window.localStorage.getItem(APP_LANG_STORAGE_KEY);
    if (raw === 'ru' || raw === 'uk' || raw === 'en') return raw;
  } catch {
    // ignore storage errors
  }
  return 'ru';
}

export function saveAppLang(lang: AppLang): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(APP_LANG_STORAGE_KEY, lang);
  } catch {
    // ignore storage errors
  }
}

const SIM_BASE_UTC_MS = Date.UTC(2026, 10, 23, 8, 0, 0);

const MONTHS_BY_LANG: Record<AppLang, string[]> = {
  ru: ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  uk: ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

export function formatSimClock(simTimeMinutes: number, lang: AppLang = 'ru'): string {
  const totalMins = Math.max(0, Math.floor(simTimeMinutes));
  const d = new Date(SIM_BASE_UTC_MS + totalMins * 60_000);
  const dayNum = Math.floor(totalMins / (24 * 60)) + 1;
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mon = MONTHS_BY_LANG[lang][d.getUTCMonth()];
  const yyyy = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const dayAbbr = lang === 'en' ? 'D.' : 'Д.';
  return `${dd} ${mon} ${yyyy} · ${hh}:${mm} (${dayAbbr}${dayNum})`;
}

export function formatSimTimeShort(simTimeMinutes: number): string {
  const totalMins = Math.max(0, Math.floor(simTimeMinutes));
  const d = new Date(SIM_BASE_UTC_MS + totalMins * 60_000);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function formatSimDateShort(simTimeMinutes: number, lang: AppLang = 'ru'): string {
  const totalMins = Math.max(0, Math.floor(simTimeMinutes));
  const d = new Date(SIM_BASE_UTC_MS + totalMins * 60_000);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mon = MONTHS_BY_LANG[lang][d.getUTCMonth()];
  const dayNum = Math.floor(totalMins / (24 * 60)) + 1;
  const dayAbbr = lang === 'en' ? 'D.' : 'Д.';
  return `${dd} ${mon} (${dayAbbr}${dayNum})`;
}

export function formatSavedAtLabel(ts: number, lang: AppLang = 'ru'): string {
  try {
    const locale = lang === 'uk' ? 'uk-UA' : lang === 'en' ? 'en-US' : 'ru-RU';
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts));
  } catch {
    return '';
  }
}

export interface UiText {
  appName: string;
  tagline: string;
  playBtn: string;
  featurePvo: string;
  featureAir: string;
  featureManual: string;
  back: string;
  chooseMode: string;
  chooseModeSub: string;
  sandboxTitle: string;
  sandboxOpenMap: string;
  sandboxDesc: string;
  sandboxTag1: string;
  sandboxTag2: string;
  sandboxSavedPrefix: string;
  sandboxSavedDesc: string;
  sandboxResumeBtn: string;
  sandboxNewMapBtn: string;
  deleteBtn: string;
  aiTitle: string;
  aiStartBtn: string;
  aiDesc: (playerCount: number, enemyCount: number) => string;
  aiStartBudget: (money: number) => string;
  aiIncomeTag: string;
  launchersShort: string;
  pvoShort: string;
  objectsShort: string;
  enemyObjectsShort: string;
  airfieldsShort: string;
  targetsShort: string;
  interceptedShort: string;
  explosionsShort: string;
  menuBtn: string;
  headerTitleAi: string;
  headerTitleSandbox: string;
  objectsWord: string;
  waveWord: string;
  waveAbbr: string;
  frontBtn: string;
  frontTitle: string;
  regionsBtn: string;
  regionsTitle: string;
  labelsBtn: string;
  alertBtn: string;
  alertTitle: string;
  soundBtn: string;
  mutedBtn: string;
  saveBtn: string;
  saveTitle: string;
  restartBtn: string;
  clearBtn: string;
  restartTitle: string;
  clearTitle: string;
  phoneBtn: string;
  phoneTitle: string;
  statsBtn: string;
  statsTitle: string;
  tabAll: string;
  tabStrike: string;
  tabPvo: string;
  tabInfra: string;
  tabObjects: string;
  tabMap: string;
  tabAlert: string;
  tabTech: string;
  tabSummary: string;
  sirensAndAlerts: string;
  statusMissile: string;
  statusDrone: string;
  statusQuiet: string;
  yellowAlert: string;
  redAlert: string;
  raionUnit: string;
  airRaidSiren: string;
  airRaidSirenSub: string;
  autoOnInRaions: string;
  sirenVolume: string;
  targetAndPvoVolume: string;
  droneVolume: string;
  missileAndInterceptVolume: string;
  missileVolumeShort: string;
  alertHoldover: string;
  alertHoldoverDesc: string;
  alertRadius: string;
  alertRadiusDesc: string;
  languageLabel: string;
  onWord: string;
  offWord: string;
  secShort: string;
  kmShort: string;
  kmhShort: string;
  perSecShort: string;
  ammoShort: string;
  unitsShort: string;
  ruCarriersTitle: string;
  krKabBadge: string;
  ruAirfieldsTitle: string;
  basesCount: (n: number) => string;
  hideWord: string;
  showOnMap: string;
  goToWord: string;
  onMapWord: string;
  onUaMapWord: string;
  inSeaWord: string;
  placeCustomRuAirfield: string;
  clickRuOrOccupied: string;
  ruNavalShip: string;
  ruNavalShipSub: string;
  ruGroundTitle: string;
  groundLaunchersTag: string;
  uaSectionTitle: string;
  uaTerritoryTag: string;
  uaAirfieldsTitle: string;
  placeCustomUaAirfield: string;
  clickControlledUa: string;
  pvoSectionTitle: string;
  autoInterceptTag: string;
  radarOverview: (km: number) => string;
  pvoSpecsLine: (rangeKm: number, ammo: number, unitWord: string, cd: number) => string;
  roundsShort: string;
  burstsShort: string;
  missilesShort: string;
  defendedObjectsTitle: string;
  enemyTargetsTitle: string;
  infraAndObjectsTitle: string;
  typesCount: (n: number) => string;
  buildingScaleLabel: string;
  deployedOnMapTitle: string;
  emptyMapHint: string;
  emptyMapHintShort: string;
  territoryUa: string;
  territoryRu: string;
  territoryOccupied: string;
  territorySea: string;
  shipLabel: string;
  launcherLabel: string;
  sortieDone: string;
  ammoEmpty: string;
  reloadBtn: string;
  repairBtn: string;
  sellTooltip: (refund: number) => string;
  radarLabel: string;
  rangeWord: string;
  overviewWord: string;
  statsDrawerTitle: string;
  statsSummaryTab: string;
  pvoSummaryTab: string;
  journalTab: string;
  tempoWord: string;
  pvoEfficiency: string;
  interceptedCount: string;
  missesCount: string;
  defenseWave: string;
  totalLaunches: string;
  shotDownInAir: string;
  missedHits: string;
  impactsExplosions: string;
  integrityLabel: string;
  destroyedUnitsLabel: string;
  radarPicture: string;
  uavsWord: string;
  missilesAndKabWord: string;
  aviationWord: string;
  objectsInOrder: string;
  pvoAndRadars: string;
  damagedShort: string;
  noAmmoShort: string;
  incomeFromObjects: string;
  alertsDroneMissile: string;
  filterAll: string;
  filterIntercepts: string;
  filterImpacts: string;
  filterMisses: string;
  filterLaunches: string;
  journalEmpty: string;
  tagIntercept: string;
  tagMiss: string;
  tagImpact: string;
  tagLaunch: string;
  tgTitle: string;
  tgReadAll: string;
  tgUkraine: string;
  tgRussia: string;
  tgSearchUa: string;
  tgSearchRu: string;
  tgQuiet: string;
  tgSubscribers: string;
  tgNoMessages: string;
  tgMonitoringFooter: string;
  tgHomeTitle: string;
  tgHomeHint: string;
  tgPvoSummaryBtn: string;
  tgChannelsBtn: string;
  tgMissileThreat: (n: number) => string;
  tgDroneThreat: (n: number) => string;
  tgAlertOff: string;
  tgAlertBallistic: string;
  tgAlertAircraft: string;
  tgAlertMissile: string;
  tgAlertDrone: string;
  tgShotDownRu: string;
  tgShotDownUa: string;
  tgDorozvedka: string;
  tgExplosion: string;
  tgOnTarget: string;
  tgTransit: string;
  tgCourse: string;
  tgInOblast: string;
  exitModalTitle: string;
  exitModalBody: string;
  saveAndExit: string;
  exitWithoutSave: string;
  cancelBtn: string;
  defeatSubtitle: string;
  defeatTitle: string;
  victorySubtitle: string;
  victoryTitle: string;
  wavesRepelled: string;
  shotDownPvo: string;
  pvoAccuracy: string;
  simTimeLabel: string;
  realTimeDefense: (sec: number, explosions: number) => string;
  playAgainBtn: string;
  toMenuBtn: string;
  restartShortBtn: string;
  airfieldBasePrefixUa: string;
  airfieldBasePrefixRu: string;
  aircraftOfBase: (n: number) => string;
  howManyBombs: string;
  howManyMissiles: string;
  boardsBack: string;
  upToWord: string;
  totalDmgLabel: (dmg: number) => string;
  mobileMapTab: string;
  mobileTechTab: string;
  mobileTelegramTab: string;
  mobileSummaryTab: string;
}

const UI_TEXT: Record<AppLang, UiText> = {
  ru: {
    appName: 'Оперативный штаб ПВО',
    tagline: 'Тактический симулятор противовоздушной обороны, пусков БПЛА, крылатых и баллистических ракет',
    playBtn: 'Играть',
    featurePvo: 'Системы ППО и РЛС',
    featureAir: 'Авиация и ракеты',
    featureManual: 'Ручное управление',
    back: 'Назад',
    chooseMode: 'Выбор режима',
    chooseModeSub: 'Выберите формат тактической операции на карте',
    sandboxTitle: 'Песочница',
    sandboxOpenMap: 'Открыть карту →',
    sandboxDesc: 'Свободное размещение любых пусковых установок, аэродромов, систем ППО, радаров и объектов без ограничений по ресурсам.',
    sandboxTag1: 'Все виды техники',
    sandboxTag2: 'Без лимита $',
    sandboxSavedPrefix: 'Сохр.',
    sandboxSavedDesc: 'Найдена сохранённая расстановка на карте. Можно продолжить с неё или начать заново.',
    sandboxResumeBtn: 'Продолжить сохранение →',
    sandboxNewMapBtn: 'Новая карта',
    deleteBtn: 'Удалить',
    aiTitle: 'Против ИИ',
    aiStartBtn: 'Начать операцию →',
    aiDesc: (p, e) => `Защита ${p} объектов Украины от волн атак ИИ и ответные удары БПЛА и ракетами по ${e} целям противника.`,
    aiStartBudget: (m) => `Старт: $${m}`,
    aiIncomeTag: 'Доход + награды',
    launchersShort: 'ПУ',
    pvoShort: 'ППО',
    objectsShort: 'Объекты',
    enemyObjectsShort: 'Цели ИИ',
    airfieldsShort: 'Аэродромы',
    targetsShort: 'Цели',
    interceptedShort: 'Сбито',
    explosionsShort: 'Взрывы',
    menuBtn: 'Меню',
    headerTitleAi: 'Против ИИ',
    headerTitleSandbox: 'Оперативный штаб',
    objectsWord: 'Объекты',
    waveWord: 'Волна',
    waveAbbr: 'В',
    frontBtn: 'Фронт',
    frontTitle: 'Линия фронта',
    regionsBtn: 'Регионы',
    regionsTitle: 'Районы и воздушные тревоги',
    labelsBtn: 'Названия',
    alertBtn: 'Тревога',
    alertTitle: 'Настройки сирен, тревог и языка',
    soundBtn: 'Звук',
    mutedBtn: 'Без звука',
    saveBtn: 'Сохранить',
    saveTitle: 'Сохранить расстановку песочницы',
    restartBtn: 'Рестарт',
    clearBtn: 'Очистить',
    restartTitle: 'Начать заново',
    clearTitle: 'Очистить карту',
    phoneBtn: 'Телефон',
    phoneTitle: 'Телефон · Telegram-каналы областей',
    statsBtn: 'Статистика',
    statsTitle: 'Статистика и журнал событий',
    tabAll: 'Все',
    tabStrike: 'Удар',
    tabPvo: 'ППО',
    tabInfra: 'Здания',
    tabObjects: 'Объекты',
    tabMap: 'Карта',
    tabAlert: 'Тревога',
    tabTech: 'Техника',
    tabSummary: 'Сводка',
    sirensAndAlerts: 'Сирены, тревоги и язык',
    statusMissile: 'Ракетная',
    statusDrone: 'Дроновая',
    statusQuiet: 'Тихо',
    yellowAlert: 'Жёлтая тревога (БПЛА)',
    redAlert: 'Красная тревога (Ракеты)',
    raionUnit: 'р-н',
    airRaidSiren: 'Сирена воздушной тревоги',
    airRaidSirenSub: 'Автозапуск при входе целей в районы',
    autoOnInRaions: 'Автозапуск при угрозе в районах',
    sirenVolume: 'Громкость сирены',
    targetAndPvoVolume: 'Громкость целей и ППО',
    droneVolume: 'Звук БПЛА (Шахеды)',
    missileAndInterceptVolume: 'Ракеты, перехваты и взрывы',
    missileVolumeShort: 'Ракеты и перехваты',
    alertHoldover: 'Задержка отбоя тревоги',
    alertHoldoverDesc: 'Сколько секунд район остаётся под тревогой после вылета или сбития цели.',
    alertRadius: 'Радиус включения тревоги',
    alertRadiusDesc: 'Дистанция упреждения до границы района при подлёте воздушной цели.',
    languageLabel: 'Язык интерфейса',
    onWord: 'ВКЛ',
    offWord: 'ВЫКЛ',
    secShort: 'с',
    kmShort: 'км',
    kmhShort: 'км/ч',
    perSecShort: '/с',
    ammoShort: 'Б/К',
    unitsShort: 'ед.',
    ruCarriersTitle: 'Носители РФ · Авиация и флот',
    krKabBadge: 'КР / КАБ',
    ruAirfieldsTitle: 'Аэродромы ВКС РФ',
    basesCount: (n) => `${n} баз`,
    hideWord: 'Скрыть',
    showOnMap: 'На карту',
    goToWord: 'Перейти',
    onMapWord: 'На карту',
    onUaMapWord: 'На карту UA',
    inSeaWord: 'В море…',
    placeCustomRuAirfield: '+ Разместить произвольный аэродром РФ',
    clickRuOrOccupied: 'Кликните на карту РФ или оккуп. территорию…',
    ruNavalShip: 'Корабль ВМФ РФ',
    ruNavalShipSub: 'Чёрное и Азовское море · Морской ракетоносец',
    ruGroundTitle: 'РФ и оккуп. · БПЛА и ракеты',
    groundLaunchersTag: 'Наземные ПУ',
    uaSectionTitle: 'ВСУ · Авиация, БПЛА и ракеты',
    uaTerritoryTag: 'Территория UA',
    uaAirfieldsTitle: 'Аэродромы ВСУ',
    placeCustomUaAirfield: '+ Разместить произвольный аэродром ВСУ',
    clickControlledUa: 'Нажмите на подконтрольную Украину…',
    pvoSectionTitle: 'Средства ППО и РЛС',
    autoInterceptTag: 'Автоперехват',
    radarOverview: (km) => `РЛС обзор ${km} км · +45% дальности ППО`,
    pvoSpecsLine: (r, a, u, cd) => `R ${r} км · Б/К ${a} ${u} · ${cd}с`,
    roundsShort: 'патр.',
    burstsShort: 'очер.',
    missilesShort: 'ракет',
    defendedObjectsTitle: 'Наши объекты (защита)',
    enemyTargetsTitle: 'Объекты противника (цели)',
    infraAndObjectsTitle: 'Инфраструктура и объекты',
    typesCount: (n) => `${n} типов`,
    buildingScaleLabel: 'Масштаб объектов на карте',
    deployedOnMapTitle: 'Развёрнуто на карте',
    emptyMapHint: 'Выберите ППО, ударное средство или объект и разместите кликом по карте.',
    emptyMapHintShort: 'Выберите ППО, ударное средство или объект и разместите на карте.',
    territoryUa: 'Украина',
    territoryRu: 'Россия',
    territoryOccupied: 'Оккуп. терр.',
    territorySea: 'Море (Чёрное/Азовское)',
    shipLabel: 'Корабль',
    launcherLabel: 'ПУ',
    sortieDone: 'Вылет выполнен',
    ammoEmpty: 'Б/К пуст',
    reloadBtn: 'Б/К',
    repairBtn: 'Ремонт',
    sellTooltip: (r) => `Продать (+$${r})`,
    radarLabel: 'РЛС',
    rangeWord: 'Радиус',
    overviewWord: 'Обзор',
    statsDrawerTitle: 'Оперативная сводка и ЖБД',
    statsSummaryTab: 'Сводка ППО',
    pvoSummaryTab: 'Сводка',
    journalTab: 'Журнал',
    tempoWord: 'Темп',
    pvoEfficiency: 'Эффективность ППО',
    interceptedCount: 'Перехвачено',
    missesCount: 'Промахи',
    defenseWave: 'Волна',
    totalLaunches: 'Всего запусков',
    shotDownInAir: 'Сбито в воздухе',
    missedHits: 'Пропущено ударов',
    impactsExplosions: 'Прилётов / Взрывов',
    integrityLabel: 'Живучесть',
    destroyedUnitsLabel: 'Поражено ПУ и ППО',
    radarPicture: 'Обстановка на радарах',
    uavsWord: 'БПЛА',
    missilesAndKabWord: 'Ракеты и КАБ',
    aviationWord: 'Авиация',
    objectsInOrder: 'Наши объекты в строю',
    pvoAndRadars: 'Средства ППО и РЛС',
    damagedShort: 'повр.',
    noAmmoShort: 'б/к',
    incomeFromObjects: 'Доход от объектов',
    alertsDroneMissile: 'Тревоги (БПЛА / Ракеты)',
    filterAll: 'Все',
    filterIntercepts: 'Сбития',
    filterImpacts: 'Прилёты',
    filterMisses: 'Промахи',
    filterLaunches: 'Пуски',
    journalEmpty: 'Дежурный журнал чист — пуски, перехваты ППО, промахи и зафиксированные удары появятся здесь в реальном времени.',
    tagIntercept: 'СБИТО',
    tagMiss: 'ПРОМАХ',
    tagImpact: 'ПРИЛЁТ',
    tagLaunch: 'ПУСК',
    tgTitle: 'Telegram · Каналы ПВО',
    tgReadAll: 'Прочитать все',
    tgUkraine: 'Украина',
    tgRussia: 'Россия',
    tgSearchUa: 'Поиск каналов Украины...',
    tgSearchRu: 'Поиск каналов РФ...',
    tgQuiet: 'тихо',
    tgSubscribers: 'подписчиков',
    tgNoMessages: 'Сообщений пока нет. Когда «Шахед» или ракета войдут в область, канал сразу опубликует курс.',
    tgMonitoringFooter: 'Канал мониторинга · сообщения обновляются автоматически',
    tgHomeTitle: 'Экран смартфона · Мониторинг',
    tgHomeHint: 'Нажмите на Telegram для чтения каналов областей',
    tgPvoSummaryBtn: 'Сводка ПВО',
    tgChannelsBtn: 'Каналы',
    tgMissileThreat: (n) => `Ракетная угроза · ${n} р-н`,
    tgDroneThreat: (n) => `Угроза БПЛА · ${n} р-н`,
    tgAlertOff: 'Отбой тревоги',
    tgAlertBallistic: 'Тревога: Баллистика',
    tgAlertAircraft: 'Тревога: Ракетоноситель',
    tgAlertMissile: 'Тревога: Ракетная',
    tgAlertDrone: 'Тревога: Угроза БПЛА',
    tgShotDownRu: 'Сбито ПВО',
    tgShotDownUa: 'Сбито ППО',
    tgDorozvedka: 'Дорозведка',
    tgExplosion: 'Взрыв',
    tgOnTarget: 'На цель',
    tgTransit: 'Транзит',
    tgCourse: 'Курс',
    tgInOblast: 'в области',
    exitModalTitle: 'Сохранить расстановку?',
    exitModalBody: 'На карте песочницы размещены объекты и техника. Сохранить текущую расстановку, чтобы продолжить позже?',
    saveAndExit: 'Сохранить и выйти',
    exitWithoutSave: 'Выйти без сохранения',
    cancelBtn: 'Отмена',
    defeatSubtitle: 'Оборона прорвана',
    defeatTitle: 'Все наши объекты уничтожены',
    victorySubtitle: 'Операция завершена',
    victoryTitle: 'Все цели противника уничтожены',
    wavesRepelled: 'Волн пройдено',
    shotDownPvo: 'Сбито ППО',
    pvoAccuracy: 'Точность ППО',
    simTimeLabel: 'Игровое время',
    realTimeDefense: (s, e) => `Реальное время: ${s} с · Прилётов: ${e}`,
    playAgainBtn: 'Играть снова',
    toMenuBtn: 'В меню',
    restartShortBtn: 'Заново',
    airfieldBasePrefixUa: 'Аэродром ВСУ',
    airfieldBasePrefixRu: 'Аэродром',
    aircraftOfBase: (n) => `Самолёты базы (${n})`,
    howManyBombs: 'Сколько бомб?',
    howManyMissiles: 'Сколько ракет?',
    boardsBack: '← Борта',
    upToWord: 'до',
    totalDmgLabel: (d) => `Суммарно -${d} HP`,
    mobileMapTab: 'Карта',
    mobileTechTab: 'Техника',
    mobileTelegramTab: 'Telegram',
    mobileSummaryTab: 'Сводка',
  },
  uk: {
    appName: 'Оперативний штаб ППО',
    tagline: 'Тактичний симулятор протиповітряної оборони, пусків БПЛА, крилатих і балістичних ракет',
    playBtn: 'Грати',
    featurePvo: 'Системи ППО та РЛС',
    featureAir: 'Авіація та ракети',
    featureManual: 'Ручне керування',
    back: 'Назад',
    chooseMode: 'Вибір режиму',
    chooseModeSub: 'Оберіть формат тактичної операції на мапі',
    sandboxTitle: 'Пісочниця',
    sandboxOpenMap: 'Відкрити мапу →',
    sandboxDesc: 'Вільне розміщення будь-яких пускових установок, аеродромів, систем ППО, радарів та об’єктів без обмежень за ресурсами.',
    sandboxTag1: 'Усі види техніки',
    sandboxTag2: 'Без ліміту $',
    sandboxSavedPrefix: 'Збер.',
    sandboxSavedDesc: 'Знайдено збережену розстановку на мапі. Можна продовжити з неї або почати заново.',
    sandboxResumeBtn: 'Продовжити збереження →',
    sandboxNewMapBtn: 'Нова мапа',
    deleteBtn: 'Видалити',
    aiTitle: 'Проти ШІ',
    aiStartBtn: 'Почати операцію →',
    aiDesc: (p, e) => `Захист ${p} об’єктів України від хвиль атак ШІ та удари БПЛА й ракетами у відповідь по ${e} цілях ворога.`,
    aiStartBudget: (m) => `Старт: $${m}`,
    aiIncomeTag: 'Дохід + нагороди',
    launchersShort: 'ПУ',
    pvoShort: 'ППО',
    objectsShort: 'Об’єкти',
    enemyObjectsShort: 'Цілі ШІ',
    airfieldsShort: 'Аеродроми',
    targetsShort: 'Цілі',
    interceptedShort: 'Збито',
    explosionsShort: 'Вибухи',
    menuBtn: 'Меню',
    headerTitleAi: 'Проти ШІ',
    headerTitleSandbox: 'Оперативний штаб',
    objectsWord: 'Об’єкти',
    waveWord: 'Хвиля',
    waveAbbr: 'Х',
    frontBtn: 'Фронт',
    frontTitle: 'Лінія фронту',
    regionsBtn: 'Регіони',
    regionsTitle: 'Райони та повітряні тривоги',
    labelsBtn: 'Назви',
    alertBtn: 'Тривога',
    alertTitle: 'Налаштування сирен, тривог і мови',
    soundBtn: 'Звук',
    mutedBtn: 'Без звуку',
    saveBtn: 'Зберегти',
    saveTitle: 'Зберегти розстановку пісочниці',
    restartBtn: 'Рестарт',
    clearBtn: 'Очистити',
    restartTitle: 'Почати заново',
    clearTitle: 'Очистити мапу',
    phoneBtn: 'Телефон',
    phoneTitle: 'Телефон · Telegram-канали областей',
    statsBtn: 'Статистика',
    statsTitle: 'Статистика та журнал подій',
    tabAll: 'Усі',
    tabStrike: 'Удар',
    tabPvo: 'ППО',
    tabInfra: 'Будівлі',
    tabObjects: 'Об’єкти',
    tabMap: 'Мапа',
    tabAlert: 'Тривога',
    tabTech: 'Техніка',
    tabSummary: 'Зведення',
    sirensAndAlerts: 'Сирени, тривоги та мова',
    statusMissile: 'Ракетна',
    statusDrone: 'Дронова',
    statusQuiet: 'Тихо',
    yellowAlert: 'Жовта тривога (БПЛА)',
    redAlert: 'Червона тривога (Ракети)',
    raionUnit: 'р-н',
    airRaidSiren: 'Сирена повітряної тривоги',
    airRaidSirenSub: 'Автозапуск при вході цілей у райони',
    autoOnInRaions: 'Автозапуск при загрозі в районах',
    sirenVolume: 'Гучність сирени',
    targetAndPvoVolume: 'Гучність цілей і ППО',
    droneVolume: 'Звук БПЛА (Шахеди)',
    missileAndInterceptVolume: 'Ракети, перехоплення та вибухи',
    missileVolumeShort: 'Ракети й перехоплення',
    alertHoldover: 'Затримка відбою тривоги',
    alertHoldoverDesc: 'Скільки секунд район залишається під тривогою після виходу або збиття цілі.',
    alertRadius: 'Радіус увімкнення тривоги',
    alertRadiusDesc: 'Дистанція упередження до межі району при підльоті повітряної цілі.',
    languageLabel: 'Мова інтерфейсу',
    onWord: 'УВІМК',
    offWord: 'ВИМК',
    secShort: 'с',
    kmShort: 'км',
    kmhShort: 'км/год',
    perSecShort: '/с',
    ammoShort: 'Б/К',
    unitsShort: 'од.',
    ruCarriersTitle: 'Носії РФ · Авіація та флот',
    krKabBadge: 'КР / КАБ',
    ruAirfieldsTitle: 'Аеродроми ПКС РФ',
    basesCount: (n) => `${n} баз`,
    hideWord: 'Сховати',
    showOnMap: 'На мапу',
    goToWord: 'Перейти',
    onMapWord: 'На мапу',
    onUaMapWord: 'На мапу UA',
    inSeaWord: 'У море…',
    placeCustomRuAirfield: '+ Розмістити довільний аеродром РФ',
    clickRuOrOccupied: 'Натисніть на мапу РФ або окуп. територію…',
    ruNavalShip: 'Корабель ВМФ РФ',
    ruNavalShipSub: 'Чорне та Азовське море · Морський ракетоносій',
    ruGroundTitle: 'РФ та окуп. · БПЛА й ракети',
    groundLaunchersTag: 'Наземні ПУ',
    uaSectionTitle: 'ЗСУ · Авіація, БПЛА та ракети',
    uaTerritoryTag: 'Територія UA',
    uaAirfieldsTitle: 'Аеродроми ЗСУ',
    placeCustomUaAirfield: '+ Розмістити довільний аеродром ЗСУ',
    clickControlledUa: 'Натисніть на підконтрольну Україну…',
    pvoSectionTitle: 'Засоби ППО та РЛС',
    autoInterceptTag: 'Автоперехоплення',
    radarOverview: (km) => `РЛС огляд ${km} км · +45% дальності ППО`,
    pvoSpecsLine: (r, a, u, cd) => `R ${r} км · Б/К ${a} ${u} · ${cd}с`,
    roundsShort: 'патр.',
    burstsShort: 'черг',
    missilesShort: 'ракет',
    defendedObjectsTitle: 'Наші об’єкти (захист)',
    enemyTargetsTitle: 'Об’єкти ворога (цілі)',
    infraAndObjectsTitle: 'Інфраструктура та об’єкти',
    typesCount: (n) => `${n} типів`,
    buildingScaleLabel: 'Масштаб об’єктів на мапі',
    deployedOnMapTitle: 'Розгорнуто на мапі',
    emptyMapHint: 'Оберіть ППО, ударний засіб або об’єкт та розмістіть кліком по мапі.',
    emptyMapHintShort: 'Оберіть ППО, ударний засіб або об’єкт та розмістіть на мапі.',
    territoryUa: 'Україна',
    territoryRu: 'Росія',
    territoryOccupied: 'Окуп. тер.',
    territorySea: 'Море (Чорне/Азовське)',
    shipLabel: 'Корабель',
    launcherLabel: 'ПУ',
    sortieDone: 'Виліт виконано',
    ammoEmpty: 'Б/К порожній',
    reloadBtn: 'Б/К',
    repairBtn: 'Ремонт',
    sellTooltip: (r) => `Продати (+$${r})`,
    radarLabel: 'РЛС',
    rangeWord: 'Радіус',
    overviewWord: 'Огляд',
    statsDrawerTitle: 'Оперативне зведення та ЖБД',
    statsSummaryTab: 'Зведення ППО',
    pvoSummaryTab: 'Зведення',
    journalTab: 'Журнал',
    tempoWord: 'Темп',
    pvoEfficiency: 'Ефективність ППО',
    interceptedCount: 'Перехоплено',
    missesCount: 'Промахи',
    defenseWave: 'Хвиля',
    totalLaunches: 'Усього пусків',
    shotDownInAir: 'Збито в повітрі',
    missedHits: 'Пропущено ударів',
    impactsExplosions: 'Прильотів / Вибухів',
    integrityLabel: 'Живучість',
    destroyedUnitsLabel: 'Уражено ПУ та ППО',
    radarPicture: 'Обстановка на радарах',
    uavsWord: 'БПЛА',
    missilesAndKabWord: 'Ракети та КАБ',
    aviationWord: 'Авіація',
    objectsInOrder: 'Наші об’єкти в строю',
    pvoAndRadars: 'Засоби ППО та РЛС',
    damagedShort: 'ушк.',
    noAmmoShort: 'б/к',
    incomeFromObjects: 'Дохід від об’єктів',
    alertsDroneMissile: 'Тривоги (БПЛА / Ракети)',
    filterAll: 'Усі',
    filterIntercepts: 'Збиття',
    filterImpacts: 'Прильоти',
    filterMisses: 'Промахи',
    filterLaunches: 'Пуски',
    journalEmpty: 'Черговий журнал порожній — пуски, перехоплення ППО, промахи та зафіксовані удари з’являться тут у реальному часі.',
    tagIntercept: 'ЗБИТО',
    tagMiss: 'ПРОМАХ',
    tagImpact: 'ПРИЛІТ',
    tagLaunch: 'ПУСК',
    tgTitle: 'Telegram · Канали ППО',
    tgReadAll: 'Прочитати всі',
    tgUkraine: 'Україна',
    tgRussia: 'Росія',
    tgSearchUa: 'Пошук каналів України...',
    tgSearchRu: 'Пошук каналів РФ...',
    tgQuiet: 'тихо',
    tgSubscribers: 'підписників',
    tgNoMessages: 'Повідомлень поки немає. Коли «Шахед» або ракета увійдуть в область, канал одразу опублікує курс.',
    tgMonitoringFooter: 'Канал моніторингу · повідомлення оновлюються автоматично',
    tgHomeTitle: 'Екран смартфона · Моніторинг',
    tgHomeHint: 'Натисніть Telegram для читання каналів областей',
    tgPvoSummaryBtn: 'Зведення ППО',
    tgChannelsBtn: 'Канали',
    tgMissileThreat: (n) => `Ракетна загроза · ${n} р-н`,
    tgDroneThreat: (n) => `Загроза БПЛА · ${n} р-н`,
    tgAlertOff: 'Відбій тривоги',
    tgAlertBallistic: 'Тривога: Балістика',
    tgAlertAircraft: 'Тривога: Ракетоносій',
    tgAlertMissile: 'Тривога: Ракетна',
    tgAlertDrone: 'Тривога: Загроза БПЛА',
    tgShotDownRu: 'Збито ППО',
    tgShotDownUa: 'Збито ППО',
    tgDorozvedka: 'Дорозвідка',
    tgExplosion: 'Вибух',
    tgOnTarget: 'На ціль',
    tgTransit: 'Транзит',
    tgCourse: 'Курс',
    tgInOblast: 'в області',
    exitModalTitle: 'Зберегти розстановку?',
    exitModalBody: 'На мапі пісочниці розміщено об’єкти та техніку. Зберегти поточну розстановку, щоб продовжити пізніше?',
    saveAndExit: 'Зберегти та вийти',
    exitWithoutSave: 'Вийти без збереження',
    cancelBtn: 'Скасувати',
    defeatSubtitle: 'Оборону прорвано',
    defeatTitle: 'Усі наші об’єкти знищено',
    victorySubtitle: 'Операцію завершено',
    victoryTitle: 'Усі цілі ворога знищено',
    wavesRepelled: 'Хвиль пройдено',
    shotDownPvo: 'Збито ППО',
    pvoAccuracy: 'Точність ППО',
    simTimeLabel: 'Ігровий час',
    realTimeDefense: (s, e) => `Реальний час: ${s} с · Прильотів: ${e}`,
    playAgainBtn: 'Грати знову',
    toMenuBtn: 'У меню',
    restartShortBtn: 'Заново',
    airfieldBasePrefixUa: 'Аеродром ЗСУ',
    airfieldBasePrefixRu: 'Аеродром',
    aircraftOfBase: (n) => `Літаки бази (${n})`,
    howManyBombs: 'Скільки бомб?',
    howManyMissiles: 'Скільки ракет?',
    boardsBack: '← Борти',
    upToWord: 'до',
    totalDmgLabel: (d) => `Сумарно -${d} HP`,
    mobileMapTab: 'Мапа',
    mobileTechTab: 'Техніка',
    mobileTelegramTab: 'Telegram',
    mobileSummaryTab: 'Зведення',
  },
  en: {
    appName: 'Air Defense HQ',
    tagline: 'Tactical air defense, UAV, cruise missile, and ballistic strike simulator',
    playBtn: 'Play',
    featurePvo: 'SAM & Radar Grid',
    featureAir: 'Aviation & Missiles',
    featureManual: 'Manual Control',
    back: 'Back',
    chooseMode: 'Select Mode',
    chooseModeSub: 'Choose the tactical operation format on the map',
    sandboxTitle: 'Sandbox',
    sandboxOpenMap: 'Open Map →',
    sandboxDesc: 'Freely place launchers, airbases, air defense systems, radars, and targets with unlimited resources.',
    sandboxTag1: 'All units',
    sandboxTag2: 'Unlimited $',
    sandboxSavedPrefix: 'Saved',
    sandboxSavedDesc: 'A saved map layout was found. Resume from your last position or start fresh.',
    sandboxResumeBtn: 'Resume Saved →',
    sandboxNewMapBtn: 'New Map',
    deleteBtn: 'Delete',
    aiTitle: 'Vs AI',
    aiStartBtn: 'Start Operation →',
    aiDesc: (p, e) => `Defend ${p} Ukrainian sites from AI attack waves while striking ${e} enemy targets with UAVs and missiles.`,
    aiStartBudget: (m) => `Start: $${m}`,
    aiIncomeTag: 'Income + bounties',
    launchersShort: 'Launchers',
    pvoShort: 'ADS',
    objectsShort: 'Sites',
    enemyObjectsShort: 'Enemy',
    airfieldsShort: 'Airbases',
    targetsShort: 'Tracks',
    interceptedShort: 'Hit',
    explosionsShort: 'Impacts',
    menuBtn: 'Menu',
    headerTitleAi: 'Vs AI',
    headerTitleSandbox: 'Operations HQ',
    objectsWord: 'Sites',
    waveWord: 'Wave',
    waveAbbr: 'W',
    frontBtn: 'Front',
    frontTitle: 'Frontline layer',
    regionsBtn: 'Regions',
    regionsTitle: 'Districts & air raid alerts',
    labelsBtn: 'Labels',
    alertBtn: 'Alerts',
    alertTitle: 'Siren, alert radius & language settings',
    soundBtn: 'Audio',
    mutedBtn: 'Muted',
    saveBtn: 'Save',
    saveTitle: 'Save sandbox layout',
    restartBtn: 'Restart',
    clearBtn: 'Clear',
    restartTitle: 'Restart scenario',
    clearTitle: 'Clear map',
    phoneBtn: 'Phone',
    phoneTitle: 'Phone · Regional Telegram channels',
    statsBtn: 'Stats',
    statsTitle: 'Statistics & combat log',
    tabAll: 'All',
    tabStrike: 'Strike',
    tabPvo: 'ADS',
    tabInfra: 'Sites',
    tabObjects: 'Sites',
    tabMap: 'Map',
    tabAlert: 'Alerts',
    tabTech: 'Units',
    tabSummary: 'Stats',
    sirensAndAlerts: 'Sirens, Alerts & Language',
    statusMissile: 'Missile',
    statusDrone: 'UAV',
    statusQuiet: 'Quiet',
    yellowAlert: 'Yellow Alert (UAV)',
    redAlert: 'Red Alert (Missiles)',
    raionUnit: 'dist.',
    airRaidSiren: 'Air Raid Siren',
    airRaidSirenSub: 'Auto-trigger when threats enter districts',
    autoOnInRaions: 'Auto-trigger on district threat',
    sirenVolume: 'Siren volume',
    targetAndPvoVolume: 'Targets & ADS volume',
    droneVolume: 'UAV sound (Shahed)',
    missileAndInterceptVolume: 'Missiles, intercepts & blasts',
    missileVolumeShort: 'Missiles & intercepts',
    alertHoldover: 'Alert holdover delay',
    alertHoldoverDesc: 'Seconds a district remains on alert after a threat exits or is intercepted.',
    alertRadius: 'Alert trigger radius',
    alertRadiusDesc: 'Early-warning distance ahead of district borders.',
    languageLabel: 'Interface Language',
    onWord: 'ON',
    offWord: 'OFF',
    secShort: 's',
    kmShort: 'km',
    kmhShort: 'km/h',
    perSecShort: '/s',
    ammoShort: 'Ammo',
    unitsShort: 'units',
    ruCarriersTitle: 'RU Carriers · Air & Naval',
    krKabBadge: 'CM / FAB',
    ruAirfieldsTitle: 'RU Aerospace Airbases',
    basesCount: (n) => `${n} bases`,
    hideWord: 'Hide',
    showOnMap: 'Deploy',
    goToWord: 'Focus',
    onMapWord: 'Place',
    onUaMapWord: 'Place UA',
    inSeaWord: 'At sea…',
    placeCustomRuAirfield: '+ Place custom RU airbase',
    clickRuOrOccupied: 'Click RU or occupied territory…',
    ruNavalShip: 'RU Navy Missile Ship',
    ruNavalShipSub: 'Black & Azov Sea · Naval cruise carrier',
    ruGroundTitle: 'RU & Occupied · UAVs & Missiles',
    groundLaunchersTag: 'Ground Launchers',
    uaSectionTitle: 'UA Forces · Air, UAVs & Missiles',
    uaTerritoryTag: 'UA Territory',
    uaAirfieldsTitle: 'UA Airbases',
    placeCustomUaAirfield: '+ Place custom UA airbase',
    clickControlledUa: 'Click UA-controlled territory…',
    pvoSectionTitle: 'Air Defense & Radars',
    autoInterceptTag: 'Auto-engage',
    radarOverview: (km) => `Radar scan ${km} km · +45% ADS range`,
    pvoSpecsLine: (r, a, u, cd) => `R ${r} km · Ammo ${a} ${u} · ${cd}s`,
    roundsShort: 'rds',
    burstsShort: 'bursts',
    missilesShort: 'msl',
    defendedObjectsTitle: 'Friendly Sites (Defend)',
    enemyTargetsTitle: 'Enemy Sites (Targets)',
    infraAndObjectsTitle: 'Infrastructure & Sites',
    typesCount: (n) => `${n} types`,
    buildingScaleLabel: 'Map object scale',
    deployedOnMapTitle: 'Deployed on Map',
    emptyMapHint: 'Select an ADS, strike asset, or object and click on the map to place.',
    emptyMapHintShort: 'Select an ADS, strike asset, or site to place on the map.',
    territoryUa: 'Ukraine',
    territoryRu: 'Russia',
    territoryOccupied: 'Occupied',
    territorySea: 'Sea (Black/Azov)',
    shipLabel: 'Ship',
    launcherLabel: 'Launcher',
    sortieDone: 'Sortie complete',
    ammoEmpty: 'Out of ammo',
    reloadBtn: 'Reload',
    repairBtn: 'Repair',
    sellTooltip: (r) => `Sell (+$${r})`,
    radarLabel: 'Radar',
    rangeWord: 'Range',
    overviewWord: 'Scan',
    statsDrawerTitle: 'Operations Summary & Log',
    statsSummaryTab: 'ADS Summary',
    pvoSummaryTab: 'Summary',
    journalTab: 'Log',
    tempoWord: 'Speed',
    pvoEfficiency: 'ADS Efficiency',
    interceptedCount: 'Intercepted',
    missesCount: 'Misses',
    defenseWave: 'Wave',
    totalLaunches: 'Total Launches',
    shotDownInAir: 'Intercepted',
    missedHits: 'Impacts Taken',
    impactsExplosions: 'Impacts / Blasts',
    integrityLabel: 'Integrity',
    destroyedUnitsLabel: 'Units Destroyed',
    radarPicture: 'Radar Picture',
    uavsWord: 'UAVs',
    missilesAndKabWord: 'Missiles & Glide Bombs',
    aviationWord: 'Aviation',
    objectsInOrder: 'Friendly Sites Active',
    pvoAndRadars: 'ADS & Radars',
    damagedShort: 'dmg',
    noAmmoShort: 'empty',
    incomeFromObjects: 'Site Income',
    alertsDroneMissile: 'Alerts (UAV / Missile)',
    filterAll: 'All',
    filterIntercepts: 'Hits',
    filterImpacts: 'Impacts',
    filterMisses: 'Misses',
    filterLaunches: 'Launches',
    journalEmpty: 'Combat log is empty — launches, intercepts, misses, and impacts will appear here in real time.',
    tagIntercept: 'HIT',
    tagMiss: 'MISS',
    tagImpact: 'IMPACT',
    tagLaunch: 'LAUNCH',
    tgTitle: 'Telegram · ADS Channels',
    tgReadAll: 'Read all',
    tgUkraine: 'Ukraine',
    tgRussia: 'Russia',
    tgSearchUa: 'Search UA channels...',
    tgSearchRu: 'Search RU channels...',
    tgQuiet: 'quiet',
    tgSubscribers: 'subscribers',
    tgNoMessages: 'No posts yet. When a UAV or missile enters the region, the channel will publish its heading.',
    tgMonitoringFooter: 'Monitoring channel · updates automatically',
    tgHomeTitle: 'Phone Screen · Monitoring',
    tgHomeHint: 'Tap Telegram to read regional channels',
    tgPvoSummaryBtn: 'ADS Stats',
    tgChannelsBtn: 'Channels',
    tgMissileThreat: (n) => `Missile Threat · ${n} dist.`,
    tgDroneThreat: (n) => `UAV Threat · ${n} dist.`,
    tgAlertOff: 'All clear',
    tgAlertBallistic: 'Alert: Ballistic',
    tgAlertAircraft: 'Alert: Missile Carrier',
    tgAlertMissile: 'Alert: Missile',
    tgAlertDrone: 'Alert: UAV Threat',
    tgShotDownRu: 'Intercepted',
    tgShotDownUa: 'Intercepted',
    tgDorozvedka: 'Recon sweep',
    tgExplosion: 'Explosion',
    tgOnTarget: 'On target',
    tgTransit: 'Transit',
    tgCourse: 'Heading',
    tgInOblast: 'in region',
    exitModalTitle: 'Save Layout?',
    exitModalBody: 'There are units and sites placed on the sandbox map. Save your current layout to resume later?',
    saveAndExit: 'Save & Exit',
    exitWithoutSave: 'Exit Without Saving',
    cancelBtn: 'Cancel',
    defeatSubtitle: 'Defense Breached',
    defeatTitle: 'All Friendly Sites Destroyed',
    victorySubtitle: 'Operation Complete',
    victoryTitle: 'All Enemy Targets Destroyed',
    wavesRepelled: 'Waves Survived',
    shotDownPvo: 'Intercepted',
    pvoAccuracy: 'ADS Accuracy',
    simTimeLabel: 'Sim Time',
    realTimeDefense: (s, e) => `Real time: ${s} s · Impacts: ${e}`,
    playAgainBtn: 'Play Again',
    toMenuBtn: 'Menu',
    restartShortBtn: 'Restart',
    airfieldBasePrefixUa: 'UA Airbase',
    airfieldBasePrefixRu: 'Airbase',
    aircraftOfBase: (n) => `Base Aircraft (${n})`,
    howManyBombs: 'How many bombs?',
    howManyMissiles: 'How many missiles?',
    boardsBack: '← Aircraft',
    upToWord: 'up to',
    totalDmgLabel: (d) => `Total -${d} HP`,
    mobileMapTab: 'Map',
    mobileTechTab: 'Units',
    mobileTelegramTab: 'Telegram',
    mobileSummaryTab: 'Stats',
  },
};

export function getUiText(lang: AppLang): UiText {
  return UI_TEXT[lang];
}

const MUNITION_TRANSLATIONS: Partial<
  Record<MunitionId, { uk?: { name: string; shortName: string; category: string }; en?: { name: string; shortName: string; category: string } }>
> = {
  'shahed-136': {
    uk: { name: 'Шахед-136', shortName: 'Шахед-136', category: 'БПЛА-камікадзе' },
    en: { name: 'Shahed-136', shortName: 'Shahed-136', category: 'Kamikaze UAV' },
  },
  'shahed-238': {
    uk: { name: 'Шахед-238', shortName: 'Шахед-238', category: 'Реактивний БПЛА' },
    en: { name: 'Shahed-238', shortName: 'Shahed-238', category: 'Jet UAV' },
  },
  banderol: {
    uk: { name: 'С-8000 «Бандероль»', shortName: 'Бандероль', category: 'Реактивна КР / БПЛА' },
    en: { name: 'S-8000 Banderol', shortName: 'Banderol', category: 'Jet Cruise / UAV' },
  },
  kalibr: {
    uk: { name: 'Калібр 3М-14', shortName: 'Калібр', category: 'Крилата ракета (ВМФ)' },
    en: { name: 'Kalibr 3M-14', shortName: 'Kalibr', category: 'Naval Cruise Missile' },
  },
  iskander: {
    uk: { name: 'Іскандер-М', shortName: 'Іскандер-М', category: 'Балістична ракета' },
    en: { name: 'Iskander-M', shortName: 'Iskander-M', category: 'Ballistic Missile' },
  },
  kh101: {
    uk: { name: 'Ракета Х-101', shortName: 'Х-101', category: 'Стратегічна КР' },
    en: { name: 'Kh-101 Missile', shortName: 'Kh-101', category: 'Air-Launched Cruise' },
  },
  neptune: {
    uk: { name: 'Р-360 Нептун', shortName: 'Нептун', category: 'Українська КР' },
    en: { name: 'R-360 Neptune', shortName: 'Neptune', category: 'UA Cruise Missile' },
  },
  airstrike: {
    uk: { name: 'Авіаудар', shortName: 'Авіаудар', category: 'Ударна авіація' },
    en: { name: 'Airstrike', shortName: 'Airstrike', category: 'Strike Aviation' },
  },
  'su57-kab': {
    uk: { name: 'Су-57 (пуск КАБ)', shortName: 'Су-57 · КАБ', category: 'Стелс-винищувач · КАБ' },
    en: { name: 'Su-57 (Glide Bomb)', shortName: 'Su-57 · FAB', category: 'Stealth Fighter · Glide' },
  },
  kab: {
    uk: { name: 'КАБ (УМПК)', shortName: 'КАБ · 75 км', category: 'Плануюча авіабомба' },
    en: { name: 'KAB (UMPK)', shortName: 'KAB · 75 km', category: 'Guided Glide Bomb' },
  },
  lyutyi: {
    uk: { name: 'БПЛА «Лютий» (АН-196)', shortName: 'Лютий', category: 'Український БПЛА' },
    en: { name: 'Lyutyi UAV (AN-196)', shortName: 'Lyutyi', category: 'UA Long-Range UAV' },
  },
  bober: {
    uk: { name: 'БПЛА «Бобер» (UJ-26)', shortName: 'Бобер', category: 'Український БПЛА' },
    en: { name: 'Bober UAV (UJ-26)', shortName: 'Bober', category: 'UA Strike UAV' },
  },
  palyanytsya: {
    uk: { name: '«Паляниця» (дрон-ракета)', shortName: 'Паляниця', category: 'Реакт. БПЛА ЗСУ' },
    en: { name: 'Palyanytsya Drone-Missile', shortName: 'Palyanytsya', category: 'UA Jet Drone-Missile' },
  },
  peklo: {
    uk: { name: '«Пекло» (ракета-дрон)', shortName: 'Пекло', category: 'Українська ракета-дрон' },
    en: { name: 'Peklo Missile-Drone', shortName: 'Peklo', category: 'UA Cruise Drone' },
  },
  sapsan: {
    uk: { name: 'ОТРК «Сапсан» (Грім-2)', shortName: 'Сапсан', category: 'Українська балістика' },
    en: { name: 'Sapsan OTRK (Hrim-2)', shortName: 'Sapsan', category: 'UA Ballistic Missile' },
  },
  flamingo: {
    uk: { name: 'КР «Фламінго» (FP-5)', shortName: 'Фламінго', category: 'Важка українська КР' },
    en: { name: 'Flamingo (FP-5)', shortName: 'Flamingo', category: 'Heavy UA Cruise Missile' },
  },
  kinzhal: {
    uk: { name: 'Х-47М2 «Кинджал»', shortName: 'Кинджал', category: 'Гіперзвукова ракета' },
    en: { name: 'Kh-47M2 Kinzhal', shortName: 'Kinzhal', category: 'Hypersonic Missile' },
  },
  kh22: {
    uk: { name: 'Ракета Х-22 / Х-32', shortName: 'Х-22', category: 'Надзвукова КР' },
    en: { name: 'Kh-22 / Kh-32', shortName: 'Kh-22', category: 'Supersonic Cruise' },
  },
  kh69: {
    uk: { name: 'Ракета Х-69', shortName: 'Х-69', category: 'Малопомітна КР' },
    en: { name: 'Kh-69 Missile', shortName: 'Kh-69', category: 'Stealth Cruise' },
  },
  'storm-shadow': {
    uk: { name: 'Storm Shadow / SCALP', shortName: 'Storm Shadow', category: 'Крилата ракета' },
    en: { name: 'Storm Shadow / SCALP', shortName: 'Storm Shadow', category: 'Stealth Cruise Missile' },
  },
  'aasm-hammer': {
    uk: { name: 'КАБ AASM Hammer', shortName: 'AASM Hammer', category: 'Плануюча КАБ' },
    en: { name: 'AASM Hammer', shortName: 'AASM Hammer', category: 'Guided Glide Bomb' },
  },
};

export function getMunitionLocalized(id: MunitionId, lang: AppLang) {
  const base = MUNITION_BY_ID[id];
  if (lang === 'ru') return base;
  const ov = MUNITION_TRANSLATIONS[id]?.[lang];
  return ov ? { ...base, ...ov } : base;
}

const PVO_TRANSLATIONS: Record<
  AirDefenseId,
  { uk: { name: string; shortName: string }; en: { name: string; shortName: string } }
> = {
  'mg-pickup': {
    uk: { name: 'МВГ «Пікап + Кулемет»', shortName: 'Кулемет МВГ' },
    en: { name: 'Mobile Fire Team (MG)', shortName: 'MG Pickup' },
  },
  gepard: {
    uk: { name: 'ЗСУ «Gepard»', shortName: 'Gepard' },
    en: { name: 'SPAAG Gepard', shortName: 'Gepard' },
  },
  'iris-t': {
    uk: { name: 'ЗРК «IRIS-T SLM»', shortName: 'IRIS-T' },
    en: { name: 'IRIS-T SLM SAM', shortName: 'IRIS-T' },
  },
  patriot: {
    uk: { name: 'ЗРК «Patriot»', shortName: 'Patriot' },
    en: { name: 'Patriot PAC-3', shortName: 'Patriot' },
  },
  s300: {
    uk: { name: 'ЗРК «С-300ПС»', shortName: 'С-300' },
    en: { name: 'S-300PS SAM', shortName: 'S-300' },
  },
  radar: {
    uk: { name: 'Радар ППО (РЛС 36Д6)', shortName: 'Радар ППО' },
    en: { name: '36D6 Air Radar', shortName: 'Radar' },
  },
};

export function getPvoLocalized(id: AirDefenseId, lang: AppLang) {
  const base = AIR_DEFENSE_BY_ID[id];
  if (lang === 'ru') return base;
  return { ...base, ...PVO_TRANSLATIONS[id][lang] };
}

const BUILDING_TRANSLATIONS: Record<
  BuildingId,
  {
    uk: { name: string; shortName: string; category: string; summary: string };
    en: { name: string; shortName: string; category: string; summary: string };
  }
> = {
  residential: {
    uk: { name: 'Житловий квартал', shortName: 'Квартал', category: 'Міська забудова', summary: 'Багатоповерховий житловий або адміністративний корпус' },
    en: { name: 'Residential Block', shortName: 'District', category: 'Urban Zone', summary: 'Multi-story residential or administrative block' },
  },
  factory: {
    uk: { name: 'Промисловий завод', shortName: 'Завод', category: 'Промисловість', summary: 'Виробничі цехи, при ураженні — детонація цеху' },
    en: { name: 'Industrial Plant', shortName: 'Factory', category: 'Industry', summary: 'Manufacturing workshops with secondary explosion risk' },
  },
  'gas-station': {
    uk: { name: 'АЗС (Заправка)', shortName: 'Заправка', category: 'Паливний вузол', summary: 'Паливні колонки та цистерни — вогняний спалах при ударі' },
    en: { name: 'Fuel Station', shortName: 'Fuel Stn', category: 'Fuel Node', summary: 'Fuel dispensers and tanks — fireball on impact' },
  },
  'oil-depot': {
    uk: { name: 'Нафтобаза / НПЗ', shortName: 'НПЗ', category: 'Паливно-енерг. вузол', summary: 'Резервуари ПММ — потужний вторинний вибух при прильоті' },
    en: { name: 'Oil Depot / Refinery', shortName: 'Refinery', category: 'Fuel & Energy', summary: 'Fuel storage tanks — large secondary detonation' },
  },
  'power-plant': {
    uk: { name: 'ТЕС / Підстанція', shortName: 'ТЕС', category: 'Енергетика', summary: 'Енергоблок і трансформаторне поле високої напруги' },
    en: { name: 'Thermal Power Plant', shortName: 'Power Plant', category: 'Power Grid', summary: 'Generation unit and high-voltage transformer yard' },
  },
  'ammo-depot': {
    uk: { name: 'Склад БК / Арсенал', shortName: 'Склад БК', category: 'Логістика та арсенал', summary: 'Арсенал боєприпасів — потужна вторинна детонація' },
    en: { name: 'Ammo Depot / Arsenal', shortName: 'Ammo Depot', category: 'Logistics', summary: 'Munitions depot with severe secondary blasts' },
  },
  port: {
    uk: { name: 'Морський / річковий порт', shortName: 'Порт', category: 'Портова інфраструктура', summary: 'Причали, крани, склади та паливні термінали' },
    en: { name: 'Sea / River Port', shortName: 'Port', category: 'Maritime Hub', summary: 'Piers, cranes, warehouses, and fuel terminals' },
  },
  'military-base': {
    uk: { name: 'Військова база', shortName: 'Військ. база', category: 'Оборонний об’єкт', summary: 'Укріплений гарнізон, бокси техніки та вузол зв’язку' },
    en: { name: 'Military Base', shortName: 'Mil. Base', category: 'Defense Facility', summary: 'Fortified garrison, vehicle bays, and comms hub' },
  },
  metallurgy: {
    uk: { name: 'Меткомбінат', shortName: 'Меткомбінат', category: 'Важка металургія', summary: 'Доменні печі, прокатні цехи та сталеплавильний вузол' },
    en: { name: 'Steel Works', shortName: 'Steelworks', category: 'Heavy Industry', summary: 'Blast furnaces and rolling mill complex' },
  },
  'railway-hub': {
    uk: { name: 'Залізничний вузол / Депо', shortName: 'З/Д вузол', category: 'Транспортна логістика', summary: 'Сортувальна станція, ешелони та локомотивне депо' },
    en: { name: 'Railway Hub / Depot', shortName: 'Rail Hub', category: 'Rail Logistics', summary: 'Marshaling yard, rolling stock, and depot' },
  },
  'command-center': {
    uk: { name: 'Командний пункт', shortName: 'Штаб / КП', category: 'Управління та зв’язок', summary: 'Захищений штаб управління, РЛС зв’язку та майданчик' },
    en: { name: 'Command Center', shortName: 'HQ / CP', category: 'C2 & Comms', summary: 'Hardened command bunker and communications node' },
  },
  bridge: {
    uk: { name: 'Стратегічний міст', shortName: 'Міст', category: 'Переправа та логістика', summary: 'Опорний річковий перехід, що з’єднує транспортні коридори' },
    en: { name: 'Strategic Bridge', shortName: 'Bridge', category: 'Crossing', summary: 'Major river crossing linking transport corridors' },
  },
};

export function getBuildingLocalized(id: BuildingId, lang: AppLang) {
  const base = BUILDING_BY_ID[id];
  if (lang === 'ru') return base;
  return { ...base, ...BUILDING_TRANSLATIONS[id][lang] };
}

const AIRCRAFT_TRANSLATIONS: Partial<
  Record<RussianAircraftId, { uk?: { name: string; shortName: string; role: string }; en?: { name: string; shortName: string; role: string } }>
> = {
  mig31k: {
    uk: { name: 'МіГ-31К', shortName: 'МіГ-31К', role: 'Носій гіперзвукового «Кинджала»' },
    en: { name: 'MiG-31K', shortName: 'MiG-31K', role: 'Hypersonic Kinzhal Carrier' },
  },
  tu95: {
    uk: { name: 'Ту-95МС', shortName: 'Ту-95МС', role: 'Стратегічний ракетоносець' },
    en: { name: 'Tu-95MS', shortName: 'Tu-95MS', role: 'Strategic Missile Bomber' },
  },
  tu22m3: {
    uk: { name: 'Ту-22М3', shortName: 'Ту-22М3', role: 'Дальній надзвуковий бомбардувальник' },
    en: { name: 'Tu-22M3', shortName: 'Tu-22M3', role: 'Supersonic Bomber' },
  },
  tu160: {
    uk: { name: 'Ту-160', shortName: 'Ту-160', role: 'Стратегічний ракетоносець' },
    en: { name: 'Tu-160', shortName: 'Tu-160', role: 'Strategic Heavy Bomber' },
  },
  'su57-x69': {
    uk: { name: 'Су-57 (Х-69)', shortName: 'Су-57', role: 'Малопомітний винищувач' },
    en: { name: 'Su-57 (Kh-69)', shortName: 'Su-57', role: 'Stealth Fighter' },
  },
  su24m: {
    uk: { name: 'Су-24М (ЗСУ)', shortName: 'Су-24М', role: 'Фронтовий бомбардувальник' },
    en: { name: 'Su-24M (UAF)', shortName: 'Su-24M', role: 'Tactical Bomber' },
  },
  mig29ua: {
    uk: { name: 'МіГ-29 (ЗСУ)', shortName: 'МіГ-29', role: 'Тактичний винищувач' },
    en: { name: 'MiG-29 (UAF)', shortName: 'MiG-29', role: 'Tactical Fighter' },
  },
  f16am: {
    uk: { name: 'F-16AM Fighting Falcon', shortName: 'F-16AM', role: 'Багатоцільовий винищувач' },
    en: { name: 'F-16AM Fighting Falcon', shortName: 'F-16AM', role: 'Multirole Fighter' },
  },
};

export function getAircraftLocalized(id: RussianAircraftId, lang: AppLang) {
  const base = RUSSIAN_AIRCRAFT_BY_ID[id];
  if (lang === 'ru') return base;
  const ov = AIRCRAFT_TRANSLATIONS[id]?.[lang];
  return ov ? { ...base, ...ov } : base;
}
