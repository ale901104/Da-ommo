import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Download,
  Edit2,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Plus,
  RotateCcw,
  Save,
  Search,
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
}

interface TeamBuilderViewProps {
  pokemonList: Pokemon[];
  equipoOU: Pokemon[];
  equipoUU: Pokemon[];
  equipoNU: Pokemon[];
  allMoves?: Move[];
  onSendToCalculator: (pokemon: Pokemon, role: 'attacker' | 'defender', moveId?: string) => void;
  onToast: (msg: string) => void;
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

function createDefaultTeam(name = 'Equipo 1'): SavedTeam {
  return {
    id: `team-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    updatedAt: Date.now(),
    members: Array.from({ length: 6 }, (_, i) => createEmptyMember(i)),
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

function getDefensiveMultiplier(defType1: string, defType2: string | undefined, atkType: string): number {
  const m1 = TYPE_CHART[atkType]?.[defType1] ?? 1;
  const m2 = defType2 ? (TYPE_CHART[atkType]?.[defType2] ?? 1) : 1;
  return m1 * m2;
}

export const TeamBuilderView: React.FC<TeamBuilderViewProps> = ({
  pokemonList,
  equipoOU,
  equipoUU,
  equipoNU,
  allMoves = allGen1To5Moves,
  onSendToCalculator,
  onToast,
}) => {
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
  const [teamToDeleteId, setTeamToDeleteId] = useState<string | null>(null);

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

  // Download team file .json
  const handleDownloadTeamFile = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentTeam, null, 2));
      const downloadAnchor = document.createElement('a');
      const safeName = currentTeam.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `${safeName || 'equipo'}.poketeam.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      onToast(`Archivo del equipo descargado.`);
    } catch {
      onToast('Error al descargar el archivo del equipo.');
    }
  };

