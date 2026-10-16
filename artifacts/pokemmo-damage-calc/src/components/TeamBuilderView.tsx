import React, { useEffect, useMemo, useState } from 'react';
import {
  Copy,
  Download,
  FileText,
  FlaskConical,
  Plus,
  RotateCcw,
  Shield,
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
  type Pokemon,
  type StatKey,
  type StatValues,
  TypeBadge,
  typeName,
  getPokemonAbilities,
  getPokemonMoves,
} from '../pokemon-constants';
import { rawDexList } from '../dex';
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

interface TeamBuilderViewProps {
  pokemonList: Pokemon[];
  equipoOU: Pokemon[];
  equipoUU: Pokemon[];
  equipoNU: Pokemon[];
  onSendToCalculator: (pokemon: Pokemon, role: 'attacker' | 'defender', moveId?: string) => void;
  onToast: (msg: string) => void;
}

const STORAGE_TEAM_KEY = 'pokemmo-builder-team-v1';

const DEFAULT_EVS: StatValues = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
const DEFAULT_IVS: StatValues = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };

// Common competitive PvP presets
const EV_PRESETS: { label: string; evs: StatValues }[] = [
  { label: '252 Atk / 252 Spe', evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 } },
  { label: '252 SpA / 252 Spe', evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 } },
  { label: '252 HP / 252 Def', evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 } },
  { label: '252 HP / 252 SpD', evs: { hp: 252, atk: 0, def: 4, spa: 0, spd: 252, spe: 0 } },
  { label: '252 HP / 252 Atk', evs: { hp: 252, atk: 252, def: 4, spa: 0, spd: 0, spe: 0 } },
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
    item: 'life-orb',
    ability: 'none',
    nature: 'adamant',
    moves: ['', '', '', ''],
    evs: { ...DEFAULT_EVS },
    ivs: { ...DEFAULT_IVS },
    level: 50,
  };
}

// Convert BuilderMember to Pokemon object for calculator
function memberToPokemon(member: BuilderMember, dexData: (typeof rawDexList)[0] | undefined): Pokemon {
  const hp = dexData?.hp ?? 80;
  const atk = dexData?.atk ?? 100;
  const def = dexData?.def ?? 80;
  const spa = dexData?.spa ?? 80;
  const spd = dexData?.spd ?? 80;
  const spe = dexData?.spe ?? 80;

  return {
    id: member.pokemonId,
    nombre: member.nombre || dexData?.nombre || 'Pokémon',
    tipo1: dexData?.tipo1 || 'normal',
    tipo2: dexData?.tipo2,
    base: { hp, atk, def, spa, spd, spe },
    ev: { ...member.evs },
    iv: { ...member.ivs },
    nature: member.nature,
    item: member.item,
    tier: 'ou',
    num: dexData?.num,
  };
}

