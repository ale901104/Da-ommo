import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Award,
  BookOpen,
  Bot,
  Brain,
  Check,
  ChevronDown,
  ChevronUp,
  Cloud,
  Copy,
  Download,
  Edit2,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  HardDrive,
  Key,
  Loader2,
  MessageSquare,
  Plus,
  RotateCcw,
  Save,
  Search,
  Share2,
  Shield,
  Sliders,
  Sparkles,
  Swords,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import {
  ITEMS,
  NATURES,
  type Move,
  type Pokemon,
  type StatKey,
  type StatValues,
  TypeBadge,
  TYPES,
  typeName,
  TYPE_COLORS,
  getPokemonAbilities,
  getPokemonMoves,
  STAT_LABELS,
  STAT_KEYS,
  ALL_ABILITY_DEFINITIONS,
} from '../pokemon-constants';
import { allGen1To5Moves, allGen1To5Pokemon, convertDexToPokemon, rawDexList } from '../dex';
import {
  getPokemonDexNum,
  getPokemonShowdownSpriteStyle,
  PokemonSearchableSelect,
} from './PokemonSearchableSelect';
import { MoveSearchableSelect } from './MoveSearchableSelect';
import {
  AI_PROVIDERS,
  STORAGE_SELECTED_PROVIDER,
  STORAGE_API_KEY,
  type AiProvider,
} from './SettingsView';
import { generateLocalCompetitiveAiAnalysis } from '../lib/team-ai-analyzer';
import {
  initDriveAuth,
  signInWithGoogle,
  signOutGoogle,
  getDriveAccessToken,
  listDriveTeamFiles,
  downloadDriveTeamFile,
  saveTeamToDrive,
  deleteDriveTeamFile,
  type DriveTeamFile,
} from '../lib/google-drive';
import type { User } from 'firebase/auth';

export interface BuilderMember {
  id: string; // unique slot ID (slot-1 ... slot-6)
  pokemonId: string;
  nombre: string;
  item: string;
  ability: string;
  nature: string;
  moves: [string, string, string, string];
  evs: StatValues;
  ivs: StatValues;
  level: number;
}

export interface SavedTeam {
  id: string;
  name: string;
  updatedAt: number;
  members: BuilderMember[];
  strategyNotes?: string;
}

interface TeamBuilderViewProps {
  pokemonList: Pokemon[];
  equipoOU: Pokemon[];
  equipoUU: Pokemon[];
  equipoNU: Pokemon[];
  allMoves?: Move[];
  onSendToCalculator: (pokemon: Pokemon, role: 'attacker' | 'defender', moveId?: string) => void;
  onToast: (msg: string) => void;
  theme?: 'light' | 'dark';
}

type BuilderSubTab = 'equipo' | 'tipos' | 'estadisticas' | 'movimientos';

const STORAGE_TEAMS_COLLECTION_KEY = 'pokemmo-builder-teams-collection-v2';

const DEFAULT_EVS: StatValues = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
const DEFAULT_IVS: StatValues = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };

// Common competitive PvP EV Presets
const EV_PRESETS: { label: string; evs: StatValues }[] = [
  { label: '252 Atq / 252 Vel', evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 } },
  { label: '252 SpA / 252 Vel', evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 } },
  { label: '252 PS / 252 Def', evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 } },
  { label: '252 PS / 252 SpD', evs: { hp: 252, atk: 0, def: 4, spa: 0, spd: 252, spe: 0 } },
  { label: 'Limpiar EVs (0)', evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } },
];

function calcStat(key: StatKey, baseVal: number, iv: number, ev: number, level: number, natureId: string): number {
  const core = Math.floor(((2 * baseVal + iv + Math.floor(ev / 4)) * level) / 100);
  if (key === 'hp') return core + level + 10;
  const base = core + 5;
  const nature = NATURES.find(([id]) => id === natureId);
  if (!nature || nature[2] === nature[3]) return base;
  return Math.floor(base * (nature[2] === key ? 1.1 : nature[3] === key ? 0.9 : 1));
}

function createEmptyMember(slotIndex: number): BuilderMember {
  return {
    id: `slot-${slotIndex + 1}`,
    pokemonId: '',
    nombre: '',
    item: 'none',
    ability: 'none',
    nature: 'hardy',
    moves: ['', '', '', ''],
    evs: { ...DEFAULT_EVS },
    ivs: { ...DEFAULT_IVS },
    level: 50,
  };
}

