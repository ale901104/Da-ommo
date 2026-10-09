import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from 'react';
import { Activity, ChevronDown, ChevronRight, CircleHelp, CloudSun, Edit2, Gauge, ImagePlus, Menu, Minus, Moon, Palette, Plus, PlusCircle, RotateCcw, Swords, Sun, Trash2, X } from 'lucide-react';
import { movimientosIniciales, pokemonIniciales } from './datos.js';

type StatKey = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';
type StageKey = Exclude<StatKey, 'hp'>;
type StatValues = Record<StatKey, number>;
type StageValues = Record<StageKey, number>;
type Pokemon = {
  id: string; nombre: string; tipo1: string; tipo2: string;
  hp: number; atk: number; def: number; spa: number; spd: number; spe: number;
  ivs: StatValues; evs: StatValues; nature: string; item: string;
  finalEvolution: boolean; boosts: StageValues;
};
type Move = { id: string; nombre: string; tipo: string; categoria: 'physical' | 'special'; poder: number; statChange?: { stat: StageKey; stages: number } };
type AbilityEffect = 'damage' | 'stage' | 'contrary';
type CustomAbility = { id: string; nombre: string; effect: AbilityEffect; moveId: string; multiplier: number; stat: StageKey; stages: number };
type ModalKind = 'pokemon' | 'movimiento' | null;
type Weather = 'none' | 'sun' | 'rain' | 'sand' | 'hail';
type Field = 'none' | 'reflect' | 'light-screen' | 'aurora-veil' | 'tailwind';
type BackgroundChoice = 'mint' | 'dusk' | 'aurora' | 'custom';
type ThemeChoice = 'light' | 'dark';

