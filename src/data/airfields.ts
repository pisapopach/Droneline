import type { MunitionId } from './munitions';

export type AirfieldFaction = 'RU' | 'UA';

export type RussianAircraftId =
  | 'mig31k'
  | 'tu95'
  | 'tu22m3'
  | 'tu160'
  | 'su57-x69'
  | 'su24m'
  | 'mig29ua'
  | 'f16am';

export type AircraftId = RussianAircraftId;

export interface RussianAircraftSpec {
  id: RussianAircraftId;
  faction: AirfieldFaction;
  name: string;
  shortName: string;
  role: string;
  missileId: MunitionId;
  missileCount: number;
  realSpeedKmh: number;
  simSpeedKmPerSec: number;
  accentColor: string;
  exhaustColor: string;
  summary: string;
}

export interface RussianAirbasePreset {
  id: string;
  faction: AirfieldFaction;
  name: string;
  region: string;
  lat: number;
  lng: number;
  defaultAircraftId: RussianAircraftId;
  availableAircraftIds: RussianAircraftId[];
  summary: string;
}

export const RUSSIAN_AIRCRAFT: RussianAircraftSpec[] = [
  {
    id: 'mig31k',
    faction: 'RU',
    name: 'МиГ-31К',
    shortName: 'МиГ-31К',
    role: 'Носитель гиперзвукового «Кинжала»',
    missileId: 'kinzhal',
    missileCount: 1,
    realSpeedKmh: 2800,
    simSpeedKmPerSec: 52,
    accentColor: '#EF4444',
    exhaustColor: '#60A5FA',
    summary: 'Перехватчик с 1× гиперзвуковой аэробаллистической ракетой Х-47М2 «Кинжал»',
  },
  {
    id: 'tu95',
    faction: 'RU',
    name: 'Ту-95МС',
    shortName: 'Ту-95МС',
    role: 'Стратегический ракетоносец',
    missileId: 'kh101',
    missileCount: 4,
    realSpeedKmh: 830,
    simSpeedKmPerSec: 30,
    accentColor: '#A78BFA',
    exhaustColor: '#94A3B8',
    summary: 'Турбовинтовой стратег — несёт залп из 4× крылатых ракет Х-101',
  },
  {
    id: 'tu22m3',
    faction: 'RU',
    name: 'Ту-22М3',
    shortName: 'Ту-22М3',
    role: 'Дальний сверхзвуковой бомбардировщик',
    missileId: 'kh22',
    missileCount: 2,
    realSpeedKmh: 2000,
    simSpeedKmPerSec: 44,
    accentColor: '#F97316',
    exhaustColor: '#FB923C',
    summary: 'Сверхзвуковой ракетоносец — пуск 2× тяжёлых ракет Х-22/Х-32',
  },
  {
    id: 'tu160',
    faction: 'RU',
    name: 'Ту-160',
    shortName: 'Ту-160',
    role: 'Стратегический ракетоносец',
    missileId: 'kh101',
    missileCount: 6,
    realSpeedKmh: 2200,
    simSpeedKmPerSec: 46,
    accentColor: '#38BDF8',
    exhaustColor: '#FDE047',
    summary: '«Белый лебедь» — тяжёлый залп из 6× крылатых ракет Х-101',
  },
  {
    id: 'su57-x69',
    faction: 'RU',
    name: 'Су-57 (Х-69)',
    shortName: 'Су-57',
    role: 'Малозаметный истребитель',
    missileId: 'kh69',
    missileCount: 2,
    realSpeedKmh: 2100,
    simSpeedKmPerSec: 46,
    accentColor: '#C084FC',
    exhaustColor: '#60A5FA',
    summary: 'Стелс-носитель — скрытый пуск 2× малозаметных ракет Х-69',
  },
];

export const UKRAINIAN_AIRCRAFT: RussianAircraftSpec[] = [
  {
    id: 'su24m',
    faction: 'UA',
    name: 'Су-24М (ВСУ)',
    shortName: 'Су-24М',
    role: 'Фронтовой бомбардировщик',
    missileId: 'storm-shadow',
    missileCount: 2,
    realSpeedKmh: 1650,
    simSpeedKmPerSec: 40,
    accentColor: '#38BDF8',
    exhaustColor: '#FBBF24',
    summary: 'Носитель дальнобойных крылатых ракет Storm Shadow / SCALP (до 2×)',
  },
  {
    id: 'mig29ua',
    faction: 'UA',
    name: 'МиГ-29 (ВСУ)',
    shortName: 'МиГ-29',
    role: 'Тактический истребитель',
    missileId: 'aasm-hammer',
    missileCount: 2,
    realSpeedKmh: 1900,
    simSpeedKmPerSec: 44,
    accentColor: '#60A5FA',
    exhaustColor: '#38BDF8',
    summary: 'Маневренный носитель управляемых авиабомб AASM Hammer (до 2×)',
  },
  {
    id: 'f16am',
    faction: 'UA',
    name: 'F-16AM Fighting Falcon',
    shortName: 'F-16AM',
    role: 'Многоцелевой истребитель',
    missileId: 'storm-shadow',
    missileCount: 2,
    realSpeedKmh: 2100,
    simSpeedKmPerSec: 46,
    accentColor: '#FACC15',
    exhaustColor: '#60A5FA',
    summary: 'Западный истребитель ВСУ — пуск крылатых ракет Storm Shadow (до 2×)',
  },
];