function createDefaultTeam(name = 'Equipo 1', strategyNotes = ''): SavedTeam {
  return {
    id: `team-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    updatedAt: Date.now(),
    members: Array.from({ length: 6 }, (_, i) => createEmptyMember(i)),
    strategyNotes,
  };
}

function memberToPokemon(member: BuilderMember, dexData: (typeof rawDexList)[0] | undefined): Pokemon {
  const hp = dexData?.hp ?? 80;
  const atk = dexData?.atk ?? 100;
  const def = dexData?.def ?? 80;
  const spa = dexData?.spa ?? 80;
  const spd = dexData?.spd ?? 80;
  const spe = dexData?.spe ?? 80;

  return {
    id: member.pokemonId,
    num: dexData?.num,
    nombre: member.nombre || dexData?.nombre || 'Pokémon',
    tier: 'ou',
    categoria: 'ou',
    tipo1: dexData?.tipo1 || 'normal',
    tipo2: dexData?.tipo2 || '',
    hp,
    atk,
    def,
    spa,
    spd,
    spe,
    ivs: { ...member.ivs },
    evs: { ...member.evs },
    nature: member.nature,
    item: member.item,
    ability: member.ability,
    abilities: dexData?.abilities,
    abilityNames: dexData?.abilityNames,
    learnset: dexData?.learnset,
    finalEvolution: true,
    boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    weightkg: dexData?.weightkg,
    heightm: dexData?.heightm,
    generation: dexData?.generation,
    color: dexData?.color,
  };
}

// Convert member to Pokémon Showdown text
function memberToShowdownText(m: BuilderMember): string {
  if (!m.pokemonId && !m.nombre) return '';
  const lines: string[] = [];
  const itemName = m.item && m.item !== 'none' ? ` @ ${m.item}` : '';
  lines.push(`${m.nombre || m.pokemonId}${itemName}`);
  if (m.ability && m.ability !== 'none') {
    lines.push(`Ability: ${m.ability}`);
  }
  lines.push(`Level: ${m.level || 50}`);

  const evParts: string[] = [];
  if (m.evs.hp) evParts.push(`${m.evs.hp} HP`);
  if (m.evs.atk) evParts.push(`${m.evs.atk} Atk`);
  if (m.evs.def) evParts.push(`${m.evs.def} Def`);
  if (m.evs.spa) evParts.push(`${m.evs.spa} SpA`);
  if (m.evs.spd) evParts.push(`${m.evs.spd} SpD`);
  if (m.evs.spe) evParts.push(`${m.evs.spe} Spe`);
  if (evParts.length > 0) {
    lines.push(`EVs: ${evParts.join(' / ')}`);
  }

  if (m.nature) {
    const natCap = m.nature.charAt(0).toUpperCase() + m.nature.slice(1);
    lines.push(`${natCap} Nature`);
  }

  (m.moves || []).forEach(mv => {
    if (mv && mv.trim()) {
      lines.push(`- ${mv.trim()}`);
    }
  });

  return lines.join('\n');
}

// Convert team to Pokémon Showdown team text
function teamToShowdownText(team: SavedTeam): string {
  return team.members
    .filter(m => m.pokemonId || m.nombre)
    .map(memberToShowdownText)
    .join('\n\n');
}

// Parse Pokémon Showdown team text into BuilderMember array
function parseShowdownTeam(text: string, dexMap: Map<string, (typeof rawDexList)[0]>): BuilderMember[] {
  const blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  const members: BuilderMember[] = [];

  for (let i = 0; i < Math.min(6, blocks.length); i++) {
    const block = blocks[i];
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const firstLine = lines[0];
    let name = firstLine;
    let item = 'none';

    if (firstLine.includes('@')) {
      const parts = firstLine.split('@');
      name = parts[0].trim();
      item = parts[1].trim();
    }

    let speciesName = name;
    const nickMatch = speciesName.match(/\(([^)]+)\)/);
    if (nickMatch) {
      const inside = nickMatch[1].trim();
      if (inside === 'M' || inside === 'F') {
        speciesName = speciesName.replace(/\([MF]\)/i, '').trim();
      } else {
        speciesName = inside;
      }
    }

    const cleanSpecies = speciesName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const foundDex =
      dexMap.get(cleanSpecies) ||
      rawDexList.find(d => d.id.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanSpecies || d.nombre.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanSpecies);

    let ability = foundDex?.abilities?.[0] || 'none';
    let nature = 'hardy';
    let level = 50;
    const evs: StatValues = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    const ivs: StatValues = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
    const moves: [string, string, string, string] = ['', '', '', ''];
    let moveIdx = 0;

    for (let j = 1; j < lines.length; j++) {
      const line = lines[j];
      if (line.toLowerCase().startsWith('ability:')) {
        ability = line.slice(8).trim();
      } else if (line.toLowerCase().startsWith('level:')) {
        const lvl = parseInt(line.slice(6).trim(), 10);
        if (!isNaN(lvl)) level = lvl;
      } else if (line.toLowerCase().endsWith('nature')) {
        nature = line.replace(/nature/i, '').trim().toLowerCase();
      } else if (line.toLowerCase().startsWith('evs:')) {
        const parts = line.slice(4).split('/');
        for (const p of parts) {
          const m = p.trim().match(/(\d+)\s*([a-zA-Z]+)/);
          if (m) {
            const val = parseInt(m[1], 10);
            const statKey = m[2].toLowerCase();
            if (statKey.includes('hp')) evs.hp = val;
            else if (statKey.includes('atk')) evs.atk = val;
            else if (statKey.includes('def')) evs.def = val;
            else if (statKey.includes('spa')) evs.spa = val;
            else if (statKey.includes('spd')) evs.spd = val;
            else if (statKey.includes('spe')) evs.spe = val;
          }
        }
      } else if (line.startsWith('-') && moveIdx < 4) {
        moves[moveIdx] = line.slice(1).trim();
        moveIdx++;
      }
    }

    members.push({
      id: `slot-${i + 1}`,
      pokemonId: foundDex?.id || speciesName,
      nombre: foundDex?.nombre || speciesName,
      item,
      ability,
      nature,
      level,
      moves,
      evs,
      ivs,
    });
  }

  while (members.length < 6) {
    members.push(createEmptyMember(members.length));
  }

  return members;
}

// Sanitize any raw imported JSON member to guarantee valid fields
function sanitizeImportedMember(raw: unknown, slotIdx: number, dexMap: Map<string, (typeof rawDexList)[0]>): BuilderMember {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const pokemonId = String(r.pokemonId || r.id || r.species || '');
  const nombre = String(r.nombre || r.name || pokemonId);
  const cleanId = pokemonId.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanName = nombre.toLowerCase().replace(/[^a-z0-9]/g, '');
  const foundDex =
    dexMap.get(cleanId) ||
    dexMap.get(cleanName) ||
    rawDexList.find(d => d.id.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanId || d.nombre.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanName);

  const rawEvs = (r.evs && typeof r.evs === 'object' ? r.evs : {}) as Record<string, number>;
  const rawIvs = (r.ivs && typeof r.ivs === 'object' ? r.ivs : {}) as Record<string, number>;
  const evs: StatValues = {
    hp: Number(rawEvs.hp) || 0,
    atk: Number(rawEvs.atk) || 0,
    def: Number(rawEvs.def) || 0,
    spa: Number(rawEvs.spa) || 0,
    spd: Number(rawEvs.spd) || 0,
    spe: Number(rawEvs.spe) || 0,
  };
  const ivs: StatValues = {
    hp: typeof rawIvs.hp === 'number' ? rawIvs.hp : 31,
    atk: typeof rawIvs.atk === 'number' ? rawIvs.atk : 31,
    def: typeof rawIvs.def === 'number' ? rawIvs.def : 31,
    spa: typeof rawIvs.spa === 'number' ? rawIvs.spa : 31,
    spd: typeof rawIvs.spd === 'number' ? rawIvs.spd : 31,
    spe: typeof rawIvs.spe === 'number' ? rawIvs.spe : 31,
  };

  const rawMoves = Array.isArray(r.moves) ? r.moves : [];
  const moves: [string, string, string, string] = [
    String(rawMoves[0] || ''),
    String(rawMoves[1] || ''),
    String(rawMoves[2] || ''),
    String(rawMoves[3] || ''),
  ];

  return {
    id: `slot-${slotIdx + 1}`,
    pokemonId: foundDex?.id || pokemonId,
    nombre: foundDex?.nombre || nombre,
    item: String(r.item || 'none'),
    ability: String(r.ability || foundDex?.abilities?.[0] || 'none'),
    nature: String(r.nature || 'hardy'),
    level: Number(r.level) || 50,
    moves,
    evs,
    ivs,
  };
}

// Type effectiveness table for defensive synergy
const TYPE_CHART: Record<string, Record<string, number>> = {
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

function getDefensiveMultiplier(
  defType1: string,
  defType2: string | undefined,
  atkType: string,
  ability?: string,
  pokemonNameOrId?: string,
  dexAbilities?: string[]
): number {
  const normAbility = (ability || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const normDexAbs = (dexAbilities || []).map(a => a.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const normName = (pokemonNameOrId || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const hasAbility = (slug: string) =>
    normAbility.includes(slug) ||
    normDexAbs.some(a => a.includes(slug));

  // 1. Levitate (Levitación) -> Immune to Ground (Rotom, Flygon, Weezing, Eelektross, Carnivine, etc.)
  if (atkType === 'ground') {
    if (
      hasAbility('levitate') ||
      hasAbility('levitacion') ||
      normName.includes('rotom') ||
      normName.includes('weezing') ||
      normName.includes('koffing') ||
      normName.includes('flygon') ||
      normName.includes('eelektross') ||
      normName.includes('carnivine') ||
      normName.includes('bronzong') ||
      normName.includes('claydol') ||
      normName.includes('cryogonal') ||
      normName.includes('cresselia') ||
      normName.includes('latios') ||
      normName.includes('latias') ||
      normName.includes('uxie') ||
      normName.includes('mesprit') ||
      normName.includes('azelf') ||
      normName.includes('mismagius') ||
      normName.includes('misdreavus')
    ) {
      return 0;
    }
  }

  // 2. Fire immunities (Flash Fire / Absorbe Fuego)
  if (atkType === 'fire') {
    if (hasAbility('flashfire') || hasAbility('absorbefuego')) {
      return 0;
    }
  }

  // 3. Water immunities (Water Absorb, Storm Drain, Dry Skin)
  if (atkType === 'water') {
    if (
      hasAbility('waterabsorb') ||
      hasAbility('absorbeagua') ||
      hasAbility('stormdrain') ||
      hasAbility('colector') ||
      hasAbility('dryskin') ||
      hasAbility('pielseca')
    ) {
      return 0;
    }
  }

  // 4. Electric immunities (Volt Absorb, Motor Drive, Lightning Rod)
  if (atkType === 'electric') {
    if (
      hasAbility('voltabsorb') ||
      hasAbility('absorbeelec') ||
      hasAbility('motordrive') ||
      hasAbility('electromotor') ||
      hasAbility('lightningrod') ||
      hasAbility('pararrayos')
    ) {
      return 0;
    }
  }

  // 5. Grass immunities (Sap Sipper / Herbívoro)
  if (atkType === 'grass') {
    if (hasAbility('sapsipper') || hasAbility('herbivoro')) {
      return 0;
    }
  }

  // 6. Wonder Guard (Superguarda) (Shedinja)
  if (hasAbility('wonderguard') || hasAbility('superguarda') || normName.includes('shedinja')) {
    const baseMult = (TYPE_CHART[atkType]?.[defType1] ?? 1) * (defType2 ? (TYPE_CHART[atkType]?.[defType2] ?? 1) : 1);
    return baseMult > 1 ? baseMult : 0;
  }

  const m1 = TYPE_CHART[atkType]?.[defType1] ?? 1;
  const m2 = defType2 ? (TYPE_CHART[atkType]?.[defType2] ?? 1) : 1;
  return m1 * m2;
}

// Exact PokéType abbreviations and colors from the user screenshot (Screenshot_20261017_145105_PokeType.jpg)
const POKETYPE_MAP: Record<string, { abbrev: string; bg: string; name: string }> = {
  fire: { abbrev: 'Fueg', bg: '#df7948', name: 'Fuego' },
  fuego: { abbrev: 'Fueg', bg: '#df7948', name: 'Fuego' },
  water: { abbrev: 'Agua', bg: '#5982c7', name: 'Agua' },
  agua: { abbrev: 'Agua', bg: '#5982c7', name: 'Agua' },
  grass: { abbrev: 'Plan', bg: '#7cb463', name: 'Planta' },
  planta: { abbrev: 'Plan', bg: '#7cb463', name: 'Planta' },
  electric: { abbrev: 'Eléc', bg: '#d8b945', name: 'Eléctrico' },
  electrico: { abbrev: 'Eléc', bg: '#d8b945', name: 'Eléctrico' },
  ice: { abbrev: 'Hiel', bg: '#7eb4b2', name: 'Hielo' },
  hielo: { abbrev: 'Hiel', bg: '#7eb4b2', name: 'Hielo' },
  fighting: { abbrev: 'Luch', bg: '#b8443b', name: 'Lucha' },
  lucha: { abbrev: 'Luch', bg: '#b8443b', name: 'Lucha' },
  poison: { abbrev: 'Vene', bg: '#9c4c9b', name: 'Veneno' },
  veneno: { abbrev: 'Vene', bg: '#9c4c9b', name: 'Veneno' },
  ground: { abbrev: 'Tier', bg: '#cca048', name: 'Tierra' },
  tierra: { abbrev: 'Tier', bg: '#cca048', name: 'Tierra' },
  flying: { abbrev: 'Vola', bg: '#869ce0', name: 'Volador' },
  volador: { abbrev: 'Vola', bg: '#869ce0', name: 'Volador' },
  psychic: { abbrev: 'Psí', bg: '#e85c7c', name: 'Psíquico' },
  psiquico: { abbrev: 'Psí', bg: '#e85c7c', name: 'Psíquico' },
  bug: { abbrev: 'Bich', bg: '#94a838', name: 'Bicho' },
  bicho: { abbrev: 'Bich', bg: '#94a838', name: 'Bicho' },
  rock: { abbrev: 'Roca', bg: '#b29e4e', name: 'Roca' },
  roca: { abbrev: 'Roca', bg: '#b29e4e', name: 'Roca' },
  ghost: { abbrev: 'Fant', bg: '#6e5898', name: 'Fantasma' },
  fantasma: { abbrev: 'Fant', bg: '#6e5898', name: 'Fantasma' },
  dragon: { abbrev: 'Drag', bg: '#6054cf', name: 'Dragón' },
  dark: { abbrev: 'Sini', bg: '#5f4e45', name: 'Siniestro' },
  siniestro: { abbrev: 'Sini', bg: '#5f4e45', name: 'Siniestro' },
  steel: { abbrev: 'Acer', bg: '#8f98a5', name: 'Acero' },
  acero: { abbrev: 'Acer', bg: '#8f98a5', name: 'Acero' },
  normal: { abbrev: 'Norm', bg: '#949488', name: 'Normal' },
};

const POKETYPE_ORDER = [
  'fire',
  'water',
  'grass',
  'electric',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'normal',
];

export const TeamBuilderView: React.FC<TeamBuilderViewProps> = ({
  pokemonList,
  equipoOU,
  equipoUU,
  equipoNU,
  allMoves = allGen1To5Moves,
  onSendToCalculator,
  onToast,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  // Current active sub-tab: 'equipo' | 'tipos' | 'estadisticas' | 'movimientos'
  const [activeTab, setActiveTab] = useState<BuilderSubTab>('equipo');

  // Saved Teams collection
  const [teams, setTeams] = useState<SavedTeam[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_TEAMS_COLLECTION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return [createDefaultTeam('Equipo 1')];
  });

  const [activeTeamId, setActiveTeamId] = useState<string>(() => {
    return teams[0]?.id || 'team-1';
  });

  const currentTeam = useMemo(() => {
    return teams.find(t => t.id === activeTeamId) || teams[0];
  }, [teams, activeTeamId]);

  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [filterLearnableOnly, setFilterLearnableOnly] = useState<boolean>(true);
  const [showTeamsModal, setShowTeamsModal] = useState<boolean>(false);
  const [isEditingTeamName, setIsEditingTeamName] = useState<boolean>(false);
  const [teamNameDraft, setTeamNameDraft] = useState<string>('');
  const [showChangePokemonModal, setShowChangePokemonModal] = useState<boolean>(false);
  const [showPokedexModal, setShowPokedexModal] = useState<boolean>(false);
  const [showSendToCalcModal, setShowSendToCalcModal] = useState<boolean>(false);
  const [calcModalMove, setCalcModalMove] = useState<string>('');
  const [builderSearchQuery, setBuilderSearchQuery] = useState<string>('');
  const [builderGenFilter, setBuilderGenFilter] = useState<number | 'all'>('all');
  const [builderTierFilter, setBuilderTierFilter] = useState<'all' | 'ou' | 'uu' | 'nu'>('all');
  const [teamToDeleteId, setTeamToDeleteId] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importPasteText, setImportPasteText] = useState<string>('');
  const [tiposMode, setTiposMode] = useState<'simple' | 'detallado'>('simple');
  const [emptySlotSearchQuery, setEmptySlotSearchQuery] = useState<string>('');

  // Google Drive Integration states
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [isDriveLoading, setIsDriveLoading] = useState<boolean>(false);
  const [driveFiles, setDriveFiles] = useState<DriveTeamFile[]>([]);
  const [driveFileToDelete, setDriveFileToDelete] = useState<DriveTeamFile | null>(null);
  const [importSourceTab, setImportSourceTab] = useState<'drive' | 'local'>('drive');

  // Load Google Drive files
  const refreshDriveFiles = async (token?: string) => {
    const activeToken = token || driveToken || getDriveAccessToken();
    if (!activeToken) return;
    setIsDriveLoading(true);
    try {
      const files = await listDriveTeamFiles(activeToken);
      setDriveFiles(files);
    } catch (err: unknown) {
      console.error('Error fetching drive files:', err);
      onToast(err instanceof Error ? err.message : 'Error al consultar Google Drive.');
    } finally {
      setIsDriveLoading(false);
    }
  };

  // Google Drive Auth Listener
  useEffect(() => {
    const unsubscribe = initDriveAuth(
      (user, token) => {
        setGoogleUser(user);
        setDriveToken(token);
        if (token) {
          refreshDriveFiles(token);
        }
      },
      () => {
        setGoogleUser(null);
        setDriveToken(null);
        setDriveFiles([]);
      }
    );
    return () => unsubscribe();
  }, []);

  // Connect Google Drive
  const handleConnectGoogleDrive = async (): Promise<string | null> => {
    setIsDriveLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result) {
        setGoogleUser(result.user);
        setDriveToken(result.accessToken);
        onToast(`¡Conectado a Google Drive como ${result.user.email || 'usuario'}!`);
        await refreshDriveFiles(result.accessToken);
        return result.accessToken;
      }
      return null;
    } catch (err: unknown) {
      console.error('Google Sign-In Error:', err);
      onToast(err instanceof Error ? err.message : 'No se pudo iniciar sesión con Google.');
      return null;
    } finally {
      setIsDriveLoading(false);
    }
  };

  // Disconnect Google Drive
  const handleDisconnectGoogleDrive = async () => {
    try {
      await signOutGoogle();
      setGoogleUser(null);
      setDriveToken(null);
      setDriveFiles([]);
      onToast('Sesión de Google Drive cerrada.');
    } catch {
      onToast('Error al cerrar sesión de Google.');
    }
  };

  // AI Consultation states
  const [activeAiProvider, setActiveAiProvider] = useState<AiProvider>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_SELECTED_PROVIDER);
      if (stored === 'gemini' || stored === 'openai' || stored === 'groq') return stored;
    } catch {}
    return 'gemini';
  });
  const [promptProvider, setPromptProvider] = useState<AiProvider>('gemini');
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string>('');
  const [aiError, setAiError] = useState<string>('');
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState<boolean>(false);
  const [promptApiKeyInput, setPromptApiKeyInput] = useState<string>('');
  const [isStrategyCollapsed, setIsStrategyCollapsed] = useState<boolean>(false);
  const [hasConfiguredApiKey, setHasConfiguredApiKey] = useState<boolean>(() => {
    try {
      return Boolean(
        localStorage.getItem(STORAGE_API_KEY) || localStorage.getItem('gemini_api_key')
      );
    } catch {
      return false;
    }
  });

  // Sync active AI provider and API key status with local storage
  useEffect(() => {
    const syncAiConfig = () => {
      try {
        const storedProvider = localStorage.getItem(STORAGE_SELECTED_PROVIDER) as AiProvider;
        if (storedProvider === 'gemini' || storedProvider === 'openai' || storedProvider === 'groq') {
          setActiveAiProvider(storedProvider);
        }
        setHasConfiguredApiKey(
          Boolean(localStorage.getItem(STORAGE_API_KEY) || localStorage.getItem('gemini_api_key'))
        );
      } catch {}
    };
    window.addEventListener('storage', syncAiConfig);
    return () => window.removeEventListener('storage', syncAiConfig);
  }, []);

  const openChangePokemonModal = () => {
    setBuilderSearchQuery('');
    setBuilderGenFilter('all');
    setBuilderTierFilter('all');
    setShowChangePokemonModal(true);
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Persist teams to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TEAMS_COLLECTION_KEY, JSON.stringify(teams));
    } catch {
      // ignore
    }
  }, [teams]);

  // Combined pokedex map for quick lookup
  const dexMap = useMemo(() => {
    const map = new Map<string, (typeof rawDexList)[0]>();
    for (const d of rawDexList) {
      map.set(d.id.toLowerCase(), d);
      map.set(d.nombre.toLowerCase(), d);
      map.set(String(d.num), d);
    }
    return map;
  }, []);

  // Quick lookup for move data (type, category, power) by name
  const movesByName = useMemo(() => {
    const map = new Map<string, (typeof allMoves)[0]>();
    for (const m of allMoves) {
      map.set(m.nombre.toLowerCase(), m);
      map.set(m.id.toLowerCase(), m);
      if (m.showdownKey) map.set(m.showdownKey.toLowerCase(), m);
    }
    return map;
  }, [allMoves]);

  const team = currentTeam.members;
  const currentMember = team[activeSlot] || team[0];
  const currentDex = useMemo(() => {
    if (!currentMember.pokemonId && !currentMember.nombre) return undefined;
    const clean = (currentMember.pokemonId || '').toLowerCase();
    if (dexMap.has(clean)) return dexMap.get(clean);
    if (currentMember.nombre && dexMap.has(currentMember.nombre.toLowerCase())) {
      return dexMap.get(currentMember.nombre.toLowerCase());
    }
    const num = getPokemonDexNum(currentMember.pokemonId) || getPokemonDexNum(currentMember.nombre);
    if (num > 0 && dexMap.has(String(num))) {
      return dexMap.get(String(num));
    }
    const bareSlug = clean.replace(/^pk-/, '').split('-')[0];
    return dexMap.get(bareSlug);
  }, [currentMember.pokemonId, currentMember.nombre, dexMap]);

  // Reliable dex lookup for any team member (even custom/stored IDs)
  const getDexForMember = (member: TeamMember) => {
    if (!member.pokemonId && !member.nombre) return undefined;
    const clean = (member.pokemonId || '').toLowerCase();
    if (dexMap.has(clean)) return dexMap.get(clean);
    if (member.nombre && dexMap.has(member.nombre.toLowerCase())) {
      return dexMap.get(member.nombre.toLowerCase());
    }
    const num = getPokemonDexNum(member.pokemonId) || getPokemonDexNum(member.nombre);
    if (num > 0 && dexMap.has(String(num))) {
      return dexMap.get(String(num));
    }
    const bareSlug = clean.replace(/^pk-/, '').split('-')[0];
    return dexMap.get(bareSlug);
  };

  // Filtered Pokémon list for builder in-modal search
  const builderFilteredPokemon = useMemo(() => {
    let list = rawDexList;
    if (builderGenFilter !== 'all') {
      list = list.filter(p => p.generation === builderGenFilter);
    }
    if (builderTierFilter !== 'all') {
      const targetTeam = builderTierFilter === 'ou' ? equipoOU : builderTierFilter === 'uu' ? equipoUU : equipoNU;
      const tierIds = new Set(targetTeam.map(t => t.id.toLowerCase()));
      list = list.filter(p => tierIds.has(p.id.toLowerCase()) || tierIds.has(p.nombre.toLowerCase()));
    }
    const q = builderSearchQuery.trim().toLowerCase();
    if (q) {
      const qNum = parseInt(q.replace(/^#/, ''), 10);
      list = list.filter(p => {
        const matchesName = p.nombre.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
        const matchesNum = !isNaN(qNum) && p.num === qNum;
        const matchesType = typeName(p.tipo1).toLowerCase().includes(q) || (p.tipo2 && typeName(p.tipo2).toLowerCase().includes(q));
        return matchesName || matchesNum || matchesType;
      });
    }
    return list;
  }, [builderSearchQuery, builderGenFilter, builderTierFilter, equipoOU, equipoUU, equipoNU]);

  // PokeType calculation: resistant, weak, and immune types for team members
  const tiposData = useMemo(() => {
    const filledMembers = team.filter(m => m.pokemonId || m.nombre);

    const resistantRows: {
      typeId: string;
      abbrev: string;
      name: string;
      bg: string;
      pokemons: { memberId: string; name: string; dexNum: number; pokemonId: string }[];
    }[] = [];

    const weakRows: {
      typeId: string;
      abbrev: string;
      name: string;
      bg: string;
      pokemons: { memberId: string; name: string; dexNum: number; pokemonId: string }[];
    }[] = [];

    const immuneRows: {
      typeId: string;
      abbrev: string;
      name: string;
      bg: string;
      pokemons: { memberId: string; name: string; dexNum: number; pokemonId: string }[];
    }[] = [];

    for (const atkTypeId of POKETYPE_ORDER) {
      const pInfo = POKETYPE_MAP[atkTypeId] || { abbrev: atkTypeId.slice(0, 4), bg: '#555', name: atkTypeId };
      const resPks: { memberId: string; name: string; dexNum: number; pokemonId: string }[] = [];
      const weakPks: { memberId: string; name: string; dexNum: number; pokemonId: string }[] = [];
      const immunePks: { memberId: string; name: string; dexNum: number; pokemonId: string }[] = [];

      for (const m of filledMembers) {
        const dex = getDexForMember(m);
        if (dex) {
          const mult = getDefensiveMultiplier(
            dex.tipo1,
            dex.tipo2,
            atkTypeId,
            m.ability,
            m.pokemonId || m.nombre,
            dex.abilities
          );
          const dexNum = dex.num || getPokemonDexNum(m.pokemonId) || getPokemonDexNum(m.nombre);
          const pId = m.pokemonId || dex.id;
          if (mult === 0) {
            immunePks.push({ memberId: m.id, name: m.nombre || dex.nombre, dexNum, pokemonId: pId });
          } else if (mult < 1 && mult > 0) {
            resPks.push({ memberId: m.id, name: m.nombre || dex.nombre, dexNum, pokemonId: pId });
          } else if (mult > 1) {
            weakPks.push({ memberId: m.id, name: m.nombre || dex.nombre, dexNum, pokemonId: pId });
          }
        }
      }

      if (resPks.length > 0) {
        resistantRows.push({
          typeId: atkTypeId,
          abbrev: pInfo.abbrev,
          name: pInfo.name,
          bg: pInfo.bg,
          pokemons: resPks,
        });
      }
      if (weakPks.length > 0) {
        weakRows.push({
          typeId: atkTypeId,
          abbrev: pInfo.abbrev,
          name: pInfo.name,
          bg: pInfo.bg,
          pokemons: weakPks,
        });
      }
      if (immunePks.length > 0) {
        immuneRows.push({
          typeId: atkTypeId,
          abbrev: pInfo.abbrev,
          name: pInfo.name,
          bg: pInfo.bg,
          pokemons: immunePks,
        });
      }
    }

    return { filledMembers, resistantRows, weakRows, immuneRows };
  }, [team, dexMap]);

  // Offensive move coverage: which team members hit each of the 17 defending types super-effectively
  const moveCoverageByDefendingType = useMemo(() => {
    const filled = team.filter(m => m.pokemonId || m.nombre);
    return POKETYPE_ORDER.map(defTypeId => {
      const pInfo = POKETYPE_MAP[defTypeId] || { abbrev: defTypeId.slice(0, 4), bg: '#555', name: defTypeId };
      const hits: {
        memberId: string;
        memberName: string;
        pokemonId: string;
        dexNum: number;
        moveName: string;
        moveType: string;
        category: string;
        power: number;
        mult: number;
      }[] = [];

      for (const m of filled) {
        const dex = getDexForMember(m);
        const dexNum = dex?.num || getPokemonDexNum(m.pokemonId) || getPokemonDexNum(m.nombre);
        const mName = m.nombre || dex?.nombre || 'Pokémon';
        for (const mvName of m.moves || []) {
          if (!mvName || !mvName.trim()) continue;
          const mv = movesByName.get(mvName.toLowerCase());
          if (mv && mv.categoria !== 'status') {
            const mult = TYPE_CHART[mv.tipo]?.[defTypeId] ?? 1;
            if (mult > 1) {
              hits.push({
                memberId: m.id,
                memberName: mName,
                pokemonId: m.pokemonId || dex?.id || '',
                dexNum,
                moveName: mv.nombre,
                moveType: mv.tipo,
                category: mv.categoria,
                power: mv.poder,
                mult,
              });
            }
          }
        }
      }

      return {
        typeId: defTypeId,
        pInfo,
        hits,
      };
    });
  }, [team, dexMap, movesByName]);

  // Available abilities for current pokemon with full descriptions
  const currentAbilitiesWithDesc = useMemo(() => {
    if (!currentDex) return [];
    const abs = currentDex.abilities || [];
    return abs.map(rawAbility => {
      const slug = rawAbility.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const def = ALL_ABILITY_DEFINITIONS[slug] || ALL_ABILITY_DEFINITIONS[rawAbility];
      return {
        id: slug,
        nombre: def?.name || rawAbility,
        desc: def?.desc || 'Sin descripción.',
      };
    });
  }, [currentDex]);

  // Learnable moves for current pokemon based strictly on Gen 1-5 learnset
  const currentAllowedMoves = useMemo(() => {
    if (!currentMember.pokemonId || !currentDex) return allMoves;
    if (!filterLearnableOnly) return allMoves;
    const pkObj = convertDexToPokemon(currentDex);
    return getPokemonMoves(pkObj, allMoves);
  }, [currentMember.pokemonId, currentDex, allMoves, filterLearnableOnly]);

  // Calculate live stats at level 50
  const statsPreview = useMemo(() => {
    if (!currentDex) return null;
    const base = {
      hp: currentDex.hp,
      atk: currentDex.atk,
      def: currentDex.def,
      spa: currentDex.spa,
      spd: currentDex.spd,
      spe: currentDex.spe,
    };
    const level = currentMember.level || 50;
    return {
      hp: calcStat('hp', base.hp, currentMember.ivs.hp, currentMember.evs.hp, level, currentMember.nature),
      atk: calcStat('atk', base.atk, currentMember.ivs.atk, currentMember.evs.atk, level, currentMember.nature),
      def: calcStat('def', base.def, currentMember.ivs.def, currentMember.evs.def, level, currentMember.nature),
      spa: calcStat('spa', base.spa, currentMember.ivs.spa, currentMember.evs.spa, level, currentMember.nature),
      spd: calcStat('spd', base.spd, currentMember.ivs.spd, currentMember.evs.spd, level, currentMember.nature),
      spe: calcStat('spe', base.spe, currentMember.ivs.spe, currentMember.evs.spe, level, currentMember.nature),
    };
  }, [currentDex, currentMember]);

  // Total EVs used
  const totalEvs = useMemo(() => {
    return Object.values(currentMember.evs).reduce((acc, v) => acc + (v || 0), 0);
  }, [currentMember.evs]);

  // Update a property of current active member
  const updateMember = (slotIdx: number, updates: Partial<BuilderMember>) => {
    setTeams(prevTeams => {
      return prevTeams.map(t => {
        if (t.id !== currentTeam.id) return t;
        const nextMembers = [...t.members];
        nextMembers[slotIdx] = { ...nextMembers[slotIdx], ...updates };
        return {
          ...t,
          updatedAt: Date.now(),
          members: nextMembers,
        };
      });
    });
  };

  // Update team name
  const updateTeamName = (name: string) => {
    const trimmed = name.trim() || 'Equipo';
    setTeams(prevTeams =>
      prevTeams.map(t => (t.id === currentTeam.id ? { ...t, name: trimmed, updatedAt: Date.now() } : t))
    );
  };

  // Update team strategy notes
  const updateTeamStrategy = (notes: string) => {
    setTeams(prevTeams =>
      prevTeams.map(t => (t.id === currentTeam.id ? { ...t, strategyNotes: notes, updatedAt: Date.now() } : t))
    );
  };

  // HTTP API call to selected AI provider (Gemini, OpenAI, Groq) or Built-in PokeMMO Competitive Engine
  const executeAiAnalysis = async (customKey?: string, customProvider?: AiProvider) => {
    const provider = customProvider || activeAiProvider || 'gemini';
    const key = (
      customKey ||
      (typeof localStorage !== 'undefined'
        ? localStorage.getItem(STORAGE_API_KEY) || (provider === 'gemini' ? localStorage.getItem('gemini_api_key') : '')
        : '') ||
      ''
    ).trim();

    setShowAiModal(true);
    setIsAiLoading(true);
    setAiError('');
    setAiAnalysisResult('');

    // Prepare structured 6 Pokemon members payload
    const teamMembersPayload = currentTeam.members.map((m, idx) => {
      const dexNum = getPokemonDexNum(m.pokemonId) || getPokemonDexNum(m.nombre);
      const dexData =
        dexNum > 0 ? dexMap.get(String(dexNum)) || dexMap.get(m.pokemonId.toLowerCase()) : undefined;
      const cleanMoves = (m.moves || []).filter(mv => Boolean(mv && mv.trim()));

      return {
        slot: idx + 1,
        nombre: m.nombre || dexData?.nombre || m.pokemonId || `Slot ${idx + 1} (Vacío)`,
        tipos: dexData ? [dexData.tipo1, dexData.tipo2].filter(Boolean) : [],
        objeto: m.item && m.item !== 'none' ? m.item : 'Sin objeto',
        habilidad:
          m.ability && m.ability !== 'none' ? m.ability : dexData?.abilities?.[0] || 'Desconocida',
        naturaleza: m.nature || 'hardy',
        nivel: m.level || 50,
        evs: m.evs,
        ivs: m.ivs,
        movimientos: cleanMoves.length > 0 ? cleanMoves : ['Sin movimientos configurados'],
      };
    });

    const userStrategy = (currentTeam.strategyNotes || '').trim();

    const systemInstruction = `Eres un analista y entrenador de combate competitivo de élite especializado en PokeMMO.
Reglas oficiales y restricciones del metagame de PokeMMO:
- Basado estrictamente en Generaciones 1 a 5 (hasta Teselia/Unova).
- NO EXISTE EL TIPO HADA (Clefable es Normal, Togekiss es Normal/Volador, Gardevoir es Psíquico puro, etc.).
- Sin Megaevoluciones, Dinamax ni Teracristales.
- Tiers estándar: OU (OverUsed), UU (UnderUsed), NU (NeverUsed) y Dobles.

Tu misión es analizar en profundidad los 6 Pokémon del equipo, sus 4 movimientos de combate exactos, naturalezas, habilidades, objetos, EVs e IVs, así como el cuadro de estrategia y notas del usuario.

DEBES ESTRUCTURAR TU RESPUESTA OBLIGATORIAMENTE EN LAS SIGUIENTES 11 SECCIONES NUMERADAS EN MARKDOWN:

### 🏆 11. Puntuación Global del Equipo: [PUNTUACIÓN de 1 a 100] / 100
- Evalúa el equipo de forma integral y asigna una puntuación estricta de 1 a 100 teniendo en cuenta sinergia, coberturas, balance de roles, optimización de EVs/IVs y concordancia con la estrategia del usuario.

### 🛡️ 1. Evaluación de Sinergia del Equipo y Cobertura Defensiva de Tipos
- Coberturas elementales defensivas y debilidades compartidas entre los Pokémon del equipo.

### ⚔️ 2. Evaluación de Cobertura de Movimientos del Equipo
- Evalúa los movimientos de ataque de cada Pokémon y qué tipos defensivos del rival son cubiertos con daño supereficaz o quedan sin respuesta.

### 👑 3. Sugerencia de Líder(es) (Lead) y Cómo Desempeñar su Función
- Sugiere cuál o cuáles deben ser los Pokémon de apertura (Lead) y cómo ejecutar el turno 1 según el tipo de rival.

### 📝 4. Sugerencias para la Estrategia Teniendo en Cuenta la Estrategia del Usuario
- Consejos tácticos y ajustes adaptados al plan del usuario escrito en sus notas.

### ♟️ 5. Roles que Debe Desempeñar Cada Pokémon
- Define el rol competitivo exacto de cada uno de los 6 miembros (Sweeper físico/especial, Muralla física/especial, Pivot ofensivo/defensivo, Hazard Setter, Hazard Remover, Revenge Killer, etc.).

### ⚠️ 6. Posibles Debilidades y Pokémon que Pueden Romper la Estrategia (Threats)
- Amenazas del meta de PokeMMO (ej. Garchomp, Volcarona, Scizor, Rotom-W, Conkeldurr, Tyranitar, Gliscor, Ferrothorn) que amenazan al equipo y cómo superarlos.

### 🔍 7. Resolución de Pokémon Problemáticos Mencionados por el Usuario
- Si el usuario menciona en sus notas algún Pokémon específico que le cause problemas, detalla la táctica exacta y cómo contrarrestarlo con este equipo.

### 💡 8. Sugerencias de Pokémon para Desempeñar Roles en el Equipo
- Si el usuario pregunta por un Pokémon para un rol específico o si falta un rol clave en el equipo, ofrece las mejores opciones competitivas de Gen 1-5.

### 🛠️ 9. Viabilidad de Pokémon Sugeridos por el Usuario y Configuración de Entrenamiento
- Si el usuario sugiere un Pokémon específico para un rol, responde si es viable o no. Si hay una mínima posibilidad, proporciona el set completo: Entrenamiento (EVs), Naturaleza, Habilidad, Objeto y 4 Movimientos.

### 📜 10. Metagame Gen 1 a 5 Sin Tipo Hada
- Confirma que todas las interacciones respetan estrictamente las mecánicas de 1ª a 5ª Generación sin tipo Hada.`;

    const userPrompt =
      `Analiza este equipo de PokeMMO considerando sus movimientos y mi estrategia:\n\n` +
      JSON.stringify(
        {
          equipo_nombre: currentTeam.name,
          estrategia_y_notas_usuario:
            userStrategy ||
            'Quiero un equipo competitivo equilibrado, sólido y adaptable para PokeMMO.',
          pokemon: teamMembersPayload,
        },
        null,
        2
      );

    // If an API key is configured, try cloud model first
    if (key) {
      if (provider === 'gemini') {
        const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
        for (const model of modelsToTry) {
          try {
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  system_instruction: { parts: [{ text: systemInstruction }] },
                  contents: [{ parts: [{ text: userPrompt }] }],
                  generationConfig: { temperature: 0.4 },
                }),
              }
            );

            if (response.ok) {
              const data = await response.json();
              const candidate = data.candidates?.[0];
              const text = candidate?.content?.parts?.[0]?.text;
              if (text) {
                setAiAnalysisResult(text);
                setIsAiLoading(false);
                onToast(`¡Análisis completado con Google Gemini (${model})!`);
                return;
              }
            }
          } catch {
            // fall through to local competitive analyzer
          }
        }
      } else {
        const endpoint =
          provider === 'openai'
            ? 'https://api.openai.com/v1/chat/completions'
            : 'https://api.groq.com/openai/v1/chat/completions';
        const model = provider === 'openai' ? 'gpt-4o-mini' : 'llama-3.3-70b-versatile';
        const providerName = provider === 'openai' ? 'OpenAI ChatGPT' : 'Groq';

        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify({
              model,
              temperature: 0.4,
              messages: [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: userPrompt },
              ],
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const text = data.choices?.[0]?.message?.content;
            if (text) {
              setAiAnalysisResult(text);
              setIsAiLoading(false);
              onToast(`¡Análisis completado con ${providerName} (${model})!`);
              return;
            }
          }
        } catch {
          // fall through to local competitive analyzer
        }
      }
    }

    // High-performance Built-in PokeMMO Competitive AI Analyzer (Zero friction, instant & reliable)
    await new Promise(r => setTimeout(r, 600));
    try {
      const localResult = generateLocalCompetitiveAiAnalysis(currentTeam, dexMap, tiposData);
      setAiAnalysisResult(localResult);
      setIsAiLoading(false);
      onToast('¡Análisis estratégico completado con éxito!');
    } catch {
      setIsAiLoading(false);
      setAiError('No se pudo generar el análisis del equipo.');
    }
  };

  // Select a pokemon into slot
  const handleSelectPokemonForSlot = (slotIdx: number, pId: string) => {
    const cleanId = pId.toLowerCase();
    const num = getPokemonDexNum(pId);
    const foundDex =
      dexMap.get(cleanId) ||
      (num > 0 ? dexMap.get(String(num)) : undefined) ||
      rawDexList.find(d => d.num === num || d.id === cleanId || d.nombre.toLowerCase() === cleanId) ||
      rawDexList.find(d => d.id === cleanId.replace(/^pk-/, '').split('-')[0]);

    const pkObj = foundDex ? convertDexToPokemon(foundDex) : undefined;
    const learnable = pkObj ? getPokemonMoves(pkObj, allMoves) : [];
    const defaultMoves: [string, string, string, string] = [
      learnable[0]?.nombre || '',
      learnable[1]?.nombre || '',
      learnable[2]?.nombre || '',
      learnable[3]?.nombre || '',
    ];
    const defaultAbility = foundDex?.abilities?.[0]?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'none';

    updateMember(slotIdx, {
      pokemonId: foundDex?.id || pId,
      nombre: foundDex?.nombre || pId,
      ability: defaultAbility,
      moves: defaultMoves,
    });
    setShowChangePokemonModal(false);
    onToast(`Slot #${slotIdx + 1}: ${foundDex?.nombre || pId} seleccionado.`);
  };

  // Clear slot (Withdraw Pokémon)
  const handleWithdrawSlot = (slotIdx: number) => {
    const name = team[slotIdx]?.nombre || `Slot #${slotIdx + 1}`;
    updateMember(slotIdx, createEmptyMember(slotIdx));
    onToast(`${name} retirado del equipo.`);
  };

  // Create new team
  const handleCreateNewTeam = () => {
    const newName = `Equipo ${teams.length + 1}`;
    const newTeam = createDefaultTeam(newName);
    setTeams(prev => [...prev, newTeam]);
    setActiveTeamId(newTeam.id);
    setActiveSlot(0);
    onToast(`Nuevo equipo "${newName}" creado.`);
  };

  // DELETE TEAM: Clean, direct, and completely safe without window.confirm (never blocked by iframes)
  const executeDeleteTeam = (teamId: string) => {
    const target = teams.find(t => t.id === teamId);
    const targetName = target?.name || 'este equipo';

    setTeams(prevTeams => {
      const remaining = prevTeams.filter(t => t.id !== teamId);
      if (remaining.length === 0) {
        // If all teams were deleted, regenerate an empty Team 1
        const fresh = [createDefaultTeam('Equipo 1')];
        setActiveTeamId(fresh[0].id);
        setActiveSlot(0);
        try {
          localStorage.setItem(STORAGE_TEAMS_COLLECTION_KEY, JSON.stringify(fresh));
        } catch {}
        return fresh;
      }
      if (activeTeamId === teamId) {
        setActiveTeamId(remaining[0].id);
        setActiveSlot(0);
      }
      try {
        localStorage.setItem(STORAGE_TEAMS_COLLECTION_KEY, JSON.stringify(remaining));
      } catch {}
      return remaining;
    });

    setTeamToDeleteId(null);
    onToast(`Equipo "${targetName}" eliminado.`);
  };

  // Save explicitly to local storage
  const handleSaveTeamLocal = () => {
    try {
      localStorage.setItem(STORAGE_TEAMS_COLLECTION_KEY, JSON.stringify(teams));
      onToast(`Equipo "${currentTeam.name}" guardado en el almacenamiento local.`);
    } catch {
      onToast('Error al guardar el equipo en almacenamiento local.');
    }
  };

  // Helper to immediately activate and implement any imported or downloaded team
  const applyAndImplementImportedTeam = (newTeam: SavedTeam) => {
    setTeams(prev => {
      const exists = prev.some(t => t.id === newTeam.id);
      const next = exists ? prev.map(t => (t.id === newTeam.id ? newTeam : t)) : [newTeam, ...prev];
      try {
        localStorage.setItem(STORAGE_TEAMS_COLLECTION_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    setActiveTeamId(newTeam.id);
    setActiveSlot(0);
    setActiveTab('equipo');
    onToast(`Equipo "${newTeam.name}" importado e implementado.`);
  };

  // Robust universal team parser (handles JSON, arrays, Showdown text, PokeMMO exports)
  const handleImportContent = (content: string, fallbackName = 'Equipo Importado') => {
    const trimmed = content.trim();
    if (!trimmed) {
      onToast('El contenido está vacío.');
      return;
    }

    // 1. Try parsing as JSON first
    let jsonStr = trimmed;
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '').trim();
    }

    if (jsonStr.startsWith('{') || jsonStr.startsWith('[')) {
      try {
        const parsed = JSON.parse(jsonStr);

        // Case A: Standard app team object { name, members } or with pokemon/team/sets arrays
        const candidateMembers =
          (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && (
            parsed.members || parsed.pokemon || parsed.team || parsed.teamMembers || parsed.sets
          )) || null;

        if (candidateMembers && Array.isArray(candidateMembers)) {
          const members = candidateMembers.map((m: unknown, idx: number) => sanitizeImportedMember(m, idx, dexMap));
          while (members.length < 6) members.push(createEmptyMember(members.length));
          const importedTeam: SavedTeam = {
            id: `team-${Date.now()}`,
            name: parsed.name || fallbackName,
            updatedAt: Date.now(),
            members: members.slice(0, 6) as BuilderMember[],
            strategyNotes: parsed.strategyNotes || parsed.strategy || '',
          };
          applyAndImplementImportedTeam(importedTeam);
          return;
        }

        // Case B: Collection of teams array [{ name, members }, ...]
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && (parsed[0].members || parsed[0].pokemon)) {
          const first = parsed[0];
          const rawList = first.members || first.pokemon || [];
          const members = rawList.map((m: unknown, idx: number) => sanitizeImportedMember(m, idx, dexMap));
          while (members.length < 6) members.push(createEmptyMember(members.length));
          const importedTeam: SavedTeam = {
            id: `team-${Date.now()}`,
            name: first.name || fallbackName,
            updatedAt: Date.now(),
            members: members.slice(0, 6) as BuilderMember[],
            strategyNotes: first.strategyNotes || first.strategy || '',
          };
          applyAndImplementImportedTeam(importedTeam);
          return;
        }

        // Case C: Array of Pokemon members directly [member1, member2, ...]
        if (Array.isArray(parsed) && parsed.length > 0) {
          const members = parsed.map((m: unknown, idx: number) => sanitizeImportedMember(m, idx, dexMap));
          while (members.length < 6) members.push(createEmptyMember(members.length));
          const importedTeam: SavedTeam = {
            id: `team-${Date.now()}`,
            name: fallbackName,
            updatedAt: Date.now(),
            members: members.slice(0, 6) as BuilderMember[],
            strategyNotes: '',
          };
          applyAndImplementImportedTeam(importedTeam);
          return;
        }
      } catch {
        // Fall through to Showdown text parsing
      }
    }

    // 2. Try parsing as Pokémon Showdown / PokeMMO text format
    try {
      const parsedMembers = parseShowdownTeam(trimmed, dexMap);
      if (parsedMembers.some(m => m.pokemonId || m.nombre)) {
        const firstFilled = parsedMembers.find(m => m.nombre);
        const autoName = firstFilled ? `Equipo ${firstFilled.nombre}` : fallbackName;
        const importedTeam: SavedTeam = {
          id: `team-${Date.now()}`,
          name: autoName,
          updatedAt: Date.now(),
          members: parsedMembers,
        };
        applyAndImplementImportedTeam(importedTeam);
        return;
      }
    } catch {
      // ignore
    }

    onToast('No se reconoció el formato de equipo (debe ser JSON o texto Showdown).');
  };

  // Direct download .json (ensures team is implemented and saved in app)
  const handleDirectDownloadJson = () => {
    try {
      // Ensure current team is also saved in app storage
      handleSaveTeamLocal();
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentTeam, null, 2));
      const downloadAnchor = document.createElement('a');
      const safeName = currentTeam.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `${safeName || 'equipo'}.poketeam.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      onToast(`Equipo descargado e implementado en tu app.`);
    } catch {
      onToast('Error al descargar el archivo del equipo.');
    }
  };

  // Export to internal storage in a folder created by the app ("PokeMMO_Equipos")
  const handleExportToInternalStorage = async () => {
    // Keep team saved in app
    handleSaveTeamLocal();
    const safeName = currentTeam.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const fileName = `${safeName || 'equipo'}.poketeam.json`;
    const fileContent = JSON.stringify(currentTeam, null, 2);

    // 1. Try File System Access API (showDirectoryPicker to create or access PokeMMO_Equipos folder)
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as unknown as { showDirectoryPicker: (opts: unknown) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker({
          id: 'pokemmo-teams-folder',
          mode: 'readwrite',
        });
        const appFolder = await dirHandle.getDirectoryHandle('PokeMMO_Equipos', { create: true });
        const fileHandle = await appFolder.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(fileContent);
        await writable.close();
        onToast(`Equipo guardado en la carpeta "PokeMMO_Equipos" de tu almacenamiento.`);
        setShowExportModal(false);
        return;
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    // 2. Try showSaveFilePicker
    if ('showSaveFilePicker' in window) {
      try {
        const fileHandle = await (window as unknown as { showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: 'Equipo PokeMMO (*.poketeam.json)',
              accept: { 'application/json': ['.json', '.poketeam.json'] },
            },
          ],
        });
        const writable = await fileHandle.createWritable();
        await writable.write(fileContent);
        await writable.close();
        onToast(`Equipo guardado en tu almacenamiento interno.`);
        setShowExportModal(false);
        return;
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    // 3. Try Web Share API (Android native sheet lets user choose File Manager / Internal storage)
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      try {
        const blob = new Blob([fileContent], { type: 'application/json' });
        const file = new File([blob], fileName, { type: 'application/json' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `PokeMMO Equipo: ${currentTeam.name}`,
            text: `Equipo ${currentTeam.name} para PokeMMO`,
            files: [file],
          });
          onToast(`Equipo exportado a almacenamiento.`);
          setShowExportModal(false);
          return;
        }
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    // Fallback: direct download
    handleDirectDownloadJson();
    setShowExportModal(false);
  };

  // Export to Google Drive using official Google Drive REST API
  const handleExportToGoogleDrive = async () => {
    handleSaveTeamLocal();
    let token = driveToken || getDriveAccessToken();
    if (!token) {
      token = await handleConnectGoogleDrive();
      if (!token) return;
    }

    setIsDriveLoading(true);
    try {
      await saveTeamToDrive(token, currentTeam);
      onToast(`¡Equipo "${currentTeam.name}" guardado exitosamente en Google Drive!`);
      setShowExportModal(false);
      refreshDriveFiles(token);
    } catch (err: unknown) {
      console.error('Error exporting to drive:', err);
      onToast(err instanceof Error ? err.message : 'Error al guardar en Google Drive.');
    } finally {
      setIsDriveLoading(false);
    }
  };

  // Import team directly from Google Drive
  const handleImportFromDrive = async (file: DriveTeamFile) => {
    let token = driveToken || getDriveAccessToken();
    if (!token) {
      token = await handleConnectGoogleDrive();
      if (!token) return;
    }

    setIsDriveLoading(true);
    try {
      const data = await downloadDriveTeamFile(token, file.id, file.mimeType);
      const cleanFileName = file.name.replace(/\.[^/.]+$/, '').replace('.poketeam', '');
      const rawString = typeof data === 'string' ? data : JSON.stringify(data);
      handleImportContent(rawString, cleanFileName || 'Equipo Drive');
      setShowImportModal(false);
      onToast(`Equipo "${file.name}" importado con éxito desde Google Drive.`);
    } catch (err: unknown) {
      console.error('Error importing from Drive:', err);
      onToast(err instanceof Error ? err.message : 'Error al importar equipo de Google Drive.');
    } finally {
      setIsDriveLoading(false);
    }
  };

  // Confirm and execute Drive file deletion (User confirmation per Workspace Skill rules)
  const handleConfirmDeleteDriveFile = async () => {
    if (!driveFileToDelete) return;
    const token = driveToken || getDriveAccessToken();
    if (!token) return;

    setIsDriveLoading(true);
    try {
      await deleteDriveTeamFile(token, driveFileToDelete.id);
      onToast(`Archivo eliminado de Google Drive.`);
      setDriveFileToDelete(null);
      await refreshDriveFiles(token);
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : 'Error al eliminar archivo de Google Drive.');
    } finally {
      setIsDriveLoading(false);
    }
  };

  // Copy or download Showdown format
  const handleCopyShowdown = () => {
    const text = teamToShowdownText(currentTeam);
    if (!text.trim()) {
      onToast('El equipo está vacío.');
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => onToast('Formato Showdown copiado al portapapeles.'),
      () => onToast('Error al copiar al portapapeles.')
    );
  };

  // Import team file (.json or .txt)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      const cleanFileName = file.name.replace(/\.[^/.]+$/, '');
      handleImportContent(content, cleanFileName || 'Equipo Importado');
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowImportModal(false);
  };

  // Adjust EV for a stat
  const handleEvChange = (stat: StatKey, value: number) => {
    const safeVal = Math.max(0, Math.min(252, Math.floor(value)));
    const currentOthers = Object.entries(currentMember.evs)
      .filter(([k]) => k !== stat)
      .reduce((acc, [, v]) => acc + v, 0);

    const clamped = Math.min(safeVal, 510 - currentOthers);
    updateMember(activeSlot, {
      evs: {
        ...currentMember.evs,
        [stat]: clamped,
      },
    });
  };

  // Adjust IV for a stat
  const handleIvChange = (stat: StatKey, value: number) => {
    const safeVal = Math.max(0, Math.min(31, Math.floor(value)));
    updateMember(activeSlot, {
      ivs: {
        ...currentMember.ivs,
        [stat]: safeVal,
      },
    });
  };

  const natureDef = NATURES.find(([id]) => id === currentMember.nature);

  return (
    <div className={`flex flex-col gap-2 relative ${isLight ? 'builder-light text-slate-900' : 'text-slate-100'}`}>
      {/* HIDDEN FILE INPUT FOR IMPORTING FROM PHONE STORAGE */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json,.txt,.poketeam,application/json,text/plain"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* TOP SUB-TABS: Exact layout from Screenshot_20261017_104629_PokeType.jpg:
          [ Equipo ] [ Tipos ] [ Estadísticas ] [ Movimientos ] */}
      <div className="grid grid-cols-4 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-900 shadow-md">
        <button
          type="button"
          className={`py-2.5 px-1 text-center font-bold text-xs sm:text-sm transition-colors ${
            activeTab === 'equipo'
              ? 'bg-[#e2e8f0] text-slate-900 shadow-inner'
              : 'bg-[#181d24] text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          onClick={() => setActiveTab('equipo')}
        >
          Equipo
        </button>

        <button
          type="button"
          className={`py-2.5 px-1 text-center font-bold text-xs sm:text-sm transition-colors border-l border-slate-700/60 ${
            activeTab === 'tipos'
              ? 'bg-[#e2e8f0] text-slate-900 shadow-inner'
              : 'bg-[#181d24] text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          onClick={() => setActiveTab('tipos')}
        >
          Tipos
        </button>

        <button
          type="button"
          className={`py-2.5 px-1 text-center font-bold text-xs sm:text-sm transition-colors border-l border-slate-700/60 ${
            activeTab === 'estadisticas'
              ? 'bg-[#e2e8f0] text-slate-900 shadow-inner'
              : 'bg-[#181d24] text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          onClick={() => setActiveTab('estadisticas')}
        >
          Estadísticas
        </button>

        <button
          type="button"
          className={`py-2.5 px-1 text-center font-bold text-xs sm:text-sm transition-colors border-l border-slate-700/60 ${
            activeTab === 'movimientos'
              ? 'bg-[#e2e8f0] text-slate-900 shadow-inner'
              : 'bg-[#181d24] text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          onClick={() => setActiveTab('movimientos')}
        >
          Movimientos
        </button>
      </div>

      {/* TEAM SELECTOR ROW WITH DIRECT DELETE & CREATE BUTTONS */}
      <div className="flex items-center justify-between gap-2 px-2 py-1.5 bg-slate-950/80 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs font-bold text-white tracking-wide">Equipo:</span>

          {isEditingTeamName ? (
            <div className="flex items-center gap-1 flex-1 max-w-xs">
              <input
                type="text"
                autoFocus
                className="w-full py-0.5 px-2 text-xs font-bold bg-slate-900 border border-emerald-500 rounded text-white"
                value={teamNameDraft}
                onChange={e => setTeamNameDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    updateTeamName(teamNameDraft);
                    setIsEditingTeamName(false);
                  }
                }}
              />
              <button
                type="button"
                className="p-1 text-emerald-400"
                onClick={() => {
                  updateTeamName(teamNameDraft);
                  setIsEditingTeamName(false);
                }}
              >
                <Check size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-slate-900 border-b-2 border-slate-600 hover:border-emerald-400 text-xs font-bold text-slate-200 transition-colors text-left break-words max-w-full"
              onClick={() => setShowTeamsModal(true)}
              title="Cambiar de equipo o ver mis equipos guardados"
            >
              <span className="break-words leading-tight">{currentTeam.name}</span>
              <ChevronDown size={13} className="text-slate-400 flex-shrink-0" />
            </button>
          )}

          <button
            type="button"
            className="p-1 text-slate-400 hover:text-white transition-colors"
            title="Renombrar equipo"
            onClick={() => {
              setTeamNameDraft(currentTeam.name);
              setIsEditingTeamName(true);
            }}
          >
            <Edit2 size={13} />
          </button>
        </div>

        {/* TEAM CONTROLS: DELETE BUTTON, NEW TEAM, SAVE LOCAL */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* BOTÓN DE BORRADO DE EQUIPO */}
          {teamToDeleteId === currentTeam.id ? (
            <div className="flex items-center gap-1 p-1 bg-rose-950/90 border border-rose-500 rounded-lg animate-in fade-in duration-100">
              <span className="text-[10px] text-rose-200 font-bold">¿Borrar?</span>
              <button
                type="button"
                className="px-1.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold shadow"
                onClick={() => executeDeleteTeam(currentTeam.id)}
              >
                Sí
              </button>
              <button
                type="button"
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                onClick={() => setTeamToDeleteId(null)}
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-slate-700/80 hover:border-rose-600/80 transition-colors"
              title="Eliminar este equipo"
              onClick={() => setTeamToDeleteId(currentTeam.id)}
            >
              <Trash2 size={15} />
            </button>
          )}

          {/* NUEVO EQUIPO */}
          <button
            type="button"
            className="flex items-center gap-1 py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow"
            title="Crear nuevo equipo"
            onClick={handleCreateNewTeam}
          >
            <Plus size={13} />
            <span className="hidden sm:inline">Nuevo</span>
          </button>

          {/* EXPORTAR EQUIPO A GOOGLE DRIVE */}
          <button
            type="button"
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700/80 transition-colors cursor-pointer"
            title="Exportar equipo a Google Drive"
            onClick={() => setShowExportModal(true)}
          >
            <Upload size={15} />
          </button>
        </div>
      </div>

      {/* 6 SLOTS BAR (Exact format from Screenshot_20261017_104629_PokeType.jpg) */}
      <div className="grid grid-cols-6 gap-1.5 px-1 py-2 bg-slate-950/90 rounded-2xl border border-slate-800">
        {team.map((member, slotIdx) => {
          const dexNum = getPokemonDexNum(member.pokemonId) || getPokemonDexNum(member.nombre);
          const dex = dexNum > 0 ? (dexMap.get(String(dexNum)) || dexMap.get(member.pokemonId.toLowerCase())) : undefined;
          const spriteStyle = (member.pokemonId || dexNum > 0)
            ? getPokemonShowdownSpriteStyle(member.pokemonId || member.nombre || dexNum)
            : {};
          const isFilled = Boolean(member.pokemonId || dexNum > 0);
          const isActive = activeSlot === slotIdx;

          return (
            <button
              key={member.id}
              type="button"
              className="flex flex-col items-center justify-center p-1 rounded-xl transition-all cursor-pointer relative group"
              onClick={() => setActiveSlot(slotIdx)}
            >
              <div className="w-12 h-12 flex items-center justify-center">
                {isFilled && dexNum > 0 ? (
                  <div
                    className="w-10 h-[30px] flex-shrink-0 drop-shadow-md origin-center"
                    style={spriteStyle}
                    title={member.nombre || dex?.nombre || 'Pokémon'}
                  />
                ) : (
                  /* Stylized flame ribbon placeholder matching the screenshot */
                  <div
                    className={`w-9 h-11 flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity ${
                      isActive ? 'opacity-100' : 'opacity-40'
                    }`}
                  >
                    <svg viewBox="0 0 24 32" className="w-6 h-8 text-slate-500 fill-current">
                      <path d="M12 2C8 6 6 10 7 14C8 17 11 18 12 21C13 23 12 26 10 28C14 27 17 23 16 19C15 15 11 13 11 9C11 6 12 3 12 2Z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Blue / Cyan active indicator line below the slot as in screenshot */}
              <div
                className={`h-1 rounded-full transition-all mt-1 ${
                  isActive ? 'w-10 bg-indigo-400 shadow-sm' : 'w-4 bg-transparent'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* SUB-TAB 1: [ EQUIPO ] - The exact view from Screenshot_20261017_104629_PokeType.jpg */}
      {activeTab === 'equipo' && (
        <div className="flex flex-col gap-3">
          <section className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 flex flex-col gap-4 shadow-xl">
          {currentMember.pokemonId && currentDex ? (
            <>
              {/* POKEMON NUMBER, NAME & TYPE HEADER: e.g. "#245 Suicune - Agua" WITH ICON */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                <div
                  className="flex items-center justify-center gap-2.5 cursor-pointer group"
                  onClick={openChangePokemonModal}
                  title="Haz clic para cambiar Pokémon de este Slot"
                >
                  {(() => {
                    const dNum = getPokemonDexNum(currentDex.num) || getPokemonDexNum(currentMember.pokemonId);
                    const sStyle = dNum > 0 ? getPokemonShowdownSpriteStyle(currentMember.pokemonId || currentDex.id || dNum) : {};
                    return dNum > 0 ? (
                      <div className="w-10 h-[30px] flex-shrink-0 drop-shadow-sm origin-center group-hover:scale-110 transition-transform" style={sStyle} />
                    ) : null;
                  })()}
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-wide group-hover:text-emerald-300 transition-colors">
                    #{getPokemonDexNum(currentDex.num)} {currentDex.nombre} - {typeName(currentDex.tipo1)}
                    {currentDex.tipo2 ? ` / ${typeName(currentDex.tipo2)}` : ''}
                  </h3>
                </div>
                <button
                  type="button"
                  className="py-1 px-2.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
                  onClick={openChangePokemonModal}
                >
                  <Search size={13} />
                  <span>Cambiar Pokémon</span>
                </button>
              </div>

              {/* ROW: ARTÍCULO (ITEM) & NATURALEZA (NATURE) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-800/80">
                {/* Artículo */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-300 w-16">Artículo</span>
                  <div className="flex-1 border-b border-slate-600 focus-within:border-emerald-400 pb-0.5">
                    <select
                      className="w-full bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer"
                      value={currentMember.item}
                      onChange={e => updateMember(activeSlot, { item: e.target.value })}
                    >
                      {ITEMS.map(([id, label]) => (
                        <option key={id} value={id} className="bg-slate-900 text-white">
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Naturaleza */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-300 w-20">Naturaleza</span>
                  <div className="flex-1 border-b border-slate-600 focus-within:border-emerald-400 pb-0.5">
                    <select
                      className="w-full bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer"
                      value={currentMember.nature}
                      onChange={e => updateMember(activeSlot, { nature: e.target.value })}
                    >
                      {NATURES.map(([id, label]) => (
                        <option key={id} value={id} className="bg-slate-900 text-white">
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* STAT MATRIX (Exact layout from Screenshot):
                  PS    Atq   Def   EspA  EspD  Vel
                  160   80    120   95    120   90
                  EVs:  0     0     0     0     0     0
                  IVs:  0     0     0     0     0     0 */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/80">
                {/* Stat headers */}
                <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs sm:text-sm">
                  <div className="text-left pl-1 text-slate-400 text-xs font-normal">Stat</div>
                  <div className="text-red-400">PS</div>
                  <div className="text-orange-400">Atq</div>
                  <div className="text-yellow-400">Def</div>
                  <div className="text-blue-400">EspA</div>
                  <div className="text-green-400">EspD</div>
                  <div className="text-pink-400">Vel</div>
                </div>

                {/* Stat Values Row (Calculated live at level 50) */}
                <div className="grid grid-cols-7 gap-1 text-center font-mono font-bold text-xs sm:text-sm text-white">
                  <div className="text-left pl-1 text-[11px] text-slate-400 font-sans font-normal">Niv.50</div>
                  <div>{statsPreview?.hp ?? '—'}</div>
                  <div
                    className={
                      natureDef && natureDef[2] === 'atk'
                        ? 'text-emerald-400'
                        : natureDef && natureDef[3] === 'atk'
                        ? 'text-rose-400'
                        : ''
                    }
                  >
                    {statsPreview?.atk ?? '—'}
                  </div>
                  <div
                    className={
                      natureDef && natureDef[2] === 'def'
                        ? 'text-emerald-400'
                        : natureDef && natureDef[3] === 'def'
                        ? 'text-rose-400'
                        : ''
                    }
                  >
                    {statsPreview?.def ?? '—'}
                  </div>
                  <div
                    className={
                      natureDef && natureDef[2] === 'spa'
                        ? 'text-emerald-400'
                        : natureDef && natureDef[3] === 'spa'
                        ? 'text-rose-400'
                        : ''
                    }
                  >
                    {statsPreview?.spa ?? '—'}
                  </div>
                  <div
                    className={
                      natureDef && natureDef[2] === 'spd'
                        ? 'text-emerald-400'
                        : natureDef && natureDef[3] === 'spd'
                        ? 'text-rose-400'
                        : ''
                    }
                  >
                    {statsPreview?.spd ?? '—'}
                  </div>
                  <div
                    className={
                      natureDef && natureDef[2] === 'spe'
                        ? 'text-emerald-400'
                        : natureDef && natureDef[3] === 'spe'
                        ? 'text-rose-400'
                        : ''
                    }
                  >
                    {statsPreview?.spe ?? '—'}
                  </div>
                </div>

                {/* EVs Row: 0 0 0 0 0 0 */}
                <div className="grid grid-cols-7 gap-1 items-center text-center font-mono text-xs sm:text-sm">
                  <div className="text-left pl-1 text-xs font-bold text-slate-300 font-sans">EVs</div>
                  {STAT_KEYS.map(stat => {
                    const evVal = currentMember.evs[stat] || 0;
                    return (
                      <div key={stat} className="border-b border-slate-600 focus-within:border-emerald-400 pb-0.5">
                        <input
                          type="number"
                          min="0"
                          max="252"
                          className="w-full bg-transparent text-center text-emerald-300 font-bold focus:outline-none"
                          value={evVal === 0 ? '' : evVal}
                          placeholder="0"
                          onChange={e => handleEvChange(stat, e.target.value === '' ? 0 : Number(e.target.value))}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* IVs Row: 31 31 31 31 31 31 */}
                <div className="grid grid-cols-7 gap-1 items-center text-center font-mono text-xs sm:text-sm">
                  <div className="text-left pl-1 text-xs font-bold text-slate-300 font-sans">IVs</div>
                  {STAT_KEYS.map(stat => {
                    const ivVal = currentMember.ivs[stat] ?? 31;
                    return (
                      <div key={stat} className="border-b border-slate-600 focus-within:border-cyan-400 pb-0.5">
                        <input
                          type="number"
                          min="0"
                          max="31"
                          className="w-full bg-transparent text-center text-cyan-300 font-bold focus:outline-none"
                          value={ivVal === 0 ? '' : ivVal}
                          placeholder="0"
                          onChange={e => handleIvChange(stat, e.target.value === '' ? 0 : Number(e.target.value))}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* EV Tracker & Quick Presets */}
                <div className="flex items-center justify-between gap-2 mt-1 text-[11px] text-slate-400 flex-wrap">
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded ${
                      totalEvs > 510 ? 'bg-rose-950 text-rose-300' : 'bg-slate-900 text-slate-300'
                    }`}
                  >
                    Total EVs: {totalEvs} / 510
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {EV_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="py-0.5 px-1.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300"
                        onClick={() => {
                          updateMember(activeSlot, { evs: { ...p.evs } });
                          onToast(`EVs aplicados: ${p.label}`);
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ABILITIES LIST (Exact format from Screenshot):
                  [ Presión ]  Todo movimiento que el rival use contra él...
                  [ Foco Interno ]  El Pokémon nunca retrocederá. */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/80">
                {currentAbilitiesWithDesc.map(ab => {
                  const isSelected = currentMember.ability === ab.id;

                  return (
                    <div
                      key={ab.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 cursor-pointer group"
                      onClick={() => updateMember(activeSlot, { ability: ab.id })}
                    >
                      {/* Left pill */}
                      <div
                        className={`w-32 py-1 px-3 text-xs font-bold rounded-sm text-center transition-all flex-shrink-0 ${
                          isSelected
                            ? 'bg-gradient-to-r from-sky-200 to-sky-300 text-slate-900 shadow'
                            : 'bg-[#252830] text-slate-300 group-hover:bg-slate-800'
                        }`}
                      >
                        {ab.nombre}
                      </div>

                      {/* Right effect description */}
                      <div className="text-xs text-slate-300 leading-snug flex-1">
                        {ab.desc}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ACTION BUTTONS ROW: [ Retirar ] [ Cambiar ] [ Pokédex ] [ Calculadora ] */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  className="py-2.5 px-3 rounded-md font-bold text-xs sm:text-sm bg-[#e2e8f0] hover:bg-white text-slate-900 text-center transition-all shadow active:scale-[0.99]"
                  onClick={() => handleWithdrawSlot(activeSlot)}
                >
                  Retirar
                </button>

                <button
                  type="button"
                  className="py-2.5 px-3 rounded-md font-bold text-xs sm:text-sm bg-indigo-600 hover:bg-indigo-500 text-white text-center transition-all shadow flex items-center justify-center gap-1.5 active:scale-[0.99]"
                  onClick={openChangePokemonModal}
                >
                  <Search size={14} />
                  <span>Cambiar</span>
                </button>

                <button
                  type="button"
                  className="py-2.5 px-3 rounded-md font-bold text-xs sm:text-sm bg-[#e2e8f0] hover:bg-white text-slate-900 text-center transition-all shadow active:scale-[0.99]"
                  onClick={() => setShowPokedexModal(true)}
                >
                  Pokédex
                </button>

                <button
                  type="button"
                  className="py-2.5 px-3 rounded-md font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white text-center transition-all shadow flex items-center justify-center gap-1.5 active:scale-[0.99]"
                  onClick={() => {
                    setCalcModalMove(currentMember.moves[0] || '');
                    setShowSendToCalcModal(true);
                  }}
                >
                  <Swords size={15} />
                  <span>Calculadora</span>
                </button>
              </div>
            </>
          ) : (
            /* EMPTY SLOT INTERFACE */
            <div className="py-10 px-4 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-500">
                <Plus size={28} />
              </div>
              <h4 className="text-sm font-bold text-white">
                Slot #{activeSlot + 1} está vacío
              </h4>
              <p className="text-xs text-slate-400 max-w-sm">
                Selecciona un Pokémon de 1ª a 5ª Generación para asignarlo a este espacio de tu equipo.
              </p>
              {/* CAMPO DE ESCRITURA PARA BÚSQUEDA SOLO POR NOMBRE */}
              <div className="w-full max-w-md mx-auto flex flex-col gap-2 mt-1">
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Escribe el nombre del Pokémon para añadir..."
                    value={emptySlotSearchQuery}
                    onChange={e => setEmptySlotSearchQuery(e.target.value)}
                    className="w-full py-2.5 pl-10 pr-9 text-xs sm:text-sm font-medium bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-xl text-white placeholder-slate-500 focus:outline-none transition-colors shadow-inner"
                  />
                  {emptySlotSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setEmptySlotSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                      title="Borrar texto"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* RESULTADOS DINÁMICOS POR NOMBRE */}
                {emptySlotSearchQuery.trim().length > 0 && (
                  <div className="max-h-60 overflow-y-auto rounded-xl bg-slate-900/95 border border-slate-700/80 p-1 flex flex-col gap-1 text-left shadow-2xl">
                    {(() => {
                      const q = emptySlotSearchQuery.trim().toLowerCase();
                      const matches = rawDexList
                        .filter(p => p.nombre.toLowerCase().includes(q))
                        .slice(0, 15);

                      if (matches.length === 0) {
                        return (
                          <div className="py-4 text-center text-xs text-slate-400">
                            No se encontraron Pokémon con el nombre &quot;{emptySlotSearchQuery}&quot;
                          </div>
                        );
                      }

                      return matches.map(pk => {
                        const dNum = pk.num;
                        const sStyle = dNum > 0 ? getPokemonShowdownSpriteStyle(pk.id || dNum) : {};
                        return (
                          <button
                            key={pk.id}
                            type="button"
                            onClick={() => {
                              handleSelectPokemonForSlot(activeSlot, pk.id);
                              setEmptySlotSearchQuery('');
                            }}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 hover:bg-emerald-950/70 border border-slate-800 hover:border-emerald-600/70 transition-colors text-left group cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-7 flex-shrink-0 flex items-center justify-center" style={sStyle} />
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-white group-hover:text-emerald-300 truncate">
                                  #{dNum} {pk.nombre}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {typeName(pk.tipo1)}{pk.tipo2 ? ` / ${typeName(pk.tipo2)}` : ''} · Gen {pk.generation}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-600/80 group-hover:bg-emerald-500 text-white shrink-0">
                              Añadir
                            </span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* CUADRO DE ESTRATEGIA O NOTAS DEL EQUIPO (SÓLO EN APARTADO EQUIPO) */}
        <section className="bg-slate-950/90 p-3 sm:p-4 rounded-2xl border border-slate-800 flex flex-col gap-2.5 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Brain size={16} className="text-pink-400" />
              <span className="text-xs sm:text-sm font-bold text-white">
                Estrategia o Notas del Equipo
              </span>
            </div>

            <button
              type="button"
              className="icon-button"
              onClick={() => setIsStrategyCollapsed(!isStrategyCollapsed)}
              title={isStrategyCollapsed ? 'Expandir' : 'Colapsar'}
            >
              {isStrategyCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          </div>

          {!isStrategyCollapsed && (
            <div className="flex flex-col gap-2">
              <textarea
                rows={3}
                placeholder="Ej: Quiero un equipo Hyper Offense con Volcarona... o 'Garchomp me causa problemas' o '¿Puede Cloyster ser mi sweeper físico?'..."
                value={currentTeam.strategyNotes || ''}
                onChange={e => updateTeamStrategy(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-colors"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-1">
                <span>
                  Proveedor IA activo:{' '}
                  <strong className="text-violet-300">
                    {AI_PROVIDERS[activeAiProvider]?.name || 'Google Gemini 3'}
                  </strong>{' '}
                  <span className="text-slate-500 font-mono">
                    ({AI_PROVIDERS[activeAiProvider]?.model || 'gemini-3.8-flash'})
                  </span>
                </span>
                <span>
                  {hasConfiguredApiKey ? (
                    <span className="text-emerald-400 font-semibold">Clave API configurada ✓</span>
                  ) : (
                    <span className="text-amber-400">Sin clave API configurada</span>
                  )}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* BOTÓN DE CONSULTAR CON IA SEPARADO AL FINAL DE LA PÁGINA (SÓLO EN APARTADO EQUIPO) */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            disabled={isAiLoading}
            onClick={() => executeAiAnalysis()}
            className="w-full sm:w-auto py-3 px-6 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all cursor-pointer hover:shadow-violet-500/25 active:scale-[0.99]"
          >
            {isAiLoading ? (
              <>
                <Loader2 size={16} className="animate-spin text-pink-200" />
                <span>Analizando equipo con IA...</span>
              </>
            ) : (
              <>
                <Brain size={16} className="text-pink-200" />
                <span>Consultar con IA (Google Gemini 3)</span>
              </>
            )}
          </button>
        </div>
      </div>
    )}

      {/* SUB-TAB 2: [ TIPOS ] - Team Weaknesses, Resistances & Immunities */}
      {activeTab === 'tipos' && (
        <section className="bg-[#121519] p-3 sm:p-5 rounded-2xl border border-slate-800 shadow-xl min-h-[300px] flex flex-col gap-4">
          {/* HEADER CON ALTERNADOR MODO SIMPLE / MODO DETALLADO */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Análisis de Tipos</span>
                <span className="text-xs text-slate-400 font-normal">
                  ({tiposMode === 'simple' ? 'Resumen rápido' : 'Matriz defensiva & cobertura de ataques'})
                </span>
              </h3>
            </div>

            {/* Alternador / Switch de Modo */}
            <div className="inline-flex rounded-xl p-1 bg-slate-900 border border-slate-700/80 self-start sm:self-auto shadow-inner">
              <button
                type="button"
                className={`py-1.5 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  tiposMode === 'simple'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
                onClick={() => setTiposMode('simple')}
              >
                Modo Simple
              </button>
              <button
                type="button"
                className={`py-1.5 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  tiposMode === 'detallado'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
                onClick={() => setTiposMode('detallado')}
              >
                Modo Detallado
              </button>
            </div>
          </div>

          {tiposData.filledMembers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Añade Pokémon a tu equipo en la pestaña <span className="font-bold text-white">Equipo</span> para ver sus debilidades, resistencias y coberturas elementales.
            </div>
          ) : tiposMode === 'simple' ? (
            /* MODO SIMPLE: RESISTENCIAS, DEBILIDADES E INMUNIDADES (3 COLUMNAS) */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 w-full">
              {/* COLUMNA 1: RESISTENTE A: */}
              <div className="flex flex-col">
                <h3 className="text-lg sm:text-2xl font-bold text-white mb-3">
                  Resistente a:
                </h3>
                <div className="flex flex-col gap-[2px]">
                  {tiposData.resistantRows.map(row => (
                    <div key={row.typeId} className="flex items-stretch min-h-[38px] rounded-sm overflow-hidden">
                      <div
                        className="w-12 sm:w-16 shrink-0 flex items-center justify-center text-white text-sm sm:text-base font-normal select-none"
                        style={{ backgroundColor: row.bg }}
                      >
                        {row.abbrev}
                      </div>
                      <div className="flex items-center gap-1.5 flex-1 bg-[#23272d] px-2 overflow-x-auto min-h-[38px]">
                        {row.pokemons.map(p => (
                          <div
                            key={p.memberId}
                            className="w-10 h-[30px] flex items-center justify-center shrink-0"
                            title={p.name}
                          >
                            <span
                              style={getPokemonShowdownSpriteStyle(p.pokemonId || p.dexNum)}
                              className="image-pixelated shrink-0"
                              role="img"
                              aria-label={p.name}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {tiposData.resistantRows.length === 0 && (
                    <div className="text-xs text-slate-500 italic py-2">Ninguna resistencia</div>
                  )}
                </div>
              </div>

              {/* COLUMNA 2: DÉBIL CONTRA: */}
              <div className="flex flex-col">
                <h3 className="text-lg sm:text-2xl font-bold text-white mb-3">
                  Débil contra:
                </h3>
                <div className="flex flex-col gap-[2px]">
                  {tiposData.weakRows.map(row => (
                    <div key={row.typeId} className="flex items-stretch min-h-[38px] rounded-sm overflow-hidden">
                      <div
                        className="w-12 sm:w-16 shrink-0 flex items-center justify-center text-white text-sm sm:text-base font-normal select-none"
                        style={{ backgroundColor: row.bg }}
                      >
                        {row.abbrev}
                      </div>
                      <div className="flex items-center gap-1.5 flex-1 bg-[#23272d] px-2 overflow-x-auto min-h-[38px]">
                        {row.pokemons.map(p => (
                          <div
                            key={p.memberId}
                            className="w-10 h-[30px] flex items-center justify-center shrink-0"
                            title={p.name}
                          >
                            <span
                              style={getPokemonShowdownSpriteStyle(p.pokemonId || p.dexNum)}
                              className="image-pixelated shrink-0"
                              role="img"
                              aria-label={p.name}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {tiposData.weakRows.length === 0 && (
                    <div className="text-xs text-slate-500 italic py-2">Ninguna debilidad</div>
                  )}
                </div>
              </div>

              {/* COLUMNA 3: INMUNE A: (Incluye Levitación de Rotom, tipos, etc.) */}
              <div className="flex flex-col sm:col-span-2 lg:col-span-1">
                <h3 className="text-lg sm:text-2xl font-bold text-white mb-3">
                  Inmune a:
                </h3>
                <div className="flex flex-col gap-[2px]">
                  {tiposData.immuneRows.map(row => (
                    <div key={row.typeId} className="flex items-stretch min-h-[38px] rounded-sm overflow-hidden">
                      <div
                        className="w-12 sm:w-16 shrink-0 flex items-center justify-center text-white text-sm sm:text-base font-normal select-none"
                        style={{ backgroundColor: row.bg }}
                      >
                        {row.abbrev}
                      </div>
                      <div className="flex items-center gap-1.5 flex-1 bg-[#23272d] px-2 overflow-x-auto min-h-[38px]">
                        {row.pokemons.map(p => (
                          <div
                            key={p.memberId}
                            className="w-10 h-[30px] flex items-center justify-center shrink-0"
                            title={`${p.name} (Inmune a ${row.name || row.abbrev})`}
                          >
                            <span
                              style={getPokemonShowdownSpriteStyle(p.pokemonId || p.dexNum)}
                              className="image-pixelated shrink-0"
                              role="img"
                              aria-label={p.name}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {tiposData.immuneRows.length === 0 && (
                    <div className="text-xs text-slate-500 italic py-2">Ninguna inmunidad</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* MODO DETALLADO: MATRIZ DEFENSIVA Y COBERTURA DE MOVIMIENTOS POR TIPO */
            <div className="flex flex-col gap-6">
              {/* 1. MATRIZ DEFENSIVA DE TIPOS DETALLADA */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-emerald-400" />
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                      1. Cobertura Defensiva Detallada (17 Tipos vs Integrantes)
                    </h4>
                  </div>
                  {/* LEYENDA */}
                  <div className="flex items-center gap-1 flex-wrap text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">0× Inmune</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600">¼× Doble Res.</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-200 border border-emerald-600/60">½× Resiste</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">1× Neutro</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-950/90 text-amber-300 border border-amber-600">2× Débil</span>
                    <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500 font-bold">4× Doble Deb.</span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#161a20]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-300">
                        <th className="py-2.5 px-3 font-bold w-28">Tipo Ataque</th>
                        {tiposData.filledMembers.map(m => {
                          const dex = getDexForMember(m);
                          const dexNum = dex?.num || getPokemonDexNum(m.pokemonId) || getPokemonDexNum(m.nombre);
                          const sStyle = dexNum > 0 ? getPokemonShowdownSpriteStyle(m.pokemonId || dexNum) : {};
                          return (
                            <th key={m.id} className="py-2 px-2 text-center font-bold">
                              <div className="flex flex-col items-center justify-center">
                                <div className="w-8 h-6 flex items-center justify-center" style={sStyle} />
                                <span className="text-[11px] text-white truncate max-w-[80px]">
                                  {m.nombre || dex?.nombre || 'Pokémon'}
                                </span>
                              </div>
                            </th>
                          );
                        })}
                        <th className="py-2.5 px-3 text-center font-bold text-slate-400 w-28">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {POKETYPE_ORDER.map(atkTypeId => {
                        const pInfo = POKETYPE_MAP[atkTypeId] || { abbrev: atkTypeId.slice(0, 4), bg: '#555', name: atkTypeId };
                        let weakCount = 0;
                        let resCount = 0;
                        let immuneCount = 0;

                        return (
                          <tr key={atkTypeId} className="hover:bg-slate-850/60 transition-colors">
                            {/* TIPO */}
                            <td className="py-2 px-3 font-semibold text-white">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-10 py-0.5 text-center text-[11px] font-bold rounded text-white shadow-sm"
                                  style={{ backgroundColor: pInfo.bg }}
                                >
                                  {pInfo.abbrev}
                                </span>
                                <span className="text-xs text-slate-300 hidden sm:inline">{pInfo.name}</span>
                              </div>
                            </td>

                            {/* CADA POKÉMON DEL EQUIPO */}
                            {tiposData.filledMembers.map(m => {
                              const dex = getDexForMember(m);
                              const mult = dex
                                ? getDefensiveMultiplier(
                                    dex.tipo1,
                                    dex.tipo2,
                                    atkTypeId,
                                    m.ability,
                                    m.pokemonId || m.nombre,
                                    dex.abilities
                                  )
                                : 1;

                              if (mult === 0) immuneCount++;
                              else if (mult < 1) resCount++;
                              else if (mult > 1) weakCount++;

                              const multLabel =
                                mult === 0
                                  ? '0×'
                                  : mult === 0.25
                                  ? '¼×'
                                  : mult === 0.5
                                  ? '½×'
                                  : mult === 1
                                  ? '1×'
                                  : mult === 2
                                  ? '2×'
                                  : `${mult}×`;

                              const badgeClass =
                                mult === 0
                                  ? 'bg-slate-800 text-slate-400 border-slate-700'
                                  : mult <= 0.25
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500 font-bold'
                                  : mult === 0.5
                                  ? 'bg-emerald-900/60 text-emerald-200 border-emerald-600/60'
                                  : mult === 1
                                  ? 'bg-slate-900/40 text-slate-500 border-transparent'
                                  : mult === 2
                                  ? 'bg-amber-950/80 text-amber-300 border-amber-500/70 font-bold'
                                  : 'bg-rose-950 text-rose-300 border-rose-500 font-black';

                              return (
                                <td key={m.id} className="py-2 px-2 text-center">
                                  <span
                                    className={`inline-block min-w-[34px] py-0.5 px-1.5 rounded text-[11px] border font-mono ${badgeClass}`}
                                  >
                                    {multLabel}
                                  </span>
                                </td>
                              );
                            })}

                            {/* BALANCE */}
                            <td className="py-2 px-3 text-center text-[11px]">
                              <div className="flex items-center justify-center gap-1.5 font-bold">
                                {weakCount > 0 && (
                                  <span className="text-rose-400">-{weakCount}</span>
                                )}
                                {(resCount > 0 || immuneCount > 0) && (
                                  <span className="text-emerald-400">+{resCount + immuneCount}</span>
                                )}
                                {weakCount === 0 && resCount === 0 && immuneCount === 0 && (
                                  <span className="text-slate-500">0</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. COBERTURA DE MOVIMIENTOS POR TIPOS DEL EQUIPO (OFENSIVA) */}
              <div className="flex flex-col gap-3 pt-4 border-t border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Swords size={16} className="text-amber-400" />
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                      2. Cobertura de Movimientos por Tipos del Equipo (Ofensiva)
                    </h4>
                  </div>
                  {(() => {
                    const coveredCount = moveCoverageByDefendingType.filter(r => r.hits.length > 0).length;
                    return (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-200">
                        {coveredCount} de 17 tipos rivales cubiertos con daño supereficaz
                      </span>
                    );
                  })()}
                </div>

                <p className="text-xs text-slate-400">
                  Evalúa si los 4 movimientos ofensivos de tus integrantes golpean con ventaja elemental (daño ×2) a cada tipo defensor en el metagame de PokéMMO:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {moveCoverageByDefendingType.map(row => {
                    const isCovered = row.hits.length > 0;

                    return (
                      <div
                        key={row.typeId}
                        className={`p-2.5 rounded-xl border flex flex-col gap-1.5 ${
                          isCovered
                            ? 'bg-slate-950/70 border-slate-800'
                            : 'bg-rose-950/20 border-rose-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-12 py-0.5 text-center text-xs font-bold rounded text-white shadow"
                              style={{ backgroundColor: row.pInfo.bg }}
                            >
                              {row.pInfo.abbrev}
                            </span>
                            <span className="text-xs font-bold text-white">
                              Contra tipo {row.pInfo.name}
                            </span>
                          </div>

                          {isCovered ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/60">
                              ✓ {row.hits.length} supereficaz{row.hits.length > 1 ? 'es' : ''}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-600/60">
                              ⚠️ Sin cobertura supereficaz
                            </span>
                          )}
                        </div>

                        {/* LISTA DE ATAQUES QUE CUBREN ESTE TIPO */}
                        {isCovered ? (
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            {row.hits.map((hit, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 py-0.5 px-2 rounded-md bg-slate-900 border border-slate-700/80 text-[11px] text-slate-200"
                              >
                                <span className="font-semibold text-white">{hit.memberName}:</span>
                                <span className="text-amber-300 font-medium">{hit.moveName}</span>
                                <span className="text-[9px] text-slate-400 font-mono">({typeName(hit.moveType)} 2×)</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[11px] text-rose-300/80 italic">
                            Ningún Pokémon del equipo tiene un movimiento que golpee supereficaz a tipo {row.pInfo.name}.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* SUB-TAB 3: [ ESTADÍSTICAS ] - Speed Tiers & Team Stats Breakdown */}
      {activeTab === 'estadisticas' && (
        <section className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3 shadow-xl">
          <div className="pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Velocidades (Speed Tiers) y Estadísticas del Equipo
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {team
              .filter(m => m.pokemonId)
              .map(m => {
                const dex = dexMap.get(m.pokemonId.toLowerCase());
                const spe = dex
                  ? calcStat('spe', dex.spe, m.ivs.spe, m.evs.spe, m.level || 50, m.nature)
                  : 0;
                const hp = dex
                  ? calcStat('hp', dex.hp, m.ivs.hp, m.evs.hp, m.level || 50, m.nature)
                  : 0;
                const atk = dex
                  ? calcStat('atk', dex.atk, m.ivs.atk, m.evs.atk, m.level || 50, m.nature)
                  : 0;
                const def = dex
                  ? calcStat('def', dex.def, m.ivs.def, m.evs.def, m.level || 50, m.nature)
                  : 0;
                const spa = dex
                  ? calcStat('spa', dex.spa, m.ivs.spa, m.evs.spa, m.level || 50, m.nature)
                  : 0;
                const spd = dex
                  ? calcStat('spd', dex.spd, m.ivs.spd, m.evs.spd, m.level || 50, m.nature)
                  : 0;

                const spriteStyle = getPokemonShowdownSpriteStyle(m.pokemonId, dex?.num);

                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 flex items-center justify-center" style={spriteStyle} />
                      <div>
                        <div className="text-xs font-bold text-white">{m.nombre}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          HP: {hp} | Atk: {atk} | Def: {def} | SpA: {spa} | SpD: {spd}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-pink-400 font-mono">{spe} Vel</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {/* SUB-TAB 4: [ MOVIMIENTOS ] - Configure 4 moves for active Pokémon */}
      {activeTab === 'movimientos' && (
        <section className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3 shadow-xl">
          {currentMember.pokemonId && currentDex ? (
            <>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Movimientos de {currentMember.nombre} ({currentAllowedMoves.length} disponibles)
                </span>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded bg-slate-800 border-slate-700 text-emerald-500"
                    checked={filterLearnableOnly}
                    onChange={e => setFilterLearnableOnly(e.target.checked)}
                  />
                  <span>Solo aprendibles en Gen 1-5</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[0, 1, 2, 3].map(moveIdx => (
                  <MoveSearchableSelect
                    key={moveIdx}
                    slotNumber={moveIdx + 1}
                    value={currentMember.moves[moveIdx] || ''}
                    availableMoves={currentAllowedMoves}
                    theme={theme}
                    allowClear={true}
                    onChange={(_moveId, moveName) => {
                      const nextMoves = [...currentMember.moves] as [string, string, string, string];
                      nextMoves[moveIdx] = moveName;
                      updateMember(activeSlot, { moves: nextMoves });
                    }}
                    onClear={() => {
                      const nextMoves = [...currentMember.moves] as [string, string, string, string];
                      nextMoves[moveIdx] = '';
                      updateMember(activeSlot, { moves: nextMoves });
                    }}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              Selecciona un Pokémon en la pestaña de Equipo para configurar sus ataques.
            </div>
          )}
        </section>
      )}



      {/* MODAL: POKEMON SELECTION SEARCH (Full-featured dedicated search modal with high visibility) */}
      {showChangePokemonModal && (
        <div
          className="modal-backdrop z-50 fixed inset-0 bg-black/85 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
          onClick={() => setShowChangePokemonModal(false)}
        >
          <div
            className="modal w-full max-w-2xl max-h-[88vh] flex flex-col bg-slate-950 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden my-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/80 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xs">
                  #{activeSlot + 1}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Elegir Pokémon para el Slot #{activeSlot + 1}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {currentMember.pokemonId
                      ? `Reemplazando a ${currentMember.nombre || currentMember.pokemonId}`
                      : 'Asignando nuevo Pokémon al equipo'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowChangePokemonModal(false)}
                aria-label="Cerrar buscador"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sticky Search & Filter Bar */}
            <div className="p-3 border-b border-slate-800 bg-slate-900/40 flex flex-col gap-2.5 flex-shrink-0">
              <div className="relative flex items-center">
                <Search size={16} className="absolute left-3 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  value={builderSearchQuery}
                  onChange={e => setBuilderSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, tipo (#006, Garchomp, Fuego, etc.)..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
                {builderSearchQuery && (
                  <button
                    type="button"
                    className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
                    onClick={() => setBuilderSearchQuery('')}
                    aria-label="Borrar búsqueda"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Quick Filter Chips (Generations & Tiers) */}
              <div className="flex items-center justify-between gap-2 overflow-x-auto text-[11px] font-bold">
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-[10px] uppercase font-mono mr-0.5">Gen:</span>
                  {(['all', 1, 2, 3, 4, 5] as const).map(g => (
                    <button
                      key={String(g)}
                      type="button"
                      className={`px-2 py-0.5 rounded-lg transition-colors whitespace-nowrap ${
                        builderGenFilter === g
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                      }`}
                      onClick={() => setBuilderGenFilter(g)}
                    >
                      {g === 'all' ? 'Todas' : `Gen ${g}`}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-[10px] uppercase font-mono mr-0.5">Tier:</span>
                  {(['all', 'ou', 'uu', 'nu'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      className={`px-2 py-0.5 rounded-lg transition-colors uppercase whitespace-nowrap ${
                        builderTierFilter === t
                          ? 'bg-indigo-600 text-white shadow'
                          : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                      }`}
                      onClick={() => setBuilderTierFilter(t)}
                    >
                      {t === 'all' ? 'Todas' : t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results Count Header */}
            <div className="px-4 py-1.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 flex-shrink-0">
              <span>
                Mostrando <strong>{builderFilteredPokemon.length}</strong> Pokémon disponibles:
              </span>
              {builderSearchQuery && (
                <button
                  type="button"
                  className="text-emerald-400 hover:underline"
                  onClick={() => {
                    setBuilderSearchQuery('');
                    setBuilderGenFilter('all');
                    setBuilderTierFilter('all');
                  }}
                >
                  Restablecer filtros
                </button>
              )}
            </div>

            {/* Scrollable Results List */}
            <div className="overflow-y-auto p-2 sm:p-3 flex flex-col gap-1.5 flex-1 min-h-[300px]">
              {builderFilteredPokemon.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center gap-2">
                  <Search size={24} className="text-slate-600" />
                  <p className="text-sm font-semibold text-slate-300">
                    No se encontró ningún Pokémon para "{builderSearchQuery}".
                  </p>
                  <p className="text-xs text-slate-500">
                    Prueba con otro término de búsqueda o limpia los filtros.
                  </p>
                  <button
                    type="button"
                    className="mt-2 px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-bold text-white hover:bg-slate-700"
                    onClick={() => {
                      setBuilderSearchQuery('');
                      setBuilderGenFilter('all');
                      setBuilderTierFilter('all');
                    }}
                  >
                    Ver todos los Pokémon
                  </button>
                </div>
              ) : (
                builderFilteredPokemon.map(pk => {
                  const dexNum = pk.num;
                  const bst = pk.hp + pk.atk + pk.def + pk.spa + pk.spd + pk.spe;
                  const isCurrent = currentMember.pokemonId.toLowerCase() === pk.id.toLowerCase();

                  return (
                    <button
                      key={pk.id}
                      type="button"
                      className={`flex items-center justify-between p-2 rounded-xl transition-all text-left border ${
                        isCurrent
                          ? 'bg-emerald-950/40 border-emerald-500/80 shadow-sm'
                          : 'bg-slate-900/70 hover:bg-slate-800/90 border-slate-800/80 hover:border-slate-700'
                      } group`}
                      onClick={() => handleSelectPokemonForSlot(activeSlot, pk.id)}
                    >
                      {/* Left: Sprite & Info */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Offline Showdown Sprite Sheet Icon */}
                        <div className="w-10 h-[30px] flex items-center justify-center flex-shrink-0 drop-shadow-sm overflow-hidden">
                          <span
                            style={getPokemonShowdownSpriteStyle(pk)}
                            className="image-pixelated origin-center"
                            role="img"
                            aria-label={pk.nombre}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs text-slate-400 font-semibold">
                              #{String(dexNum).padStart(3, '0')}
                            </span>
                            <span className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                              {pk.nombre}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-600 text-white font-bold">
                                Actual
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <TypeBadge type={pk.tipo1} size="sm" />
                            {pk.tipo2 && <TypeBadge type={pk.tipo2} size="sm" />}
                            <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                              BST: {bst} (Vel {pk.spe})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Select Action */}
                      <div className="flex items-center gap-2 flex-shrink-0 pl-2">
                        <span className="hidden sm:inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 group-hover:bg-emerald-600 text-slate-300 group-hover:text-white transition-colors">
                          Seleccionar
                        </span>
                        <ChevronDown className="sm:hidden text-slate-500 -rotate-90" size={16} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CARGAR EN CALCULADORA (OPCIÓN ATACANTE O DEFENSOR) */}
      {showSendToCalcModal && (
        <div
          className="modal-backdrop z-50 fixed inset-0 bg-black/80 flex items-center justify-center p-3 overflow-y-auto"
          onClick={() => setShowSendToCalcModal(false)}
        >
          <div
            className="modal w-full max-w-md p-4 bg-slate-950 rounded-2xl border border-slate-700 shadow-2xl flex flex-col gap-4 text-xs"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Swords size={16} className="text-emerald-400" />
                <span className="text-sm font-bold text-white">
                  Enviar a la Calculadora
                </span>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowSendToCalcModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-xl border border-slate-800">
              <div className="w-12 h-10 flex items-center justify-center overflow-hidden flex-shrink-0 bg-slate-950 rounded-lg border border-slate-800">
                <span
                  style={getPokemonShowdownSpriteStyle(currentDex?.num || currentMember.pokemonId)}
                  className="image-pixelated scale-90"
                  role="img"
                  aria-label={currentMember.nombre}
                />
              </div>
              <div>
                <div className="text-sm font-bold text-white">{currentMember.nombre}</div>
                <div className="text-[11px] text-slate-400">
                  Nivel {currentMember.level || 50} · Naturaleza {currentMember.nature} · {currentMember.item || 'Sin objeto'}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-300">
                Movimiento principal para el cálculo:
              </label>
              <select
                className="w-full py-2 px-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                value={calcModalMove}
                onChange={e => setCalcModalMove(e.target.value)}
              >
                {currentMember.moves.filter(Boolean).map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
                <option value="">(Sin movimiento predeterminado)</option>
              </select>
            </div>

            <div className="text-slate-300 text-[11px]">
              Elige el rol con el que deseas cargar a <strong>{currentMember.nombre}</strong> en la calculadora de daño:
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                className="py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.98]"
                onClick={() => {
                  const pk = memberToPokemon(currentMember, currentDex);
                  onSendToCalculator(pk, 'attacker', calcModalMove || currentMember.moves[0]);
                  setShowSendToCalcModal(false);
                }}
              >
                <Swords size={16} />
                <span>Como Atacante</span>
              </button>

              <button
                type="button"
                className="py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-cyan-700 hover:bg-cyan-600 text-white flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.98]"
                onClick={() => {
                  const pk = memberToPokemon(currentMember, currentDex);
                  onSendToCalculator(pk, 'defender', calcModalMove || currentMember.moves[0]);
                  setShowSendToCalcModal(false);
                }}
              >
                <Shield size={16} />
                <span>Como Defensor</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FICHA POKÉDEX DEL POKÉMON ACTIVO */}
      {showPokedexModal && currentDex && (
        <div
          className="modal-backdrop z-50 fixed inset-0 bg-black/80 flex items-center justify-center p-3 overflow-y-auto"
          onClick={() => setShowPokedexModal(false)}
        >
          <div
            className="modal w-full max-w-lg max-h-[90vh] flex flex-col p-4 bg-slate-950 rounded-2xl border border-slate-700 shadow-2xl overflow-y-auto text-xs"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <BookOpen size={17} className="text-emerald-400" />
                <span className="text-sm font-bold text-white">
                  Ficha Pokédex #{String(currentDex.num).padStart(3, '0')} · {currentDex.nombre}
                </span>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowPokedexModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            {/* HEADER: SPRITE, TYPES, GEN, BST */}
            <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-12 flex items-center justify-center bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                  <span
                    style={getPokemonShowdownSpriteStyle(currentDex.num)}
                    className="image-pixelated scale-110"
                    role="img"
                    aria-label={currentDex.nombre}
                  />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{currentDex.nombre}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <TypeBadge type={currentDex.tipo1} size="sm" />
                    {currentDex.tipo2 && <TypeBadge type={currentDex.tipo2} size="sm" />}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-emerald-400 font-bold text-sm">
                  BST {currentDex.hp + currentDex.atk + currentDex.def + currentDex.spa + currentDex.spd + currentDex.spe}
                </div>
                <div className="text-[10px] text-slate-400">Gen {currentDex.generation} · Gen 1-5</div>
              </div>
            </div>

            {/* BASE STATS PROGRESS BARS */}
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col gap-2 mb-3">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Estadísticas Base
              </span>
              {[
                { key: 'hp', label: 'PS', val: currentDex.hp, color: 'bg-emerald-500' },
                { key: 'atk', label: 'Ataque', val: currentDex.atk, color: 'bg-amber-500' },
                { key: 'def', label: 'Defensa', val: currentDex.def, color: 'bg-orange-500' },
                { key: 'spa', label: 'Atq. Esp.', val: currentDex.spa, color: 'bg-sky-500' },
                { key: 'spd', label: 'Def. Esp.', val: currentDex.spd, color: 'bg-indigo-500' },
                { key: 'spe', label: 'Velocidad', val: currentDex.spe, color: 'bg-pink-500' },
              ].map(st => {
                const pct = Math.min(100, Math.round((st.val / 200) * 100));
                return (
                  <div key={st.key} className="flex items-center gap-2 text-xs">
                    <span className="w-16 font-semibold text-slate-400 text-[11px]">{st.label}</span>
                    <span className="w-8 font-mono font-bold text-white text-right">{st.val}</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className={`h-full rounded-full ${st.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ABILITIES WITH DESCRIPTIONS */}
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col gap-2 mb-3">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-400" />
                <span>Habilidades Disponibles</span>
              </span>
              <div className="flex flex-col gap-1.5">
                {currentAbilitiesWithDesc.map(ab => (
                  <div key={ab.id} className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
                    <strong className="text-white font-semibold block">{ab.nombre}</strong>
                    <span className="text-slate-400 leading-relaxed">{ab.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* DEFENSIVE MATCHUPS OF THIS POKÉMON */}
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col gap-2 mb-3">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Shield size={13} className="text-emerald-400" />
                <span>Efectividad Defensiva (Gen 1-5)</span>
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {TYPES.map(([typeId, typeLabel]) => {
                  const mult = getDefensiveMultiplier(currentDex.tipo1, currentDex.tipo2, typeId);
                  const isWeak = mult > 1;
                  const isResist = mult < 1 && mult > 0;
                  const isImmune = mult === 0;

                  return (
                    <div
                      key={typeId}
                      className={`flex items-center justify-between p-1.5 rounded-lg border text-[11px] ${
                        isWeak
                          ? 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                          : isImmune
                          ? 'bg-indigo-950/40 border-indigo-800/80 text-cyan-300'
                          : isResist
                          ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400'
                      }`}
                    >
                      <TypeBadge type={typeId} size="sm" />
                      <span className="font-mono font-bold">
                        {mult === 0 ? '0x' : mult === 0.25 ? '¼x' : mult === 0.5 ? '½x' : mult === 2 ? '2x' : mult === 4 ? '4x' : '1x'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                className="py-2 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow"
                onClick={() => {
                  setShowPokedexModal(false);
                  setShowSendToCalcModal(true);
                }}
              >
                <Swords size={14} />
                <span>Enviar a la Calculadora</span>
              </button>

              <button
                type="button"
                className="secondary"
                onClick={() => setShowPokedexModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MIS EQUIPOS GUARDADOS */}
      {showTeamsModal && (
        <div className="modal-backdrop z-50 fixed inset-0 bg-black/80 flex items-center justify-center p-3" onClick={() => setShowTeamsModal(false)}>
          <div className="modal w-full max-w-lg p-4 bg-slate-950 rounded-2xl border border-slate-700 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="modal-head pb-2 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FolderOpen size={18} className="text-amber-400" />
                <span className="modal-title">Mis Equipos en Almacenamiento ({teams.length})</span>
              </div>
              <button type="button" className="icon-button" onClick={() => setShowTeamsModal(false)}>
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-3">
              Administra los equipos guardados en tu dispositivo. Puedes cambiar entre ellos, renombrarlos o eliminarlos.
            </p>

            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
              {teams.map(t => {
                const filledCount = t.members.filter(m => m.pokemonId).length;
                const isCurrent = t.id === currentTeam.id;

                return (
                  <div
                    key={t.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                      isCurrent
                        ? 'bg-emerald-950/50 border-emerald-500 shadow'
                        : 'bg-slate-900/80 border-slate-700/80 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-white truncate">{t.name}</strong>
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-600 text-white">
                            Activo
                          </span>
                        )}
                      </div>

                      {/* Mini sprites of team members */}
                      <div className="flex items-center gap-1.5 mt-2">
                        {t.members.map((m, mIdx) => {
                          const dexNum = getPokemonDexNum(m.pokemonId) || getPokemonDexNum(m.nombre);
                          const spriteStyle = (m.pokemonId || dexNum > 0)
                            ? getPokemonShowdownSpriteStyle(m.pokemonId || m.nombre || dexNum)
                            : {};
                          const hasPokemon = Boolean(dexNum > 0 || m.pokemonId);
                          return (
                            <div
                              key={mIdx}
                              className="w-8 h-8 rounded bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden"
                              title={m.nombre || (dexNum > 0 ? `Pokémon #${dexNum}` : 'Vacío')}
                            >
                              {hasPokemon && dexNum > 0 ? (
                                <div className="scale-75 origin-center flex-shrink-0" style={spriteStyle} />
                              ) : (
                                <span className="text-[9px] text-slate-600">-</span>
                              )}
                            </div>
                          );
                        })}
                        <span className="text-[11px] text-slate-400 font-mono ml-1">({filledCount}/6)</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {teamToDeleteId === t.id ? (
                        <div className="flex items-center gap-1.5 p-1 bg-rose-950/90 border border-rose-500 rounded-lg animate-in fade-in duration-100">
                          <span className="text-[10px] text-rose-200 font-bold">¿Borrar?</span>
                          <button
                            type="button"
                            className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold shadow"
                            onClick={e => {
                              e.stopPropagation();
                              executeDeleteTeam(t.id);
                            }}
                          >
                            Sí
                          </button>
                          <button
                            type="button"
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                            onClick={e => {
                              e.stopPropagation();
                              setTeamToDeleteId(null);
                            }}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          {!isCurrent && (
                            <button
                              type="button"
                              className="py-1 px-3 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow"
                              onClick={() => {
                                setActiveTeamId(t.id);
                                setActiveSlot(0);
                                setShowTeamsModal(false);
                                onToast(`Equipo "${t.name}" cargado.`);
                              }}
                            >
                              Cargar
                            </button>
                          )}

                          {/* BOTÓN DE BORRADO DE EQUIPO */}
                          <button
                            type="button"
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-600 transition-colors"
                            title={`Eliminar equipo "${t.name}"`}
                            onClick={e => {
                              e.stopPropagation();
                              setTeamToDeleteId(t.id);
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-700/60">
              <button
                type="button"
                className="py-2 px-3.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow"
                onClick={() => {
                  handleCreateNewTeam();
                  setShowTeamsModal(false);
                }}
              >
                <Plus size={14} />
                <span>Crear Nuevo Equipo</span>
              </button>

              <button
                type="button"
                className="secondary"
                onClick={() => setShowTeamsModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXPORTAR EQUIPO (Almacenamiento Interno / Google Drive / JSON / Showdown) */}
      {showExportModal && (
        <div
          className="modal-backdrop z-50 fixed inset-0 bg-black/80 flex items-center justify-center p-3 overflow-y-auto"
          onClick={() => setShowExportModal(false)}
        >
          <div
            className="modal w-full max-w-lg p-5 bg-slate-950 rounded-2xl border border-slate-700 shadow-2xl flex flex-col gap-4 text-xs"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Download size={18} className="text-cyan-400" />
                <span className="text-sm font-bold text-white">
                  Exportar Equipo: <span className="text-cyan-300 font-extrabold">{currentTeam.name}</span>
                </span>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowExportModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Team preview mini bar */}
            <div className="flex items-center gap-1.5 p-2 bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto">
              {currentTeam.members.map((m, idx) => {
                const dexNum = getPokemonDexNum(m.pokemonId) || getPokemonDexNum(m.nombre);
                return (
                  <div
                    key={idx}
                    className="flex flex-col items-center justify-center p-1 rounded-lg bg-slate-950 border border-slate-800 min-w-[50px]"
                    title={m.nombre || 'Vacío'}
                  >
                    <div className="w-8 h-6 flex items-center justify-center overflow-hidden">
                      {dexNum > 0 ? (
                        <span
                          style={getPokemonShowdownSpriteStyle(m.pokemonId || m.nombre || dexNum)}
                          className="image-pixelated scale-75 origin-center"
                          role="img"
                          aria-label={m.nombre}
                        />
                      ) : (
                        <span className="text-slate-600 text-[10px]">-</span>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-300 font-bold truncate max-w-[46px] block">
                      {m.nombre || `Slot ${idx + 1}`}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-slate-300">
              Guarda y sincroniza tu equipo directamente en tu cuenta de Google Drive para respaldar e importar en cualquier dispositivo.
            </p>

            <div className="grid grid-cols-1 gap-2.5">
              {/* GOOGLE DRIVE EXPORT */}
              <button
                type="button"
                className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-sky-500 text-left transition-all group cursor-pointer"
                onClick={handleExportToGoogleDrive}
                disabled={isDriveLoading}
              >
                <div className="w-10 h-10 rounded-xl bg-sky-950/80 border border-sky-600/80 flex items-center justify-center text-sky-400 shrink-0 group-hover:scale-105 transition-transform">
                  {isDriveLoading ? <Loader2 size={20} className="animate-spin" /> : <Cloud size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-sky-300 flex items-center gap-1.5">
                    <span>Exportar a Google Drive</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-600/30 text-sky-300 font-normal">
                      {googleUser ? 'Sincronizar' : 'Conectar'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {googleUser
                      ? `Sube y sincroniza directamente a tu cuenta (${googleUser.email}).`
                      : 'Guarda y sincroniza el equipo en tu Google Drive para respaldar y compartir.'}
                  </div>
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                className="secondary"
                onClick={() => setShowExportModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IMPORTAR EQUIPO (GOOGLE DRIVE O ALMACENAMIENTO LOCAL) */}
      {showImportModal && (
        <div
          className="modal-backdrop z-50 fixed inset-0 bg-black/80 flex items-center justify-center p-3 overflow-y-auto"
          onClick={() => setShowImportModal(false)}
        >
          <div
            className="modal w-full max-w-lg p-5 bg-slate-950 rounded-2xl border border-slate-700 shadow-2xl flex flex-col gap-4 text-xs"
            onClick={e => e.stopPropagation()}
          >
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Download size={18} className="text-emerald-400" />
                <span className="text-sm font-bold text-white">
                  Importar e Implementar Equipo
                </span>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowImportModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            {/* GOOGLE DRIVE IMPORT SECTION */}
            <div className="flex flex-col gap-3">
              {!googleUser || !driveToken ? (
                <div className="flex flex-col items-center justify-center p-6 text-center gap-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <Cloud size={32} className="text-sky-400" />
                  <div>
                    <div className="text-xs font-bold text-white">Conecta tu cuenta de Google Drive</div>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                      Inicia sesión con Google para sincronizar e importar tus equipos guardados en la nube.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="gsi-material-button mt-1"
                    onClick={handleConnectGoogleDrive}
                    disabled={isDriveLoading}
                  >
                    <div className="gsi-material-button-state"></div>
                    <div className="gsi-material-button-content-wrapper">
                      <div className="gsi-material-button-icon">
                        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        </svg>
                      </div>
                      <span className="gsi-material-button-contents">Sign in with Google</span>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {/* User bar */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-sky-950/40 border border-sky-800/40 text-xs text-sky-200">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Cloud size={14} className="text-sky-400 shrink-0" />
                      <span className="truncate font-semibold">{googleUser.email || 'Conectado a Google Drive'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white transition-colors cursor-pointer"
                        title="Actualizar lista de archivos"
                        onClick={() => refreshDriveFiles()}
                        disabled={isDriveLoading}
                      >
                        <RotateCcw size={13} className={isDriveLoading ? 'animate-spin' : ''} />
                      </button>
                      <button
                        type="button"
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 cursor-pointer"
                        onClick={handleDisconnectGoogleDrive}
                      >
                        Cerrar sesión
                      </button>
                    </div>
                  </div>

                  {/* Files list */}
                  {isDriveLoading ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Loader2 size={24} className="animate-spin text-sky-400" />
                      <span className="text-xs">Consultando tus equipos en Google Drive...</span>
                    </div>
                  ) : driveFiles.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col items-center gap-2">
                      <Cloud size={28} className="text-slate-500" />
                      <p className="text-xs font-semibold text-white">No hay equipos en Google Drive</p>
                      <p className="text-[11px] text-slate-400 max-w-xs">
                        Exporta tu equipo actual usando el botón de exportar (flecha hacia arriba) y seleccionando Google Drive.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                      {driveFiles.map(file => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-900/90 border border-slate-700 hover:border-sky-500 transition-colors gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileSpreadsheet size={16} className="text-sky-400 shrink-0" />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate">
                                {file.name.replace(/\.poketeam\.json$/, '')}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {new Date(file.modifiedTime).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              className="py-1 px-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1 shadow cursor-pointer"
                              onClick={() => handleImportFromDrive(file)}
                              disabled={isDriveLoading}
                            >
                              <Download size={12} />
                              <span>Importar</span>
                            </button>
                            <button
                              type="button"
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/60 transition-colors cursor-pointer"
                              title="Eliminar de Google Drive"
                              onClick={() => setDriveFileToDelete(file)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* O PEGAR TEXTO SHOWDOWN DIRECTAMENTE */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-300">
                  O pega texto del equipo (Showdown):
                </label>
                <textarea
                  rows={3}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs focus:outline-none focus:border-sky-500"
                  placeholder={`Rotom-Wash @ Leftovers\nAbility: Levitate\nEVs: 252 HP / 252 Def / 4 SpD\nBold Nature\n- Volt Switch\n- Hydro Pump\n- Will-O-Wisp\n- Pain Split`}
                  value={importPasteText}
                  onChange={e => setImportPasteText(e.target.value)}
                />
                <button
                  type="button"
                  disabled={!importPasteText.trim()}
                  className={`py-2 px-4 rounded-xl font-bold text-xs shadow flex items-center justify-center gap-2 transition-all ${
                    importPasteText.trim()
                      ? 'bg-sky-600 hover:bg-sky-500 text-white cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                  onClick={() => {
                    handleImportContent(importPasteText, 'Equipo Pegado');
                    setImportPasteText('');
                    setShowImportModal(false);
                  }}
                >
                  <Check size={14} />
                  <span>Implementar Equipo Pegado</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                className="secondary"
                onClick={() => setShowImportModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMACIÓN DE ELIMINACIÓN DE GOOGLE DRIVE (OBLIGATORIA POR PROTOCOLO WORKSPACE) */}
      {driveFileToDelete && (
        <div
          className="modal-backdrop z-50 fixed inset-0 bg-black/85 flex items-center justify-center p-3"
          onClick={() => setDriveFileToDelete(null)}
        >
          <div
            className="modal w-full max-w-sm p-4 bg-slate-950 rounded-2xl border border-rose-500/60 shadow-2xl flex flex-col gap-3 text-xs"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
              <AlertCircle size={18} />
              <span>¿Eliminar de Google Drive?</span>
            </div>
            <p className="text-xs text-slate-300">
              ¿Estás seguro de que deseas eliminar permanentemente el archivo <strong className="text-white">{driveFileToDelete.name}</strong> de tu Google Drive?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                className="secondary"
                onClick={() => setDriveFileToDelete(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold"
                onClick={handleConfirmDeleteDriveFile}
                disabled={isDriveLoading}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ANÁLISIS ESTRATÉGICO CON ASISTENTE IA */}
      {showAiModal && (
        <div
          className="modal-backdrop z-50 fixed inset-0 bg-black/85 flex items-center justify-center p-3 overflow-y-auto"
          onClick={() => setShowAiModal(false)}
        >
          <div
            className="modal w-full max-w-2xl max-h-[90vh] bg-slate-950 rounded-2xl border border-violet-500/50 shadow-2xl flex flex-col overflow-hidden text-xs"
            onClick={e => e.stopPropagation()}
          >
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-violet-900/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-pink-600 flex items-center justify-center text-white shadow">
                  <Brain size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>
                      Estrategia PokeMMO · {AI_PROVIDERS[activeAiProvider]?.name || 'IA Asistente'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-violet-600/30 text-violet-300 font-mono">
                      {AI_PROVIDERS[activeAiProvider]?.model || 'Gens 1-5'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Equipo: <strong className="text-white">{currentTeam.name}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="icon-button text-slate-400 hover:text-white"
                onClick={() => setShowAiModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-3">
              {/* ESTRATEGIA ORIGINAL DEL USUARIO */}
              {currentTeam.strategyNotes && (
                <div className="p-2.5 rounded-xl bg-violet-950/20 border border-violet-700/40 text-xs">
                  <div className="flex items-center gap-1.5 text-violet-300 font-bold mb-0.5">
                    <MessageSquare size={12} />
                    <span>Tu Estrategia Planteada:</span>
                  </div>
                  <p className="text-slate-300 italic pl-1">
                    "{currentTeam.strategyNotes}"
                  </p>
                </div>
              )}

              {/* LOADING STATE */}
              {isAiLoading && (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                  <div className="relative flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full border-4 border-violet-500/20 border-t-pink-500 animate-spin" />
                    <Brain size={22} className="absolute text-pink-400 animate-pulse" />
                  </div>
                  <div className="text-sm font-bold text-white">
                    Consultando a {AI_PROVIDERS[activeAiProvider]?.name || 'IA Asistente'} (
                    {AI_PROVIDERS[activeAiProvider]?.model})...
                  </div>
                  <div className="text-xs text-slate-400 max-w-sm">
                    Evaluando sinergias de tipos, coberturas defensivas, amenazas del meta de PokeMMO y optimizaciones de EVs.
                  </div>
                </div>
              )}

              {/* ERROR STATE */}
              {!isAiLoading && aiError && (
                <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/50 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 text-rose-300 font-bold">
                    <AlertCircle size={16} />
                    <span>
                      Error al generar análisis con {AI_PROVIDERS[activeAiProvider]?.name || 'la IA'}
                    </span>
                  </div>
                  <p className="text-xs text-rose-200 leading-relaxed font-mono">
                    {aiError}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => executeAiAnalysis()}
                      className="py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
                    >
                      Reintentar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAiModal(false);
                        setPromptProvider(activeAiProvider);
                        setShowApiKeyPrompt(true);
                      }}
                      className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 cursor-pointer"
                    >
                      Cambiar Proveedor / Clave API
                    </button>
                  </div>
                </div>
              )}

              {/* SUCCESS RESULT: RICH MARKDOWN RENDER */}
              {!isAiLoading && !aiError && aiAnalysisResult && (
                <div className="flex flex-col gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                    <MarkdownContent content={aiAnalysisResult} />
                  </div>
                </div>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="flex items-center justify-between p-3.5 bg-slate-900 border-t border-slate-800 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {!isAiLoading && aiAnalysisResult && (
                  <button
                    type="button"
                    className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
                    onClick={() => {
                      navigator.clipboard.writeText(aiAnalysisResult).then(
                        () => onToast('Análisis copiado al portapapeles.'),
                        () => onToast('Error al copiar texto.')
                      );
                    }}
                  >
                    <Copy size={13} />
                    <span>Copiar Análisis</span>
                  </button>
                )}

                {!isAiLoading && aiAnalysisResult && (
                  <button
                    type="button"
                    className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 border border-violet-500/40 text-xs font-semibold transition-colors cursor-pointer"
                    onClick={() => executeAiAnalysis()}
                  >
                    <RotateCcw size={13} />
                    <span>Reanalizar</span>
                  </button>
                )}

                <button
                  type="button"
                  className="flex items-center gap-1 py-1.5 px-2.5 rounded-lg text-slate-400 hover:text-slate-200 text-[11px] font-medium"
                  onClick={() => {
                    setShowAiModal(false);
                    setPromptProvider(activeAiProvider);
                    setShowApiKeyPrompt(true);
                  }}
                  title="Configurar clave propia de Google Gemini u OpenAI"
                >
                  <Key size={12} />
                  <span>Clave Cloud (Opcional)</span>
                </button>
              </div>

              <button
                type="button"
                className="secondary"
                onClick={() => setShowAiModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PROMPT CLAVE API SI NO ESTÁ CONFIGURADA */}
      {showApiKeyPrompt && (
        <div
          className="modal-backdrop z-50 fixed inset-0 bg-black/85 flex items-center justify-center p-3 overflow-y-auto"
          onClick={() => setShowApiKeyPrompt(false)}
        >
          <div
            className="modal w-full max-w-md p-5 bg-slate-950 rounded-2xl border border-violet-500/60 shadow-2xl flex flex-col gap-4 text-xs"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Brain size={18} className="text-pink-400" />
                <span className="text-sm font-bold text-white">
                  Configurar Proveedor de IA y Clave API
                </span>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowApiKeyPrompt(false)}
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Elige tu proveedor de inteligencia artificial e ingresa tu clave API para analizar
              estrategias y sinergias de PokeMMO.
            </p>

            {/* PROVIDER SELECTOR */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-white">
                Selecciona Proveedor de IA:
              </label>
              <select
                value={promptProvider}
                onChange={e => setPromptProvider(e.target.value as AiProvider)}
                className="w-full py-2 px-3 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-medium focus:outline-none focus:border-violet-500"
              >
                <option value="gemini">Google Gemini (gemini-1.5-flash)</option>
                <option value="openai">OpenAI ChatGPT (gpt-4o-mini)</option>
                <option value="groq">Groq (llama-3.3-70b-versatile)</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Key size={13} className="text-violet-400" />
                <span>Pega tu API Key de {AI_PROVIDERS[promptProvider]?.name}:</span>
              </label>

              <input
                type="password"
                value={promptApiKeyInput}
                onChange={e => setPromptApiKeyInput(e.target.value)}
                placeholder={AI_PROVIDERS[promptProvider]?.placeholder || 'Pega tu clave aquí...'}
                className="w-full py-2 px-3 text-xs font-mono bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>

            <button
              type="button"
              disabled={!promptApiKeyInput.trim()}
              className="py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white shadow flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              onClick={() => {
                const key = promptApiKeyInput.trim();
                if (key) {
                  try {
                    localStorage.setItem(STORAGE_SELECTED_PROVIDER, promptProvider);
                    localStorage.setItem(STORAGE_API_KEY, key);
                    if (promptProvider === 'gemini') {
                      localStorage.setItem('gemini_api_key', key);
                    }
                    setActiveAiProvider(promptProvider);
                    setHasConfiguredApiKey(true);
                    window.dispatchEvent(new Event('storage'));
                    onToast(`Clave de ${AI_PROVIDERS[promptProvider]?.name} guardada.`);
                    setShowApiKeyPrompt(false);
                    // Trigger analysis directly
                    executeAiAnalysis(key, promptProvider);
                  } catch {
                    onToast('Error al guardar clave en almacenamiento local.');
                  }
                }
              }}
            >
              <Brain size={14} />
              <span>Guardar y Consultar con AI</span>
            </button>

            {/* DYNAMIC HELP LINK */}
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-violet-950/40 border border-violet-800/40 text-violet-200">
              <span className="text-[11px]">¿No tienes clave? Puedes obtenerla aquí:</span>
              <a
                href={AI_PROVIDERS[promptProvider]?.apiKeyHelpUrl || 'https://aistudio.google.com/app/apikey'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 py-1 px-2.5 rounded bg-violet-700/80 hover:bg-violet-700 text-white font-bold text-[11px] shrink-0"
              >
                <span>Obtener Clave</span>
                <ExternalLink size={11} />
              </a>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                className="secondary"
                onClick={() => setShowApiKeyPrompt(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// MARKDOWN CONTENT RENDERER FOR GEMINI ANALYSIS
const MarkdownContent: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');

  return (
    <div className="flex flex-col gap-2.5 text-xs text-slate-200 leading-relaxed font-sans">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // H1
        if (trimmed.startsWith('# ')) {
          return (
            <h1
              key={idx}
              className="text-base sm:text-lg font-bold text-white border-b border-violet-500/40 pb-1 mt-2 flex items-center gap-2"
            >
              <span className="text-violet-400">#</span>
              <span>{renderFormattedInline(trimmed.slice(2))}</span>
            </h1>
          );
        }

        // H2
        if (trimmed.startsWith('## ')) {
          return (
            <h2
              key={idx}
              className="text-sm sm:text-base font-bold text-violet-200 border-b border-slate-700/60 pb-1 mt-2.5 flex items-center gap-2"
            >
              <span>{renderFormattedInline(trimmed.slice(3))}</span>
            </h2>
          );
        }

        // H3
        if (trimmed.startsWith('### ')) {
          return (
            <h3
              key={idx}
              className="text-xs sm:text-sm font-bold text-emerald-300 mt-2 flex items-center gap-1.5"
            >
              <span>{renderFormattedInline(trimmed.slice(4))}</span>
            </h3>
          );
        }

        // Horizontal Rule
        if (trimmed === '---' || trimmed === '***') {
          return <hr key={idx} className="border-t border-slate-700/60 my-2" />;
        }

        // Blockquote
        if (trimmed.startsWith('> ')) {
          return (
            <div
              key={idx}
              className="pl-3 py-1 border-l-2 border-violet-500 bg-violet-950/20 rounded-r text-violet-200 italic my-1"
            >
              {renderFormattedInline(trimmed.slice(2))}
            </div>
          );
        }

        // Bullet point
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-violet-400 mt-1 flex-shrink-0">•</span>
              <span className="flex-1">{renderFormattedInline(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Numbered list (e.g. "1. ")
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-indigo-400 font-bold flex-shrink-0">{numMatch[1]}.</span>
              <span className="flex-1">{renderFormattedInline(numMatch[2])}</span>
            </div>
          );
        }

        // Regular paragraph
        return (
          <p key={idx} className="text-slate-300">
            {renderFormattedInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

// Helper for bold and inline code spans
function renderFormattedInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-violet-300 font-mono text-[11px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