const STORAGE_KEY = 'pokemmo-calc-v1';
const TYPES: [string, string][] = [['normal','Normal'],['fire','Fuego'],['water','Agua'],['electric','Eléctrico'],['grass','Planta'],['ice','Hielo'],['fighting','Lucha'],['poison','Veneno'],['ground','Tierra'],['flying','Volador'],['psychic','Psíquico'],['bug','Bicho'],['rock','Roca'],['ghost','Fantasma'],['dragon','Dragón'],['dark','Siniestro'],['steel','Acero'],['fairy','Hada']];
const typeName = (id: string) => TYPES.find(([key]) => key === id)?.[1] ?? id;
const STAT_KEYS: StatKey[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
const STAGE_KEYS: StageKey[] = ['atk', 'def', 'spa', 'spd', 'spe'];
const STAT_LABELS: Record<StatKey, string> = { hp: 'PS', atk: 'Ataque', def: 'Defensa', spa: 'At. Esp.', spd: 'Def. Esp.', spe: 'Velocidad' };
const NATURES: [string, string, StageKey, StageKey][] = [
  ['hardy','Fuerte','atk','atk'],['lonely','Huraña','atk','def'],['brave','Audaz','atk','spe'],['adamant','Firme','atk','spa'],['naughty','Pícara','atk','spd'],
  ['bold','Osada','def','atk'],['docile','Dócil','def','def'],['relaxed','Plácida','def','spe'],['impish','Agitada','def','spa'],['lax','Floja','def','spd'],
  ['timid','Miedosa','spe','atk'],['hasty','Activa','spe','def'],['serious','Seria','spe','spe'],['jolly','Alegre','spe','spa'],['naive','Ingenua','spe','spd'],
  ['modest','Modesta','spa','atk'],['mild','Afable','spa','def'],['quiet','Mansa','spa','spe'],['bashful','Tímida','spa','spa'],['rash','Alocada','spa','spd'],
  ['calm','Serena','spd','atk'],['gentle','Amable','spd','def'],['sassy','Grosera','spd','spe'],['careful','Cauta','spd','spa'],['quirky','Rara','spd','spd'],
];
const DEFAULT_IVS: StatValues = { hp:31, atk:31, def:31, spa:31, spd:31, spe:31 };
const DEFAULT_EVS: StatValues = { hp:0, atk:0, def:0, spa:0, spd:0, spe:0 };
const DEFAULT_BOOSTS: StageValues = { atk:0, def:0, spa:0, spd:0, spe:0 };
const ITEMS: [string, string][] = [
  ['none','Ninguno'],['eviolite','Mineral Evolutivo · Defensas ×1,5'],['assault-vest','Chaleco Asalto · Def. Esp. ×1,5'],
  ['leftovers','Restos · recuperación, no afecta al daño'],['choice-band','Cinta Elegida · Ataque ×1,5'],
  ['choice-specs','Gafas Elegidas · At. Esp. ×1,5'],['life-orb','Vidasfera · daño ×1,3'],
  ['expert-belt','Cinta Experto · supereficaz ×1,2'],['muscle-band','Cinta Fuerte · físico ×1,1'],
  ['wise-glasses','Gafas Especiales · especial ×1,1'],
  ...TYPES.slice(1).map(([id,name]): [string,string] => [`${id}-gem`, `${name} Zafiro (+30% ${name})`]),
];
const createWallpaper = (top: string, bottom: string, accent: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1400" viewBox="0 0 800 1400"><defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs><rect width="800" height="1400" fill="url(%23g)"/><circle cx="690" cy="210" r="245" fill="${accent}" fill-opacity=".18"/><circle cx="120" cy="810" r="310" fill="#fff" fill-opacity=".12"/><path d="M0 980C170 870 360 1060 520 950s240-40 280-100v550H0Z" fill="${accent}" fill-opacity=".14"/><path d="M0 1110c180-105 320 70 510-25s240-75 290-30v345H0Z" fill="#fff" fill-opacity=".12"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};
const BACKGROUNDS: { id: Exclude<BackgroundChoice, 'custom'>; name: string; image: string }[] = [
  { id:'mint', name:'Bruma marina', image:createWallpaper('#eaf4f1','#dcebee','#6bb39a') },
  { id:'dusk', name:'Atardecer', image:createWallpaper('#f6e4d8','#e9dbe5','#dc9b79') },
  { id:'aurora', name:'Aurora', image:createWallpaper('#dfece9','#d8dff0','#829bc5') },
];
const EFFECT: Record<string, Record<string, number>> = {
  normal: { rock:.5, ghost:0, steel:.5 }, fire: { fire:.5, water:.5, grass:2, ice:2, bug:2, rock:.5, dragon:.5, steel:2 },
  water: { fire:2, water:.5, grass:.5, ground:2, rock:2, dragon:.5 }, electric: { water:2, electric:.5, grass:.5, ground:0, flying:2, dragon:.5 },
  grass: { fire:.5, water:2, grass:.5, poison:.5, ground:2, flying:.5, bug:.5, rock:2, dragon:.5, steel:.5 },
  ice: { fire:.5, water:.5, grass:2, ice:.5, ground:2, flying:2, dragon:2, steel:.5 },
  fighting: { normal:2, ice:2, poison:.5, flying:.5, psychic:.5, bug:.5, rock:2, ghost:0, dark:2, steel:2, fairy:.5 },
  poison: { grass:2, poison:.5, ground:.5, rock:.5, ghost:.5, steel:0, fairy:2 }, ground: { fire:2, electric:2, grass:.5, poison:2, flying:0, bug:.5, rock:2, steel:2 },
  flying: { electric:.5, grass:2, fighting:2, bug:2, rock:.5, steel:.5 }, psychic: { fighting:2, poison:2, psychic:.5, dark:0, steel:.5 },
  bug: { fire:.5, grass:2, fighting:.5, poison:.5, flying:.5, psychic:2, ghost:.5, dark:2, steel:.5, fairy:.5 },
  rock: { fire:2, ice:2, fighting:.5, ground:.5, flying:2, bug:2, steel:.5 }, ghost: { normal:0, psychic:2, ghost:2, dark:.5 },
  dragon: { dragon:2, steel:.5, fairy:0 }, dark: { fighting:.5, psychic:2, ghost:2, dark:.5 },
  steel: { fire:.5, water:.5, electric:.5, ice:2, rock:2, steel:.5, fairy:2 }, fairy: { fire:.5, fighting:2, poison:.5, dragon:2, dark:2, steel:.5 },
};
const abilityOptions = [
  ['none','Ninguna'],['adaptability','Adaptable (STAB ×2)'],['huge-power','Potencia (Ataque ×2)'],
  ['pure-power','Energía Pura (Ataque ×2)'],['technician','Experto (potencia ≤60 ×1,5)'],
  ['guts','Agallas (físico ×1,5 si está quemado)'],['contrary','Respondón (invierte cambios de stats)'],
  ['blaze','Mar Llamas (Fuego ×1,5, PS bajos)'],['torrent','Torrente (Agua ×1,5, PS bajos)'],
  ['overgrow','Espesura (Planta ×1,5, PS bajos)'],['swarm','Enjambre (Bicho ×1,5, PS bajos)'],
];
const items = ITEMS;
const weatherOptions: [Weather,string][] = [['none','Sin clima'],['sun','Sol intenso'],['rain','Lluvia'],['sand','Tormenta de arena'],['hail','Granizo']];
const fieldOptions: [Field,string][] = [['none','Sin efecto'],['reflect','Reflejo'],['light-screen','Pantalla de Luz'],['aurora-veil','Velo Aurora'],['tailwind','Viento Afín']];

function safeInteger(value: unknown, fallback: number, min: number, max: number) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.floor(parsed))) : fallback;
}
function normalizeStatValues(value: unknown, fallback: StatValues, min: number, max: number): StatValues {
  const source = value && typeof value === 'object' ? value as Partial<StatValues> : {};
  return Object.fromEntries(STAT_KEYS.map(key => [key, safeInteger(source[key], fallback[key], min, max)])) as StatValues;
}
function normalizeBoostValues(value: unknown): StageValues {
  const source = value && typeof value === 'object' ? value as Partial<StageValues> : {};
  return Object.fromEntries(STAGE_KEYS.map(key => [key, safeInteger(source[key], 0, -6, 6)])) as StageValues;
}
function normalizeMove(value: unknown): Move {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const statChangeRow = row.statChange && typeof row.statChange === 'object' ? row.statChange as Record<string, unknown> : null;
  const stage = statChangeRow && STAGE_KEYS.includes(statChangeRow.stat as StageKey) ? safeInteger(statChangeRow.stages, 0, -6, 6) : 0;
  return {
    id: typeof row.id === 'string' ? row.id : `mv-${Date.now()}`,
    nombre: typeof row.nombre === 'string' ? row.nombre.slice(0,28) : 'Movimiento',
    tipo: typeof row.tipo === 'string' && TYPES.some(([id]) => id === row.tipo) ? row.tipo : 'normal',
    categoria: row.categoria === 'special' ? 'special' : 'physical',
    poder: safeInteger(row.poder, 80, 1, 250),
    ...(statChangeRow && stage !== 0 ? { statChange: { stat: statChangeRow.stat as StageKey, stages: stage } } : {}),
  };
}
function normalizeAbility(value: unknown): CustomAbility | null {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const effect: AbilityEffect | null = row.effect === 'damage' || row.effect === 'stage' || row.effect === 'contrary' ? row.effect : null;
  if (!effect || typeof row.nombre !== 'string' || !row.nombre.trim()) return null;
  return {
    id: typeof row.id === 'string' ? row.id : `ability-${Date.now()}`,
    nombre: row.nombre.trim().slice(0,28),
    effect,
    moveId: typeof row.moveId === 'string' ? row.moveId : '',
    multiplier: Math.max(1, Math.min(3, Number(row.multiplier) || 1)),
    stat: STAGE_KEYS.includes(row.stat as StageKey) ? row.stat as StageKey : 'spa',
    stages: safeInteger(row.stages, 1, -6, 6),
  };
}
function normalizePokemon(value: unknown): Pokemon {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const statDefaults: StatValues = { hp:80, atk:100, def:80, spa:80, spd:80, spe:80 };
  const nature = typeof row.nature === 'string' && NATURES.some(([id]) => id === row.nature) ? row.nature : 'serious';
  const item = typeof row.item === 'string' && ITEMS.some(([id]) => id === row.item) ? row.item : 'none';
  return {
    id: typeof row.id === 'string' ? row.id : `pk-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    nombre: typeof row.nombre === 'string' ? row.nombre.slice(0,24) : 'Pokémon',
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
    finalEvolution: typeof row.finalEvolution === 'boolean' ? row.finalEvolution : true,
    boosts: normalizeBoostValues(row.boosts),
  };
}
function loadSaved() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, unknown>;
      if (Array.isArray(parsed.pokemon) && Array.isArray(parsed.movimientos)) {
        const background = ['mint','dusk','aurora','custom'].includes(String(parsed.background)) ? parsed.background as BackgroundChoice : 'mint';
        const customBackground = typeof parsed.customBackground === 'string' && parsed.customBackground.startsWith('data:image/') ? parsed.customBackground : '';
        return {
          pokemon: parsed.pokemon.map(normalizePokemon),
          movimientos: parsed.movimientos.map(normalizeMove),
          habilidades: Array.isArray(parsed.habilidades) ? parsed.habilidades.map(normalizeAbility).filter((value): value is CustomAbility => Boolean(value)) : [],
          background,
          customBackground,
          theme: parsed.theme === 'dark' ? 'dark' as ThemeChoice : 'light' as ThemeChoice,
        };
      }
    }
  } catch { /* Fall back to the curated local sample roster. */ }
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
  const contraryActive = ability === 'contrary' || (customAbility?.effect === 'contrary' && (!customAbility.moveId || customAbility.moveId === move.id));
  const requestedChange = contraryActive ? -stages : stages;
  const next = Math.max(-6, Math.min(6, attacker.boosts[key] + requestedChange));
  return { stat: key, delta: next - attacker.boosts[key], next };
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
        if (result.length > 1_850_000) throw new Error('La imagen sigue siendo demasiado grande. Prueba una imagen más pequeña.');
        resolve(result);
      } catch (error) { reject(error); }
      finally { URL.revokeObjectURL(url); }
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo abrir esta imagen.')); };
    image.src = url;
  });
}
function effectiveness(moveType: string, defender: Pokemon) {
  const first = EFFECT[moveType]?.[defender.tipo1] ?? 1;
  const second = defender.tipo2 ? (EFFECT[moveType]?.[defender.tipo2] ?? 1) : 1;
  return first * second;
}
function fmt(n: number) { return Math.max(0, Math.floor(n)).toLocaleString('es-ES'); }

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
  const [weather, setWeather] = useState<Weather>('none');
  const [ability, setAbility] = useState('none');
  const [critical, setCritical] = useState(false);
  const [burned, setBurned] = useState(false);
  const [lowHp, setLowHp] = useState(false);
  const [field, setField] = useState<Field>('none');
  const [drawer, setDrawer] = useState(false);
  const [openSections, setOpenSections] = useState({ pokemon: true, moves: false, abilities: false, backgrounds: false });
  const [abilityEffect, setAbilityEffect] = useState<AbilityEffect>('damage');
  const [editingAbility, setEditingAbility] = useState<CustomAbility | null>(null);
  const [modal, setModal] = useState<ModalKind>(null);
  const [editing, setEditing] = useState<Pokemon | Move | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ pokemon, movimientos: moves, habilidades: customAbilities, background, customBackground, theme }));
    } catch {
      setToast('No se pudo guardar. Libera espacio local o elige otra imagen.');
    }
  }, [pokemon, moves, customAbilities, background, customBackground, theme]);
  useEffect(() => {
    if (toast) { const timer = window.setTimeout(() => setToast(''), 2400); return () => window.clearTimeout(timer); }
    return undefined;
  }, [toast]);
  useEffect(() => {
    if (!pokemon.some(p => p.id === attackerId)) setAttackerId(pokemon[0]?.id ?? '');
    if (!pokemon.some(p => p.id === defenderId)) setDefenderId(pokemon.find(p => p.id !== attackerId)?.id ?? pokemon[0]?.id ?? '');
  }, [pokemon, attackerId, defenderId]);
  useEffect(() => { if (!moves.some(m => m.id === moveId)) setMoveId(moves[0]?.id ?? ''); }, [moves, moveId]);

  const attacker = pokemon.find(p => p.id === attackerId);
  const defender = pokemon.find(p => p.id === defenderId);
  const move = moves.find(m => m.id === moveId);
  const customAbility = customAbilities.find(candidate => ability === `custom-${candidate.id}`);
  const customAbilityMatches = !customAbility?.moveId || customAbility.moveId === move?.id;
  const calc = useMemo(() => {
    if (!attacker || !defender || !move) return null;
    const attackKey: StageKey = move.categoria === 'physical' ? 'atk' : 'spa';
    const defenseKey: StageKey = move.categoria === 'physical' ? 'def' : 'spd';
    const hp = stat(defender, 'hp', defenderLevel);
    let attackStage = attacker.boosts[attackKey];
    let defenseStage = defender.boosts[defenseKey];
    if (critical && attackStage < 0) attackStage = 0;
    if (critical && defenseStage > 0) defenseStage = 0;
    if (customAbility?.effect === 'stage' && customAbilityMatches && customAbility.stat === attackKey) attackStage = Math.max(-6, Math.min(6, attackStage + customAbility.stages));
    const atk = applyStage(stat(attacker, attackKey, attackerLevel), attackStage);
    let def = applyStage(stat(defender, defenseKey, defenderLevel), defenseStage);
    if (defender.item === 'eviolite' && !defender.finalEvolution) def = Math.floor(def * 1.5);
    if (defender.item === 'assault-vest' && move.categoria === 'special') def = Math.floor(def * 1.5);
    if (weather === 'sand' && move.categoria === 'special' && (defender.tipo1 === 'rock' || defender.tipo2 === 'rock')) def = Math.floor(def * 1.5);
    const eff = effectiveness(move.tipo, defender);
    const stab = attacker.tipo1 === move.tipo || attacker.tipo2 === move.tipo ? (ability === 'adaptability' ? 2 : 1.5) : 1;
    let weatherMod = 1;
    if ((weather === 'sun' && move.tipo === 'fire') || (weather === 'rain' && move.tipo === 'water')) weatherMod = 1.5;
    if ((weather === 'sun' && move.tipo === 'water') || (weather === 'rain' && move.tipo === 'fire')) weatherMod = .5;
    let abilityMod = 1;
    if (ability === 'technician' && move.poder <= 60) abilityMod = 1.5;
    if (lowHp && ((ability === 'blaze' && move.tipo === 'fire') || (ability === 'torrent' && move.tipo === 'water') || (ability === 'overgrow' && move.tipo === 'grass') || (ability === 'swarm' && move.tipo === 'bug'))) abilityMod = 1.5;
    if (customAbility?.effect === 'damage' && customAbilityMatches) abilityMod *= customAbility.multiplier;
    let itemStatMod = 1;
    if ((attacker.item === 'choice-band' && move.categoria === 'physical') || (attacker.item === 'choice-specs' && move.categoria === 'special')) itemStatMod = 1.5;
    if ((attacker.item === 'muscle-band' && move.categoria === 'physical') || (attacker.item === 'wise-glasses' && move.categoria === 'special')) itemStatMod = 1.1;
    const attackAbilityMod = move.categoria === 'physical' && ['huge-power','pure-power'].includes(ability) ? 2 : 1;
    const gutsMod = ability === 'guts' && burned && move.categoria === 'physical' ? 1.5 : 1;
    const burnMod = burned && move.categoria === 'physical' && ability !== 'guts' ? .5 : 1;
    const effectiveAtk = Math.floor(atk * itemStatMod * attackAbilityMod * gutsMod * burnMod);
    let itemPower = attacker.item === `${move.tipo}-gem` ? 1.3 : attacker.item === 'life-orb' ? 1.3 : 1;
    if (attacker.item === 'expert-belt' && eff > 1) itemPower = 1.2;
    const screen = !critical && (((['reflect','aurora-veil'].includes(field) && move.categoria === 'physical') || (['light-screen','aurora-veil'].includes(field) && move.categoria === 'special'))) ? .5 : 1;
    const criticalMod = critical ? 1.5 : 1;
    const base = Math.floor(Math.floor((Math.floor(2 * attackerLevel / 5 + 2) * move.poder * effectiveAtk) / Math.max(1, def)) / 50) + 2;
    const modifier = stab * eff * weatherMod * abilityMod * itemPower * screen * criticalMod;
    const lo = Math.floor(base * modifier * .85), hi = Math.floor(base * modifier);
    return { hp, eff, lo, hi, pct: hp ? hi / hp * 100 : 0, atk: effectiveAtk, def, burnMod, criticalMod, abilityMod };
  }, [attacker, defender, move, attackerLevel, defenderLevel, weather, ability, field, critical, burned, lowHp, customAbility, customAbilityMatches]);
  const koChance = calc ? calc.lo >= calc.hp ? 'KO seguro' : calc.hi >= calc.hp ? 'Posible KO' : 'No es KO' : 'Sin datos';
  const openForm = (kind: Exclude<ModalKind, null>, itemToEdit: Pokemon | Move | null = null) => { setEditing(itemToEdit); setModal(kind); };

  function savePokemon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('nombre') ?? '').trim();
    if (!name) return;
    const ivs = Object.fromEntries(STAT_KEYS.map(key => [key, Number(data.get(`iv-${key}`))])) as StatValues;
    const evs = Object.fromEntries(STAT_KEYS.map(key => [key, Number(data.get(`ev-${key}`))])) as StatValues;
    const baseStats = Object.fromEntries(STAT_KEYS.map(key => [key, Number(data.get(key))])) as StatValues;
    if (Object.values(baseStats).some(value => !Number.isInteger(value) || value < 1 || value > 255)) { setToast('Las estadísticas base deben estar entre 1 y 255.'); return; }
    if (Object.values(ivs).some(value => !Number.isInteger(value) || value < 0 || value > 31)) { setToast('Cada IV debe estar entre 0 y 31.'); return; }
    if (Object.values(evs).some(value => !Number.isInteger(value) || value < 0 || value > 252) || Object.values(evs).reduce((sum,value) => sum + value,0) > 510) { setToast('Los EV deben estar entre 0 y 252, con un máximo total de 510.'); return; }
    const next = normalizePokemon({
      id: editing?.id ?? `pk-${Date.now()}`, nombre: name.slice(0, 24), tipo1: String(data.get('tipo1')), tipo2: String(data.get('tipo2') ?? ''),
      ...baseStats, ivs, evs, nature: String(data.get('nature') ?? 'serious'), item: String(data.get('item') ?? 'none'),
      finalEvolution: data.get('finalEvolution') === 'on', boosts: (editing as Pokemon | null)?.boosts ?? DEFAULT_BOOSTS,
    });
    if (Object.values(next).some(value => typeof value === 'number' && (!Number.isFinite(value) || value < 1 || value > 255))) { setToast('Cada estadística debe estar entre 1 y 255.'); return; }
    setPokemon(existing => editing ? existing.map(p => p.id === editing.id ? next : p) : [...existing, next]);
    if (!editing) setAttackerId(next.id);
    setModal(null); setToast(editing ? 'Pokémon actualizado.' : 'Pokémon añadido al equipo.');
  }
  function saveMove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('nombre') ?? '').trim(), power = Number(data.get('poder'));
    if (!name || !Number.isFinite(power) || power < 1 || power > 250) { setToast('Indica un nombre y potencia entre 1 y 250.'); return; }
    const stageStat = String(data.get('stageStat') ?? 'none');
    const stageChange = safeInteger(data.get('stageChange'), 0, -6, 6);
    const next: Move = normalizeMove({ id: editing?.id ?? `mv-${Date.now()}`, nombre: name.slice(0, 28), tipo: String(data.get('tipo')), categoria: data.get('categoria') === 'special' ? 'special' : 'physical', poder: power, ...(STAGE_KEYS.includes(stageStat as StageKey) && stageChange ? { statChange:{stat:stageStat,stages:stageChange} } : {}) });
    setMoves(existing => editing ? existing.map(m => m.id === editing.id ? next : m) : [...existing, next]);
    if (!editing) setMoveId(next.id);
    setModal(null); setToast(editing ? 'Movimiento actualizado.' : 'Movimiento añadido.');
  }
  function saveAbility(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('nombre') ?? '').trim();
    const effect = data.get('effect');
    const multiplier = Number(data.get('multiplier'));
    const stages = Number(data.get('stages'));
    if (!name || name.length > 28) { setToast('Escribe un nombre de habilidad de hasta 28 caracteres.'); return; }
    if (effect === 'damage' && (!Number.isFinite(multiplier) || multiplier < 1.01 || multiplier > 3)) { setToast('El multiplicador debe estar entre 1,01 y 3.'); return; }
    if (effect === 'stage' && (!STAGE_KEYS.includes(String(data.get('stat')) as StageKey) || !Number.isInteger(stages) || stages < -6 || stages > 6 || stages === 0)) { setToast('Elige una estadística y una etapa distinta de cero, entre −6 y +6.'); return; }
    if (effect !== 'damage' && effect !== 'stage' && effect !== 'contrary') return;
    const next: CustomAbility = { id:editingAbility?.id ?? `ability-${Date.now()}`, nombre:name.slice(0,28), effect, moveId:String(data.get('moveId') ?? ''), multiplier:Number.isFinite(multiplier)?multiplier:1.2, stat:STAGE_KEYS.includes(String(data.get('stat')) as StageKey)?String(data.get('stat')) as StageKey:'spa', stages:Number.isInteger(stages)?stages:1 };
    setCustomAbilities(existing => editingAbility ? existing.map(row => row.id===editingAbility.id?next:row) : [...existing,next]);
    if (!editingAbility) setAbility(`custom-${next.id}`);
    setEditingAbility(null); setAbilityEffect('damage'); setToast(editingAbility?'Habilidad actualizada.':'Habilidad añadida.');
  }
  function deleteAbility(id: string) {
    const target = customAbilities.find(row => row.id === id);
    if (!target || !window.confirm(`¿Eliminar la habilidad ${target.nombre}?`)) return;
    setCustomAbilities(rows => rows.filter(row => row.id !== id));
    if (ability === `custom-${id}`) setAbility('none');
    if (editingAbility?.id === id) setEditingAbility(null);
    setToast('Habilidad eliminada.');
  }
  function loadContraryExample() {
    const existingSerperior = pokemon.find(row => row.nombre.toLowerCase() === 'serperior');
    const serperior = existingSerperior ?? normalizePokemon({ id:'serperior-example', nombre:'Serperior', tipo1:'grass', tipo2:'', hp:75, atk:75, def:95, spa:110, spd:95, spe:113, nature:'serious', item:'none', finalEvolution:true, ivs:DEFAULT_IVS, evs:DEFAULT_EVS, boosts:DEFAULT_BOOSTS });
    if (!existingSerperior) setPokemon(roster => [...roster,serperior]);
    const leafStorm = moves.find(row => row.id === 'leaf-storm') ?? normalizeMove({ id:'leaf-storm', nombre:'Lluevehojas', tipo:'grass', categoria:'special', poder:130, statChange:{stat:'spa',stages:-2} });
    if (!moves.some(row => row.id === 'leaf-storm')) setMoves(rows => [...rows,leafStorm]);
    setAttackerId(serperior.id);
    setMoveId(leafStorm.id);
    setAbility('contrary');
    setDrawer(false);
    setToast('Ejemplo listo: Lluevehojas sube +2 At. Esp. después del golpe.');
  }
  function deletePokemon(id: string) {
    const p = pokemon.find(item => item.id === id);
    if (p && window.confirm(`¿Eliminar a ${p.nombre} del equipo?`)) { setPokemon(list => list.filter(item => item.id !== id)); setToast('Pokémon eliminado.'); }
  }
  function deleteMove(id: string) {
    const m = moves.find(item => item.id === id);
    if (m && window.confirm(`¿Eliminar el movimiento ${m.nombre}?`)) { setMoves(list => list.filter(item => item.id !== id)); setToast('Movimiento eliminado.'); }
  }
  const updateLevel = (which: 'attacker' | 'defender', by: number) => (which === 'attacker' ? setAttackerLevel : setDefenderLevel)(level => Math.max(1, Math.min(100, level + by)));
  const updateHeldItem = (id: string | undefined, heldItem: string) => {
    if (!id) return;
    setPokemon(roster => roster.map(p => p.id === id ? { ...p, item: heldItem } : p));
  };
  const updateBoost = (id: string | undefined, key: StageKey, change: number) => {
    if (!id) return;
    setPokemon(roster => roster.map(p => p.id === id ? { ...p, boosts: { ...p.boosts, [key]: Math.max(-6, Math.min(6, p.boosts[key] + change)) } } : p));
  };
  const postMoveChange = attacker && move ? moveStageOutcome(attacker,move,ability,customAbility) : null;
  const clearActiveBoosts = () => {
    const active = new Set([attackerId, defenderId]);
    setPokemon(roster => roster.map(p => active.has(p.id) ? { ...p, boosts: { ...DEFAULT_BOOSTS } } : p));
  };
  async function handleBackgroundUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024) {
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
  const chosenTypePills = (p: Pokemon | undefined) => p ? <div className="type-pills"><span className="type-pill">{typeName(p.tipo1)}</span>{p.tipo2 && <span className="type-pill">{typeName(p.tipo2)}</span>}</div> : null;
  const backgroundImage = background === 'custom' && customBackground
    ? `url("${customBackground}")`
    : BACKGROUNDS.find(option => option.id === background)?.image ?? BACKGROUNDS[0].image;
  const editingPokemon = modal === 'pokemon' ? editing as Pokemon | null : null;
  const editingMove = modal === 'movimiento' ? editing as Move | null : null;

  return <main className="app-shell" data-theme={theme} style={{ backgroundImage }}>
    <header className="topbar">
      <button className="icon-button" aria-label="Abrir menú" data-testid="button-open-menu" onClick={() => setDrawer(true)}><Menu size={19}/></button>
      <div className="brand"><div className="brand-mark"><Swords size={18}/></div><div><div className="brand-name">PokéMMO</div><div className="brand-kicker">calculadora de daño</div></div></div>
      <button className="icon-button" aria-label="Restablecer escenario" data-testid="button-reset" onClick={() => { setWeather('none');setAbility('none');setCritical(false);setBurned(false);setLowHp(false);setField('none');setAttackerLevel(50);setDefenderLevel(50);clearActiveBoosts();setToast('Escenario restablecido.'); }}><RotateCcw size={17}/></button>
    </header>
    <section className="hero">
      <div className="eyebrow">Herramienta de combate · v1.0</div>
      <h1>Calcula tu<br/>siguiente turno.</h1>
      <p>Daño al instante. Decide con ventaja.</p>
    </section>
    <section className="glass combat-card" aria-label="Escenario de combate">
      <div className="section-head"><span className="section-title">Enfrentamiento</span><Activity size={15} color="#6d9290"/></div>
      <div className="versus">
        <div className="combatant"><div className="combatant-label">Atacante</div><select aria-label="Pokémon atacante" data-testid="select-attacker" value={attackerId} onChange={e => setAttackerId(e.target.value)}>{pokemon.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select>{chosenTypePills(attacker)}</div>
        <div className="versus-mark">VS</div>
        <div className="combatant defender"><div className="combatant-label">Defensor</div><select aria-label="Pokémon defensor" data-testid="select-defender" value={defenderId} onChange={e => setDefenderId(e.target.value)}>{pokemon.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select>{chosenTypePills(defender)}</div>
      </div>
      <div className="move-row"><div className="move-icon"><Swords size={17}/></div><div className="field"><label htmlFor="move-choice">Movimiento</label><select id="move-choice" data-testid="select-move" value={moveId} onChange={e => setMoveId(e.target.value)}>{moves.map(m => <option key={m.id} value={m.id}>{m.nombre} · {typeName(m.tipo)}</option>)}</select></div><div className="move-power">{move ? `${move.poder} P` : '—'}</div></div>
      <div className="levels">{([['attacker','Nivel atacante',attackerLevel],['defender','Nivel defensor',defenderLevel]] as const).map(([who,label,level]) => <div className="level-control" key={who}><span>{label}</span><div className="stepper"><button aria-label={`Bajar ${label}`} data-testid={`button-level-down-${who}`} onClick={() => updateLevel(who,-1)}><Minus size={13}/></button><strong data-testid={`text-level-${who}`}>{level}</strong><button aria-label={`Subir ${label}`} data-testid={`button-level-up-${who}`} onClick={() => updateLevel(who,1)}><Plus size={13}/></button></div></div>)}</div>
    </section>
    <section className="glass conditions">
      <div className="section-head"><span className="section-title">Condiciones de batalla</span><CloudSun size={15} color="#6d9290"/></div>
      <div className="conditions-grid">
        <div className="field"><label htmlFor="weather">Clima</label><select id="weather" data-testid="select-weather" value={weather} onChange={e => setWeather(e.target.value as Weather)}>{weatherOptions.map(([v,label]) => <option key={v} value={v}>{label}</option>)}</select></div>
        <div className="field"><label htmlFor="ability">Habilidad atacante</label><select id="ability" data-testid="select-ability" value={ability} onChange={e => setAbility(e.target.value)}>{abilityOptions.map(([v,label]) => <option key={v} value={v}>{label}</option>)}{customAbilities.map(row => <option key={row.id} value={`custom-${row.id}`}>{row.nombre} · {row.effect==='damage'?`daño ×${row.multiplier}`:row.effect==='stage'?`${STAT_LABELS[row.stat]} ${row.stages>0?'+':''}${row.stages}`:'invierte stats'}</option>)}</select></div>
        <div className="field"><label htmlFor="attacker-item">Objeto atacante</label><select id="attacker-item" data-testid="select-attacker-item" value={attacker?.item ?? 'none'} disabled={!attacker} onChange={e => updateHeldItem(attacker?.id,e.target.value)}>{items.map(([v,label]) => <option key={v} value={v}>{label}</option>)}</select></div>
        <div className="field"><label htmlFor="defender-item">Objeto defensor</label><select id="defender-item" data-testid="select-defender-item" value={defender?.item ?? 'none'} disabled={!defender} onChange={e => updateHeldItem(defender?.id,e.target.value)}>{items.map(([v,label]) => <option key={v} value={v}>{label}</option>)}</select></div>
        <div className="field"><label htmlFor="field-effect">Efecto de campo</label><select id="field-effect" data-testid="select-field-effect" value={field} onChange={e => setField(e.target.value as Field)}>{fieldOptions.map(([v,label]) => <option key={v} value={v}>{label}</option>)}</select></div>
        <label className="battle-toggle"><input type="checkbox" data-testid="checkbox-critical" checked={critical} onChange={e => setCritical(e.target.checked)}/><span>Golpe crítico <small>×1,5</small></span></label>
        <label className="battle-toggle"><input type="checkbox" data-testid="checkbox-burned" checked={burned} onChange={e => setBurned(e.target.checked)}/><span>Atacante quemado <small>reduce físico</small></span></label>
        <label className="battle-toggle"><input type="checkbox" data-testid="checkbox-low-hp" checked={lowHp} onChange={e => setLowHp(e.target.checked)}/><span>Atacante con PS bajos <small>activa Mar Llamas y similares</small></span></label>
      </div>
    </section>
    <section className="glass stage-card">
      <div className="section-head"><span className="section-title">Boosts de combate</span><Activity size={15} color="#6d9290"/></div>
      <p className="stage-description">Modifica las etapas de cada Pokémon. El ataque y la defensa seleccionados se aplican al daño.</p>
      <div className="stage-columns">
        {([['Atacante',attacker],['Defensor',defender]] as const).map(([role,combatant]) => combatant && <details className="stage-panel" key={`${role}-${combatant.id}`} data-testid={`panel-boosts-${role.toLowerCase()}`}>
          <summary><span>{role} · {combatant.nombre}</span><ChevronDown size={15}/></summary>
          <div className="stage-rows">{STAGE_KEYS.map(key => <div className="stage-row" key={key}>
            <span>{STAT_LABELS[key]}</span>
            <div className="stage-stepper">
              <button type="button" aria-label={`Bajar boost de ${STAT_LABELS[key]} de ${role.toLowerCase()}`} data-testid={`button-boost-down-${role.toLowerCase()}-${key}`} disabled={combatant.boosts[key] <= -6} onClick={() => updateBoost(combatant.id,key,-1)}><Minus size={12}/></button>
              <strong data-testid={`text-boost-${role.toLowerCase()}-${key}`}>{combatant.boosts[key] > 0 ? `+${combatant.boosts[key]}` : combatant.boosts[key]}</strong>
              <button type="button" aria-label={`Subir boost de ${STAT_LABELS[key]} de ${role.toLowerCase()}`} data-testid={`button-boost-up-${role.toLowerCase()}-${key}`} disabled={combatant.boosts[key] >= 6} onClick={() => updateBoost(combatant.id,key,1)}><Plus size={12}/></button>
            </div>
          </div>)}</div>
        </details>)}
      </div>
    </section>
    <section className="glass results" aria-live="polite">
      <div className="result-top"><span className="section-title">Daño estimado</span><span className="ko-badge" data-testid="status-ko">{koChance}</span></div>
      {calc && move && defender ? <>
        <div className="damage-number" data-testid="text-damage-range">{fmt(calc.lo)}<small> – </small>{fmt(calc.hi)} <small>PS</small></div>
        <p className="result-caption">{move.nombre} contra {defender.nombre} · <span data-testid="text-effectiveness">{calc.eff === 0 ? 'Sin efecto' : calc.eff > 1 ? `Supereficaz ×${calc.eff}` : calc.eff < 1 ? `Poco eficaz ×${calc.eff}` : 'Daño normal'}</span></p>
        <div className="hp-track"><div className="hp-fill" style={{width:`${Math.min(100,calc.pct)}%`}}/></div>
        <div className="result-bottom"><span>PS del defensor: {calc.hp}</span><strong data-testid="text-damage-percent">{calc.pct.toFixed(1)}% máx.</strong></div>
        <div className="modifiers"><span className="modifier">STAB ×{attacker?.tipo1 === move.tipo || attacker?.tipo2 === move.tipo ? (ability === 'adaptability' ? '2' : '1,5') : '1'}</span><span className="modifier">{field === 'tailwind' ? 'Viento Afín: no modifica daño' : field === 'none' ? 'Sin pantallas' : `Pantalla: ${fieldOptions.find(([v])=>v===field)?.[1]}`}</span>{weather !== 'none' && <span className="modifier">{weatherOptions.find(([v])=>v===weather)?.[1]}</span>}{calc.criticalMod>1&&<span className="modifier">Crítico ×1,5</span>}{calc.burnMod<1&&<span className="modifier">Quemadura físico ×0,5</span>}{ability==='guts'&&burned&&move.categoria==='physical'&&<span className="modifier">Agallas ×1,5; ignora quemadura</span>}{customAbility&&customAbilityMatches&&<span className="modifier">Habilidad: {customAbility.nombre}</span>}{attacker?.item==='leftovers'&&attacker&&<span className="modifier">Restos atacante: +{Math.max(1,Math.floor(stat(attacker,'hp',attackerLevel)/16))} PS tras el turno</span>}{defender.item==='leftovers'&&<span className="modifier">Restos defensor: +{Math.max(1,Math.floor(stat(defender,'hp',defenderLevel)/16))} PS tras el turno</span>}</div>
        {postMoveChange && attacker && <div className="post-move-effect" data-testid="text-post-move-effect">
          <span>Tras el golpe: {STAT_LABELS[postMoveChange.stat]} {postMoveChange.delta>0?'+':''}{postMoveChange.delta} {ability==='contrary'||(customAbility?.effect==='contrary'&&customAbilityMatches)?'(Respondón)':''}</span>
          <button type="button" data-testid="button-apply-post-move-boost" disabled={postMoveChange.delta===0} onClick={() => {updateBoost(attacker.id,postMoveChange.stat,postMoveChange.delta);setToast('Cambio de estadística aplicado al siguiente cálculo.');}}>Aplicar al siguiente cálculo</button>
        </div>}
      </> : <div className="empty-state">Añade Pokémon y movimientos para calcular el daño.</div>}
    </section>
    <p className="assumption"><b>Modelo estimado:</b> usa IV, EV, naturaleza, objeto, boosts, crítico y quemadura física. Variación aleatoria estándar 85–100%. El cálculo es orientativo para PokéMMO.</p>
    <div className="subhead"><h2>Estadísticas calculadas</h2><span>NIVEL · {attackerLevel} / {defenderLevel}</span></div>
    {attacker && defender && <div className="quick-stats"><div className="stat-chip"><small>Ataque efectivo</small><strong data-testid="text-effective-attack">{calc ? calc.atk : '—'}</strong></div><div className="stat-chip"><small>Defensa rival</small><strong data-testid="text-effective-defense">{calc ? calc.def : '—'}</strong></div><div className="stat-chip"><small>Velocidad</small><strong>{applyStage(stat(attacker,'spe',attackerLevel),attacker.boosts.spe)}</strong></div></div>}
    <div className="subhead"><h2>Atajo de equipo</h2><span>{pokemon.length} POKÉMON</span></div>
    <div className="quick-stats">{pokemon.slice(0,3).map(p => <button className="stat-chip" style={{border:0}} key={p.id} data-testid={`button-roster-${p.id}`} onClick={() => setAttackerId(p.id)}><small>{typeName(p.tipo1)}</small><strong>{p.nombre}</strong></button>)}</div>
    {drawer && <div className="drawer-backdrop" onMouseDown={e => {if(e.target===e.currentTarget)setDrawer(false);}}>
      <nav className="drawer" aria-label="Navegación">
        <div className="drawer-head"><div><div className="brand-kicker">PokéMMO · FIELD KIT</div><div className="drawer-title">Tu espacio de batalla</div></div><button className="icon-button" aria-label="Cerrar menú" data-testid="button-close-menu" onClick={() => setDrawer(false)}><X size={18}/></button></div>
        <button className="drawer-link active" data-testid="nav-calculator" onClick={() => setDrawer(false)}><Gauge size={16}/> Calculadora de daño</button>
        <div className="theme-row"><span><Palette size={15}/>{theme==='dark'?'Modo oscuro':'Modo día'}</span><button type="button" className="theme-toggle" data-testid="button-toggle-theme" aria-label={theme==='dark'?'Cambiar a modo día':'Cambiar a modo oscuro'} onClick={() => setTheme(current => current==='dark'?'light':'dark')}>{theme==='dark'?<Sun size={15}/>:<Moon size={15}/>}{theme==='dark'?'Modo día':'Modo oscuro'}</button></div>
        <div className="drawer-section"><button data-testid="button-toggle-pokemon-section" onClick={() => setOpenSections(s => ({...s,pokemon:!s.pokemon}))}><span>Pokémon</span>{openSections.pokemon?<ChevronDown size={16}/>:<ChevronRight size={16}/>}</button>
          {openSections.pokemon && <><button className="drawer-link" data-testid="button-add-pokemon" onClick={() => openForm('pokemon')}><PlusCircle size={15}/> Añadir Pokémon</button><button className="drawer-link" data-testid="button-manage-pokemon" onClick={() => openForm('pokemon')}><Activity size={15}/> Gestionar equipo ({pokemon.length})</button></>}</div>
        <div className="drawer-section"><button data-testid="button-toggle-moves-section" onClick={() => setOpenSections(s => ({...s,moves:!s.moves}))}><span>Movimientos</span>{openSections.moves?<ChevronDown size={16}/>:<ChevronRight size={16}/>}</button>
          {openSections.moves && <><button className="drawer-link" data-testid="button-add-move" onClick={() => openForm('movimiento')}><PlusCircle size={15}/> Añadir movimiento</button><button className="drawer-link" data-testid="button-manage-moves" onClick={() => openForm('movimiento')}><Swords size={15}/> Gestionar movimientos ({moves.length})</button></>}</div>
        <div className="drawer-section"><button data-testid="button-toggle-abilities-section" onClick={() => setOpenSections(s => ({...s,abilities:!s.abilities}))}><span><Activity size={15}/> Habilidades y efectos</span>{openSections.abilities?<ChevronDown size={16}/>:<ChevronRight size={16}/>}</button>
          {openSections.abilities && <div className="ability-manager">
            <p>Crea efectos de daño o etapas de estadística y asígnalos al atacante. Respondón invierte los cambios causados por el movimiento.</p>
            <button type="button" className="drawer-link ability-example" data-testid="button-example-contrary" onClick={loadContraryExample}><Swords size={14}/> Probar ejemplo: Serperior · Lluevehojas · Respondón</button>
            <form className="ability-form" key={editingAbility?.id??'new-ability'} onSubmit={saveAbility}>
              <div className="form-field"><label htmlFor="ability-name">Nombre de habilidad</label><input id="ability-name" name="nombre" data-testid="input-ability-name" maxLength={28} required defaultValue={editingAbility?.nombre??''} placeholder="Ej. Potencia especial"/></div>
              <div className="form-field"><label htmlFor="ability-effect">Efecto</label><select id="ability-effect" name="effect" data-testid="select-ability-effect" value={abilityEffect} onChange={e => setAbilityEffect(e.target.value as AbilityEffect)}><option value="damage">Multiplicador de daño</option><option value="stage">Cambio de etapa antes del golpe</option><option value="contrary">Invertir cambios del movimiento</option></select></div>
              <div className="form-field"><label htmlFor="ability-move">Movimiento asociado</label><select id="ability-move" name="moveId" data-testid="select-ability-move" defaultValue={editingAbility?.moveId??''}><option value="">Todos los movimientos</option>{moves.map(row=><option value={row.id} key={row.id}>{row.nombre}</option>)}</select></div>
              {abilityEffect==='damage'&&<div className="form-field"><label htmlFor="ability-multiplier">Multiplicador de daño</label><input id="ability-multiplier" name="multiplier" data-testid="input-ability-multiplier" type="number" min="1.01" max="3" step="0.01" required defaultValue={editingAbility?.multiplier??1.2}/></div>}
              {abilityEffect==='stage'&&<div className="form-grid"><div className="form-field"><label htmlFor="ability-stat">Estadística</label><select id="ability-stat" name="stat" data-testid="select-ability-stat" defaultValue={editingAbility?.stat??'spa'}>{STAGE_KEYS.map(key=><option value={key} key={key}>{STAT_LABELS[key]}</option>)}</select></div><div className="form-field"><label htmlFor="ability-stages">Etapas −6 a +6</label><input id="ability-stages" name="stages" data-testid="input-ability-stages" type="number" min="-6" max="6" step="1" required defaultValue={editingAbility?.stages??1}/></div></div>}
              {abilityEffect==='contrary'&&<p className="ability-hint">El efecto del movimiento se muestra tras el golpe; puedes aplicarlo para el siguiente cálculo.</p>}
              <div className="form-actions"><button type="button" className="btn btn-muted" data-testid="button-new-ability" onClick={() => {setEditingAbility(null);setAbilityEffect('damage');}}>Nueva</button><button className="btn btn-primary" data-testid="button-save-ability">{editingAbility?'Guardar':'Añadir habilidad'}</button></div>
            </form>
            <div className="ability-list">{customAbilities.map(row=><div className="roster-row" key={row.id}><div className="roster-info"><strong>{row.nombre}</strong><small>{row.effect==='damage'?`Daño ×${row.multiplier}`:row.effect==='stage'?`${STAT_LABELS[row.stat]} ${row.stages>0?'+':''}${row.stages} · antes del golpe`:'Invierte el cambio de etapa'}{row.moveId?` · ${moves.find(m=>m.id===row.moveId)?.nombre??'movimiento'}`:''}</small></div><button type="button" className="tiny-action" aria-label={`Editar ${row.nombre}`} data-testid={`button-edit-ability-${row.id}`} onClick={() => {setEditingAbility(row);setAbilityEffect(row.effect);}}><Edit2 size={14}/></button><button type="button" className="tiny-action delete" aria-label={`Eliminar ${row.nombre}`} data-testid={`button-delete-ability-${row.id}`} onClick={() => deleteAbility(row.id)}><Trash2 size={14}/></button></div>)}</div>
          </div>}</div>
        <div className="drawer-section"><button data-testid="button-toggle-background-section" onClick={() => setOpenSections(s => ({...s,backgrounds:!s.backgrounds}))}><span><Palette size={15}/> Personalización de fondo</span>{openSections.backgrounds?<ChevronDown size={16}/>:<ChevronRight size={16}/>}</button>
          {openSections.backgrounds && <div className="background-settings">
            <p>Elige una imagen o sube la tuya. Se guarda en este dispositivo.</p>
            <div className="background-options">{BACKGROUNDS.map(option => <button type="button" className={`background-option ${background===option.id?'selected':''}`} key={option.id} data-testid={`button-background-${option.id}`} aria-pressed={background===option.id} onClick={() => setBackground(option.id)}>
              <span className="background-preview" style={{backgroundImage:option.image}}/><span>{option.name}</span>{background===option.id&&<span className="background-check">✓</span>}
            </button>)}
            {customBackground && <button type="button" className={`background-option ${background==='custom'?'selected':''}`} data-testid="button-background-custom" aria-pressed={background==='custom'} onClick={() => setBackground('custom')}>
              <span className="background-preview" style={{backgroundImage:`url("${customBackground}")`}}/><span>Mi imagen</span>{background==='custom'&&<span className="background-check">✓</span>}
            </button>}</div>
            <label className="background-upload"><ImagePlus size={16}/><span>Subir una imagen</span><input type="file" accept="image/jpeg,image/png,image/webp" data-testid="input-background-upload" onChange={handleBackgroundUpload}/></label>
            {customBackground && <button className="remove-background" type="button" data-testid="button-remove-background" onClick={() => {setCustomBackground('');if(background==='custom')setBackground('mint');setToast('Imagen personalizada eliminada.');}}>Eliminar mi imagen</button>}
          </div>}</div>
        <div className="drawer-note"><strong><CircleHelp size={12} style={{verticalAlign:'-2px',marginRight:5}}/> Sobre el cálculo</strong>Daño estimado con fórmula estándar y datos editables en este dispositivo. Viento Afín afecta a la velocidad, no al daño.</div>
      </nav>
    </div>}
    {modal && <div className="modal-backdrop" onMouseDown={e => {if(e.target===e.currentTarget)setModal(null);}}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-head"><div><div className="brand-kicker">ROSTER LOCAL · SE GUARDA EN TU DISPOSITIVO</div><h2 id="modal-title">{modal === 'pokemon' ? 'Equipo Pokémon' : 'Biblioteca de movimientos'}</h2></div><button className="icon-button" aria-label="Cerrar" data-testid="button-close-modal" onClick={() => setModal(null)}><X size={18}/></button></div>
        {modal === 'pokemon' ? <>
          <form className="modal-form" key={editing?.id ?? 'new-pokemon'} onSubmit={savePokemon}>
            <div className="form-field"><label htmlFor="pokemon-name">Nombre</label><input id="pokemon-name" name="nombre" data-testid="input-pokemon-name" defaultValue={editingPokemon?.nombre ?? ''} maxLength={24} required placeholder="Ej. Garchomp"/></div>
            <div className="form-grid"><FormType name="tipo1" label="Tipo 1" initial={editingPokemon?.tipo1 ?? 'normal'}/><FormType name="tipo2" label="Tipo 2 (opcional)" initial={editingPokemon?.tipo2 ?? ''} optional/></div>
            <div className="form-subsection"><div className="form-subhead">Estadísticas base</div><div className="form-grid">{STAT_KEYS.map((key,index) => <div className="form-field" key={key}><label htmlFor={`stat-${key}`}>{STAT_LABELS[key]} base</label><input id={`stat-${key}`} name={key} data-testid={`input-pokemon-${key}`} type="number" min="1" max="255" step="1" required defaultValue={editingPokemon?.[key] ?? [80,100,80,80,80,80][index]}/></div>)}</div></div>
            <div className="form-subsection"><div className="form-subhead">IVs · de 0 a 31</div><div className="form-grid">{STAT_KEYS.map(key => <div className="form-field" key={key}><label htmlFor={`iv-${key}`}>{STAT_LABELS[key]}</label><input id={`iv-${key}`} name={`iv-${key}`} data-testid={`input-iv-${key}`} type="number" min="0" max="31" step="1" required defaultValue={editingPokemon?.ivs[key] ?? 31}/></div>)}</div></div>
            <div className="form-subsection"><div className="form-subhead">EVs · 0–252 por estadística; 510 en total</div><div className="form-grid">{STAT_KEYS.map(key => <div className="form-field" key={key}><label htmlFor={`ev-${key}`}>{STAT_LABELS[key]}</label><input id={`ev-${key}`} name={`ev-${key}`} data-testid={`input-ev-${key}`} type="number" min="0" max="252" step="1" required defaultValue={editingPokemon?.evs[key] ?? 0}/></div>)}</div></div>
            <div className="form-grid"><div className="form-field"><label htmlFor="pokemon-nature">Naturaleza</label><select id="pokemon-nature" name="nature" data-testid="select-pokemon-nature" defaultValue={editingPokemon?.nature ?? 'serious'}>{NATURES.map(([id,label]) => <option value={id} key={id}>{label}</option>)}</select></div><div className="form-field"><label htmlFor="pokemon-held-item">Objeto equipado</label><select id="pokemon-held-item" name="item" data-testid="select-pokemon-held-item" defaultValue={editingPokemon?.item ?? 'none'}>{items.map(([id,label]) => <option value={id} key={id}>{label}</option>)}</select></div></div>
            <label className="check-row"><input type="checkbox" name="finalEvolution" data-testid="checkbox-final-evolution" defaultChecked={editingPokemon?.finalEvolution ?? true}/><span>Está en su evolución final</span><small>El Mineral Evolutivo solo se aplica si no lo está.</small></label>
            <div className="form-actions"><button type="button" className="btn btn-muted" data-testid="button-new-pokemon" onClick={() => setEditing(null)}>Nuevo registro</button><button className="btn btn-primary" data-testid="button-save-pokemon">{editing?'Guardar cambios':'Añadir Pokémon'}</button></div>
          </form>
          <div className="roster-list">{pokemon.length ? pokemon.map(p => <div className="roster-row" key={p.id}><div className="roster-info"><strong>{p.nombre}</strong><small>{typeName(p.tipo1)}{p.tipo2?` / ${typeName(p.tipo2)}`:''} · PS {p.hp} · Atq. {p.atk}</small></div><button className="tiny-action" aria-label={`Editar ${p.nombre}`} data-testid={`button-edit-pokemon-${p.id}`} onClick={() => setEditing(p)}><Edit2 size={14}/></button><button className="tiny-action delete" aria-label={`Eliminar ${p.nombre}`} data-testid={`button-delete-pokemon-${p.id}`} onClick={() => deletePokemon(p.id)}><Trash2 size={14}/></button></div>) : <div className="empty-state">Tu equipo está vacío. Añade un Pokémon arriba.</div>}</div>
        </> : <>
          <form className="modal-form" key={editing?.id ?? 'new-move'} onSubmit={saveMove}>
            <div className="form-field"><label htmlFor="move-name">Nombre</label><input id="move-name" name="nombre" data-testid="input-move-name" defaultValue={editingMove?.nombre ?? ''} maxLength={28} required placeholder="Ej. Terremoto"/></div>
            <div className="form-grid"><FormType name="tipo" label="Tipo" initial={editingMove?.tipo ?? 'normal'}/><div className="form-field"><label htmlFor="move-category">Categoría</label><select id="move-category" name="categoria" data-testid="select-move-category" defaultValue={editingMove?.categoria ?? 'physical'}><option value="physical">Físico</option><option value="special">Especial</option></select></div></div>
            <div className="form-field"><label htmlFor="move-power">Potencia base</label><input id="move-power" name="poder" data-testid="input-move-power" type="number" min="1" max="250" required defaultValue={editingMove?.poder ?? 80}/></div>
            <div className="form-subsection"><div className="form-subhead">Cambio de estadística del usuario después del golpe</div><div className="form-grid"><div className="form-field"><label htmlFor="move-stage-stat">Estadística</label><select id="move-stage-stat" name="stageStat" data-testid="select-move-stage-stat" defaultValue={editingMove?.statChange?.stat??'none'}><option value="none">Sin cambio</option>{STAGE_KEYS.map(key=><option key={key} value={key}>{STAT_LABELS[key]}</option>)}</select></div><div className="form-field"><label htmlFor="move-stage-change">Etapas</label><select id="move-stage-change" name="stageChange" data-testid="select-move-stage-change" defaultValue={editingMove?.statChange?.stages??0}><option value="0">Sin cambio</option>{[-6,-5,-4,-3,-2,-1,1,2,3,4,5,6].map(value=><option key={value} value={value}>{value>0?`+${value}`:value}</option>)}</select></div></div></div>
            <div className="form-actions"><button type="button" className="btn btn-muted" data-testid="button-new-move" onClick={() => setEditing(null)}>Nuevo registro</button><button className="btn btn-primary" data-testid="button-save-move">{editing?'Guardar cambios':'Añadir movimiento'}</button></div>
          </form>
          <div className="roster-list">{moves.length ? moves.map(m => <div className="roster-row" key={m.id}><div className="roster-info"><strong>{m.nombre}</strong><small>{typeName(m.tipo)} · {m.categoria==='physical'?'Físico':'Especial'} · {m.poder} potencia{m.statChange?` · ${STAT_LABELS[m.statChange.stat]} ${m.statChange.stages>0?'+':''}${m.statChange.stages} tras el golpe`:''}</small></div><button className="tiny-action" aria-label={`Editar ${m.nombre}`} data-testid={`button-edit-move-${m.id}`} onClick={() => setEditing(m)}><Edit2 size={14}/></button><button className="tiny-action delete" aria-label={`Eliminar ${m.nombre}`} data-testid={`button-delete-move-${m.id}`} onClick={() => deleteMove(m.id)}><Trash2 size={14}/></button></div>) : <div className="empty-state">No hay movimientos. Añade uno arriba.</div>}</div>
        </>}
      </section>
    </div>}
    {toast && <div role="status" className="toast" data-testid="status-toast">{toast}</div>}
  </main>;
}

function FormType({ name, label, initial, optional = false }: { name: string; label: string; initial: string; optional?: boolean }) {
  return <div className="form-field"><label htmlFor={`form-${name}`}>{label}</label><select id={`form-${name}`} name={name} data-testid={`select-form-${name}`} defaultValue={initial} required={!optional}><option value="">{optional?'Sin tipo':'Elige un tipo'}</option>{TYPES.map(([id,title]) => <option value={id} key={id}>{title}</option>)}</select></div>;
}

export default App;
