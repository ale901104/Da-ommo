import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  CloudSun,
  Download,
  Edit2,
  FlaskConical,
  Gauge,
  ImagePlus,
  Info,
  LogOut,
  Menu,
  Minus,
  Moon,
  Palette,
  Pin,
  PinOff,
  Plus,
  PlusCircle,
  RotateCcw,
  Settings,
  Shield,
  Smartphone,
  Sun,
  Swords,
  Trash2,
  X,
  Zap,
} from 'lucide-react';

import { movimientosIniciales, pokemonIniciales } from './datos.js';
import {
  ATTACKER_ABILITIES,
  DEFENDER_ABILITIES,
  ITEMS,
  NATURES,
  STAGE_KEYS,
  STAT_KEYS,
  STAT_LABELS,
  TYPES,
  TypeBadge,
  typeName,
  getPokemonAbilities,
  getPokemonMoves,
  type CustomAbility,
  type Move,
  type Pokemon,
  type PokemonTier,
  type StageKey,
  type StageValues,
  type StatKey,
  type StatValues,
} from './pokemon-constants';
import { usePWAInstall } from './hooks/use-pwa-install';
import { WeatherBackground } from './components/weather-background';
import { allGen1To5Pokemon, convertDexToPokemon } from './dex';
import { DexGeneralModal } from './components/DexGeneralModal';
import { PokemonSearchableSelect, getPokemonDexNum, getPokemonShowdownSpriteStyle } from './components/PokemonSearchableSelect';
import { TeamBuilderView } from './components/TeamBuilderView';
import { PokemonDexView } from './components/PokemonDexView';
import { MovesView } from './components/MovesView';
import { SettingsView } from './components/SettingsView';
import { InfoView } from './components/InfoView';

type ModalKind = 'pokemon' | 'movimiento' | 'apk-guide' | 'ivev-attacker' | 'ivev-defender' | 'dex-general' | null;
type Weather = 'none' | 'sun' | 'rain' | 'sand' | 'hail';
export interface FieldEffects {
  tailwind: boolean;
  trickRoom: boolean;
  lightScreen: boolean;
  reflect: boolean;
}

const DEFAULT_FIELD_EFFECTS: FieldEffects = {
  tailwind: false,
  trickRoom: false,
  lightScreen: false,
  reflect: false,
};

type BackgroundChoice = 'mint' | 'dusk' | 'aurora' | 'custom';
type ThemeChoice = 'light' | 'dark';

const STORAGE_KEY = 'pokemmo-calc-v2';

const DEFAULT_IVS: StatValues = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
const DEFAULT_EVS: StatValues = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
const DEFAULT_BOOSTS: StageValues = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

const createWallpaper = (top: string, bottom: string, accent: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1400" viewBox="0 0 800 1400"><defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs><rect width="800" height="1400" fill="url(%23g)"/><circle cx="690" cy="210" r="245" fill="${accent}" fill-opacity=".18"/><circle cx="120" cy="810" r="310" fill="#fff" fill-opacity=".12"/><path d="M0 980C170 870 360 1060 520 950s240-40 280-100v550H0Z" fill="${accent}" fill-opacity=".14"/><path d="M0 1110c180-105 320 70 510-25s240-75 290-30v345H0Z" fill="#fff" fill-opacity=".12"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

const BACKGROUNDS: { id: Exclude<BackgroundChoice, 'custom'>; name: string; image: string }[] = [
  { id: 'mint', name: 'Bruma marina', image: createWallpaper('#eaf4f1', '#dcebee', '#6bb39a') },
  { id: 'dusk', name: 'Atardecer', image: createWallpaper('#f6e4d8', '#e9dbe5', '#dc9b79') },
  { id: 'aurora', name: 'Aurora', image: createWallpaper('#dfece9', '#d8dff0', '#829bc5') },
];

const EFFECT: Record<string, Record<string, number>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5 },
};

const weatherOptions: [Weather, string][] = [
  ['none', 'Sin clima'],
  ['sun', 'Sol intenso (Desierto)'],
  ['rain', 'Lluvia torrencial'],
  ['sand', 'Tormenta de arena'],
  ['hail', 'Granizo y nieve'],
];

function safeInteger(value: unknown, fallback: number, min: number, max: number) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.floor(parsed))) : fallback;
}

function normalizeStatValues(value: unknown, fallback: StatValues, min: number, max: number): StatValues {
  const source = value && typeof value === 'object' ? (value as Partial<StatValues>) : {};
  return Object.fromEntries(STAT_KEYS.map(key => [key, safeInteger(source[key], fallback[key], min, max)])) as StatValues;
}

function normalizeBoostValues(value: unknown): StageValues {
  const source = value && typeof value === 'object' ? (value as Partial<StageValues>) : {};
  return Object.fromEntries(STAGE_KEYS.map(key => [key, safeInteger(source[key], 0, -6, 6)])) as StageValues;
}

function normalizeMove(value: unknown): Move {
  const row = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const statChangeRow = row.statChange && typeof row.statChange === 'object' ? (row.statChange as Record<string, unknown>) : null;
  const stage = statChangeRow && STAGE_KEYS.includes(statChangeRow.stat as StageKey) ? safeInteger(statChangeRow.stages, 0, -6, 6) : 0;
  return {
    id: typeof row.id === 'string' ? row.id : `mv-${Date.now()}`,
    nombre: typeof row.nombre === 'string' ? row.nombre.slice(0, 28) : 'Movimiento',
    tipo: typeof row.tipo === 'string' && TYPES.some(([id]) => id === row.tipo) ? row.tipo : 'normal',
    categoria: row.categoria === 'special' ? 'special' : 'physical',
    poder: safeInteger(row.poder, 80, 1, 250),
    priority: typeof row.priority === 'number' ? safeInteger(row.priority, 0, -6, 5) : 0,
    ...(statChangeRow && stage !== 0 ? { statChange: { stat: statChangeRow.stat as StageKey, stages: stage } } : {}),
  };
}

