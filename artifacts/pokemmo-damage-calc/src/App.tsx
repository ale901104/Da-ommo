import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  CloudSun,
  Download,
  Edit2,
  Gauge,
  ImagePlus,
  Menu,
  Minus,
  Moon,
  Palette,
  Plus,
  PlusCircle,
  RotateCcw,
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
  type CustomAbility,
  type Move,
  type Pokemon,
  type StageKey,
  type StageValues,
  type StatKey,
  type StatValues,
} from './pokemon-constants';
import { usePWAInstall } from './hooks/use-pwa-install';
import { WeatherBackground } from './components/weather-background';

type ModalKind = 'pokemon' | 'movimiento' | 'apk-guide' | 'ivev-attacker' | 'ivev-defender' | null;
type Weather = 'none' | 'sun' | 'rain' | 'sand' | 'hail';
type Field = 'none' | 'reflect' | 'light-screen' | 'aurora-veil' | 'tailwind';
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
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
};

const weatherOptions: [Weather, string][] = [
  ['none', 'Sin clima'],
  ['sun', 'Sol intenso (Desierto)'],
  ['rain', 'Lluvia torrencial'],
  ['sand', 'Tormenta de arena'],
  ['hail', 'Granizo y nieve'],
];

const fieldOptions: [Field, string][] = [
  ['none', 'Sin efecto'],
  ['reflect', 'Reflejo (Físico -50%)'],
  ['light-screen', 'Pantalla de Luz (Esp. -50%)'],
  ['aurora-veil', 'Velo Aurora (Ambos -50%)'],
  ['tailwind', 'Viento Afín (Velocidad ×2)'],
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
  return {
    id: typeof row.id === 'string' ? row.id : `pk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    nombre: typeof row.nombre === 'string' ? row.nombre.slice(0, 24) : 'Pokémon',
    tipo1: typeof row.tipo1 === 'string' && TYPES.some(([id]) => id === row.tipo1) ? row.tipo1 : 'normal',
    tipo2: typeof row.tipo2 === 'string' && TYPES.some(([id]) => id === row.tipo2) ? row.tipo2 : '',
    hp: safeInteger(row.hp, statDefaults.hp, 1, 255),
    atk: safeInteger(row.atk, statDefaults.atk, 1, 255),
    def: safeInteger(row.def, statDefaults.def, 1, 255),
    spa: safeInteger(row.spa, statDefaults.spa, 1, 255),
    spd: safeInteger(row.spd, statDefaults.spd, 1, 255),
    spe: safeInteger(row.spe, statDefaults.spe, 1, 255),
    ivs: normalizeStatValues(row.ivs, DEFAULT_IVS, 0, 31),
    evs: normalizeStatValues(row.evs, DEFAULT_EVS, 0, 252),
    nature,
    item,
    ability: typeof row.ability === 'string' ? row.ability : 'none',
    finalEvolution: typeof row.finalEvolution === 'boolean' ? row.finalEvolution : true,
    boosts: normalizeBoostValues(row.boosts),
  };
}

function loadSaved() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('pokemmo-calc-v1');
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, unknown>;
      if (Array.isArray(parsed.pokemon) && Array.isArray(parsed.movimientos)) {
        const background = ['mint', 'dusk', 'aurora', 'custom'].includes(String(parsed.background))
          ? (parsed.background as BackgroundChoice)
          : 'mint';
        const customBackground =
          typeof parsed.customBackground === 'string' && parsed.customBackground.startsWith('data:image/')
            ? parsed.customBackground
            : '';
        return {
          pokemon: parsed.pokemon.map(normalizePokemon),
          movimientos: parsed.movimientos.map(normalizeMove),
          habilidades: Array.isArray(parsed.habilidades) ? (parsed.habilidades as CustomAbility[]) : [],
          background,
          customBackground,
          theme: parsed.theme === 'dark' ? ('dark' as ThemeChoice) : ('light' as ThemeChoice),
        };
      }
    }
  } catch {
    // fallback
  }
  return {
    pokemon: (pokemonIniciales as unknown[]).map(normalizePokemon),
    movimientos: (movimientosIniciales as unknown[]).map(normalizeMove),
    habilidades: [] as CustomAbility[],
    background: 'mint' as BackgroundChoice,
    customBackground: '',
    theme: 'light' as ThemeChoice,
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

function App() {
  const initial = useMemo(loadSaved, []);
  const [pokemon, setPokemon] = useState<Pokemon[]>(initial.pokemon);
  const [moves, setMoves] = useState<Move[]>(initial.movimientos);
  const [customAbilities, setCustomAbilities] = useState<CustomAbility[]>(initial.habilidades);
  const [background, setBackground] = useState<BackgroundChoice>(initial.background);
  const [customBackground, setCustomBackground] = useState(initial.customBackground);
  const [theme, setTheme] = useState<ThemeChoice>(initial.theme);

  const [attackerId, setAttackerId] = useState(initial.pokemon[0]?.id ?? '');
  const [defenderId, setDefenderId] = useState(initial.pokemon[1]?.id ?? initial.pokemon[0]?.id ?? '');
  const [moveId, setMoveId] = useState(initial.movimientos[0]?.id ?? '');

  const [attackerLevel, setAttackerLevel] = useState(50);
  const [defenderLevel, setDefenderLevel] = useState(50);

  // Independent abilities
  const [attackerAbility, setAttackerAbility] = useState('none');
  const [defenderAbility, setDefenderAbility] = useState('none');

  const [weather, setWeather] = useState<Weather>('none');
  const [critical, setCritical] = useState(false);
  const [burned, setBurned] = useState(false);
  const [lowHp, setLowHp] = useState(false);
  const [field, setField] = useState<Field>('none');

  const [drawer, setDrawer] = useState(false);
  const [openSections, setOpenSections] = useState({ pokemon: true, moves: false, abilities: false, backgrounds: false });
  const [modal, setModal] = useState<ModalKind>(null);
  const [editing, setEditing] = useState<Pokemon | Move | null>(null);
  const [toast, setToast] = useState('');

  // PWA Install hook
  const { isInstallable, isInstalled, install } = usePWAInstall();

  // Save changes locally
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          pokemon,
          movimientos: moves,
          habilidades: customAbilities,
          background,
          customBackground,
          theme,
        }),
      );
    } catch {
      setToast('No se pudo guardar en almacenamiento local.');
    }
  }, [pokemon, moves, customAbilities, background, customBackground, theme]);

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

  // Sync abilities from pokemon if set
  useEffect(() => {
    if (attacker?.ability && attacker.ability !== 'none') {
      setAttackerAbility(attacker.ability);
    }
  }, [attacker?.id]);

  useEffect(() => {
    if (defender?.ability && defender.ability !== 'none') {
      setDefenderAbility(defender.ability);
    }
  }, [defender?.id]);

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

    const atkFieldMod = field === 'tailwind' ? 2 : 1;
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

    const finalDefenderSpe = Math.floor(stagedDefenderSpe * defItemMod * defAbilityMod);

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
      if (finalAttackerSpe > finalDefenderSpe) {
        winner = 'attacker';
        headline = `⚡ ${attacker.nombre} ataca primero (${finalAttackerSpe} vs ${finalDefenderSpe} Vel)`;
        detail = `Ventaja de velocidad de +${finalAttackerSpe - finalDefenderSpe} puntos para el atacante.`;
      } else if (finalDefenderSpe > finalAttackerSpe) {
        winner = 'defender';
        headline = `🛡️ ${defender.nombre} ataca primero (${finalDefenderSpe} vs ${finalAttackerSpe} Vel)`;
        detail = `El rival supera en +${finalDefenderSpe - finalAttackerSpe} puntos de velocidad al atacante.`;
      } else {
        winner = 'tie';
        headline = `⚔️ Empate de velocidad (${finalAttackerSpe} Vel)`;
        detail = `Ambos Pokémon tienen exactamente la misma velocidad. Probabilidad de turno: 50% / 50%.`;
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
      attackerBarPct: (finalAttackerSpe / maxSpeed) * 100,
      defenderBarPct: (finalDefenderSpe / maxSpeed) * 100,
      atkItemNote,
      atkAbilityNote,
      defItemNote,
      defAbilityNote,
    };
  }, [attacker, defender, move, attackerLevel, defenderLevel, attackerAbility, defenderAbility, weather, field]);

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

    // Sandstorm SpD boost for Rock types
    if (weather === 'sand' && move.categoria === 'special' && (defender.tipo1 === 'rock' || defender.tipo2 === 'rock')) {
      def = Math.floor(def * 1.5);
    }

    let eff = effectiveness(move.tipo, defender);

    // Defender type immunities via Abilities
    if (defenderAbility === 'levitate' && move.tipo === 'ground') eff = 0;
    if (defenderAbility === 'water-absorb' && move.tipo === 'water') eff = 0;
    if (defenderAbility === 'flash-fire' && move.tipo === 'fire') eff = 0;
    if (defenderAbility === 'volt-absorb' && move.tipo === 'electric') eff = 0;
    if (defenderAbility === 'sap-sipper' && move.tipo === 'grass') eff = 0;
    if (defenderAbility === 'wonder-guard' && eff <= 1) eff = 0;

    const stab =
      attacker.tipo1 === move.tipo || attacker.tipo2 === move.tipo
        ? attackerAbility === 'adaptability'
          ? 2
          : 1.5
        : 1;

    let weatherMod = 1;
    if ((weather === 'sun' && move.tipo === 'fire') || (weather === 'rain' && move.tipo === 'water')) weatherMod = 1.5;
    if ((weather === 'sun' && move.tipo === 'water') || (weather === 'rain' && move.tipo === 'fire')) weatherMod = 0.5;

    let abilityMod = 1;
    if (attackerAbility === 'technician' && move.poder <= 60) abilityMod = 1.5;
    if (attackerAbility === 'sheer-force') abilityMod = 1.3;
    if (attackerAbility === 'tinted-lens' && eff < 1 && eff > 0) abilityMod = 2;

    if (
      lowHp &&
      ((attackerAbility === 'blaze' && move.tipo === 'fire') ||
        (attackerAbility === 'torrent' && move.tipo === 'water') ||
        (attackerAbility === 'overgrow' && move.tipo === 'grass') ||
        (attackerAbility === 'swarm' && move.tipo === 'bug'))
    ) {
      abilityMod = 1.5;
    }

    if (customAbility?.effect === 'damage' && customAbilityMatches) {
      abilityMod *= customAbility.multiplier;
    }

    // Defender Ability Reductions
    let defenderAbilityMod = 1;
    if (defenderAbility === 'thick-fat' && (move.tipo === 'fire' || move.tipo === 'ice')) {
      defenderAbilityMod *= 0.5;
    }
    if (defenderAbility === 'multiscale') {
      defenderAbilityMod *= 0.5;
    }
    if ((defenderAbility === 'solid-rock' || defenderAbility === 'filter') && eff > 1) {
      defenderAbilityMod *= 0.75;
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
    const gutsMod = attackerAbility === 'guts' && burned && move.categoria === 'physical' ? 1.5 : 1;
    const burnMod = burned && move.categoria === 'physical' && attackerAbility !== 'guts' ? 0.5 : 1;

    const effectiveAtk = Math.floor(atk * itemStatMod * attackAbilityMod * gutsMod * burnMod);

    let itemPower = attacker.item === `${move.tipo}-gem` ? 1.3 : attacker.item === 'life-orb' ? 1.3 : 1;
    if (attacker.item === 'expert-belt' && eff > 1) itemPower = 1.2;

    const screen =
      !critical &&
      ((['reflect', 'aurora-veil'].includes(field) && move.categoria === 'physical') ||
        (['light-screen', 'aurora-veil'].includes(field) && move.categoria === 'special'))
        ? 0.5
        : 1;

    const criticalMod = critical ? (attackerAbility === 'sniper' ? 2.25 : 1.5) : 1;

    const base =
      eff === 0
        ? 0
        : Math.floor(
            Math.floor((Math.floor((2 * attackerLevel) / 5 + 2) * move.poder * effectiveAtk) / Math.max(1, def)) / 50,
          ) + 2;

    const modifier = stab * eff * weatherMod * abilityMod * defenderAbilityMod * itemPower * screen * criticalMod;
    const lo = eff === 0 ? 0 : Math.floor(base * modifier * 0.85);
    const hi = eff === 0 ? 0 : Math.floor(base * modifier);

    return {
      hp,
      eff,
      lo,
      hi,
      pct: hp && eff > 0 ? (hi / hp) * 100 : 0,
      atk: effectiveAtk,
      def,
      burnMod,
      criticalMod,
      abilityMod,
      defenderAbilityMod,
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
    field,
    critical,
    burned,
    lowHp,
    customAbility,
    customAbilityMatches,
  ]);

  const koChance = calc
    ? calc.eff === 0
      ? 'Inmune (Sin daño)'
      : calc.lo >= calc.hp
      ? 'KO seguro (100%)'
      : calc.hi >= calc.hp
      ? 'Posible KO'
      : 'No es KO'
    : 'Sin datos';

  // --- Handlers for direct IV/EV modifications ---
  const updateIV = (id: string | undefined, key: StatKey, value: number) => {
    if (!id) return;
    const clamped = safeInteger(value, 31, 0, 31);
    setPokemon(roster =>
      roster.map(p => (p.id === id ? { ...p, ivs: { ...p.ivs, [key]: clamped } } : p)),
    );
  };

  const updateEV = (id: string | undefined, key: StatKey, value: number) => {
    if (!id) return;
    const clamped = safeInteger(value, 0, 0, 252);
    setPokemon(roster =>
      roster.map(p => (p.id === id ? { ...p, evs: { ...p.evs, [key]: clamped } } : p)),
    );
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
    setPokemon(roster => roster.map(p => (p.id === id ? { ...p, ivs: newIvs } : p)));
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
    setPokemon(roster => roster.map(p => (p.id === id ? { ...p, evs: newEvs } : p)));
    setToast('EVs actualizados.');
  };

  const updateHeldItem = (id: string | undefined, heldItem: string) => {
    if (!id) return;
    setPokemon(roster => roster.map(p => (p.id === id ? { ...p, item: heldItem } : p)));
  };

  const updateNature = (id: string | undefined, nat: string) => {
    if (!id) return;
    setPokemon(roster => roster.map(p => (p.id === id ? { ...p, nature: nat } : p)));
  };

  const updateLevel = (which: 'attacker' | 'defender', by: number) =>
    (which === 'attacker' ? setAttackerLevel : setDefenderLevel)(level => Math.max(1, Math.min(100, level + by)));

  const updateBoost = (id: string | undefined, key: StageKey, change: number) => {
    if (!id) return;
    setPokemon(roster =>
      roster.map(p =>
        p.id === id ? { ...p, boosts: { ...p.boosts, [key]: Math.max(-6, Math.min(6, p.boosts[key] + change)) } } : p,
      ),
    );
  };

  const postMoveChange = attacker && move ? moveStageOutcome(attacker, move, attackerAbility, customAbility) : null;

  const clearActiveBoosts = () => {
    const active = new Set([attackerId, defenderId]);
    setPokemon(roster => roster.map(p => (active.has(p.id) ? { ...p, boosts: { ...DEFAULT_BOOSTS } } : p)));
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

    const next = normalizePokemon({
      id: editing?.id ?? `pk-${Date.now()}`,
      nombre: name.slice(0, 24),
      tipo1: String(data.get('tipo1')),
      tipo2: String(data.get('tipo2') ?? ''),
      ...baseStats,
      ivs,
      evs,
      nature: String(data.get('nature') ?? 'adamant'),
      item: String(data.get('item') ?? 'none'),
      ability: String(data.get('ability') ?? 'none'),
      finalEvolution: data.get('finalEvolution') === 'on',
      boosts: (editing as Pokemon | null)?.boosts ?? DEFAULT_BOOSTS,
    });

    setPokemon(existing => (editing ? existing.map(p => (p.id === editing.id ? next : p)) : [...existing, next]));
    if (!editing) setAttackerId(next.id);
    setModal(null);
    setToast(editing ? 'Pokémon actualizado.' : 'Pokémon añadido al equipo.');
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
    if (p && window.confirm(`¿Eliminar a ${p.nombre} del equipo?`)) {
      setPokemon(list => list.filter(item => item.id !== id));
      setToast('Pokémon eliminado.');
    }
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
      <WeatherBackground weather={weather} defaultImage={defaultWallpaper} />

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

        <div className="brand">
          <div className="brand-mark">
            <Swords size={18} />
          </div>
          <div>
            <div className="brand-name">PokéMMO</div>
            <div className="brand-kicker">Calculadora de daño</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
              setBurned(false);
              setLowHp(false);
              setField('none');
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

      {/* Hero Banner with Offline Status */}
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
          {/* Matchup Card: Attacker and Defender Side by Side */}
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

                  {/* Attacker Select */}
                  <select
                    aria-label="Pokémon atacante"
                    data-testid="select-attacker"
                    className="combatant-name-select"
                    value={attackerId}
                    onChange={e => setAttackerId(e.target.value)}
                  >
                    {pokemon.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>

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
                        {ATTACKER_ABILITIES.map(([id, label]) => (
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

                  {/* Defender Select */}
                  <select
                    aria-label="Pokémon defensor"
                    data-testid="select-defender"
                    className="combatant-name-select"
                    value={defenderId}
                    onChange={e => setDefenderId(e.target.value)}
                  >
                    {pokemon.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>

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
                        {DEFENDER_ABILITIES.map(([id, label]) => (
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
                </div>
              )}
            </div>

            {/* Move Selection Row with Type Badge */}
            <div className="move-row">
              <div className="move-icon">
                <Swords size={17} />
              </div>
              <div className="field">
                <label htmlFor="move-choice">Movimiento</label>
                <select
                  id="move-choice"
                  data-testid="select-move"
                  value={moveId}
                  onChange={e => setMoveId(e.target.value)}
                >
                  {moves.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nombre} · {typeName(m.tipo)} ({m.categoria === 'physical' ? 'Físico' : 'Especial'} · {m.poder} P)
                      {m.priority ? ` [Prio +${m.priority}]` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {move && (
                <div className="flex items-center gap-2">
                  <TypeBadge type={move.tipo} size="sm" />
                  <div className="move-power">{move.poder} P</div>
                </div>
              )}
            </div>
          </section>

          {/* Conditions Card */}
          <section className="glass conditions">
            <div className="section-head">
              <span className="section-title">Condiciones de batalla</span>
              <CloudSun size={15} color="#6d9290" />
            </div>
            <div className="conditions-grid">
              <div className="field">
                <label htmlFor="weather">Clima</label>
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
              </div>

              <div className="field">
                <label htmlFor="field-effect">Efecto de campo</label>
                <select
                  id="field-effect"
                  data-testid="select-field-effect"
                  value={field}
                  onChange={e => setField(e.target.value as Field)}
                >
                  {fieldOptions.map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="battle-toggle">
                <input
                  type="checkbox"
                  data-testid="checkbox-critical"
                  checked={critical}
                  onChange={e => setCritical(e.target.checked)}
                />
                <span>
                  Golpe crítico <small>{attackerAbility === 'sniper' ? '×2,25 (Francotirador)' : '×1,5'}</small>
                </span>
              </label>

              <label className="battle-toggle">
                <input
                  type="checkbox"
                  data-testid="checkbox-burned"
                  checked={burned}
                  onChange={e => setBurned(e.target.checked)}
                />
                <span>
                  Atacante quemado <small>{attackerAbility === 'guts' ? 'activa Agallas' : 'reduce físico'}</small>
                </span>
              </label>

              <label className="battle-toggle col-span-2">
                <input
                  type="checkbox"
                  data-testid="checkbox-low-hp"
                  checked={lowHp}
                  onChange={e => setLowHp(e.target.checked)}
                />
                <span>
                  Atacante con PS bajos (&le; 1/3){' '}
                  <small>activa Mar Llamas, Torrente, Espesura y Enjambre</small>
                </span>
              </label>
            </div>
          </section>
        </div>

        {/* COLUMN 2: UNIFIED RESULT (DAÑO Y VELOCIDAD FUSIONADOS) & STAGE BOOSTS */}
        <div className="flex flex-col gap-3">
          {/* Requirement 3: UNIFIED CARD (DAÑO Y VELOCIDAD FUSIONADOS) */}
          <section className="glass unified-outcome-card" aria-label="Resultado de batalla">
            <div className="section-head">
              <div className="flex items-center gap-2">
                <span className="section-title text-emerald-100">Resultado · Daño & Velocidad</span>
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

                <div className="damage-header-row">
                  <div className="damage-number-large" data-testid="text-damage-range">
                    {fmt(calc.lo)}
                    <small> – </small>
                    {fmt(calc.hi)} <small>PS</small>
                  </div>
                  <div className="damage-pct-badge" data-testid="text-damage-percent">
                    {calc.pct.toFixed(1)}% <small className="text-xs text-amber-200">máx</small>
                  </div>
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

                {/* Defender Health Bar */}
                <div className="hp-track">
                  <div className="hp-fill" style={{ width: `${Math.min(100, calc.pct)}%` }} />
                </div>
                <div className="result-bottom">
                  <span>PS rival: {calc.hp}</span>
                  <span>Mín: {fmt(calc.lo)} PS</span>
                  <span>Máx: {fmt(calc.hi)} PS</span>
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
                  <span className="modifier">
                    {field === 'tailwind'
                      ? 'Viento Afín (Vel ×2)'
                      : field === 'none'
                      ? 'Sin pantallas'
                      : `Pantalla: ${fieldOptions.find(([v]) => v === field)?.[1]}`}
                  </span>
                  {weather !== 'none' && (
                    <span className="modifier">{weatherOptions.find(([v]) => v === weather)?.[1]}</span>
                  )}
                  {calc.criticalMod > 1 && (
                    <span className="modifier">Crítico ×{attackerAbility === 'sniper' ? '2,25' : '1,5'}</span>
                  )}
                  {calc.burnMod < 1 && <span className="modifier">Quemadura físico ×0,5</span>}
                  {attackerAbility === 'guts' && burned && move.categoria === 'physical' && (
                    <span className="modifier">Agallas ×1,5 (ignora quemadura)</span>
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
                        setToast('Cambio de estadística aplicado al siguiente cálculo.');
                      }}
                    >
                      Aplicar al siguiente cálculo
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">Añade Pokémon y movimientos para calcular el resultado.</div>
            )}
          </section>

          {/* Stage Boosts Card */}
          <section className="glass stage-card">
            <div className="section-head">
              <span className="section-title">Boosts de combate</span>
              <Activity size={15} color="#6d9290" />
            </div>
            <p className="stage-description">
              Modifica las etapas (−6 a +6). El ataque, defensa y velocidad afectan directamente al daño y al orden de turno.
            </p>
            <div className="stage-columns">
              {([['Atacante', attacker], ['Defensor', defender]] as const).map(
                ([role, combatant]) =>
                  combatant && (
                    <details
                      className="stage-panel"
                      key={`${role}-${combatant.id}`}
                      data-testid={`panel-boosts-${role.toLowerCase()}`}
                    >
                      <summary>
                        <span>
                          {role} · {combatant.nombre}
                        </span>
                        <ChevronDown size={15} />
                      </summary>
                      <div className="stage-rows">
                        {STAGE_KEYS.map(key => (
                          <div className="stage-row" key={key}>
                            <span>{STAT_LABELS[key]}</span>
                            <div className="stage-stepper">
                              <button
                                type="button"
                                aria-label={`Bajar boost de ${STAT_LABELS[key]} de ${role.toLowerCase()}`}
                                data-testid={`button-boost-down-${role.toLowerCase()}-${key}`}
                                disabled={combatant.boosts[key] <= -6}
                                onClick={() => updateBoost(combatant.id, key, -1)}
                              >
                                <Minus size={12} />
                              </button>
                              <strong data-testid={`text-boost-${role.toLowerCase()}-${key}`}>
                                {combatant.boosts[key] > 0 ? `+${combatant.boosts[key]}` : combatant.boosts[key]}
                              </strong>
                              <button
                                type="button"
                                aria-label={`Subir boost de ${STAT_LABELS[key]} de ${role.toLowerCase()}`}
                                data-testid={`button-boost-up-${role.toLowerCase()}-${key}`}
                                disabled={combatant.boosts[key] >= 6}
                                onClick={() => updateBoost(combatant.id, key, 1)}
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  ),
              )}
            </div>
          </section>
        </div>
      </div>

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

            <button className="drawer-link active" data-testid="nav-calculator" onClick={() => setDrawer(false)}>
              <Gauge size={16} /> Calculadora de daño
            </button>

            {/* APK Install button in Drawer */}
            <button
              type="button"
              className="drawer-link bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-bold"
              data-testid="drawer-button-apk-install"
              onClick={() => {
                setDrawer(false);
                if (isInstallable) {
                  install();
                } else {
                  setModal('apk-guide');
                }
              }}
            >
              <Smartphone size={16} /> Instalar como App / APK móvil
            </button>

            <div className="theme-row">
              <span>
                <Palette size={15} />
                {theme === 'dark' ? 'Modo oscuro' : 'Modo día'}
              </span>
              <button
                type="button"
                className="theme-toggle"
                data-testid="button-toggle-theme"
                aria-label={theme === 'dark' ? 'Cambiar a modo día' : 'Cambiar a modo oscuro'}
                onClick={() => setTheme(current => (current === 'dark' ? 'light' : 'dark'))}
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                {theme === 'dark' ? 'Modo día' : 'Modo oscuro'}
              </button>
            </div>

            {/* Pokémon section */}
            <div className="drawer-section">
              <button
                data-testid="button-toggle-pokemon-section"
                onClick={() => setOpenSections(s => ({ ...s, pokemon: !s.pokemon }))}
              >
                <span>Pokémon</span>
                {openSections.pokemon ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {openSections.pokemon && (
                <>
                  <button
                    className="drawer-link"
                    data-testid="button-add-pokemon"
                    onClick={() => {
                      setDrawer(false);
                      openForm('pokemon');
                    }}
                  >
                    <PlusCircle size={15} /> Añadir Pokémon al equipo
                  </button>
                  <button
                    className="drawer-link"
                    data-testid="button-manage-pokemon"
                    onClick={() => {
                      setDrawer(false);
                      openForm('pokemon');
                    }}
                  >
                    <Activity size={15} /> Gestionar equipo ({pokemon.length})
                  </button>
                </>
              )}
            </div>

            {/* Moves section */}
            <div className="drawer-section">
              <button
                data-testid="button-toggle-moves-section"
                onClick={() => setOpenSections(s => ({ ...s, moves: !s.moves }))}
              >
                <span>Movimientos</span>
                {openSections.moves ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {openSections.moves && (
                <>
                  <button
                    className="drawer-link"
                    data-testid="button-add-move"
                    onClick={() => {
                      setDrawer(false);
                      openForm('movimiento');
                    }}
                  >
                    <PlusCircle size={15} /> Añadir movimiento
                  </button>
                  <button
                    className="drawer-link"
                    data-testid="button-manage-moves"
                    onClick={() => {
                      setDrawer(false);
                      openForm('movimiento');
                    }}
                  >
                    <Swords size={15} /> Gestionar movimientos ({moves.length})
                  </button>
                </>
              )}
            </div>

            {/* Background customizer */}
            <div className="drawer-section">
              <button
                data-testid="button-toggle-background-section"
                onClick={() => setOpenSections(s => ({ ...s, backgrounds: !s.backgrounds }))}
              >
                <span>
                  <Palette size={15} /> Personalización de fondo
                </span>
                {openSections.backgrounds ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {openSections.backgrounds && (
                <div className="background-settings">
                  <p>Elige un fondo o sube el tuyo personalizado. Cuando seleccionas un clima activo (Sol, Lluvia, etc.), el fondo se adapta automáticamente al clima animado.</p>
                  <div className="background-options">
                    {BACKGROUNDS.map(option => (
                      <button
                        type="button"
                        className={`background-option ${background === option.id ? 'selected' : ''}`}
                        key={option.id}
                        data-testid={`button-background-${option.id}`}
                        aria-pressed={background === option.id}
                        onClick={() => setBackground(option.id)}
                      >
                        <span className="background-preview" style={{ backgroundImage: option.image }} />
                        <span>{option.name}</span>
                        {background === option.id && <span className="background-check">✓</span>}
                      </button>
                    ))}
                    {customBackground && (
                      <button
                        type="button"
                        className={`background-option ${background === 'custom' ? 'selected' : ''}`}
                        data-testid="button-background-custom"
                        aria-pressed={background === 'custom'}
                        onClick={() => setBackground('custom')}
                      >
                        <span className="background-preview" style={{ backgroundImage: `url("${customBackground}")` }} />
                        <span>Mi imagen</span>
                        {background === 'custom' && <span className="background-check">✓</span>}
                      </button>
                    )}
                  </div>
                  <label className="background-upload">
                    <ImagePlus size={16} />
                    <span>Subir una imagen</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      data-testid="input-background-upload"
                      onChange={handleBackgroundUpload}
                    />
                  </label>
                  {customBackground && (
                    <button
                      className="remove-background"
                      type="button"
                      data-testid="button-remove-background"
                      onClick={() => {
                        setCustomBackground('');
                        if (background === 'custom') setBackground('mint');
                        setToast('Imagen personalizada eliminada.');
                      }}
                    >
                      Eliminar mi imagen
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="drawer-note">
              <strong>
                <CircleHelp size={12} style={{ verticalAlign: '-2px', marginRight: 5 }} /> Sobre la App y APK
              </strong>
              100% Offline: todos tus Pokémon, movimientos y configuraciones se guardan en el almacenamiento local del dispositivo. Listo para instalar como APK.
            </div>
          </nav>
        </div>
      )}

      {/* Modals */}
      {modal && (
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
                    ? 'Equipo Pokémon'
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

            {/* Pokemon Form */}
            {modal === 'pokemon' && (
              <>
                <form className="modal-form" key={editing?.id ?? 'new-pokemon'} onSubmit={savePokemon}>
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
                      onClick={() => setEditing(null)}
                    >
                      Nuevo registro
                    </button>
                    <button className="btn btn-primary" data-testid="button-save-pokemon">
                      {editing ? 'Guardar cambios' : 'Añadir Pokémon'}
                    </button>
                  </div>
                </form>

                <div className="roster-list">
                  {pokemon.length ? (
                    pokemon.map(p => (
                      <div className="roster-row" key={p.id}>
                        <div className="roster-info">
                          <div className="flex items-center gap-2 mb-1">
                            <strong className="text-sm">{p.nombre}</strong>
                            <TypeBadge type={p.tipo1} size="sm" />
                            {p.tipo2 && <TypeBadge type={p.tipo2} size="sm" />}
                          </div>
                          <small>
                            PS {p.hp} · Atq {p.atk} · Def {p.def} · SpA {p.spa} · SpD {p.spd} · Vel {p.spe}
                          </small>
                        </div>
                        <button
                          className="tiny-action"
                          aria-label={`Editar ${p.nombre}`}
                          data-testid={`button-edit-pokemon-${p.id}`}
                          onClick={() => setEditing(p)}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="tiny-action delete"
                          aria-label={`Eliminar ${p.nombre}`}
                          data-testid={`button-delete-pokemon-${p.id}`}
                          onClick={() => deletePokemon(p.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">Tu equipo está vacío. Añade un Pokémon arriba.</div>
                  )}
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