  // Import team file .json
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed && Array.isArray(parsed.members) && parsed.members.length === 6) {
          const importedTeam: SavedTeam = {
            id: `team-${Date.now()}`,
            name: parsed.name || `Importado (${file.name.replace('.json', '')})`,
            updatedAt: Date.now(),
            members: parsed.members,
          };
          setTeams(prev => [...prev, importedTeam]);
          setActiveTeamId(importedTeam.id);
          onToast(`Equipo "${importedTeam.name}" importado con éxito.`);
        } else {
          onToast('El archivo no tiene el formato válido de equipo de 6 Pokémon.');
        }
      } catch {
        onToast('Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
    <div className="flex flex-col gap-2 relative text-slate-100">
      {/* HIDDEN FILE INPUT FOR IMPORTING FROM PHONE STORAGE */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json,application/json"
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
              className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-slate-900 border-b-2 border-slate-600 hover:border-emerald-400 text-xs font-bold text-slate-200 transition-colors truncate"
              onClick={() => setShowTeamsModal(true)}
              title="Cambiar de equipo o ver mis equipos guardados"
            >
              <span className="truncate">{currentTeam.name}</span>
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

          {/* GUARDAR EN TELÉFONO */}
          <button
            type="button"
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-700/80 transition-colors"
            title="Guardar equipo en almacenamiento del teléfono"
            onClick={handleSaveTeamLocal}
          >
            <Save size={15} />
          </button>

          {/* DESCARGAR JSON */}
          <button
            type="button"
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700/80 transition-colors"
            title="Descargar archivo .json a descargas"
            onClick={handleDownloadTeamFile}
          >
            <Download size={15} />
          </button>

          {/* CARGAR ARCHIVO */}
          <button
            type="button"
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition-colors"
            title="Cargar archivo .json desde tu dispositivo"
            onClick={() => fileInputRef.current?.click()}
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
          const spriteStyle = dexNum > 0 ? getPokemonShowdownSpriteStyle(dexNum) : {};
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
        <section className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 flex flex-col gap-4 shadow-xl">
          {currentMember.pokemonId && currentDex ? (
            <>
              {/* POKEMON NUMBER, NAME & TYPE HEADER: e.g. "#245 Suicune - Agua" WITH ICON */}
              <div className="flex items-center justify-center gap-2.5">
                {(() => {
                  const dNum = getPokemonDexNum(currentDex.num) || getPokemonDexNum(currentMember.pokemonId);
                  const sStyle = dNum > 0 ? getPokemonShowdownSpriteStyle(dNum) : {};
                  return dNum > 0 ? (
                    <div className="w-10 h-[30px] flex-shrink-0 drop-shadow-sm origin-center" style={sStyle} />
                  ) : null;
                })()}
                <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  #{getPokemonDexNum(currentDex.num)} {currentDex.nombre} - {typeName(currentDex.tipo1)}
                  {currentDex.tipo2 ? ` / ${typeName(currentDex.tipo2)}` : ''}
                </h3>
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

              {/* ACTION BUTTONS ROW: [ Retirar ] [ Pokédex ] (Exact format from Screenshot) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  className="py-2.5 px-4 rounded-md font-bold text-xs sm:text-sm bg-[#e2e8f0] hover:bg-white text-slate-900 text-center transition-all shadow active:scale-[0.99]"
                  onClick={() => handleWithdrawSlot(activeSlot)}
                >
                  Retirar
                </button>

                <button
                  type="button"
                  className="py-2.5 px-4 rounded-md font-bold text-xs sm:text-sm bg-[#e2e8f0] hover:bg-white text-slate-900 text-center transition-all shadow active:scale-[0.99]"
                  onClick={() => setShowChangePokemonModal(true)}
                >
                  Pokédex
                </button>

                <button
                  type="button"
                  className="col-span-2 sm:col-span-1 py-2.5 px-4 rounded-md font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white text-center transition-all shadow flex items-center justify-center gap-1.5 active:scale-[0.99]"
                  onClick={() => {
                    const pk = memberToPokemon(currentMember, currentDex);
                    onSendToCalculator(pk, 'attacker', currentMember.moves[0]);
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
              <button
                type="button"
                className="py-2 px-5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md flex items-center gap-2"
                onClick={() => setShowChangePokemonModal(true)}
              >
                <Search size={14} />
                <span>Buscar y añadir Pokémon</span>
              </button>
            </div>
          )}
        </section>
      )}

      {/* SUB-TAB 2: [ TIPOS ] - Team Defensive Synergy & Weakness Matrix */}
      {activeTab === 'tipos' && (
        <section className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Cobertura Defensiva del Equipo (17 Tipos)
            </span>
            <span className="text-[11px] text-slate-400">
              {team.filter(m => m.pokemonId).length} / 6 Pokémon en equipo
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {TYPES.map(([atkTypeId, atkTypeLabel]) => {
              const members = team.filter(m => m.pokemonId);
              let weakCount = 0;
              let resistCount = 0;
              let immuneCount = 0;

              for (const m of members) {
                const dex = dexMap.get(m.pokemonId.toLowerCase());
                if (dex) {
                  const mult = getDefensiveMultiplier(dex.tipo1, dex.tipo2, atkTypeId);
                  if (mult > 1) weakCount++;
                  else if (mult === 0) immuneCount++;
                  else if (mult < 1) resistCount++;
                }
              }

              const typeColor = TYPE_COLORS[atkTypeId] || { bg: '#444', text: '#fff' };

              return (
                <div
                  key={atkTypeId}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded text-[11px] font-bold text-white"
                      style={{ backgroundColor: typeColor.bg }}
                    >
                      {atkTypeLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span
                      className={`font-bold ${
                        weakCount >= 3 ? 'text-rose-400' : weakCount > 0 ? 'text-amber-300' : 'text-slate-500'
                      }`}
                      title="Débiles"
                    >
                      {weakCount} Déb.
                    </span>
                    <span
                      className={`font-bold ${resistCount > 0 ? 'text-emerald-400' : 'text-slate-500'}`}
                      title="Resistencias"
                    >
                      {resistCount} Res.
                    </span>
                    <span
                      className={`font-bold ${immuneCount > 0 ? 'text-indigo-400' : 'text-slate-500'}`}
                      title="Inmunidades"
                    >
                      {immuneCount} Inm.
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
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
                  <div key={moveIdx} className="flex flex-col gap-1 p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <label className="text-[11px] font-bold text-slate-300">
                      Movimiento #{moveIdx + 1}:
                    </label>
                    <select
                      className="w-full py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                      value={currentMember.moves[moveIdx] || ''}
                      onChange={e => {
                        const nextMoves = [...currentMember.moves] as [string, string, string, string];
                        nextMoves[moveIdx] = e.target.value;
                        updateMember(activeSlot, { moves: nextMoves });
                      }}
                    >
                      <option value="">(Sin movimiento)</option>
                      {currentAllowedMoves.map(mv => (
                        <option key={mv.id} value={mv.nombre}>
                          {mv.nombre} · {typeName(mv.tipo)} ({mv.categoria === 'physical' ? 'Físico' : mv.categoria === 'special' ? 'Especial' : 'Estado'} · {mv.categoria === 'status' ? '—' : mv.poder} P)
                        </option>
                      ))}
                    </select>
                  </div>
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

      {/* MODAL: POKEMON SELECTION SEARCH (When clicking Pokédex or Add) */}
      {showChangePokemonModal && (
        <div className="modal-backdrop z-50 fixed inset-0 bg-black/80 flex items-center justify-center p-3" onClick={() => setShowChangePokemonModal(false)}>
          <div className="modal w-full max-w-md max-h-[85vh] flex flex-col p-4 bg-slate-950 rounded-2xl border border-slate-700 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
              <span className="text-sm font-bold text-white">
                Elegir Pokémon para el Slot #{activeSlot + 1}
              </span>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowChangePokemonModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <PokemonSearchableSelect
              id="builder-modal-pk-search"
              value={currentMember.pokemonId}
              onChange={pId => handleSelectPokemonForSlot(activeSlot, pId)}
              pokemonList={pokemonList}
              equipoOU={equipoOU}
              equipoUU={equipoUU}
              equipoNU={equipoNU}
              placeholder="Buscar por nombre o # Pokédex..."
            />
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
                          const spriteStyle = dexNum > 0 ? getPokemonShowdownSpriteStyle(dexNum) : {};
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
    </div>
  );
};