function normalizePokemon(value: unknown): Pokemon {
  const row = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const statDefaults: StatValues = { hp: 80, atk: 100, def: 80, spa: 80, spd: 80, spe: 80 };
  const nature = typeof row.nature === 'string' && NATURES.some(([id]) => id === row.nature) ? row.nature : 'adamant';
  const item = typeof row.item === 'string' && ITEMS.some(([id]) => id === row.item) ? row.item : 'none';
  const rawTier = typeof row.tier === 'string' ? row.tier : typeof row.categoria === 'string' ? row.categoria : 'ou';
  const tier: PokemonTier = ['ou', 'uu', 'nu'].includes(rawTier.toLowerCase()) ? (rawTier.toLowerCase() as PokemonTier) : 'ou';

  // Extract base stats supporting direct or stats/baseStats nested fields
  const statsObj = (row.baseStats && typeof row.baseStats === 'object'
    ? row.baseStats
    : row.estadisticas_base && typeof row.estadisticas_base === 'object'
    ? row.estadisticas_base
    : row.stats && typeof row.stats === 'object'
    ? row.stats
    : row) as Record<string, unknown>;

  // Extract abilities supporting both string IDs and object { id, nombre }
  let abilities: string[] = [];
  if (Array.isArray(row.abilities)) {
    abilities = (row.abilities as unknown[]).map(a => (typeof a === 'string' ? a : (a as Record<string, unknown>)?.id)).filter(Boolean) as string[];
  } else if (Array.isArray(row.habilidades)) {
    abilities = (row.habilidades as unknown[]).map(a => (typeof a === 'string' ? a : (a as Record<string, unknown>)?.id)).filter(Boolean) as string[];
  }

  // Extract learnset supporting both string IDs and object { id, nombre }
  let learnset: string[] = [];
  if (Array.isArray(row.learnset)) {
    learnset = (row.learnset as unknown[]).map(m => (typeof m === 'string' ? m : (m as Record<string, unknown>)?.id)).filter(Boolean) as string[];
  } else if (Array.isArray(row.movimientos)) {
    learnset = (row.movimientos as unknown[]).map(m => (typeof m === 'string' ? m : (m as Record<string, unknown>)?.id)).filter(Boolean) as string[];
  }

  return {
    id: typeof row.id === 'string' ? row.id : `pk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    nombre: typeof row.nombre === 'string' ? row.nombre.slice(0, 24) : 'Pokémon',
    tier,
    tipo1: typeof row.tipo1 === 'string' && TYPES.some(([id]) => id === row.tipo1) ? row.tipo1 : 'normal',
    tipo2: typeof row.tipo2 === 'string' && TYPES.some(([id]) => id === row.tipo2) ? row.tipo2 : '',
    hp: safeInteger(statsObj.hp ?? row.hp, statDefaults.hp, 1, 255),
    atk: safeInteger(statsObj.atk ?? statsObj.ataque ?? row.atk, statDefaults.atk, 1, 255),
    def: safeInteger(statsObj.def ?? statsObj.defensa ?? row.def, statDefaults.def, 1, 255),
    spa: safeInteger(statsObj.spa ?? statsObj.ataque_especial ?? row.spa, statDefaults.spa, 1, 255),
    spd: safeInteger(statsObj.spd ?? statsObj.defensa_especial ?? row.spd, statDefaults.spd, 1, 255),
    spe: safeInteger(statsObj.spe ?? statsObj.velocidad ?? row.spe, statDefaults.spe, 1, 255),
    ivs: normalizeStatValues(row.ivs, DEFAULT_IVS, 0, 31),
    evs: normalizeStatValues(row.evs, DEFAULT_EVS, 0, 252),
    nature,
    item,
    ability: typeof row.ability === 'string' && row.ability !== 'none' ? row.ability : abilities[0] || 'none',
    abilities,
    learnset,
    finalEvolution: typeof row.finalEvolution === 'boolean' ? row.finalEvolution : true,
    boosts: normalizeBoostValues(row.boosts),
  };
}

function loadSaved() {
  const initialPkList = (pokemonIniciales as unknown[]).map(normalizePokemon);
  const initialPkMap = new Map(initialPkList.map(p => [p.id, p]));
  const initialMvList = (movimientosIniciales as unknown[]).map(normalizeMove);
  const initialMvMap = new Map(initialMvList.map(m => [m.id, m]));

  let equipoOU: Pokemon[] = [];
  let equipoUU: Pokemon[] = [];
  let equipoNU: Pokemon[] = [];
  let movimientos: Move[] = [...initialMvList];
  let habilidades: CustomAbility[] = [];
  let background: BackgroundChoice = 'mint';
  let customBackground = '';
  let theme: ThemeChoice = 'light';

  const rawOU = localStorage.getItem('equipoOU');
  const rawUU = localStorage.getItem('equipoUU');
  const rawNU = localStorage.getItem('equipoNU');

  if (rawOU !== null || rawUU !== null || rawNU !== null) {
    if (rawOU) {
      try {
        const parsed = JSON.parse(rawOU);
        if (Array.isArray(parsed)) equipoOU = parsed.map(p => normalizePokemon({ ...p, tier: 'ou' }));
      } catch {
        // ignore
      }
    }
    if (rawUU) {
      try {
        const parsed = JSON.parse(rawUU);
        if (Array.isArray(parsed)) equipoUU = parsed.map(p => normalizePokemon({ ...p, tier: 'uu' }));
      } catch {
        // ignore
      }
    }
    if (rawNU) {
      try {
        const parsed = JSON.parse(rawNU);
        if (Array.isArray(parsed)) equipoNU = parsed.map(p => normalizePokemon({ ...p, tier: 'nu' }));
      } catch {
        // ignore
      }
    }
  } else {
    // Migration from legacy single-list storage if any exists
    try {
      const stored = localStorage.getItem('pokemmo-calc-v3') || localStorage.getItem(STORAGE_KEY) || localStorage.getItem('pokemmo-calc-v1');
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, unknown>;
        if (Array.isArray(parsed.pokemon)) {
          for (const item of parsed.pokemon) {
            const p = normalizePokemon(item);
            if (p.tier === 'uu') equipoUU.push(p);
            else if (p.tier === 'nu') equipoNU.push(p);
            else equipoOU.push({ ...p, tier: 'ou' });
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // Ensure default Pokémon are present in equipoOU
  if (equipoOU.length === 0) {
    equipoOU = initialPkList.map(p => ({ ...p, tier: 'ou' as PokemonTier }));
  } else {
    const allIds = new Set([...equipoOU, ...equipoUU, ...equipoNU].map(p => p.id));
    for (const [id, def] of initialPkMap.entries()) {
      if (!allIds.has(id)) {
        equipoOU.push(def);
      }
    }
  }

  // Load other persistent settings
  try {
    const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('pokemmo-calc-v3') || localStorage.getItem('pokemmo-calc-v1');
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, unknown>;
      if (Array.isArray(parsed.movimientos)) {
        const savedMv = parsed.movimientos.map(normalizeMove);
        const combinedMv = [...savedMv];
        const seenMv = new Set(savedMv.map(m => m.id));
        for (const [id, mv] of initialMvMap.entries()) {
          if (!seenMv.has(id)) combinedMv.push(mv);
        }
        movimientos = combinedMv;
      }
      if (Array.isArray(parsed.habilidades)) {
        habilidades = parsed.habilidades as CustomAbility[];
      }
      if (['mint', 'dusk', 'aurora', 'custom'].includes(String(parsed.background))) {
        background = parsed.background as BackgroundChoice;
      }
      if (typeof parsed.customBackground === 'string' && parsed.customBackground.startsWith('data:image/')) {
        customBackground = parsed.customBackground;
      }
      if (parsed.theme === 'dark') {
        theme = 'dark';
      }
    }
  } catch {
    // ignore
  }

  // Immediately ensure separate LocalStorage keys are written
  try {
    localStorage.setItem('equipoOU', JSON.stringify(equipoOU));
    localStorage.setItem('equipoUU', JSON.stringify(equipoUU));
    localStorage.setItem('equipoNU', JSON.stringify(equipoNU));
  } catch {
    // ignore
  }

  let lockCustomBackground = false;
  try {
    lockCustomBackground = localStorage.getItem('lockCustomBackground') === 'true';
  } catch {
    // ignore
  }

  let dexCustomizations: Record<string, Partial<Pokemon>> = {};
  try {
    const rawDexCust = localStorage.getItem('pokemmo-dex-customizations');
    if (rawDexCust) {
      const parsed = JSON.parse(rawDexCust);
      if (parsed && typeof parsed === 'object') {
        dexCustomizations = parsed;
      }
    }
  } catch {
    // ignore
  }

  return {
    equipoOU,
    equipoUU,
    equipoNU,
    dexCustomizations,
    movimientos,
    habilidades,
    background,
    customBackground,
    lockCustomBackground,
    theme,
  };
}

function stat(pokemon: Pokemon, key: StatKey, level: number) {
  const core = Math.floor(((2 * pokemon[key] + pokemon.ivs[key] + Math.floor(pokemon.evs[key] / 4)) * level) / 100);
  if (key === 'hp') return core + level + 10;
  const base = core + 5;
  const nature = NATURES.find(([id]) => id === pokemon.nature);
  if (!nature || nature[2] === nature[3]) return base;
  return Math.floor(base * (nature[2] === key ? 1.1 : nature[3] === key ? 0.9 : 1));
}

function applyStage(value: number, stage: number) {
  const level = Math.max(-6, Math.min(6, stage));
  return Math.floor(value * (level >= 0 ? (2 + level) / 2 : 2 / (2 - level)));
}

function moveStageOutcome(attacker: Pokemon, move: Move, ability: string, customAbility?: CustomAbility) {
  if (!move.statChange) return null;
  const { stat: key, stages } = move.statChange;
  const contraryActive =
    ability === 'contrary' || (customAbility?.effect === 'contrary' && (!customAbility.moveId || customAbility.moveId === move.id));
  const requestedChange = contraryActive ? -stages : stages;
  const next = Math.max(-6, Math.min(6, attacker.boosts[key] + requestedChange));
  return { stat: key, delta: next - attacker.boosts[key], next };
}

function effectiveness(moveType: string, defender: Pokemon) {
  const first = EFFECT[moveType]?.[defender.tipo1] ?? 1;
  const second = defender.tipo2 ? EFFECT[moveType]?.[defender.tipo2] ?? 1 : 1;
  return first * second;
}

function fmt(n: number) {
  return Math.max(0, Math.floor(n)).toLocaleString('es-ES');
}

function compressBackground(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      try {
        const scale = Math.min(1, 1440 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('No se pudo procesar la imagen.');
        context.fillStyle = '#eaf4f2';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        let result = canvas.toDataURL('image/jpeg', 0.76);
        if (result.length > 1_650_000) result = canvas.toDataURL('image/jpeg', 0.56);
        if (result.length > 1_850_000) throw new Error('La imagen es demasiado grande. Prueba una imagen más pequeña.');
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo abrir esta imagen.'));
    };
    image.src = url;
  });
}

export type AppView = 'dex' | 'calc' | 'moves' | 'builder' | 'settings' | 'info';

export const DRAWER_ITEMS = [
  { id: 'dex', label: 'Pokemon dex', icon: BookOpen },
  { id: 'calc', label: 'Calculadora', icon: Swords },
  { id: 'moves', label: 'Movimientos', icon: Zap },
  { id: 'builder', label: 'Builder', icon: FlaskConical },
  { id: 'settings', label: 'Configuración', icon: Palette },
  { id: 'info', label: 'Información', icon: CircleHelp },
  { id: 'salir', label: 'Salir', icon: LogOut },
] as const;

function App() {
  const initial = useMemo(loadSaved, []);
  const [equipoOU, setEquipoOU] = useState<Pokemon[]>(initial.equipoOU);
  const [equipoUU, setEquipoUU] = useState<Pokemon[]>(initial.equipoUU);
  const [equipoNU, setEquipoNU] = useState<Pokemon[]>(initial.equipoNU);
  const [moves, setMoves] = useState<Move[]>(initial.movimientos);
  const [customAbilities, setCustomAbilities] = useState<CustomAbility[]>(initial.habilidades);
  const [background, setBackground] = useState<BackgroundChoice>(initial.background);
  const [customBackground, setCustomBackground] = useState(initial.customBackground);
  const [theme, setTheme] = useState<ThemeChoice>(initial.theme);
  const [lockCustomBackground, setLockCustomBackground] = useState<boolean>(initial.lockCustomBackground);

  useEffect(() => {
    try {
      localStorage.setItem('lockCustomBackground', String(lockCustomBackground));
    } catch {
      // ignore
    }
  }, [lockCustomBackground]);

  const [dexCustomizations, setDexCustomizations] = useState<Record<string, Partial<Pokemon>>>(
    initial.dexCustomizations ?? {},
  );

  useEffect(() => {
    try {
      localStorage.setItem('pokemmo-dex-customizations', JSON.stringify(dexCustomizations));
    } catch {
      // ignore
    }
  }, [dexCustomizations]);

  // Combined pokemon list for calculation lookups: Gen 1-5 Dex plus custom team overrides and Dex customizations
  const pokemon = useMemo(() => {
    const map = new Map<string, Pokemon>();
    for (const p of allGen1To5Pokemon) {
      const custom = dexCustomizations[p.id];
      map.set(p.id, custom ? { ...p, ...custom } : p);
    }
    for (const p of equipoOU) {
      const custom = dexCustomizations[p.id];
      map.set(p.id, custom ? { ...p, ...custom } : p);
    }
    for (const p of equipoUU) {
      const custom = dexCustomizations[p.id];
      map.set(p.id, custom ? { ...p, ...custom } : p);
    }
    for (const p of equipoNU) {
      const custom = dexCustomizations[p.id];
      map.set(p.id, custom ? { ...p, ...custom } : p);
    }
    return Array.from(map.values());
  }, [equipoOU, equipoUU, equipoNU, dexCustomizations]);

  const [attackerId, setAttackerId] = useState(initial.equipoOU[0]?.id ?? '');
  const [defenderId, setDefenderId] = useState(initial.equipoOU[1]?.id ?? initial.equipoOU[0]?.id ?? '');
  const [moveId, setMoveId] = useState(initial.movimientos[0]?.id ?? '');

  const [attackerLevel, setAttackerLevel] = useState(50);
  const [defenderLevel, setDefenderLevel] = useState(50);

  // Independent abilities
  const [attackerAbility, setAttackerAbility] = useState('none');
  const [defenderAbility, setDefenderAbility] = useState('none');

  const [weather, setWeather] = useState<Weather>('none');
  const [critical, setCritical] = useState(false);
  const [attackerBurned, setAttackerBurned] = useState(false);
  const [attackerPoisoned, setAttackerPoisoned] = useState(false);
  const [defenderBurned, setDefenderBurned] = useState(false);
  const [defenderPoisoned, setDefenderPoisoned] = useState(false);
  const [attackerField, setAttackerField] = useState<FieldEffects>(DEFAULT_FIELD_EFFECTS);
  const [defenderField, setDefenderField] = useState<FieldEffects>(DEFAULT_FIELD_EFFECTS);

  const toggleAttackerField = (key: keyof FieldEffects) => {
    setAttackerField(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleDefenderField = (key: keyof FieldEffects) => {
    setDefenderField(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAttackerBurned = () => {
    setAttackerBurned(prev => {
      const next = !prev;
      if (next) setAttackerPoisoned(false);
      return next;
    });
  };

  const toggleAttackerPoisoned = () => {
    setAttackerPoisoned(prev => {
      const next = !prev;
      if (next) setAttackerBurned(false);
      return next;
    });
  };

  const toggleDefenderBurned = () => {
    setDefenderBurned(prev => {
      const next = !prev;
      if (next) setDefenderPoisoned(false);
      return next;
    });
  };

  const toggleDefenderPoisoned = () => {
    setDefenderPoisoned(prev => {
      const next = !prev;
      if (next) setDefenderBurned(false);
      return next;
    });
  };

  const [drawer, setDrawer] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>('calc');
  const [openSections, setOpenSections] = useState({ pokemon: true, moves: false, abilities: false, backgrounds: false });
  const [openTiers, setOpenTiers] = useState<{ dex: boolean; ou: boolean; uu: boolean; nu: boolean }>({
    dex: true,
    ou: true,
    uu: false,
    nu: false,
  });
  const [activeTier, setActiveTier] = useState<'ou' | 'uu' | 'nu'>('ou');
  const [tierViewMode, setTierViewMode] = useState<'form' | 'list'>('list');
  const [modal, setModal] = useState<ModalKind>(null);
  const [editing, setEditing] = useState<Pokemon | Move | null>(null);
  const [toast, setToast] = useState('');

  // Handlers for switching views and passing data
  const handleSelectAttackerFromDexView = (pk: Pokemon) => {
    setAttackerId(pk.id);
    setAttackerAbility('none');
    setCurrentView('calc');
    setToast(`⚡ ${pk.nombre} cargado como Atacante.`);
  };

  const handleSelectDefenderFromDexView = (pk: Pokemon) => {
    setDefenderId(pk.id);
    setDefenderAbility('none');
    setCurrentView('calc');
    setToast(`🛡️ ${pk.nombre} cargado como Defensor.`);
  };

  const handleAddToBuilder = (pk: Pokemon) => {
    try {
      const rawSaved = localStorage.getItem('pokemmo-builder-team-v1');
      let team = rawSaved ? JSON.parse(rawSaved) : [];
      if (!Array.isArray(team) || team.length !== 6) {
        team = Array.from({ length: 6 }, (_, i) => ({
          id: `slot-${i + 1}`,
          pokemonId: '',
          nombre: '',
          item: 'life-orb',
          ability: 'none',
          nature: 'adamant',
          moves: ['', '', '', ''],
          evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
          level: 50,
        }));
      }
      const emptyIdx = team.findIndex((s: any) => !s.pokemonId);
      const targetIdx = emptyIdx !== -1 ? emptyIdx : 0;
      const pkMoves = getPokemonMoves(pk.id);
      team[targetIdx] = {
        ...team[targetIdx],
        pokemonId: pk.id,
        nombre: pk.nombre,
        ability: pk.habilidad || 'none',
        nature: pk.nature || 'adamant',
        item: pk.item || 'life-orb',
        moves: [pkMoves[0]?.id || '', pkMoves[1]?.id || '', pkMoves[2]?.id || '', pkMoves[3]?.id || ''],
      };
      localStorage.setItem('pokemmo-builder-team-v1', JSON.stringify(team));
      setCurrentView('builder');
      setToast(`🧪 ${pk.nombre} añadido al Slot #${targetIdx + 1} del Builder.`);
    } catch {
      setCurrentView('builder');
    }
  };

  const handleSendFromBuilderToCalc = (pk: Pokemon, role: 'attacker' | 'defender', moveName?: string) => {
    if (role === 'attacker') {
      setAttackerId(pk.id);
      setAttackerAbility(pk.habilidad || 'none');
      setAttackerLevel(50);
      if (moveName) {
        const matchMove = moves.find(
          m =>
            m.nombre.toLowerCase() === moveName.toLowerCase() ||
            m.id.toLowerCase() === moveName.toLowerCase()
        );
        if (matchMove) setMoveId(matchMove.id);
      }
      setToast(`⚡ ${pk.nombre} cargado como Atacante desde el Builder.`);
    } else {
      setDefenderId(pk.id);
      setDefenderAbility(pk.habilidad || 'none');
      setDefenderLevel(50);
      setToast(`🛡️ ${pk.nombre} cargado como Defensor desde el Builder.`);
    }
    setCurrentView('calc');
  };

  const handleSelectMoveInCalc = (mId: string) => {
    setMoveId(mId);
    setCurrentView('calc');
  };

  const handleDeleteMove = (moveId: string) => {
    setMoves(prev => prev.filter(m => m.id !== moveId));
    setToast('Movimiento eliminado.');
  };

  // Dex General selection state
  const [dexTargetRole, setDexTargetRole] = useState<'attacker' | 'defender' | null>(null);
  const [dexInitialGen, setDexInitialGen] = useState<number>(0);

  function openDexGeneral(targetRole: 'attacker' | 'defender' | null = null, gen = 0) {
    setDexTargetRole(targetRole);
    setDexInitialGen(gen);
    setModal('dex-general');
  }

  function handleAddFromDexToTeam(pk: Pokemon, tier: 'ou' | 'uu' | 'nu') {
    const newPk: Pokemon = {
      ...pk,
      id: `${pk.id}-${Date.now().toString(36)}`,
      tier,
      categoria: tier,
    };
    if (tier === 'ou') {
      setEquipoOU(list => [...list, newPk]);
      setToast(`${pk.nombre} añadido al equipo OU.`);
    } else if (tier === 'uu') {
      setEquipoUU(list => [...list, newPk]);
      setToast(`${pk.nombre} añadido al equipo UU.`);
    } else if (tier === 'nu') {
      setEquipoNU(list => [...list, newPk]);
      setToast(`${pk.nombre} añadido al equipo NU.`);
    }
  }

  function handleSelectAttackerFromDex(pk: Pokemon) {
    handleAttackerChange(pk.id);
    setToast(`${pk.nombre} cargado como Atacante.`);
  }

  function handleSelectDefenderFromDex(pk: Pokemon) {
    handleDefenderChange(pk.id);
    setToast(`${pk.nombre} cargado como Defensor.`);
  }

  // PWA Install hook
  const { isInstallable, isInstalled, install } = usePWAInstall();

  // Save changes locally in separated lists for each tier (equipoOU, equipoUU, equipoNU)
  useEffect(() => {
    try {
      localStorage.setItem('equipoOU', JSON.stringify(equipoOU));
    } catch {
      setToast('No se pudo guardar el equipo OU.');
    }
  }, [equipoOU]);

  useEffect(() => {
    try {
      localStorage.setItem('equipoUU', JSON.stringify(equipoUU));
    } catch {
      setToast('No se pudo guardar el equipo UU.');
    }
  }, [equipoUU]);

  useEffect(() => {
    try {
      localStorage.setItem('equipoNU', JSON.stringify(equipoNU));
    } catch {
      setToast('No se pudo guardar el equipo NU.');
    }
  }, [equipoNU]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          movimientos: moves,
          habilidades: customAbilities,
          background,
          customBackground,
          theme,
        }),
      );
    } catch {
      setToast('No se pudo guardar la configuración.');
    }
  }, [moves, customAbilities, background, customBackground, theme]);

  useEffect(() => {
    if (toast) {
      const timer = window.setTimeout(() => setToast(''), 2400);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [toast]);

  // Ensure active IDs exist
  useEffect(() => {
    if (!pokemon.some(p => p.id === attackerId)) setAttackerId(pokemon[0]?.id ?? '');
    if (!pokemon.some(p => p.id === defenderId)) setDefenderId(pokemon.find(p => p.id !== attackerId)?.id ?? pokemon[0]?.id ?? '');
  }, [pokemon, attackerId, defenderId]);

  useEffect(() => {
    if (!moves.some(m => m.id === moveId)) setMoveId(moves[0]?.id ?? '');
  }, [moves, moveId]);

  const attacker = pokemon.find(p => p.id === attackerId);
  const defender = pokemon.find(p => p.id === defenderId);
  const move = moves.find(m => m.id === moveId);

  // Allowed abilities strictly based on selected Pokémon
  const attackerAllowedAbilities = useMemo(() => {
    return getPokemonAbilities(attacker);
  }, [attacker]);

  const defenderAllowedAbilities = useMemo(() => {
    return getPokemonAbilities(defender);
  }, [defender]);

  // Allowed moves strictly based on attacker's learnset
  const attackerAllowedMoves = useMemo(() => {
    return getPokemonMoves(attacker, moves);
  }, [attacker, moves]);

  // Grouped Pokémon by Tier (OU, UU, NU, Custom)
  const ouPokemon = equipoOU;
  const uuPokemon = equipoUU;
  const nuPokemon = equipoNU;
  const customPokemon: Pokemon[] = [];

  function openAddPokemonForTier(tier: 'ou' | 'uu' | 'nu') {
    setActiveTier(tier);
    setEditing(null);
    setTierViewMode('form');
    setModal('pokemon');
  }

  function openManageTeamForTier(tier: 'ou' | 'uu' | 'nu') {
    setActiveTier(tier);
    setEditing(null);
    setTierViewMode('list');
    setModal('pokemon');
  }

  // Automatically update and clean abilities when Pokémon changes
  useEffect(() => {
    if (attackerAllowedAbilities.length > 0) {
      const exists = attackerAllowedAbilities.some(([id]) => id === attackerAbility);
      if (!exists) {
        setAttackerAbility(attackerAllowedAbilities[0][0]);
      }
    }
  }, [attackerAllowedAbilities, attackerAbility]);

  useEffect(() => {
    if (defenderAllowedAbilities.length > 0) {
      const exists = defenderAllowedAbilities.some(([id]) => id === defenderAbility);
      if (!exists) {
        setDefenderAbility(defenderAllowedAbilities[0][0]);
      }
    }
  }, [defenderAllowedAbilities, defenderAbility]);

  // Automatically update and clean moves when Attacker changes
  useEffect(() => {
    if (attackerAllowedMoves.length > 0) {
      const exists = attackerAllowedMoves.some(m => m.id === moveId);
      if (!exists) {
        setMoveId(attackerAllowedMoves[0].id);
      }
    }
  }, [attackerAllowedMoves, moveId]);

  // Handlers for switching Pokémon with automatic clearing and loading of abilities & moves
  const handleAttackerChange = (newId: string) => {
    setAttackerId(newId);
    const nextPk = pokemon.find(p => p.id === newId);
    if (nextPk) {
      const nextAbilities = getPokemonAbilities(nextPk);
      setAttackerAbility(nextAbilities[0]?.[0] ?? 'none');
      const nextMoves = getPokemonMoves(nextPk, moves);
      if (nextMoves.length > 0) {
        setMoveId(nextMoves[0].id);
      }
    }
  };

  const handleDefenderChange = (newId: string) => {
    setDefenderId(newId);
    const nextPk = pokemon.find(p => p.id === newId);
    if (nextPk) {
      const nextAbilities = getPokemonAbilities(nextPk);
      setDefenderAbility(nextAbilities[0]?.[0] ?? 'none');
    }
  };

  const customAbility = customAbilities.find(candidate => attackerAbility === `custom-${candidate.id}`);
  const customAbilityMatches = !customAbility?.moveId || customAbility.moveId === move?.id;

  // --- Speed Calculation (Requirement 3: Who attacks first) ---
  const speedCalc = useMemo(() => {
    if (!attacker || !defender) return null;

    // Attacker speed
    const rawAttackerSpe = stat(attacker, 'spe', attackerLevel);
    const stagedAttackerSpe = applyStage(rawAttackerSpe, attacker.boosts.spe);
    let atkItemMod = 1;
    let atkItemNote = '';
    if (attacker.item === 'choice-scarf') {
      atkItemMod = 1.5;
      atkItemNote = 'Pañuelo Elegido (×1,5)';
    } else if (attacker.item === 'iron-ball') {
      atkItemMod = 0.5;
      atkItemNote = 'Bola Férrea (×0,5)';
    }

    let atkAbilityMod = 1;
    let atkAbilityNote = '';
    if (attackerAbility === 'swift-swim' && weather === 'rain') {
      atkAbilityMod = 2;
      atkAbilityNote = 'Nado Rápido en Lluvia (×2)';
    } else if (attackerAbility === 'chlorophyll' && weather === 'sun') {
      atkAbilityMod = 2;
      atkAbilityNote = 'Clorofila en Sol (×2)';
    } else if (attackerAbility === 'sand-rush' && weather === 'sand') {
      atkAbilityMod = 2;
      atkAbilityNote = 'Ímpetu Arena (×2)';
    } else if (attackerAbility === 'slush-rush' && weather === 'hail') {
      atkAbilityMod = 2;
      atkAbilityNote = 'Quitanieves (×2)';
    }

    if (attackerAbility === 'quick-feet' && (attackerBurned || attackerPoisoned)) {
      atkAbilityMod *= 1.5;
      atkAbilityNote = 'Pies Rápidos con estado (×1,5)';
    }

    const atkFieldMod = attackerField.tailwind ? 2 : 1;
    const atkFieldNote = attackerField.tailwind ? 'Viento Afín en campo propio (×2)' : '';
    const finalAttackerSpe = Math.floor(stagedAttackerSpe * atkItemMod * atkAbilityMod * atkFieldMod);

    // Defender speed
    const rawDefenderSpe = stat(defender, 'spe', defenderLevel);
    const stagedDefenderSpe = applyStage(rawDefenderSpe, defender.boosts.spe);
    let defItemMod = 1;
    let defItemNote = '';
    if (defender.item === 'choice-scarf') {
      defItemMod = 1.5;
      defItemNote = 'Pañuelo Elegido (×1,5)';
    } else if (defender.item === 'iron-ball') {
      defItemMod = 0.5;
      defItemNote = 'Bola Férrea (×0,5)';
    }

    let defAbilityMod = 1;
    let defAbilityNote = '';
    if (defenderAbility === 'swift-swim' && weather === 'rain') {
      defAbilityMod = 2;
      defAbilityNote = 'Nado Rápido en Lluvia (×2)';
    } else if (defenderAbility === 'chlorophyll' && weather === 'sun') {
      defAbilityMod = 2;
      defAbilityNote = 'Clorofila en Sol (×2)';
    } else if (defenderAbility === 'sand-rush' && weather === 'sand') {
      defAbilityMod = 2;
      defAbilityNote = 'Ímpetu Arena (×2)';
    } else if (defenderAbility === 'slush-rush' && weather === 'hail') {
      defAbilityMod = 2;
      defAbilityNote = 'Quitanieves (×2)';
    }

    if (defenderAbility === 'quick-feet' && (defenderBurned || defenderPoisoned)) {
      defAbilityMod *= 1.5;
      defAbilityNote = 'Pies Rápidos con estado (×1,5)';
    }

    const defFieldMod = defenderField.tailwind ? 2 : 1;
    const defFieldNote = defenderField.tailwind ? 'Viento Afín en campo rival (×2)' : '';
    const finalDefenderSpe = Math.floor(stagedDefenderSpe * defItemMod * defAbilityMod * defFieldMod);

    const isTrickRoom = attackerField.trickRoom || defenderField.trickRoom;

    // Priority Check
    const movePriority = move?.priority ?? (
      move?.id === 'extreme-speed' ? 2 :
      ['bullet-punch', 'aqua-jet', 'mach-punch', 'ice-shard', 'shadow-sneak', 'quick-attack', 'sucker-punch'].includes(move?.id ?? '') ? 1 :
      0
    );

    let winner: 'attacker' | 'defender' | 'tie' = 'attacker';
    let headline = '';
    let detail = '';

    if (movePriority > 0) {
      winner = 'attacker';
      headline = `⚡ ${attacker.nombre} ataca primero (Prioridad +${movePriority})`;
      detail = `${move?.nombre || 'Movimiento'} tiene prioridad +${movePriority}. Ataca antes que ataques normales.`;
    } else if (movePriority < 0) {
      winner = 'defender';
      headline = `🛡️ ${defender.nombre} ataca primero (Prioridad negativa)`;
      detail = `${move?.nombre || 'Movimiento'} tiene prioridad ${movePriority}. El defensor actúa antes.`;
    } else {
      if (finalAttackerSpe === finalDefenderSpe) {
        winner = 'tie';
        headline = `⚔️ Empate de velocidad (${finalAttackerSpe} Vel)`;
        detail = `Ambos Pokémon tienen exactamente la misma velocidad. Probabilidad de turno: 50% / 50%.`;
      } else if (isTrickRoom) {
        if (finalAttackerSpe < finalDefenderSpe) {
          winner = 'attacker';
          headline = `🌀 ${attacker.nombre} ataca primero por Espacio Raro (${finalAttackerSpe} vs ${finalDefenderSpe} Vel)`;
          detail = `En Espacio Raro el Pokémon más lento ataca primero. El atacante es más lento.`;
        } else {
          winner = 'defender';
          headline = `🌀 ${defender.nombre} ataca primero por Espacio Raro (${finalDefenderSpe} vs ${finalAttackerSpe} Vel)`;
          detail = `En Espacio Raro el Pokémon más lento ataca primero. El defensor es más lento.`;
        }
      } else {
        if (finalAttackerSpe > finalDefenderSpe) {
          winner = 'attacker';
          headline = `⚡ ${attacker.nombre} ataca primero (${finalAttackerSpe} vs ${finalDefenderSpe} Vel)`;
          detail = `Ventaja de velocidad de +${finalAttackerSpe - finalDefenderSpe} puntos para el atacante.`;
        } else {
          winner = 'defender';
          headline = `🛡️ ${defender.nombre} ataca primero (${finalDefenderSpe} vs ${finalAttackerSpe} Vel)`;
          detail = `El rival supera en +${finalDefenderSpe - finalAttackerSpe} puntos de velocidad al atacante.`;
        }
      }
    }

    const maxSpeed = Math.max(1, Math.max(finalAttackerSpe, finalDefenderSpe));

    return {
      finalAttackerSpe,
      finalDefenderSpe,
      rawAttackerSpe,
      rawDefenderSpe,
      movePriority,
      winner,
      headline,
      detail,
      isTrickRoom,
      attackerBarPct: (finalAttackerSpe / maxSpeed) * 100,
      defenderBarPct: (finalDefenderSpe / maxSpeed) * 100,
      atkItemNote,
      atkAbilityNote,
      atkFieldNote,
      defItemNote,
      defAbilityNote,
      defFieldNote,
    };
  }, [
    attacker,
    defender,
    move,
    attackerLevel,
    defenderLevel,
    attackerAbility,
    defenderAbility,
    weather,
    attackerField,
    defenderField,
    attackerBurned,
    attackerPoisoned,
    defenderBurned,
    defenderPoisoned,
  ]);

  // --- Damage Calculation ---
  const calc = useMemo(() => {
    if (!attacker || !defender || !move) return null;

    const attackKey: StageKey = move.categoria === 'physical' ? 'atk' : 'spa';
    const defenseKey: StageKey = move.categoria === 'physical' ? 'def' : 'spd';
    const hp = stat(defender, 'hp', defenderLevel);

    let attackStage = attacker.boosts[attackKey];
    let defenseStage = defender.boosts[defenseKey];

    // Defender ability Unaware ignores attacker attack boosts
    if (defenderAbility === 'unaware' && attackStage > 0) {
      attackStage = 0;
    }

    if (critical && attackStage < 0) attackStage = 0;
    if (critical && defenseStage > 0) defenseStage = 0;

    // Intimidate lowers attacker physical attack by 1 stage
    if (defenderAbility === 'intimidate' && attackKey === 'atk') {
      attackStage = Math.max(-6, attackStage - 1);
    }

    if (customAbility?.effect === 'stage' && customAbilityMatches && customAbility.stat === attackKey) {
      attackStage = Math.max(-6, Math.min(6, attackStage + customAbility.stages));
    }

    const atk = applyStage(stat(attacker, attackKey, attackerLevel), attackStage);
    let def = applyStage(stat(defender, defenseKey, defenderLevel), defenseStage);

    // Defender Item Boosts
    if (defender.item === 'eviolite' && !defender.finalEvolution) {
      def = Math.floor(def * 1.5);
    }
    if (defender.item === 'assault-vest' && move.categoria === 'special') {
      def = Math.floor(def * 1.5);
    }

    // Defender Fur Coat doubles physical defense
    if (defenderAbility === 'fur-coat' && move.categoria === 'physical') {
      def = Math.floor(def * 2);
    }

    // Marvel Scale boosts defense by 50% if status condition
    if (defenderAbility === 'marvel-scale' && (defenderBurned || defenderPoisoned)) {
      def = Math.floor(def * 1.5);
    }

    // Sandstorm SpD boost for Rock types
    if (weather === 'sand' && move.categoria === 'special' && (defender.tipo1 === 'rock' || defender.tipo2 === 'rock')) {
      def = Math.floor(def * 1.5);
    }

    let eff = effectiveness(move.tipo, defender);
    const gasActive = attackerAbility === 'neutralizing-gas' || defenderAbility === 'neutralizing-gas';

    // Defender type immunities via Abilities (if not suppressed by Neutralizing Gas)
    if (!gasActive) {
      if (defenderAbility === 'levitate' && move.tipo === 'ground') eff = 0;
      if (defenderAbility === 'water-absorb' && move.tipo === 'water') eff = 0;
      if (defenderAbility === 'flash-fire' && move.tipo === 'fire') eff = 0;
      if (defenderAbility === 'volt-absorb' && move.tipo === 'electric') eff = 0;
      if (defenderAbility === 'sap-sipper' && move.tipo === 'grass') eff = 0;
      if (defenderAbility === 'wonder-guard' && eff <= 1) eff = 0;
    }

    const stab =
      attacker.tipo1 === move.tipo || attacker.tipo2 === move.tipo
        ? !gasActive && attackerAbility === 'adaptability'
          ? 2
          : 1.5
        : 1;

    let weatherMod = 1;
    if ((weather === 'sun' && move.tipo === 'fire') || (weather === 'rain' && move.tipo === 'water')) weatherMod = 1.5;
    if ((weather === 'sun' && move.tipo === 'water') || (weather === 'rain' && move.tipo === 'fire')) weatherMod = 0.5;

    let abilityMod = 1;
    if (!gasActive) {
      if (attackerAbility === 'technician' && move.poder <= 60) abilityMod = 1.5;
      if (attackerAbility === 'sheer-force') abilityMod = 1.3;
      if (attackerAbility === 'tinted-lens' && eff < 1 && eff > 0) abilityMod = 2;
      // Starmie Analytic: +30% boost if moving after defender
      if (attackerAbility === 'analytic' && speedCalc?.winner === 'defender') abilityMod = 1.3;
    }

    if (customAbility?.effect === 'damage' && customAbilityMatches) {
      abilityMod *= customAbility.multiplier;
    }

    // Defender Ability Reductions
    let defenderAbilityMod = 1;
    if (!gasActive) {
      if (defenderAbility === 'thick-fat' && (move.tipo === 'fire' || move.tipo === 'ice')) {
        defenderAbilityMod *= 0.5;
      }
      if (defenderAbility === 'multiscale') {
        defenderAbilityMod *= 0.5;
      }
      if ((defenderAbility === 'solid-rock' || defenderAbility === 'filter') && eff > 1) {
        defenderAbilityMod *= 0.75;
      }
    }

    let itemStatMod = 1;
    if (
      (attacker.item === 'choice-band' && move.categoria === 'physical') ||
      (attacker.item === 'choice-specs' && move.categoria === 'special')
    ) {
      itemStatMod = 1.5;
    }
    if (
      (attacker.item === 'muscle-band' && move.categoria === 'physical') ||
      (attacker.item === 'wise-glasses' && move.categoria === 'special')
    ) {
      itemStatMod = 1.1;
    }

    const attackAbilityMod =
      move.categoria === 'physical' && ['huge-power', 'pure-power'].includes(attackerAbility) ? 2 : 1;

    // Guts & Toxic Boost
    const hasStatus = attackerBurned || attackerPoisoned;
    const gutsMod = attackerAbility === 'guts' && hasStatus && move.categoria === 'physical' ? 1.5 : 1;
    const toxicBoostMod = attackerAbility === 'toxic-boost' && attackerPoisoned && move.categoria === 'physical' ? 1.5 : 1;

    // Burn halves physical damage unless Guts or Facade
    const isFacade = move.id === 'facade';
    const burnMod = attackerBurned && move.categoria === 'physical' && attackerAbility !== 'guts' && !isFacade ? 0.5 : 1;

    const effectiveAtk = Math.floor(atk * itemStatMod * attackAbilityMod * gutsMod * toxicBoostMod * burnMod);

    let movePower = move.poder;
    // Facade power doubles to 140 if burned or poisoned
    if (isFacade && hasStatus) {
      movePower = 140;
    }

    let itemPower = attacker.item === `${move.tipo}-gem` ? 1.3 : attacker.item === 'life-orb' ? 1.3 : 1;
    if (attacker.item === 'expert-belt' && eff > 1) itemPower = 1.2;

    // Defender Screens (Reflejo reduces physical, Pantalla Luz reduces special)
    // Critical hits ignore screens
    let screen = 1;
    if (!critical) {
      if (defenderField.reflect && move.categoria === 'physical') {
        screen = 0.5;
      } else if (defenderField.lightScreen && move.categoria === 'special') {
        screen = 0.5;
      }
    }

    const criticalMod = critical ? (attackerAbility === 'sniper' ? 2.25 : 1.5) : 1;

    const base =
      eff === 0
        ? 0
        : Math.floor(
            Math.floor((Math.floor((2 * attackerLevel) / 5 + 2) * movePower * effectiveAtk) / Math.max(1, def)) / 50,
          ) + 2;

    const modifier = stab * eff * weatherMod * abilityMod * defenderAbilityMod * itemPower * screen * criticalMod;
    const lo = eff === 0 ? 0 : Math.floor(base * modifier * 0.85);
    const hi = eff === 0 ? 0 : Math.floor(base * modifier);

    const minPct = hp && eff > 0 ? (lo / hp) * 100 : 0;
    const maxPct = hp && eff > 0 ? (hi / hp) * 100 : 0;

    // Remaining HP
    const remainingMin = Math.max(0, hp - hi);
    const remainingMax = Math.max(0, hp - lo);

    const remainingMinPct = hp > 0 ? Math.max(0, Math.min(100, (remainingMin / hp) * 100)) : 0;
    const remainingMaxPct = hp > 0 ? Math.max(0, Math.min(100, (remainingMax / hp) * 100)) : 0;

    const remainingText =
      eff === 0
        ? `${hp.toFixed(1)}`
        : remainingMin === remainingMax
        ? remainingMin.toFixed(1)
        : `${remainingMin.toFixed(1)}-${remainingMax.toFixed(1)}`;

    // KO analysis & guaranteed hits
    let koBadge = 'Sin datos';
    let koCategory: 'immune' | 'ohko' | 'possible' | 'hits' = 'hits';
    let koIcon = '⚔️';
    let koFullDetail = '';
    let guaranteedHits = 0;
    let minHits = 0;

    if (eff === 0) {
      koBadge = 'Inmune (0%)';
      koCategory = 'immune';
      koIcon = '🚫';
      koFullDetail = 'Inmune · No causa daño';
    } else if (lo >= hp) {
      koBadge = '¡KO seguro!';
      koCategory = 'ohko';
      koIcon = '💥';
      koFullDetail = '¡KO seguro en 1 golpe! (100% OHKO)';
      guaranteedHits = 1;
      minHits = 1;
    } else if (hi >= hp) {
      guaranteedHits = Math.ceil(hp / Math.max(1, lo));
      minHits = 1;
      koBadge = `Posible KO (1 o ${guaranteedHits} golpes)`;
      koCategory = 'possible';
      koIcon = '⚠️';
      koFullDetail = `Posible KO en 1 golpe · KO seguro en ${guaranteedHits} golpes`;
    } else {
      guaranteedHits = Math.ceil(hp / Math.max(1, lo));
      minHits = Math.ceil(hp / Math.max(1, hi));
      koCategory = 'hits';
      koIcon = '🛡️';
      if (minHits === guaranteedHits) {
        koBadge = `KO seguro en ${guaranteedHits} golpes`;
        koFullDetail = `No es KO · KO seguro en ${guaranteedHits} golpes`;
      } else {
        koBadge = `KO seguro en ${guaranteedHits} golpes`;
        koFullDetail = `No es KO · KO seguro en ${guaranteedHits} golpes (${minHits} a ${guaranteedHits} golpes)`;
      }
    }

    return {
      hp,
      eff,
      lo,
      hi,
      minPct,
      maxPct,
      pct: maxPct,
      remainingMin,
      remainingMax,
      remainingMinPct,
      remainingMaxPct,
      remainingText,
      koBadge,
      koCategory,
      koIcon,
      koFullDetail,
      guaranteedHits,
      minHits,
      atk: effectiveAtk,
      def,
      burnMod,
      criticalMod,
      abilityMod,
      defenderAbilityMod,
      screen,
    };
  }, [
    attacker,
    defender,
    move,
    attackerLevel,
    defenderLevel,
    weather,
    attackerAbility,
    defenderAbility,
    attackerField,
    defenderField,
    critical,
    attackerBurned,
    attackerPoisoned,
    defenderBurned,
    defenderPoisoned,
    speedCalc?.winner,
    customAbility,
    customAbilityMatches,
  ]);

  const koChance = calc ? calc.koBadge : 'Sin datos';

  const updateAnyPokemon = (updater: (p: Pokemon) => Pokemon, targetId?: string) => {
    if (!targetId) return;

    if (equipoOU.some(p => p.id === targetId)) {
      setEquipoOU(list => list.map(p => (p.id === targetId ? updater(p) : p)));
    }
    if (equipoUU.some(p => p.id === targetId)) {
      setEquipoUU(list => list.map(p => (p.id === targetId ? updater(p) : p)));
    }
    if (equipoNU.some(p => p.id === targetId)) {
      setEquipoNU(list => list.map(p => (p.id === targetId ? updater(p) : p)));
    }

    setDexCustomizations(prev => {
      const current = pokemon.find(p => p.id === targetId) || allGen1To5Pokemon.find(p => p.id === targetId);
      if (!current) return prev;
      const updated = updater(current);
      return {
        ...prev,
        [targetId]: {
          ivs: updated.ivs,
          evs: updated.evs,
          nature: updated.nature,
          item: updated.item,
          ability: updated.ability,
          boosts: updated.boosts,
        },
      };
    });
  };

  // --- Handlers for direct IV/EV modifications ---
  const updateIV = (id: string | undefined, key: StatKey, value: number) => {
    if (!id) return;
    const clamped = safeInteger(value, 31, 0, 31);
    updateAnyPokemon(p => ({ ...p, ivs: { ...p.ivs, [key]: clamped } }), id);
  };

  const updateEV = (id: string | undefined, key: StatKey, value: number) => {
    if (!id) return;
    const clamped = safeInteger(value, 0, 0, 252);
    updateAnyPokemon(p => ({ ...p, evs: { ...p.evs, [key]: clamped } }), id);
  };

  const applyIVPreset = (id: string | undefined, preset: 'max31' | 'minAtk' | 'minSpe') => {
    if (!id) return;
    const newIvs: StatValues = {
      hp: 31,
      atk: preset === 'minAtk' ? 0 : 31,
      def: 31,
      spa: 31,
      spd: 31,
      spe: preset === 'minSpe' ? 0 : 31,
    };
    updateAnyPokemon(p => ({ ...p, ivs: newIvs }), id);
    setToast('IVs actualizados.');
  };

  const applyEVPreset = (id: string | undefined, evs: Partial<StatValues>) => {
    if (!id) return;
    const newEvs: StatValues = {
      hp: evs.hp ?? 0,
      atk: evs.atk ?? 0,
      def: evs.def ?? 0,
      spa: evs.spa ?? 0,
      spd: evs.spd ?? 0,
      spe: evs.spe ?? 0,
    };
    updateAnyPokemon(p => ({ ...p, evs: newEvs }), id);
    setToast('EVs actualizados.');
  };

  const updateHeldItem = (id: string | undefined, heldItem: string) => {
    if (!id) return;
    updateAnyPokemon(p => ({ ...p, item: heldItem }), id);
  };

  const updateNature = (id: string | undefined, nat: string) => {
    if (!id) return;
    updateAnyPokemon(p => ({ ...p, nature: nat }), id);
  };

  const updateLevel = (which: 'attacker' | 'defender', by: number) =>
    (which === 'attacker' ? setAttackerLevel : setDefenderLevel)(level => Math.max(1, Math.min(100, level + by)));

  const updateBoost = (id: string | undefined, key: StageKey, change: number) => {
    if (!id) return;
    updateAnyPokemon(
      p => ({ ...p, boosts: { ...p.boosts, [key]: Math.max(-6, Math.min(6, p.boosts[key] + change)) } }),
      id,
    );
  };

  const postMoveChange = attacker && move ? moveStageOutcome(attacker, move, attackerAbility, customAbility) : null;

  const clearActiveBoosts = () => {
    if (attackerId) updateAnyPokemon(p => ({ ...p, boosts: { ...DEFAULT_BOOSTS } }), attackerId);
    if (defenderId) updateAnyPokemon(p => ({ ...p, boosts: { ...DEFAULT_BOOSTS } }), defenderId);
  };

  const resetCombatantBoosts = (id: string | undefined) => {
    if (id) updateAnyPokemon(p => ({ ...p, boosts: { ...DEFAULT_BOOSTS } }), id);
  };

  async function handleBackgroundUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024) {
      setToast('Elige un archivo JPG, PNG o WebP de menos de 12 MB.');
      return;
    }
    try {
      const image = await compressBackground(file);
      setCustomBackground(image);
      setBackground('custom');
      setToast('Fondo guardado en este dispositivo.');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'No se pudo guardar el fondo.');
    }
  }

  const openForm = (kind: Exclude<ModalKind, null>, itemToEdit: Pokemon | Move | null = null) => {
    setEditing(itemToEdit);
    setModal(kind);
  };

  function savePokemon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('nombre') ?? '').trim();
    if (!name) return;
    const ivs = Object.fromEntries(STAT_KEYS.map(key => [key, Number(data.get(`iv-${key}`))])) as StatValues;
    const evs = Object.fromEntries(STAT_KEYS.map(key => [key, Number(data.get(`ev-${key}`))])) as StatValues;
    const baseStats = Object.fromEntries(STAT_KEYS.map(key => [key, Number(data.get(key))])) as StatValues;

    const editingPk = editing as Pokemon | null;
    const rawTier = String(data.get('tier') || activeTier || 'ou').toLowerCase();
    const targetTier: 'ou' | 'uu' | 'nu' = rawTier === 'uu' ? 'uu' : rawTier === 'nu' ? 'nu' : 'ou';

    const next = normalizePokemon({
      id: editingPk?.id ?? `pk-${Date.now()}`,
      nombre: name.slice(0, 24),
      tier: targetTier,
      tipo1: String(data.get('tipo1')),
      tipo2: String(data.get('tipo2') ?? ''),
      ...baseStats,
      ivs,
      evs,
      nature: String(data.get('nature') ?? editingPk?.nature ?? 'adamant'),
      item: String(data.get('item') ?? editingPk?.item ?? 'none'),
      ability: String(data.get('ability') ?? editingPk?.ability ?? 'none'),
      abilities: editingPk?.abilities ?? [],
      learnset: editingPk?.learnset ?? [],
      finalEvolution: data.get('finalEvolution') === 'on',
      boosts: editingPk?.boosts ?? DEFAULT_BOOSTS,
    });

    if (editingPk) {
      const oldTier: 'ou' | 'uu' | 'nu' =
        editingPk.tier === 'uu' ? 'uu' : editingPk.tier === 'nu' ? 'nu' : 'ou';

      if (oldTier === targetTier) {
        if (targetTier === 'ou') setEquipoOU(list => list.map(p => (p.id === editingPk.id ? next : p)));
        else if (targetTier === 'uu') setEquipoUU(list => list.map(p => (p.id === editingPk.id ? next : p)));
        else setEquipoNU(list => list.map(p => (p.id === editingPk.id ? next : p)));
      } else {
        if (oldTier === 'ou') setEquipoOU(list => list.filter(p => p.id !== editingPk.id));
        else if (oldTier === 'uu') setEquipoUU(list => list.filter(p => p.id !== editingPk.id));
        else setEquipoNU(list => list.filter(p => p.id !== editingPk.id));

        if (targetTier === 'ou') setEquipoOU(list => [...list, next]);
        else if (targetTier === 'uu') setEquipoUU(list => [...list, next]);
        else setEquipoNU(list => [...list, next]);
      }
      setToast(`Pokémon actualizado en Tier ${targetTier.toUpperCase()}.`);
    } else {
      if (targetTier === 'ou') setEquipoOU(list => [...list, next]);
      else if (targetTier === 'uu') setEquipoUU(list => [...list, next]);
      else setEquipoNU(list => [...list, next]);
      setAttackerId(next.id);
      setToast(`Pokémon añadido al equipo Tier ${targetTier.toUpperCase()}.`);
    }

    setEditing(null);
    setTierViewMode('list');
  }

  function saveMove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('nombre') ?? '').trim();
    const power = Number(data.get('poder'));
    const priority = safeInteger(data.get('priority'), 0, -6, 5);
    const stageStat = String(data.get('stageStat') ?? 'none');
    const stageChange = safeInteger(data.get('stageChange'), 0, -6, 6);

    const next: Move = normalizeMove({
      id: editing?.id ?? `mv-${Date.now()}`,
      nombre: name.slice(0, 28),
      tipo: String(data.get('tipo')),
      categoria: data.get('categoria') === 'special' ? 'special' : 'physical',
      poder: power,
      priority,
      ...(STAGE_KEYS.includes(stageStat as StageKey) && stageChange ? { statChange: { stat: stageStat as StageKey, stages: stageChange } } : {}),
    });

    setMoves(existing => (editing ? existing.map(m => (m.id === editing.id ? next : m)) : [...existing, next]));
    if (!editing) setMoveId(next.id);
    setModal(null);
    setToast(editing ? 'Movimiento actualizado.' : 'Movimiento añadido.');
  }

  function deletePokemon(id: string) {
    const p = pokemon.find(item => item.id === id);
    if (!p) return;
    setEquipoOU(list => list.filter(item => item.id !== id));
    setEquipoUU(list => list.filter(item => item.id !== id));
    setEquipoNU(list => list.filter(item => item.id !== id));
    setToast(`Pokémon ${p.nombre} eliminado del equipo.`);
  }

  function clearActiveTierList(tier: 'ou' | 'uu' | 'nu') {
    if (tier === 'ou') {
      setEquipoOU([]);
    } else if (tier === 'uu') {
      setEquipoUU([]);
    } else if (tier === 'nu') {
      setEquipoNU([]);
    }
    setToast(`Lista completa de Tier ${tier.toUpperCase()} vaciada.`);
  }

  function deleteMove(id: string) {
    const m = moves.find(item => item.id === id);
    if (m && window.confirm(`¿Eliminar el movimiento ${m.nombre}?`)) {
      setMoves(list => list.filter(item => item.id !== id));
      setToast('Movimiento eliminado.');
    }
  }

  const defaultWallpaper =
    background === 'custom' && customBackground
      ? `url("${customBackground}")`
      : BACKGROUNDS.find(option => option.id === background)?.image ?? BACKGROUNDS[0].image;

  const editingPokemon = modal === 'pokemon' ? (editing as Pokemon | null) : null;
  const editingMove = modal === 'movimiento' ? (editing as Move | null) : null;

  return (
    <main className="app-shell" data-theme={theme}>
      {/* Dynamic Animated Weather Background Layer */}
      <WeatherBackground
        weather={weather}
        defaultImage={defaultWallpaper}
        lockCustomBackground={lockCustomBackground && background === 'custom' && !!customBackground}
      />

      {/* Top Header */}
      <header className="topbar">
        <button
          className="icon-button"
          aria-label="Abrir menú"
          data-testid="button-open-menu"
          onClick={() => setDrawer(true)}
        >
          <Menu size={19} />
        </button>

        <div
          className="brand cursor-pointer"
          onClick={() => setCurrentView('calc')}
          role="button"
          tabIndex={0}
        >
          <div className="brand-mark">
            <Swords size={18} />
          </div>
          <div>
            <div className="brand-name">PokéMMO</div>
            <div className="brand-kicker">
              {currentView === 'calc' && 'Calculadora de daño'}
              {currentView === 'dex' && 'Pokemon dex'}
              {currentView === 'moves' && 'Movimientos'}
              {currentView === 'builder' && 'Builder PvP 1v1'}
              {currentView === 'settings' && 'Configuración'}
              {currentView === 'info' && 'Información'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentView !== 'calc' && (
            <button
              type="button"
              className="pwa-top-btn"
              title="Volver a la Calculadora"
              onClick={() => setCurrentView('calc')}
            >
              <Swords size={13} />
              <span>Calculadora</span>
            </button>
          )}

          {/* APK / PWA install button */}
          <button
            type="button"
            className="pwa-top-btn"
            title="Instalar como APK / App en tu móvil"
            data-testid="button-install-apk-top"
            onClick={() => {
              if (isInstallable) {
                install();
              } else {
                setModal('apk-guide');
              }
            }}
          >
            <Smartphone size={13} />
            <span>{isInstalled ? 'APK Lista' : 'Instalar APK'}</span>
          </button>

          <button
            className="icon-button"
            aria-label="Restablecer escenario"
            data-testid="button-reset"
            onClick={() => {
              setWeather('none');
              setAttackerAbility('none');
              setDefenderAbility('none');
              setCritical(false);
              setAttackerBurned(false);
              setAttackerPoisoned(false);
              setDefenderBurned(false);
              setDefenderPoisoned(false);
              setAttackerField(DEFAULT_FIELD_EFFECTS);
              setDefenderField(DEFAULT_FIELD_EFFECTS);
              setAttackerLevel(50);
              setDefenderLevel(50);
              clearActiveBoosts();
              setToast('Escenario restablecido.');
            }}
          >
            <RotateCcw size={17} />
          </button>
        </div>
      </header>

      {/* Calculator View (Hero + App Layout Grid) */}
      {currentView === 'calc' && (
        <>
          <section className="hero">
            <div className="flex items-center justify-between">
          <div className="eyebrow">PokéMMO Battle Kit · v2.1</div>
          <div className="offline-chip">
            <span className="offline-pulse" />
            <span>100% Offline · APK Ready</span>
          </div>
        </div>
        <h1>
          Calcula tu
          <br />
          siguiente turno.
        </h1>
        <p>Daño exacto, orden de velocidad y control total de IV/EV al instante.</p>
      </section>

      {/* Responsive Landscape / Portrait Grid Container */}
      <div className="app-layout-grid">
        {/* COLUMN 1: ENFRENTAMIENTO (SIDE-BY-SIDE) & MOVIMIENTO & CONDICIONES */}
        <div className="flex flex-col gap-3">
          {/* Matchup Card: Attacker and Defender Side by Side with Integrated Boosts & Status */}
          <section className="glass combat-card" aria-label="Escenario de combate">
            <div className="section-head">
              <span className="section-title">Enfrentamiento</span>
              <Activity size={15} color="#6d9290" />
            </div>

            {/* Side-by-side grid: Atacante al lado del Defensor */}
            <div className="combatants-split-grid">
              {/* ATACANTE (LADO IZQUIERDO) */}
              {attacker && (
                <div className="combatant-col">
                  <div className="combatant-col-head">
                    <span className="combatant-role-badge">Atacante</span>
                    <div className="combatant-level-stepper">
                      <button
                        type="button"
                        aria-label="Bajar nivel atacante"
                        onClick={() => updateLevel('attacker', -1)}
                      >
                        <Minus size={9} />
                      </button>
                      <strong>Nv.{attackerLevel}</strong>
                      <button
                        type="button"
                        aria-label="Subir nivel atacante"
                        onClick={() => updateLevel('attacker', 1)}
                      >
                        <Plus size={9} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-wrap">
                    <TypeBadge type={attacker.tipo1} size="sm" />
                    {attacker.tipo2 && <TypeBadge type={attacker.tipo2} size="sm" />}
                  </div>

                  {/* Searchable input for Attacker */}
                  <PokemonSearchableSelect
                    id="select-attacker-search"
                    dataTestId="select-attacker"
                    label="Pokémon atacante"
                    value={attackerId}
                    onChange={handleAttackerChange}
                    pokemonList={pokemon}
                    equipoOU={ouPokemon}
                    equipoUU={uuPokemon}
                    equipoNU={nuPokemon}
                    placeholder="Escribe el nombre del atacante..."
                  />

                  {/* Micro selects for Nature, Ability, Item */}
                  <div className="combatant-micro-selects">
                    <div className="micro-field">
                      <label htmlFor="atk-nature">Naturaleza</label>
                      <select
                        id="atk-nature"
                        data-testid="select-attacker-nature"
                        value={attacker.nature}
                        onChange={e => updateNature(attacker.id, e.target.value)}
                      >
                        {NATURES.map(([id, label]) => (
                          <option key={id} value={id}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="micro-field">
                      <label htmlFor="atk-ability">Habilidad</label>
                      <select
                        id="atk-ability"
                        data-testid="select-attacker-ability"
                        value={attackerAbility}
                        onChange={e => setAttackerAbility(e.target.value)}
                      >
                        {attackerAllowedAbilities.map(([id, label]) => (
                          <option key={id} value={id}>
                            {label}
                          </option>
                        ))}
                        {customAbilities.map(row => (
                          <option key={row.id} value={`custom-${row.id}`}>
                            {row.nombre} (Custom)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="micro-field">
                      <label htmlFor="atk-item">Objeto</label>
                      <select
                        id="atk-item"
                        data-testid="select-attacker-item"
                        value={attacker.item}
                        onChange={e => updateHeldItem(attacker.id, e.target.value)}
                      >
                        {ITEMS.map(([id, label]) => (
                          <option key={id} value={id}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Button to open Attacker IV/EV Editor Modal */}
                  <button
                    type="button"
                    className="ivev-mini-btn"
                    data-testid="button-open-attacker-ivev"
                    onClick={() => setModal('ivev-attacker')}
                  >
                    <span>⚙️ IV/EV ({Object.values(attacker.evs).reduce((a, b) => a + b, 0)}/510)</span>
                    <ChevronRight size={13} />
                  </button>

                  {/* Boosts integrados debajo del Atacante */}
                  <div className="combatant-boosts-block" data-testid="panel-boosts-attacker">
                    <div className="combatant-boosts-header">
                      <span className="boosts-label">Boosts Atacante</span>
                      <button
                        type="button"
                        className="boosts-reset-mini"
                        title="Restablecer boosts a 0"
                        onClick={() => resetCombatantBoosts(attacker.id)}
                      >
                        <RotateCcw size={9} />
                        <span>0</span>
                      </button>
                    </div>
                    <div className="combatant-boosts-grid">
                      {STAGE_KEYS.map(key => {
                        const val = attacker.boosts[key];
                        return (
                          <div className="combatant-boost-row" key={key}>
                            <span className="boost-stat-name">{STAT_LABELS[key]}</span>
                            <div className="boost-stepper">
                              <button
                                type="button"
                                aria-label={`Bajar ${STAT_LABELS[key]} de atacante`}
                                data-testid={`button-boost-down-attacker-${key}`}
                                disabled={val <= -6}
                                onClick={() => updateBoost(attacker.id, key, -1)}
                              >
                                <Minus size={9} />
                              </button>
                              <strong
                                className={val > 0 ? 'pos' : val < 0 ? 'neg' : 'zero'}
                                data-testid={`text-boost-attacker-${key}`}
                              >
                                {val > 0 ? `+${val}` : val}
                              </strong>
                              <button
                                type="button"
                                aria-label={`Subir ${STAT_LABELS[key]} de atacante`}
                                data-testid={`button-boost-up-attacker-${key}`}
                                disabled={val >= 6}
                                onClick={() => updateBoost(attacker.id, key, 1)}
                              >
                                <Plus size={9} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Opciones de estado debajo de los boosts (Atacante) */}
                  <div className="combatant-status-block" data-testid="panel-status-attacker">
                    <div className="combatant-status-header">
                      <span className="status-label">Estado de combate</span>
                      {(attackerBurned || attackerPoisoned) && (
                        <button
                          type="button"
                          className="boosts-reset-mini"
                          title="Quitar estados de combate"
                          onClick={() => {
                            setAttackerBurned(false);
                            setAttackerPoisoned(false);
                          }}
                        >
                          <RotateCcw size={9} />
                          <span>0</span>
                        </button>
                      )}
                    </div>
                    <div className="combatant-status-toggles">
                      <button
                        type="button"
                        className={`status-btn burn ${attackerBurned ? 'active' : ''}`}
                        data-testid="button-status-burn-attacker"
                        onClick={toggleAttackerBurned}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs">🔥</span>
                          <span className="truncate">Quemado</span>
                        </div>
                        <small className="status-badge-state flex-shrink-0">
                          {attackerBurned ? 'ACTIVO' : 'Atq −50%'}
                        </small>
                      </button>
                      <button
                        type="button"
                        className={`status-btn poison ${attackerPoisoned ? 'active' : ''}`}
                        data-testid="button-status-poison-attacker"
                        onClick={toggleAttackerPoisoned}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs">☠️</span>
                          <span className="truncate">Envenenado</span>
                        </div>
                        <small className="status-badge-state flex-shrink-0">
                          {attackerPoisoned ? 'ACTIVO' : '1/8 PS'}
                        </small>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* DEFENSOR (LADO DERECHO) */}
              {defender && (
                <div className="combatant-col def">
                  <div className="combatant-col-head">
                    <span className="combatant-role-badge def">Defensor</span>
                    <div className="combatant-level-stepper">
                      <button
                        type="button"
                        aria-label="Bajar nivel defensor"
                        onClick={() => updateLevel('defender', -1)}
                      >
                        <Minus size={9} />
                      </button>
                      <strong>Nv.{defenderLevel}</strong>
                      <button
                        type="button"
                        aria-label="Subir nivel defensor"
                        onClick={() => updateLevel('defender', 1)}
                      >
                        <Plus size={9} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-wrap">
                    <TypeBadge type={defender.tipo1} size="sm" />
                    {defender.tipo2 && <TypeBadge type={defender.tipo2} size="sm" />}
                  </div>

                  {/* Searchable input for Defender */}
                  <PokemonSearchableSelect
                    id="select-defender-search"
                    dataTestId="select-defender"
                    label="Pokémon defensor"
                    value={defenderId}
                    onChange={handleDefenderChange}
                    pokemonList={pokemon}
                    equipoOU={ouPokemon}
                    equipoUU={uuPokemon}
                    equipoNU={nuPokemon}
                    placeholder="Escribe el nombre del defensor..."
                  />

                  {/* Micro selects for Nature, Ability, Item */}
                  <div className="combatant-micro-selects">
                    <div className="micro-field">
                      <label htmlFor="def-nature">Naturaleza</label>
                      <select
                        id="def-nature"
                        data-testid="select-defender-nature"
                        value={defender.nature}
                        onChange={e => updateNature(defender.id, e.target.value)}
                      >
                        {NATURES.map(([id, label]) => (
                          <option key={id} value={id}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="micro-field">
                      <label htmlFor="def-ability">Habilidad</label>
                      <select
                        id="def-ability"
                        data-testid="select-defender-ability"
                        value={defenderAbility}
                        onChange={e => setDefenderAbility(e.target.value)}
                      >
                        {defenderAllowedAbilities.map(([id, label]) => (
                          <option key={id} value={id}>
                            {label}
                          </option>
                        ))}
                        {customAbilities.map(row => (
                          <option key={row.id} value={`custom-${row.id}`}>
                            {row.nombre} (Custom)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="micro-field">
                      <label htmlFor="def-item">Objeto</label>
                      <select
                        id="def-item"
                        data-testid="select-defender-item"
                        value={defender.item}
                        onChange={e => updateHeldItem(defender.id, e.target.value)}
                      >
                        {ITEMS.map(([id, label]) => (
                          <option key={id} value={id}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Button to open Defender IV/EV Editor Modal */}
                  <button
                    type="button"
                    className="ivev-mini-btn"
                    data-testid="button-open-defender-ivev"
                    onClick={() => setModal('ivev-defender')}
                  >
                    <span>⚙️ IV/EV ({Object.values(defender.evs).reduce((a, b) => a + b, 0)}/510)</span>
                    <ChevronRight size={13} />
                  </button>

                  {/* Boosts integrados debajo del Defensor */}
                  <div className="combatant-boosts-block" data-testid="panel-boosts-defender">
                    <div className="combatant-boosts-header">
                      <span className="boosts-label">Boosts Defensor</span>
                      <button
                        type="button"
                        className="boosts-reset-mini"
                        title="Restablecer boosts a 0"
                        onClick={() => resetCombatantBoosts(defender.id)}
                      >
                        <RotateCcw size={9} />
                        <span>0</span>
                      </button>
                    </div>
                    <div className="combatant-boosts-grid">
                      {STAGE_KEYS.map(key => {
                        const val = defender.boosts[key];
                        return (
                          <div className="combatant-boost-row" key={key}>
                            <span className="boost-stat-name">{STAT_LABELS[key]}</span>
                            <div className="boost-stepper">
                              <button
                                type="button"
                                aria-label={`Bajar ${STAT_LABELS[key]} de defensor`}
                                data-testid={`button-boost-down-defender-${key}`}
                                disabled={val <= -6}
                                onClick={() => updateBoost(defender.id, key, -1)}
                              >
                                <Minus size={9} />
                              </button>
                              <strong
                                className={val > 0 ? 'pos' : val < 0 ? 'neg' : 'zero'}
                                data-testid={`text-boost-defender-${key}`}
                              >
                                {val > 0 ? `+${val}` : val}
                              </strong>
                              <button
                                type="button"
                                aria-label={`Subir ${STAT_LABELS[key]} de defensor`}
                                data-testid={`button-boost-up-defender-${key}`}
                                disabled={val >= 6}
                                onClick={() => updateBoost(defender.id, key, 1)}
                              >
                                <Plus size={9} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Opciones de estado debajo de los boosts (Defensor) */}
                  <div className="combatant-status-block" data-testid="panel-status-defender">
                    <div className="combatant-status-header">
                      <span className="status-label">Estado de combate</span>
                      {(defenderBurned || defenderPoisoned) && (
                        <button
                          type="button"
                          className="boosts-reset-mini"
                          title="Quitar estados de combate"
                          onClick={() => {
                            setDefenderBurned(false);
                            setDefenderPoisoned(false);
                          }}
                        >
                          <RotateCcw size={9} />
                          <span>0</span>
                        </button>
                      )}
                    </div>
                    <div className="combatant-status-toggles">
                      <button
                        type="button"
                        className={`status-btn burn ${defenderBurned ? 'active' : ''}`}
                        data-testid="button-status-burn-defender"
                        onClick={toggleDefenderBurned}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs">🔥</span>
                          <span className="truncate">Quemado</span>
                        </div>
                        <small className="status-badge-state flex-shrink-0">
                          {defenderBurned ? 'ACTIVO' : '1/8 PS'}
                        </small>
                      </button>
                      <button
                        type="button"
                        className={`status-btn poison ${defenderPoisoned ? 'active' : ''}`}
                        data-testid="button-status-poison-defender"
                        onClick={toggleDefenderPoisoned}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs">☠️</span>
                          <span className="truncate">Envenenado</span>
                        </div>
                        <small className="status-badge-state flex-shrink-0">
                          {defenderPoisoned ? 'ACTIVO' : '1/8 PS'}
                        </small>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 2. Condiciones de Batalla (Clima + Dual Fields) */}
          <section className="glass conditions" aria-label="Condiciones de batalla">
            <div className="section-head">
              <span className="section-title">Condiciones de Batalla</span>
              <CloudSun size={15} color="#6d9290" />
            </div>

            {/* Clima: aplica a ambos campos */}
            <div className="weather-section">
              <div className="field">
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="weather" className="font-semibold text-xs">Clima (aplica a ambos campos)</label>
                  {weather !== 'none' && (
                    <span className="weather-active-badge">Activo</span>
                  )}
                </div>
                <select
                  id="weather"
                  data-testid="select-weather"
                  value={weather}
                  onChange={e => setWeather(e.target.value as Weather)}
                >
                  {weatherOptions.map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
                {customBackground && background === 'custom' && (
                  <button
                    type="button"
                    className={`pin-weather-toggle-btn ${lockCustomBackground ? 'pinned' : ''}`}
                    data-testid="button-quick-pin-weather"
                    onClick={() => {
                      setLockCustomBackground(v => !v);
                      setToast(
                        !lockCustomBackground
                          ? '📌 Fondo fijado: Tu imagen no se verá afectada por el clima.'
                          : 'Fondo desfijado: El clima volverá a alterar el fondo.',
                      );
                    }}
                    title="Fijar o desfijar tu imagen para que no sea alterada por los climas"
                  >
                    {lockCustomBackground ? <PinOff size={11} /> : <Pin size={11} />}
                    <span>{lockCustomBackground ? 'Mi imagen fijada (Inmune)' : 'Fijar mi imagen vs clima'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Campos separados: Campo Atacante (Izquierda) y Campo Defensor (Derecha) */}
            <div className="battle-fields-grid">
              {/* Campo Atacante (Izquierda) */}
              <div className="battle-field-col atk-field">
                <div className="battle-field-header">
                  <span className="combatant-role-badge">Campo Atacante</span>
                  <small className="field-side-hint">Izquierda</small>
                </div>

                <div className="field-effects-list">
                  <button
                    type="button"
                    className={`field-effect-toggle ${attackerField.tailwind ? 'active tailwind' : ''}`}
                    data-testid="toggle-field-atk-tailwind"
                    onClick={() => toggleAttackerField('tailwind')}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="field-effect-icon">🌪️</span>
                      <strong className="field-effect-name truncate">Viento Afín</strong>
                    </div>
                    <small className="field-effect-desc flex-shrink-0">Vel ×2</small>
                  </button>

                  <button
                    type="button"
                    className={`field-effect-toggle ${attackerField.trickRoom ? 'active trick-room' : ''}`}
                    data-testid="toggle-field-atk-trick-room"
                    onClick={() => toggleAttackerField('trickRoom')}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="field-effect-icon">🌀</span>
                      <strong className="field-effect-name truncate">Espacio Raro</strong>
                    </div>
                    <small className="field-effect-desc flex-shrink-0">Lento 1º</small>
                  </button>

                  <button
                    type="button"
                    className={`field-effect-toggle ${attackerField.lightScreen ? 'active light-screen' : ''}`}
                    data-testid="toggle-field-atk-light-screen"
                    onClick={() => toggleAttackerField('lightScreen')}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="field-effect-icon">✨</span>
                      <strong className="field-effect-name truncate">Pantalla Luz</strong>
                    </div>
                    <small className="field-effect-desc flex-shrink-0">Esp −50%</small>
                  </button>

                  <button
                    type="button"
                    className={`field-effect-toggle ${attackerField.reflect ? 'active reflect' : ''}`}
                    data-testid="toggle-field-atk-reflect"
                    onClick={() => toggleAttackerField('reflect')}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="field-effect-icon">🛡️</span>
                      <strong className="field-effect-name truncate">Reflejo</strong>
                    </div>
                    <small className="field-effect-desc flex-shrink-0">Fís −50%</small>
                  </button>
                </div>
              </div>

              {/* Campo Defensor (Derecha) */}
              <div className="battle-field-col def-field">
                <div className="battle-field-header def">
                  <span className="combatant-role-badge def">Campo Defensor</span>
                  <small className="field-side-hint">Derecha</small>
                </div>

                <div className="field-effects-list">
                  <button
                    type="button"
                    className={`field-effect-toggle ${defenderField.tailwind ? 'active tailwind' : ''}`}
                    data-testid="toggle-field-def-tailwind"
                    onClick={() => toggleDefenderField('tailwind')}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="field-effect-icon">🌪️</span>
                      <strong className="field-effect-name truncate">Viento Afín</strong>
                    </div>
                    <small className="field-effect-desc flex-shrink-0">Vel ×2</small>
                  </button>

                  <button
                    type="button"
                    className={`field-effect-toggle ${defenderField.trickRoom ? 'active trick-room' : ''}`}
                    data-testid="toggle-field-def-trick-room"
                    onClick={() => toggleDefenderField('trickRoom')}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="field-effect-icon">🌀</span>
                      <strong className="field-effect-name truncate">Espacio Raro</strong>
                    </div>
                    <small className="field-effect-desc flex-shrink-0">Lento 1º</small>
                  </button>

                  <button
                    type="button"
                    className={`field-effect-toggle ${defenderField.lightScreen ? 'active light-screen' : ''}`}
                    data-testid="toggle-field-def-light-screen"
                    onClick={() => toggleDefenderField('lightScreen')}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="field-effect-icon">✨</span>
                      <strong className="field-effect-name truncate">Pantalla Luz</strong>
                    </div>
                    <small className="field-effect-desc flex-shrink-0">Esp −50%</small>
                  </button>

                  <button
                    type="button"
                    className={`field-effect-toggle ${defenderField.reflect ? 'active reflect' : ''}`}
                    data-testid="toggle-field-def-reflect"
                    onClick={() => toggleDefenderField('reflect')}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="field-effect-icon">🛡️</span>
                      <strong className="field-effect-name truncate">Reflejo</strong>
                    </div>
                    <small className="field-effect-desc flex-shrink-0">Fís −50%</small>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Movimiento (Standalone Move Card with Golpe Crítico option) */}
          <section className="glass move-card" aria-label="Movimiento">
            <div className="section-head">
              <div className="flex items-center gap-2">
                <span className="section-title">Movimiento</span>
                {attacker && <span className="move-attacker-tag">({attacker.nombre})</span>}
              </div>
              <Swords size={15} color="#6d9290" />
            </div>

            <div className="move-card-body">
              {/* Move Selection Row */}
              <div className="move-selection-row">
                <div className="move-icon">
                  <Swords size={17} />
                </div>
                <div className="field flex-1">
                  <label htmlFor="move-choice">Seleccionar ataque</label>
                  <select
                    id="move-choice"
                    data-testid="select-move"
                    value={moveId}
                    onChange={e => setMoveId(e.target.value)}
                  >
                    {attackerAllowedMoves.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.nombre} · {typeName(m.tipo)} ({m.categoria === 'physical' ? 'Físico' : 'Especial'} · {m.poder} P)
                        {m.priority ? ` [Prio +${m.priority}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {move && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <TypeBadge type={move.tipo} size="sm" />
                    <div className="move-power">{move.poder} P</div>
                    <span className={`move-category-chip ${move.categoria}`}>
                      {move.categoria === 'physical' ? 'Físico' : 'Especial'}
                    </span>
                  </div>
                )}
              </div>

              {/* Option: Golpe Crítico */}
              <div className="move-crit-row">
                <button
                  type="button"
                  className={`crit-toggle-btn ${critical ? 'active' : ''}`}
                  data-testid="checkbox-critical"
                  onClick={() => setCritical(v => !v)}
                >
                  <div className="crit-toggle-icon">💥</div>
                  <div className="crit-toggle-info">
                    <div className="flex items-center gap-2">
                      <strong className="crit-title">Golpe crítico</strong>
                      <span className={`crit-badge ${critical ? 'active' : ''}`}>
                        {critical ? 'ACTIVADO' : 'DESACTIVADO'}
                      </span>
                    </div>
                    <small className="crit-desc">
                      {attackerAbility === 'sniper' ? '×2,25 con Francotirador' : '×1,5 de daño base'} · Ignora pantallas y defensas aumentadas
                    </small>
                  </div>
                </button>
              </div>

              {/* Post-Move Stat Change (e.g. Draco Meteor, Close Combat) */}
              {postMoveChange && attacker && (
                <div className="post-move-effect" data-testid="text-post-move-effect">
                  <span>
                    Tras el golpe: {STAT_LABELS[postMoveChange.stat]} {postMoveChange.delta > 0 ? '+' : ''}
                    {postMoveChange.delta}{' '}
                    {attackerAbility === 'contrary' || (customAbility?.effect === 'contrary' && customAbilityMatches)
                      ? '(Respondón)'
                      : ''}
                  </span>
                  <button
                    type="button"
                    data-testid="button-apply-post-move-boost"
                    disabled={postMoveChange.delta === 0}
                    onClick={() => {
                      updateBoost(attacker.id, postMoveChange.stat, postMoveChange.delta);
                      setToast('Cambio de estadística aplicado al atacante.');
                    }}
                  >
                    Aplicar al siguiente cálculo
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* COLUMN 2: 4. Resultado • Daño & Velocidad */}
        <div className="flex flex-col gap-3">
          {/* UNIFIED CARD (DAÑO Y VELOCIDAD FUSIONADOS) */}
          <section className="glass unified-outcome-card" aria-label="Resultado de batalla">
            <div className="section-head">
              <div className="flex items-center gap-2">
                <span className="section-title text-emerald-100">Resultado • Daño & Velocidad</span>
                <span className="ko-badge" data-testid="status-ko">
                  {koChance}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap size={15} className="text-amber-400" />
                <Swords size={15} className="text-emerald-300" />
              </div>
            </div>

            {/* BLOCK A: SPEED & TURN ORDER */}
            {speedCalc && attacker && defender && (
              <div>
                <div className="outcome-subhead">
                  <Zap size={13} className="text-amber-300" />
                  <span>Orden de turno y velocidad</span>
                </div>

                <div
                  className={`speed-banner ${
                    speedCalc.movePriority !== 0
                      ? 'priority-active'
                      : speedCalc.winner === 'attacker'
                      ? ''
                      : speedCalc.winner === 'defender'
                      ? 'defender-first'
                      : 'speed-tie'
                  }`}
                  data-testid="banner-speed-winner"
                >
                  <div className="speed-banner-icon">
                    {speedCalc.winner === 'attacker' ? (
                      <Zap size={18} className="text-amber-500 animate-pulse" />
                    ) : speedCalc.winner === 'defender' ? (
                      <Shield size={18} className="text-blue-500" />
                    ) : (
                      <Swords size={18} className="text-yellow-600" />
                    )}
                  </div>
                  <div className="speed-banner-content">
                    <strong>{speedCalc.headline}</strong>
                    <small>{speedCalc.detail}</small>
                  </div>
                </div>

                {/* Comparative Speed Bars */}
                <div className="speed-comparison-bars">
                  <div className="speed-row">
                    <span className="speed-name">{attacker.nombre}</span>
                    <div className="speed-bar-track">
                      <div
                        className="speed-bar-fill"
                        style={{ width: `${Math.min(100, speedCalc.attackerBarPct)}%` }}
                      />
                    </div>
                    <span className="speed-val">{speedCalc.finalAttackerSpe} Vel</span>
                  </div>

                  <div className="speed-row">
                    <span className="speed-name">{defender.nombre}</span>
                    <div className="speed-bar-track">
                      <div
                        className="speed-bar-fill def"
                        style={{ width: `${Math.min(100, speedCalc.defenderBarPct)}%` }}
                      />
                    </div>
                    <span className="speed-val">{speedCalc.finalDefenderSpe} Vel</span>
                  </div>
                </div>
              </div>
            )}

            <div className="outcome-divider" />

            {/* BLOCK B: DAMAGE CALCULATION */}
            {calc && move && defender ? (
              <div>
                <div className="outcome-subhead">
                  <Swords size={13} className="text-emerald-300" />
                  <span>Daño estimado</span>
                </div>

                <p className="result-caption">
                  {move.nombre} contra {defender.nombre} ·{' '}
                  <span data-testid="text-effectiveness">
                    {calc.eff === 0
                      ? 'Sin efecto (Inmune)'
                      : calc.eff > 1
                      ? `Supereficaz ×${calc.eff}`
                      : calc.eff < 1
                      ? `Poco eficaz ×${calc.eff}`
                      : 'Daño normal'}
                  </span>
                </p>

                {/* Photo-inspired Damage & Remaining HP Capsule Model */}
                <div className="photo-damage-capsule" data-testid="container-photo-damage-capsule">
                  {/* Encima de la barra: % de daño aproximado que causará el golpe */}
                  <div className="photo-damage-title" data-testid="text-photo-damage-pct">
                    Daño estimado {calc.minPct.toFixed(1)} - {calc.maxPct.toFixed(1)} %
                  </div>

                  {/* Barra de daño que disminuye con los PS restantes aproximados */}
                  <div
                    className="photo-hp-track"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={calc.hp}
                    aria-valuenow={calc.remainingMin}
                    data-testid="track-photo-hp-bar"
                  >
                    {/* Tramo de variación entre daño mínimo y máximo */}
                    <div
                      className="photo-hp-variance-fill"
                      style={{ width: `${calc.remainingMaxPct}%` }}
                      title={`Rango de PS restantes: ${calc.remainingMin.toFixed(1)} a ${calc.remainingMax.toFixed(1)} PS`}
                    />
                    {/* Barra sólida de PS restantes garantizados */}
                    <div
                      className={`photo-hp-solid-fill ${
                        calc.remainingMinPct > 50
                          ? 'hp-green'
                          : calc.remainingMinPct > 20
                          ? 'hp-amber'
                          : 'hp-red'
                      }`}
                      style={{ width: `${calc.remainingMinPct}%` }}
                      title={`PS restantes mínimos seguros: ${calc.remainingMin.toFixed(1)} PS`}
                    />
                  </div>

                  {/* Debajo de la barra: PS restantes y totales en formato exacto: 65.0-70.0/180 Ps */}
                  <div className="photo-hp-numbers-row" data-testid="text-photo-hp-counter">
                    <span className="photo-hp-current">{calc.remainingText}</span>
                    <span className="photo-hp-max">/{calc.hp} Ps</span>
                  </div>

                  {/* Especificar si es KO y cuántos golpes para KO seguro */}
                  <div className={`photo-ko-banner ${calc.koCategory}`} data-testid="banner-photo-ko-status">
                    <span>{calc.koIcon}</span>
                    <span>{calc.koFullDetail}</span>
                  </div>
                </div>

                <div className="result-bottom">
                  <span>Daño infligido: {fmt(calc.lo)} – {fmt(calc.hi)} PS</span>
                  <span>PS total rival: {calc.hp}</span>
                </div>

                {/* Modifiers Chips */}
                <div className="modifiers">
                  <span className="modifier">
                    STAB ×
                    {attacker?.tipo1 === move.tipo || attacker?.tipo2 === move.tipo
                      ? attackerAbility === 'adaptability'
                        ? '2'
                        : '1,5'
                      : '1'}
                  </span>
                  {weather !== 'none' && (
                    <span className="modifier">{weatherOptions.find(([v]) => v === weather)?.[1]}</span>
                  )}
                  {speedCalc?.isTrickRoom && (
                    <span className="modifier">🌀 Espacio Raro activo</span>
                  )}
                  {attackerField.tailwind && (
                    <span className="modifier">🌪️ Viento Afín (Atacante ×2 Vel)</span>
                  )}
                  {defenderField.tailwind && (
                    <span className="modifier">🌪️ Viento Afín (Defensor ×2 Vel)</span>
                  )}
                  {defenderField.reflect && move.categoria === 'physical' && (
                    <span className="modifier">
                      {critical ? 'Reflejo (ignorado por Crítico)' : 'Reflejo (−50% daño físico)'}
                    </span>
                  )}
                  {defenderField.lightScreen && move.categoria === 'special' && (
                    <span className="modifier">
                      {critical ? 'Pantalla Luz (ignorada por Crítico)' : 'Pantalla Luz (−50% daño especial)'}
                    </span>
                  )}
                  {calc.criticalMod > 1 && (
                    <span className="modifier">💥 Crítico ×{attackerAbility === 'sniper' ? '2,25' : '1,5'}</span>
                  )}
                  {attackerBurned && (
                    <span className="modifier">
                      🔥 Atacante quemado {move.categoria === 'physical' && attackerAbility !== 'guts' && move.id !== 'facade' ? '(físico ×0,5)' : attackerAbility === 'guts' ? '(Agallas ×1,5)' : ''}
                    </span>
                  )}
                  {attackerPoisoned && (
                    <span className="modifier">
                      ☠️ Atacante envenenado {attackerAbility === 'guts' || attackerAbility === 'toxic-boost' ? '(físico ×1,5)' : ''}
                    </span>
                  )}
                  {defenderBurned && (
                    <span className="modifier">
                      🔥 Defensor quemado {defenderAbility === 'marvel-scale' ? '(Escama Especial Def +50%)' : ''}
                    </span>
                  )}
                  {defenderPoisoned && (
                    <span className="modifier">
                      ☠️ Defensor envenenado {defenderAbility === 'marvel-scale' ? '(Escama Especial Def +50%)' : ''}
                    </span>
                  )}
                  {attackerAbility === 'technician' && move.poder <= 60 && (
                    <span className="modifier">Experto ×1,5</span>
                  )}
                  {attackerAbility === 'sheer-force' && <span className="modifier">Potencia Bruta ×1,3</span>}
                  {defenderAbility !== 'none' && (
                    <span className="modifier">Defensor: {DEFENDER_ABILITIES.find(([id]) => id === defenderAbility)?.[1]}</span>
                  )}
                  {attacker?.item !== 'none' && (
                    <span className="modifier">Objeto atacante: {ITEMS.find(([id]) => id === attacker?.item)?.[1]}</span>
                  )}
                  {defender.item !== 'none' && (
                    <span className="modifier">Objeto defensor: {ITEMS.find(([id]) => id === defender.item)?.[1]}</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="empty-state">Añade Pokémon y movimientos para calcular el resultado.</div>
            )}
          </section>
        </div>
      </div>
      </>
    )}

      {/* Main View: Pokemon Dex */}
      {currentView === 'dex' && (
        <PokemonDexView
          onSelectAttacker={handleSelectAttackerFromDexView}
          onSelectDefender={handleSelectDefenderFromDexView}
          onAddToBuilder={handleAddToBuilder}
          onToast={setToast}
        />
      )}

      {/* Main View: Movimientos */}
      {currentView === 'moves' && (
        <MovesView
          moves={moves}
          onSelectMoveInCalc={handleSelectMoveInCalc}
          onOpenCreateMoveModal={() => openForm('movimiento')}
          onOpenEditMoveModal={mv => openForm('movimiento', mv)}
          onDeleteMove={handleDeleteMove}
          onToast={setToast}
        />
      )}

      {/* Main View: Builder (6-Pokemon PvP 1v1) */}
      {currentView === 'builder' && (
        <TeamBuilderView
          pokemonList={pokemon}
          equipoOU={ouPokemon}
          equipoUU={uuPokemon}
          equipoNU={nuPokemon}
          onSendToCalculator={handleSendFromBuilderToCalc}
          onToast={setToast}
        />
      )}

      {/* Main View: Configuración (Fondo y Modo Oscuro/Día) */}
      {currentView === 'settings' && (
        <SettingsView
          theme={theme}
          onToggleTheme={() => setTheme(c => (c === 'dark' ? 'light' : 'dark'))}
          background={background}
          onSelectBackground={setBackground}
          customBackground={customBackground}
          onUploadCustomBackground={handleBackgroundUpload}
          onRemoveCustomBackground={() => {
            setCustomBackground('');
            if (background === 'custom') setBackground('mint');
            setToast('Imagen personalizada eliminada.');
          }}
          lockCustomBackground={lockCustomBackground}
          onToggleLockCustomBackground={() => {
            setLockCustomBackground(v => !v);
            setToast(
              !lockCustomBackground
                ? '📌 Fondo fijado: Tu imagen no se verá afectada por el clima.'
                : 'Fondo desfijado: El clima volverá a alterar el fondo.'
            );
          }}
          backgrounds={BACKGROUNDS}
          onToast={setToast}
        />
      )}

      {/* Main View: Información (Guía APK & Offline) */}
      {currentView === 'info' && (
        <InfoView onToast={setToast} />
      )}

      {/* Navigation Drawer */}
      {drawer && (
        <div
          className="drawer-backdrop"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setDrawer(false);
          }}
        >
          <nav className="drawer" aria-label="Navegación">
            <div className="drawer-head">
              <div>
                <div className="brand-kicker">PokéMMO · FIELD KIT</div>
                <div className="drawer-title">Tu espacio de batalla</div>
              </div>
              <button
                className="icon-button"
                aria-label="Cerrar menú"
                data-testid="button-close-menu"
                onClick={() => setDrawer(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="drawer-item-list">
              {DRAWER_ITEMS.map(item => {
                const isActive = currentView === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`drawer-item-btn ${isActive ? "active" : ""}`}
                    data-testid={`drawer-item-${item.id}`}
                    onClick={() => {
                      if (item.id === "salir") {
                        setDrawer(false);
                      } else {
                        setCurrentView(item.id);
                        setDrawer(false);
                      }
                    }}
                  >
                    <span className="drawer-item-icon">
                      <Icon size={18} />
                    </span>
                    <span className="drawer-item-label">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="drawer-note mt-6">
              <strong>
                <CircleHelp size={12} style={{ verticalAlign: "-2px", marginRight: 5 }} /> PokéMMO 100% Offline
              </strong>
              Todos tus Pokémon, movimientos y equipos se guardan localmente en tu dispositivo. Listo para usar sin conexión.
            </div>
          </nav>
        </div>
      )}

      {/* Dex General Modal (Showdown Gen 1-5 Pokédex) */}
      <DexGeneralModal
        isOpen={modal === 'dex-general'}
        onClose={() => setModal(null)}
        onAddToTeam={handleAddFromDexToTeam}
        onSelectAttacker={handleSelectAttackerFromDex}
        onSelectDefender={handleSelectDefenderFromDex}
        targetRole={dexTargetRole}
        equipoOU={equipoOU}
        equipoUU={equipoUU}
        equipoNU={equipoNU}
      />

      {/* Other Modals */}
      {modal && modal !== 'dex-general' && (
        <div
          className="modal-backdrop"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-head">
              <div>
                <div className="brand-kicker">ALMACENAMIENTO LOCAL · SIN CONEXIÓN</div>
                <h2 id="modal-title">
                  {modal === 'pokemon'
                    ? editingPokemon
                      ? `Editar · ${editingPokemon.nombre} (Tier ${activeTier.toUpperCase()})`
                      : tierViewMode === 'form'
                      ? `Añadir Pokémon a Tier ${activeTier.toUpperCase()}`
                      : `Gestionar equipo Tier ${activeTier.toUpperCase()} (${(activeTier === 'ou' ? equipoOU : activeTier === 'uu' ? equipoUU : equipoNU).length})`
                    : modal === 'movimiento'
                    ? 'Biblioteca de movimientos'
                    : modal === 'ivev-attacker'
                    ? `Modificar IV/EV · ${attacker?.nombre || 'Atacante'}`
                    : modal === 'ivev-defender'
                    ? `Modificar IV/EV · ${defender?.nombre || 'Defensor'}`
                    : 'Instalación Offline & APK'}
                </h2>
              </div>
              <button
                className="icon-button"
                aria-label="Cerrar"
                data-testid="button-close-modal"
                onClick={() => setModal(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* DEDICATED MODAL FOR ATTACKER IV / EV */}
            {modal === 'ivev-attacker' && attacker && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                    {attacker.nombre} (Nv. {attackerLevel}) · {attacker.nature.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-1">
                    <TypeBadge type={attacker.tipo1} size="sm" />
                    {attacker.tipo2 && <TypeBadge type={attacker.tipo2} size="sm" />}
                  </div>
                </div>

                <div className="ivev-presets">
                  <button type="button" className="preset-btn" onClick={() => applyIVPreset(attacker.id, 'max31')}>
                    Max IVs (31)
                  </button>
                  <button type="button" className="preset-btn" onClick={() => applyIVPreset(attacker.id, 'minAtk')}>
                    0 Atk IV
                  </button>
                  <button type="button" className="preset-btn" onClick={() => applyIVPreset(attacker.id, 'minSpe')}>
                    0 Vel IV
                  </button>
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => applyEVPreset(attacker.id, { atk: 252, spe: 252, hp: 4 })}
                  >
                    252 Atq / 252 Vel
                  </button>
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => applyEVPreset(attacker.id, { spa: 252, spe: 252, hp: 4 })}
                  >
                    252 SpA / 252 Vel
                  </button>
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => applyEVPreset(attacker.id, { hp: 252, atk: 252, def: 4 })}
                  >
                    252 PS / 252 Atq
                  </button>
                  <button type="button" className="preset-btn" onClick={() => applyEVPreset(attacker.id, {})}>
                    Reset 0 EVs
                  </button>
                </div>

                <table className="ivev-table">
                  <thead>
                    <tr>
                      <th>Estadística</th>
                      <th>Base</th>
                      <th>IV (0-31)</th>
                      <th>EV (0-252)</th>
                      <th>Stat Nv.{attackerLevel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {STAT_KEYS.map(key => {
                      const calculated = stat(attacker, key, attackerLevel);
                      return (
                        <tr key={key}>
                          <td className="ivev-stat-name">{STAT_LABELS[key]}</td>
                          <td>{attacker[key]}</td>
                          <td>
                            <input
                              type="number"
                              min={0}
                              max={31}
                              className="ivev-input"
                              value={attacker.ivs[key]}
                              onChange={e => updateIV(attacker.id, key, Number(e.target.value))}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min={0}
                              max={252}
                              className="ivev-input"
                              value={attacker.evs[key]}
                              onChange={e => updateEV(attacker.id, key, Number(e.target.value))}
                            />
                          </td>
                          <td className="ivev-total-stat">{calculated}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div
                  className={`ev-counter-bar ${
                    Object.values(attacker.evs).reduce((a, b) => a + b, 0) > 510 ? 'overflow' : ''
                  }`}
                >
                  <span>
                    Total EVs: <strong>{Object.values(attacker.evs).reduce((a, b) => a + b, 0)} / 510</strong>
                  </span>
                  {Object.values(attacker.evs).reduce((a, b) => a + b, 0) > 510 && (
                    <span className="text-red-500 font-bold">¡Límite superado!</span>
                  )}
                </div>

                <button type="button" className="btn btn-primary mt-2" onClick={() => setModal(null)}>
                  Listo / Guardar
                </button>
              </div>
            )}

            {/* DEDICATED MODAL FOR DEFENDER IV / EV */}
            {modal === 'ivev-defender' && defender && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                    {defender.nombre} (Nv. {defenderLevel}) · {defender.nature.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-1">
                    <TypeBadge type={defender.tipo1} size="sm" />
                    {defender.tipo2 && <TypeBadge type={defender.tipo2} size="sm" />}
                  </div>
                </div>

                <div className="ivev-presets">
                  <button type="button" className="preset-btn" onClick={() => applyIVPreset(defender.id, 'max31')}>
                    Max IVs (31)
                  </button>
                  <button type="button" className="preset-btn" onClick={() => applyIVPreset(defender.id, 'minSpe')}>
                    0 Vel IV
                  </button>
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => applyEVPreset(defender.id, { hp: 252, def: 252, spd: 4 })}
                  >
                    252 PS / 252 Def
                  </button>
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => applyEVPreset(defender.id, { hp: 252, spd: 252, def: 4 })}
                  >
                    252 PS / 252 SpD
                  </button>
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => applyEVPreset(defender.id, { def: 252, spd: 252, hp: 4 })}
                  >
                    252 Def / 252 SpD
                  </button>
                  <button
                    type="button"
                    className="preset-btn"
                    onClick={() => applyEVPreset(defender.id, { hp: 252, spe: 252, def: 4 })}
                  >
                    252 PS / 252 Vel
                  </button>
                  <button type="button" className="preset-btn" onClick={() => applyEVPreset(defender.id, {})}>
                    Reset 0 EVs
                  </button>
                </div>

                <table className="ivev-table">
                  <thead>
                    <tr>
                      <th>Estadística</th>
                      <th>Base</th>
                      <th>IV (0-31)</th>
                      <th>EV (0-252)</th>
                      <th>Stat Nv.{defenderLevel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {STAT_KEYS.map(key => {
                      const calculated = stat(defender, key, defenderLevel);
                      return (
                        <tr key={key}>
                          <td className="ivev-stat-name">{STAT_LABELS[key]}</td>
                          <td>{defender[key]}</td>
                          <td>
                            <input
                              type="number"
                              min={0}
                              max={31}
                              className="ivev-input"
                              value={defender.ivs[key]}
                              onChange={e => updateIV(defender.id, key, Number(e.target.value))}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min={0}
                              max={252}
                              className="ivev-input"
                              value={defender.evs[key]}
                              onChange={e => updateEV(defender.id, key, Number(e.target.value))}
                            />
                          </td>
                          <td className="ivev-total-stat">{calculated}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div
                  className={`ev-counter-bar ${
                    Object.values(defender.evs).reduce((a, b) => a + b, 0) > 510 ? 'overflow' : ''
                  }`}
                >
                  <span>
                    Total EVs: <strong>{Object.values(defender.evs).reduce((a, b) => a + b, 0)} / 510</strong>
                  </span>
                  {Object.values(defender.evs).reduce((a, b) => a + b, 0) > 510 && (
                    <span className="text-red-500 font-bold">¡Límite superado!</span>
                  )}
                </div>

                <button type="button" className="btn btn-primary mt-2" onClick={() => setModal(null)}>
                  Listo / Guardar
                </button>
              </div>
            )}

            {/* APK / PWA Guide Modal */}
            {modal === 'apk-guide' && (
              <div className="flex flex-col gap-4 text-slate-800 dark:text-slate-100 text-sm">
                <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                  <img src="/pwa-192x192.png" alt="Icono de la App" className="w-14 h-14 rounded-2xl shadow-md" />
                  <div>
                    <h3 className="font-bold text-base text-emerald-900 dark:text-emerald-100">
                      PokéMMO Damage Calc
                    </h3>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      App móvil offline con rotación horizontal y fondos climáticos.
                    </p>
                  </div>
                </div>

                <div className="bg-white/60 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                  <strong className="text-emerald-700 dark:text-emerald-400 font-mono text-xs uppercase">
                    📱 Opción 1: Instalación directa en Android
                  </strong>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    En Google Chrome o navegadores basados en Chromium:
                  </p>
                  {isInstallable ? (
                    <button
                      type="button"
                      className="btn btn-primary flex items-center justify-center gap-2 mt-2"
                      onClick={async () => {
                        const ok = await install();
                        if (ok) setModal(null);
                      }}
                    >
                      <Download size={16} /> Instalar ahora en este dispositivo
                    </button>
                  ) : (
                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs">
                      Pulsa en los <strong>3 puntos del navegador ⋮</strong> y selecciona{' '}
                      <strong>"Instalar aplicación"</strong> o <strong>"Añadir a pantalla de inicio"</strong>. Se añadirá como una app nativa con el icono en tu launcher y soporte horizontal.
                    </div>
                  )}
                </div>

                <div className="bg-white/60 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                  <strong className="text-sky-700 dark:text-sky-400 font-mono text-xs uppercase">
                    📦 Opción 2: Generar APK instalable (.apk)
                  </strong>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Si deseas compilar un archivo <code>.apk</code> independiente:
                  </p>
                  <ol className="text-xs list-decimal pl-4 flex flex-col gap-1 text-slate-600 dark:text-slate-300">
                    <li>
                      Usa <strong>PWABuilder</strong> (pwabuilder.com) introduciendo la URL de esta aplicación para generar un paquete Android APK firmado.
                    </li>
                    <li>
                      O utiliza apps como <strong>Hermit Lite Apps</strong> para empaquetarla localmente como un APK con icono de launcher.
                    </li>
                    <li>
                      El Service Worker integrado mantendrá todos los datos y fondos climáticos cacheados para uso <strong>100% offline</strong>.
                    </li>
                  </ol>
                </div>

                <button
                  type="button"
                  className="btn btn-muted w-full"
                  onClick={() => setModal(null)}
                >
                  Entendido
                </button>
              </div>
            )}

            {/* Pokemon Form & Team Management organized by Tier */}
            {modal === 'pokemon' && (
              <>
                {/* Tier Tabs Switcher */}
                <div className="tier-modal-tabs" role="tablist">
                  <button
                    type="button"
                    data-testid="modal-tab-tier-ou"
                    className={`tier-modal-tab ${activeTier === 'ou' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTier('ou');
                      if (editing && (editing as Pokemon).tier !== 'ou') setEditing(null);
                    }}
                  >
                    <span className="tier-chip tier-chip-ou">OU</span>
                    <span>Tier OU ({equipoOU.length})</span>
                  </button>
                  <button
                    type="button"
                    data-testid="modal-tab-tier-uu"
                    className={`tier-modal-tab ${activeTier === 'uu' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTier('uu');
                      if (editing && (editing as Pokemon).tier !== 'uu') setEditing(null);
                    }}
                  >
                    <span className="tier-chip tier-chip-uu">UU</span>
                    <span>Tier UU ({equipoUU.length})</span>
                  </button>
                  <button
                    type="button"
                    data-testid="modal-tab-tier-nu"
                    className={`tier-modal-tab ${activeTier === 'nu' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTier('nu');
                      if (editing && (editing as Pokemon).tier !== 'nu') setEditing(null);
                    }}
                  >
                    <span className="tier-chip tier-chip-nu">NU</span>
                    <span>Tier NU ({equipoNU.length})</span>
                  </button>
                </div>

                {/* Sub-actions for active tier */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <button
                    type="button"
                    data-testid="button-mode-add"
                    className={`btn ${tierViewMode === 'form' || editing ? 'btn-primary' : 'btn-muted'} !py-2 !px-3 text-xs flex items-center gap-1.5`}
                    onClick={() => {
                      setEditing(null);
                      setTierViewMode('form');
                    }}
                  >
                    <PlusCircle size={14} /> Añadir a Tier {activeTier.toUpperCase()}
                  </button>
                  <button
                    type="button"
                    data-testid="button-mode-manage"
                    className={`btn ${tierViewMode === 'list' && !editing ? 'btn-primary' : 'btn-muted'} !py-2 !px-3 text-xs flex items-center gap-1.5`}
                    onClick={() => {
                      setEditing(null);
                      setTierViewMode('list');
                    }}
                  >
                    <Activity size={14} /> Gestionar equipo Tier {activeTier.toUpperCase()} ({(activeTier === 'ou' ? equipoOU : activeTier === 'uu' ? equipoUU : equipoNU).length})
                  </button>
                </div>

                {(tierViewMode === 'form' || editing) && (
                <form className="modal-form" key={editing?.id ?? `new-pokemon-${activeTier}`} onSubmit={savePokemon}>
                  <div className="form-grid">
                    <div className="form-field">
                      <label htmlFor="pokemon-name">Nombre</label>
                      <input
                        id="pokemon-name"
                        name="nombre"
                        data-testid="input-pokemon-name"
                        defaultValue={editingPokemon?.nombre ?? ''}
                        maxLength={24}
                        required
                        placeholder="Ej. Garchomp"
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="pokemon-tier">Categoría / Tier</label>
                      <select
                        id="pokemon-tier"
                        name="tier"
                        data-testid="select-pokemon-tier"
                        defaultValue={editingPokemon?.tier ?? activeTier}
                        onChange={e => setActiveTier(e.target.value as 'ou' | 'uu' | 'nu')}
                      >
                        <option value="ou">Tier OU (Over Used)</option>
                        <option value="uu">Tier UU (Under Used)</option>
                        <option value="nu">Tier NU (Never Used)</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-grid">
                    <FormType name="tipo1" label="Tipo 1" initial={editingPokemon?.tipo1 ?? 'normal'} />
                    <FormType
                      name="tipo2"
                      label="Tipo 2 (opcional)"
                      initial={editingPokemon?.tipo2 ?? ''}
                      optional
                    />
                  </div>

                  <div className="form-subsection">
                    <div className="form-subhead">Estadísticas base</div>
                    <div className="form-grid">
                      {STAT_KEYS.map((key, index) => (
                        <div className="form-field" key={key}>
                          <label htmlFor={`stat-${key}`}>{STAT_LABELS[key]} base</label>
                          <input
                            id={`stat-${key}`}
                            name={key}
                            data-testid={`input-pokemon-${key}`}
                            type="number"
                            min="1"
                            max="255"
                            step="1"
                            required
                            defaultValue={editingPokemon?.[key] ?? [80, 100, 80, 80, 80, 80][index]}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="form-subsection">
                    <div className="form-subhead">IVs · de 0 a 31</div>
                    <div className="form-grid">
                      {STAT_KEYS.map(key => (
                        <div className="form-field" key={key}>
                          <label htmlFor={`iv-${key}`}>{STAT_LABELS[key]}</label>
                          <input
                            id={`iv-${key}`}
                            name={`iv-${key}`}
                            data-testid={`input-iv-${key}`}
                            type="number"
                            min="0"
                            max="31"
                            step="1"
                            required
                            defaultValue={editingPokemon?.ivs[key] ?? 31}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="form-subsection">
                    <div className="form-subhead">EVs · 0–252 por estadística; 510 en total</div>
                    <div className="form-grid">
                      {STAT_KEYS.map(key => (
                        <div className="form-field" key={key}>
                          <label htmlFor={`ev-${key}`}>{STAT_LABELS[key]}</label>
                          <input
                            id={`ev-${key}`}
                            name={`ev-${key}`}
                            data-testid={`input-ev-${key}`}
                            type="number"
                            min="0"
                            max="252"
                            step="1"
                            required
                            defaultValue={editingPokemon?.evs[key] ?? 0}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-field">
                      <label htmlFor="pokemon-nature">Naturaleza</label>
                      <select
                        id="pokemon-nature"
                        name="nature"
                        data-testid="select-pokemon-nature"
                        defaultValue={editingPokemon?.nature ?? 'adamant'}
                      >
                        {NATURES.map(([id, label]) => (
                          <option value={id} key={id}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-field">
                      <label htmlFor="pokemon-held-item">Objeto equipado</label>
                      <select
                        id="pokemon-held-item"
                        name="item"
                        data-testid="select-pokemon-held-item"
                        defaultValue={editingPokemon?.item ?? 'none'}
                      >
                        {ITEMS.map(([id, label]) => (
                          <option value={id} key={id}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <label className="check-row">
                    <input
                      type="checkbox"
                      name="finalEvolution"
                      data-testid="checkbox-final-evolution"
                      defaultChecked={editingPokemon?.finalEvolution ?? true}
                    />
                    <span>Está en su evolución final</span>
                    <small>El Mineral Evolutivo solo se aplica si no lo está.</small>
                  </label>

                    <div className="form-actions">
                      <button
                        type="button"
                        className="btn btn-muted"
                        data-testid="button-new-pokemon"
                        onClick={() => {
                          setEditing(null);
                          setTierViewMode('list');
                        }}
                      >
                        {editing ? 'Cancelar edición' : 'Ver lista'}
                      </button>
                      <button className="btn btn-primary" data-testid="button-save-pokemon">
                        {editing ? 'Guardar cambios' : `Añadir a Tier ${activeTier.toUpperCase()}`}
                      </button>
                    </div>
                  </form>
                )}

                {/* Tier-specific Roster List */}
                <div className="mt-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700 flex-wrap gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <span className={`tier-chip tier-chip-${activeTier}`}>{activeTier.toUpperCase()}</span>
                      Equipo Tier {activeTier.toUpperCase()} ({(activeTier === 'ou' ? equipoOU : activeTier === 'uu' ? equipoUU : equipoNU).length} Pokémon)
                    </span>
                    <div className="flex items-center gap-2">
                      {(activeTier === 'ou' ? equipoOU : activeTier === 'uu' ? equipoUU : equipoNU).length > 0 && (
                        <button
                          type="button"
                          className="text-xs text-rose-600 dark:text-rose-400 font-semibold hover:underline flex items-center gap-1 bg-rose-50 dark:bg-rose-950/40 px-2 py-1 rounded border border-rose-200 dark:border-rose-900/40"
                          data-testid={`button-clear-all-${activeTier}`}
                          onClick={() => clearActiveTierList(activeTier)}
                          title={`Limpiar toda la lista de Pokémon de Tier ${activeTier.toUpperCase()}`}
                        >
                          <Trash2 size={12} /> Limpiar toda la lista
                        </button>
                      )}
                      {tierViewMode !== 'form' && !editing && (
                        <button
                          type="button"
                          className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                          onClick={() => {
                            setEditing(null);
                            setTierViewMode('form');
                          }}
                        >
                          <Plus size={12} /> Nuevo Pokémon
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="roster-list">
                    {(activeTier === 'ou' ? equipoOU : activeTier === 'uu' ? equipoUU : equipoNU).length ? (
                      (activeTier === 'ou' ? equipoOU : activeTier === 'uu' ? equipoUU : equipoNU).map(p => (
                        <div className="roster-row" key={p.id}>
                          <div className="roster-info">
                            <div className="flex items-center gap-2 mb-1">
                              <strong className="text-sm">{p.nombre}</strong>
                              <TypeBadge type={p.tipo1} size="sm" />
                              {p.tipo2 && <TypeBadge type={p.tipo2} size="sm" />}
                              <span className={`tier-chip tier-chip-${p.tier || 'ou'} ml-auto`}>
                                {(p.tier || 'ou').toUpperCase()}
                              </span>
                            </div>
                            <small>
                              PS {p.hp} · Atq {p.atk} · Def {p.def} · SpA {p.spa} · SpD {p.spd} · Vel {p.spe}
                            </small>
                          </div>
                          <button
                            type="button"
                            className="tiny-action"
                            aria-label={`Editar ${p.nombre}`}
                            data-testid={`button-edit-pokemon-${p.id}`}
                            onClick={() => {
                              setEditing(p);
                              setTierViewMode('form');
                            }}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            className="tiny-action delete"
                            aria-label={`Eliminar ${p.nombre}`}
                            data-testid={`button-delete-pokemon-${p.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePokemon(p.id);
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">
                        El equipo Tier {activeTier.toUpperCase()} está vacío. Pulsa en "Añadir a Tier {activeTier.toUpperCase()}" arriba para añadir tu primer Pokémon.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Move Form */}
            {modal === 'movimiento' && (
              <>
                <form className="modal-form" key={editing?.id ?? 'new-move'} onSubmit={saveMove}>
                  <div className="form-field">
                    <label htmlFor="move-name">Nombre</label>
                    <input
                      id="move-name"
                      name="nombre"
                      data-testid="input-move-name"
                      defaultValue={editingMove?.nombre ?? ''}
                      maxLength={28}
                      required
                      placeholder="Ej. Terremoto"
                    />
                  </div>

                  <div className="form-grid">
                    <FormType name="tipo" label="Tipo" initial={editingMove?.tipo ?? 'normal'} />
                    <div className="form-field">
                      <label htmlFor="move-category">Categoría</label>
                      <select
                        id="move-category"
                        name="categoria"
                        data-testid="select-move-category"
                        defaultValue={editingMove?.categoria ?? 'physical'}
                      >
                        <option value="physical">Físico</option>
                        <option value="special">Especial</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-field">
                      <label htmlFor="move-power">Potencia base</label>
                      <input
                        id="move-power"
                        name="poder"
                        data-testid="input-move-power"
                        type="number"
                        min="1"
                        max="250"
                        required
                        defaultValue={editingMove?.poder ?? 80}
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="move-priority">Prioridad de turno (−6 a +5)</label>
                      <input
                        id="move-priority"
                        name="priority"
                        data-testid="input-move-priority"
                        type="number"
                        min="-6"
                        max="5"
                        defaultValue={editingMove?.priority ?? 0}
                      />
                    </div>
                  </div>

                  <div className="form-subsection">
                    <div className="form-subhead">Cambio de estadística del usuario después del golpe</div>
                    <div className="form-grid">
                      <div className="form-field">
                        <label htmlFor="move-stage-stat">Estadística</label>
                        <select
                          id="move-stage-stat"
                          name="stageStat"
                          data-testid="select-move-stage-stat"
                          defaultValue={editingMove?.statChange?.stat ?? 'none'}
                        >
                          <option value="none">Sin cambio</option>
                          {STAGE_KEYS.map(key => (
                            <option key={key} value={key}>
                              {STAT_LABELS[key]}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-field">
                        <label htmlFor="move-stage-change">Etapas</label>
                        <select
                          id="move-stage-change"
                          name="stageChange"
                          data-testid="select-move-stage-change"
                          defaultValue={editingMove?.statChange?.stages ?? 0}
                        >
                          <option value="0">Sin cambio</option>
                          {[-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6].map(value => (
                            <option key={value} value={value}>
                              {value > 0 ? `+${value}` : value}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn btn-muted"
                      data-testid="button-new-move"
                      onClick={() => setEditing(null)}
                    >
                      Nuevo registro
                    </button>
                    <button className="btn btn-primary" data-testid="button-save-move">
                      {editing ? 'Guardar cambios' : 'Añadir movimiento'}
                    </button>
                  </div>
                </form>

                <div className="roster-list">
                  {moves.length ? (
                    moves.map(m => (
                      <div className="roster-row" key={m.id}>
                        <div className="roster-info">
                          <div className="flex items-center gap-2 mb-1">
                            <strong className="text-sm">{m.nombre}</strong>
                            <TypeBadge type={m.tipo} size="sm" />
                            {m.priority ? (
                              <span className="text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">
                                +{m.priority} Prio
                              </span>
                            ) : null}
                          </div>
                          <small>
                            {m.categoria === 'physical' ? 'Físico' : 'Especial'} · {m.poder} potencia
                            {m.statChange
                              ? ` · ${STAT_LABELS[m.statChange.stat]} ${m.statChange.stages > 0 ? '+' : ''}${
                                  m.statChange.stages
                                } tras el golpe`
                              : ''}
                          </small>
                        </div>
                        <button
                          className="tiny-action"
                          aria-label={`Editar ${m.nombre}`}
                          data-testid={`button-edit-move-${m.id}`}
                          onClick={() => setEditing(m)}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="tiny-action delete"
                          aria-label={`Eliminar ${m.nombre}`}
                          data-testid={`button-delete-move-${m.id}`}
                          onClick={() => deleteMove(m.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">No hay movimientos. Añade uno arriba.</div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div role="status" className="toast" data-testid="status-toast">
          {toast}
        </div>
      )}
    </main>
  );
}

function FormType({
  name,
  label,
  initial,
  optional = false,
}: {
  name: string;
  label: string;
  initial: string;
  optional?: boolean;
}) {
  return (
    <div className="form-field">
      <label htmlFor={`form-${name}`}>{label}</label>
      <select id={`form-${name}`} name={name} data-testid={`select-form-${name}`} defaultValue={initial} required={!optional}>
        <option value="">{optional ? 'Sin tipo' : 'Elige un tipo'}</option>
        {TYPES.map(([id, title]) => (
          <option value={id} key={id}>
            {title}
          </option>
        ))}
      </select>
    </div>
  );
}

export default App;