export const TeamBuilderView: React.FC<TeamBuilderViewProps> = ({
  pokemonList,
  equipoOU,
  equipoUU,
  equipoNU,
  onSendToCalculator,
  onToast,
}) => {
  // 6 slots
  const [team, setTeam] = useState<BuilderMember[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TEAM_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 6) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    // Seed with empty 6 slots
    return Array.from({ length: 6 }, (_, i) => createEmptyMember(i));
  });

  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');

  // Persist team to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TEAM_KEY, JSON.stringify(team));
    } catch {
      // ignore
    }
  }, [team]);

  // Combined pokedex map for quick lookup
  const dexMap = useMemo(() => {
    const map = new Map<string, (typeof rawDexList)[0]>();
    for (const d of rawDexList) {
      map.set(d.id.toLowerCase(), d);
      map.set(d.nombre.toLowerCase(), d);
    }
    return map;
  }, []);

  const currentMember = team[activeSlot] || team[0];
  const currentDex = currentMember.pokemonId
    ? dexMap.get(currentMember.pokemonId.toLowerCase()) || dexMap.get(currentMember.nombre.toLowerCase())
    : undefined;

  // Available abilities for current pokemon
  const currentAbilities = useMemo(() => {
    if (!currentDex) return [['none', 'Ninguna'] as [string, string]];
    const abs = currentDex.abilities || [];
    return abs.map(a => [a.toLowerCase().replace(/[^a-z0-9]/g, '-'), a] as [string, string]);
  }, [currentDex]);

  // Available moves for current pokemon
  const currentAllowedMoves = useMemo(() => {
    if (!currentMember.pokemonId) return [];
    return getPokemonMoves(currentMember.pokemonId);
  }, [currentMember.pokemonId]);

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

  // Update member property
  const updateMember = (slotIdx: number, updates: Partial<BuilderMember>) => {
    setTeam(prev => {
      const next = [...prev];
      next[slotIdx] = { ...next[slotIdx], ...updates };
      return next;
    });
  };

  // Select a pokemon into slot
  const handleSelectPokemonForSlot = (slotIdx: number, pId: string) => {
    const foundDex = dexMap.get(pId.toLowerCase());
    const moves = getPokemonMoves(pId);
    const defaultMoves: [string, string, string, string] = [
      moves[0]?.id || '',
      moves[1]?.id || '',
      moves[2]?.id || '',
      moves[3]?.id || '',
    ];
    const defaultAbility = foundDex?.abilities?.[0]?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'none';

    updateMember(slotIdx, {
      pokemonId: pId,
      nombre: foundDex?.nombre || pId,
      ability: defaultAbility,
      moves: defaultMoves,
    });
    onToast(`Slot #${slotIdx + 1}: ${foundDex?.nombre || pId} seleccionado.`);
  };

  // Clear slot
  const handleClearSlot = (slotIdx: number) => {
    updateMember(slotIdx, createEmptyMember(slotIdx));
    onToast(`Slot #${slotIdx + 1} limpiado.`);
  };

  // Export team to Pokémon Showdown format text
  const handleExportShowdown = () => {
    const filled = team.filter(m => m.pokemonId);
    if (filled.length === 0) {
      onToast('El equipo está vacío. Añade al menos un Pokémon.');
      return;
    }

    let text = '';
    for (const m of filled) {
      const dex = dexMap.get(m.pokemonId.toLowerCase()) || dexMap.get(m.nombre.toLowerCase());
      const name = dex?.nombre || m.nombre || 'Pokemon';
      const itemRow = ITEMS.find(([id]) => id === m.item);
      const itemName = itemRow ? itemRow[1] : '';

      text += `${name}${itemName && itemName !== 'Ninguno' ? ` @ ${itemName}` : ''}\n`;
      if (m.ability && m.ability !== 'none') {
        text += `Ability: ${m.ability}\n`;
      }
      text += `Level: ${m.level || 50}\n`;

      // EVs line
      const evParts: string[] = [];
      if (m.evs.hp) evParts.push(`${m.evs.hp} HP`);
      if (m.evs.atk) evParts.push(`${m.evs.atk} Atk`);
      if (m.evs.def) evParts.push(`${m.evs.def} Def`);
      if (m.evs.spa) evParts.push(`${m.evs.spa} SpA`);
      if (m.evs.spd) evParts.push(`${m.evs.spd} SpD`);
      if (m.evs.spe) evParts.push(`${m.evs.spe} Spe`);
      if (evParts.length) {
        text += `EVs: ${evParts.join(' / ')}\n`;
      }

      const natRow = NATURES.find(([id]) => id === m.nature);
      if (natRow) {
        text += `${natRow[1]} Nature\n`;
      }

      for (const mv of m.moves) {
        if (mv) {
          text += `- ${mv}\n`;
        }
      }
      text += '\n';
    }

    navigator.clipboard?.writeText(text);
    onToast('✅ Equipo copiado al portapapeles en formato Showdown!');
  };

  // Import team from Showdown text
  const handleImportShowdown = () => {
    if (!importText.trim()) return;

    const blocks = importText.split(/\n\s*\n/).filter(b => b.trim());
    const newTeam = [...team];

    for (let i = 0; i < Math.min(6, blocks.length); i++) {
      const lines = blocks[i].split('\n').map(l => l.trim()).filter(Boolean);
      if (!lines.length) continue;

      const header = lines[0];
      let pName = header;
      let item = 'none';

      if (header.includes('@')) {
        const parts = header.split('@');
        pName = parts[0].trim();
        const rawItem = parts[1].trim();
        const foundItem = ITEMS.find(([, lbl]) => lbl.toLowerCase() === rawItem.toLowerCase());
        item = foundItem ? foundItem[0] : 'none';
      }

      const matchDex = rawDexList.find(d => d.nombre.toLowerCase() === pName.toLowerCase() || d.id === pName.toLowerCase());
      if (!matchDex) continue;

      const moves: [string, string, string, string] = ['', '', '', ''];
      let moveIdx = 0;
      let nature = 'adamant';
      let ability = matchDex.abilities[0]?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'none';
      const evs: StatValues = { ...DEFAULT_EVS };

      for (const line of lines.slice(1)) {
        if (line.startsWith('-')) {
          if (moveIdx < 4) {
            moves[moveIdx] = line.replace(/^-+\s*/, '').trim();
            moveIdx++;
          }
        } else if (line.toLowerCase().includes('nature')) {
          const natWord = line.split(' ')[0].toLowerCase();
          const natRow = NATURES.find(([id, lbl]) => id.toLowerCase() === natWord || lbl.toLowerCase().includes(natWord));
          if (natRow) nature = natRow[0];
        } else if (line.toLowerCase().startsWith('ability:')) {
          ability = line.replace(/ability:\s*/i, '').trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
        } else if (line.toLowerCase().startsWith('evs:')) {
          const evStr = line.replace(/evs:\s*/i, '');
          const evTokens = evStr.split('/');
          for (const tok of evTokens) {
            const m = tok.trim().match(/(\d+)\s*(hp|atk|def|spa|spd|spe)/i);
            if (m) {
              const k = m[2].toLowerCase() as StatKey;
              evs[k] = parseInt(m[1], 10);
            }
          }
        }
      }

      newTeam[i] = {
        id: `slot-${i + 1}`,
        pokemonId: matchDex.id,
        nombre: matchDex.nombre,
        item,
        ability,
        nature,
        moves,
        evs,
        ivs: { ...DEFAULT_IVS },
        level: 50,
      };
    }

    setTeam(newTeam);
    setShowImportModal(false);
    setImportText('');
    onToast(`✅ Equipo importado (${Math.min(6, blocks.length)} Pokémon).`);
  };

  // Reset entire team
  const handleClearAll = () => {
    if (window.confirm('¿Quieres reiniciar los 6 slots del equipo?')) {
      setTeam(Array.from({ length: 6 }, (_, i) => createEmptyMember(i)));
      onToast('Equipo reiniciado.');
    }
  };

  const filledCount = team.filter(m => m.pokemonId).length;

  return (
    <div className="flex flex-col gap-3">
      {/* HEADER CARD */}
      <section className="glass combat-card" aria-label="Constructor de equipos">
        <div className="section-head">
          <div className="flex items-center gap-2">
            <FlaskConical size={18} className="text-emerald-400" />
            <span className="section-title">Builder · Equipo PvP 1v1</span>
          </div>
          <span className="ko-badge">
            {filledCount} / 6 Pokémon
          </span>
        </div>

        <p className="text-xs text-slate-300 mt-1 mb-3">
          Configura tu equipo competitivo de 6 Pokémon para combates 1v1 en PokéMMO. Personaliza objetos, naturalezas, movimientos y reparte los EVs al instante.
        </p>

        {/* TEAM ACTIONS BAR */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-700/40">
          <button
            type="button"
            className="action-btn-sm"
            onClick={handleExportShowdown}
            title="Copiar equipo en formato estándar Showdown"
          >
            <Copy size={13} />
            <span>Exportar Showdown</span>
          </button>

          <button
            type="button"
            className="action-btn-sm"
            onClick={() => setShowImportModal(true)}
            title="Importar equipo desde texto Showdown"
          >
            <Upload size={13} />
            <span>Importar</span>
          </button>

          <button
            type="button"
            className="action-btn-sm text-rose-300 hover:text-rose-200"
            onClick={handleClearAll}
            title="Limpiar los 6 slots"
          >
            <Trash2 size={13} />
            <span>Limpiar equipo</span>
          </button>
        </div>
      </section>

      {/* 6 SLOTS SELECTOR TABS */}
      <div className="grid grid-cols-6 gap-1.5 p-1.5 rounded-xl bg-slate-900/60 backdrop-blur border border-slate-700/50">
        {team.map((slot, idx) => {
          const isActive = activeSlot === idx;
          const dex = slot.pokemonId ? dexMap.get(slot.pokemonId.toLowerCase()) || dexMap.get(slot.nombre.toLowerCase()) : null;
          const dexNum = dex?.num || 0;

          return (
            <button
              key={slot.id}
              type="button"
              className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
                isActive
                  ? 'bg-emerald-600/30 border-emerald-400 text-white shadow-lg'
                  : 'bg-slate-800/40 border-slate-700/40 text-slate-400 hover:bg-slate-800/70'
              }`}
              onClick={() => setActiveSlot(idx)}
            >
              <div className="flex items-center justify-center w-9 h-7">
                {dexNum > 0 ? (
                  <span
                    style={getPokemonShowdownSpriteStyle(dexNum)}
                    className="image-pixelated"
                    role="img"
                    aria-label={slot.nombre}
                  />
                ) : (
                  <span className="text-xs text-slate-500 font-bold">#{idx + 1}</span>
                )}
              </div>
              <span className="text-[11px] font-semibold truncate max-w-full mt-0.5">
                {slot.nombre ? slot.nombre.slice(0, 7) : `Slot ${idx + 1}`}
              </span>
            </button>
          );
        })}
      </div>

      {/* ACTIVE SLOT DETAIL CARD */}
      <section className="glass combat-card" aria-label={`Detalle Slot #${activeSlot + 1}`}>
        <div className="section-head">
          <div className="flex items-center gap-2">
            <span className="combatant-role-badge">Slot #{activeSlot + 1}</span>
            {currentMember.nombre && (
              <strong className="text-sm text-white font-bold">{currentMember.nombre}</strong>
            )}
            {currentDex && (
              <div className="flex items-center gap-1">
                <TypeBadge type={currentDex.tipo1} size="sm" />
                {currentDex.tipo2 && <TypeBadge type={currentDex.tipo2} size="sm" />}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {currentMember.pokemonId && (
              <>
                <button
                  type="button"
                  className="send-calc-btn atk"
                  title="Enviar como Atacante a la Calculadora"
                  onClick={() => {
                    const pk = memberToPokemon(currentMember, currentDex);
                    onSendToCalculator(pk, 'attacker', currentMember.moves[0]);
                  }}
                >
                  <Swords size={12} />
                  <span>A Calculadora</span>
                </button>
                <button
                  type="button"
                  className="icon-button text-rose-400 hover:text-rose-300"
                  title="Vaciar este slot"
                  onClick={() => handleClearSlot(activeSlot)}
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* POKEMON SEARCH & SELECTION */}
        <div className="mt-3">
          <label className="text-xs text-slate-300 font-semibold mb-1 block">
            Elegir Pokémon para el Slot #{activeSlot + 1}:
          </label>
          <PokemonSearchableSelect
            id={`builder-select-pk-${activeSlot}`}
            value={currentMember.pokemonId}
            onChange={pId => handleSelectPokemonForSlot(activeSlot, pId)}
            pokemonList={pokemonList}
            equipoOU={equipoOU}
            equipoUU={equipoUU}
            equipoNU={equipoNU}
            placeholder="Buscar por nombre o # Pokédex..."
          />
        </div>

        {currentMember.pokemonId ? (
          <div className="flex flex-col gap-3.5 mt-3 pt-3 border-t border-slate-700/50">
            {/* ROW 1: ITEM, NATURE, ABILITY */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="micro-field">
                <label htmlFor={`builder-item-${activeSlot}`}>Objeto equipado</label>
                <select
                  id={`builder-item-${activeSlot}`}
                  value={currentMember.item}
                  onChange={e => updateMember(activeSlot, { item: e.target.value })}
                >
                  {ITEMS.map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="micro-field">
                <label htmlFor={`builder-nature-${activeSlot}`}>Naturaleza</label>
                <select
                  id={`builder-nature-${activeSlot}`}
                  value={currentMember.nature}
                  onChange={e => updateMember(activeSlot, { nature: e.target.value })}
                >
                  {NATURES.map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="micro-field">
                <label htmlFor={`builder-ability-${activeSlot}`}>Habilidad</label>
                <select
                  id={`builder-ability-${activeSlot}`}
                  value={currentMember.ability}
                  onChange={e => updateMember(activeSlot, { ability: e.target.value })}
                >
                  {currentAbilities.map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ROW 2: 4 MOVES */}
            <div>
              <label className="text-xs text-slate-300 font-semibold mb-1 block">
                Movimientos (4 ataques):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[0, 1, 2, 3].map(moveIdx => (
                  <div key={moveIdx} className="micro-field">
                    <label htmlFor={`builder-move-${activeSlot}-${moveIdx}`}>
                      Movimiento #{moveIdx + 1}
                    </label>
                    <select
                      id={`builder-move-${activeSlot}-${moveIdx}`}
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
                          {mv.nombre} · {typeName(mv.tipo)} ({mv.categoria === 'physical' ? 'Físico' : 'Especial'} · {mv.poder} P)
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* ROW 3: QUICK EV PRESETS */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-slate-300 font-semibold">
                  Repartición de EVs ({totalEvs} / 508 usados):
                </label>
                <button
                  type="button"
                  className="text-[11px] text-slate-400 hover:text-white"
                  onClick={() => updateMember(activeSlot, { evs: { ...DEFAULT_EVS } })}
                >
                  Reiniciar EVs
                </button>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                {EV_PRESETS.map((preset, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    className="quick-ev-btn"
                    onClick={() => {
                      updateMember(activeSlot, { evs: { ...preset.evs } });
                      onToast(`EVs aplicados: ${preset.label}`);
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* STATS PREVIEW TABLE */}
              {statsPreview && (
                <div className="stats-preview-grid">
                  <div className="stat-preview-item">
                    <span className="stat-label">PS</span>
                    <strong>{statsPreview.hp}</strong>
                    <small>{currentMember.evs.hp} EV</small>
                  </div>
                  <div className="stat-preview-item">
                    <span className="stat-label">Ataque</span>
                    <strong>{statsPreview.atk}</strong>
                    <small>{currentMember.evs.atk} EV</small>
                  </div>
                  <div className="stat-preview-item">
                    <span className="stat-label">Defensa</span>
                    <strong>{statsPreview.def}</strong>
                    <small>{currentMember.evs.def} EV</small>
                  </div>
                  <div className="stat-preview-item">
                    <span className="stat-label">Sp. Atk</span>
                    <strong>{statsPreview.spa}</strong>
                    <small>{currentMember.evs.spa} EV</small>
                  </div>
                  <div className="stat-preview-item">
                    <span className="stat-label">Sp. Def</span>
                    <strong>{statsPreview.spd}</strong>
                    <small>{currentMember.evs.spd} EV</small>
                  </div>
                  <div className="stat-preview-item">
                    <span className="stat-label">Velocidad</span>
                    <strong>{statsPreview.spe}</strong>
                    <small>{currentMember.evs.spe} EV</small>
                  </div>
                </div>
              )}
            </div>

            {/* SEND TO CALCULATOR BUTTONS */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50">
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md"
                onClick={() => {
                  const pk = memberToPokemon(currentMember, currentDex);
                  onSendToCalculator(pk, 'attacker', currentMember.moves[0]);
                }}
              >
                <Swords size={15} />
                <span>Probar como Atacante en Calculadora</span>
              </button>

              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs bg-cyan-700 hover:bg-cyan-600 text-white transition-all shadow-md"
                onClick={() => {
                  const pk = memberToPokemon(currentMember, currentDex);
                  onSendToCalculator(pk, 'defender');
                }}
              >
                <Shield size={15} />
                <span>Probar como Defensor</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs">
            Este slot está vacío. Busca y selecciona un Pokémon en el campo de arriba para configurarlo.
          </div>
        )}
      </section>

      {/* MODAL IMPORT SHOWDOWN */}
      {showImportModal && (
        <div className="modal-backdrop" onClick={() => setShowImportModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title">Importar Equipo desde Showdown</span>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowImportModal(false)}
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-300 mb-2">
              Pega aquí el texto exportado de tu equipo en Pokémon Showdown. Se cargarán automáticamente en los slots disponibles.
            </p>
            <textarea
              className="w-full h-48 p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono resize-none focus:outline-none focus:border-emerald-500"
              placeholder={`Garchomp @ Life Orb\nAbility: Rough Skin\nEVs: 4 HP / 252 Atk / 252 Spe\nJolly Nature\n- Earthquake\n- Outrage\n- Swords Dance\n- Stone Edge`}
              value={importText}
              onChange={e => setImportText(e.target.value)}
            />
            <div className="flex items-center justify-end gap-2 mt-3">
              <button
                type="button"
                className="secondary"
                onClick={() => setShowImportModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primary"
                onClick={handleImportShowdown}
                disabled={!importText.trim()}
              >
                Importar al equipo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