export const ALL_AIRCRAFT: RussianAircraftSpec[] = [...RUSSIAN_AIRCRAFT, ...UKRAINIAN_AIRCRAFT];

export const RUSSIAN_AIRCRAFT_BY_ID: Record<RussianAircraftId, RussianAircraftSpec> =
  ALL_AIRCRAFT.reduce(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {} as Record<RussianAircraftId, RussianAircraftSpec>,
  );

export const RUSSIAN_AIRBASE_PRESETS: RussianAirbasePreset[] = [
  {
    id: 'savasleyka',
    faction: 'RU',
    name: 'Саваслейка',
    region: 'Нижегородская обл.',
    lat: 55.435,
    lng: 42.309,
    defaultAircraftId: 'mig31k',
    availableAircraftIds: ['mig31k'],
    summary: 'База носителей МиГ-31К «Кинжал»',
  },
  {
    id: 'engels',
    faction: 'RU',
    name: 'Энгельс-2',
    region: 'Саратовская обл.',
    lat: 51.482,
    lng: 46.203,
    defaultAircraftId: 'tu95',
    availableAircraftIds: ['tu95', 'tu160'],
    summary: 'База стратегической авиации Ту-95МС и Ту-160',
  },
  {
    id: 'shaykovka',
    faction: 'RU',
    name: 'Шайковка',
    region: 'Калужская обл.',
    lat: 54.226,
    lng: 34.369,
    defaultAircraftId: 'tu22m3',
    availableAircraftIds: ['tu22m3'],
    summary: 'Авиабаза Ту-22М3 (ракеты Х-22)',
  },
  {
    id: 'baltimore',
    faction: 'RU',
    name: 'Балтимор (Воронеж)',
    region: 'Воронежская обл.',
    lat: 51.622,
    lng: 39.152,
    defaultAircraftId: 'su57-x69',
    availableAircraftIds: ['su57-x69'],
    summary: 'Оперативный аэродром тактической авиации (Су-57)',
  },
  {
    id: 'mozdok',
    faction: 'RU',
    name: 'Моздок',
    region: 'Сев. Осетия',
    lat: 43.791,
    lng: 44.6,
    defaultAircraftId: 'tu22m3',
    availableAircraftIds: ['tu22m3', 'mig31k'],
    summary: 'Южный аэродром Ту-22М3 и МиГ-31К',
  },
  {
    id: 'olenya',
    faction: 'RU',
    name: 'Оленья',
    region: 'Мурманская обл.',
    lat: 68.151,
    lng: 33.462,
    defaultAircraftId: 'tu160',
    availableAircraftIds: ['tu160', 'tu95', 'tu22m3'],
    summary: 'Северная база Ту-160, Ту-95МС и Ту-22М3',
  },
];

export const UKRAINIAN_AIRBASE_PRESETS: RussianAirbasePreset[] = [
  {
    id: 'starokonstantinov',
    faction: 'UA',
    name: 'Староконстантинов',
    region: 'Хмельницкая обл.',
    lat: 49.748,
    lng: 27.272,
    defaultAircraftId: 'su24m',
    availableAircraftIds: ['su24m', 'f16am'],
    summary: 'Ключевая база Су-24М и F-16AM (Storm Shadow)',
  },
  {
    id: 'mirgorod',
    faction: 'UA',
    name: 'Миргород',
    region: 'Полтавская обл.',
    lat: 49.932,
    lng: 33.638,
    defaultAircraftId: 'mig29ua',
    availableAircraftIds: ['mig29ua', 'su24m'],
    summary: 'Оперативный аэродром МиГ-29 и Су-24М',
  },
  {
    id: 'ozernoe',
    faction: 'UA',
    name: 'Озёрное',
    region: 'Житомирская обл.',
    lat: 50.158,
    lng: 28.738,
    defaultAircraftId: 'f16am',
    availableAircraftIds: ['f16am', 'mig29ua'],
    summary: 'Авиабаза истребителей F-16AM и МиГ-29',
  },
  {
    id: 'vasylkiv',
    faction: 'UA',
    name: 'Васильков',
    region: 'Киевская обл.',
    lat: 50.233,
    lng: 30.3,
    defaultAircraftId: 'mig29ua',
    availableAircraftIds: ['mig29ua'],
    summary: 'Аэродром прикрытия Киевского направления (МиГ-29)',
  },
  {
    id: 'kulbakino',
    faction: 'UA',
    name: 'Кульбакино',
    region: 'Николаевская обл.',
    lat: 46.938,
    lng: 32.1,
    defaultAircraftId: 'su24m',
    availableAircraftIds: ['su24m'],
    summary: 'Южный аэродром Су-24М (Storm Shadow)',
  },
  {
    id: 'ivano_frankivsk',
    faction: 'UA',
    name: 'Ивано-Франковск',
    region: 'Ивано-Франковская обл.',
    lat: 48.884,
    lng: 24.686,
    defaultAircraftId: 'f16am',
    availableAircraftIds: ['f16am', 'su24m'],
    summary: 'Западная база F-16AM и Су-24М',
  },
];

