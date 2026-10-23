import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Search,
  Shield,
  Sparkles,
  Swords,
  Zap,
} from 'lucide-react';
import { rawDexList, convertDexToPokemon, type RawDexPokemon } from '../dex';
import {
  type Pokemon,
  STAT_KEYS,
  STAT_LABELS,
  TypeBadge,
  TYPES,
} from '../pokemon-constants';
import { getPokemonShowdownSpriteStyle } from './PokemonSearchableSelect';
import {
  TypeSelectModal,
  getPokeTypeColor,
  getPokeTypeName,
} from './TypeSelectModal';
import { PokemonAnimatedSprite } from './PokemonAnimatedSprite';

interface PokemonDexViewProps {
  onSelectAttacker: (pokemon: Pokemon) => void;
  onSelectDefender: (pokemon: Pokemon) => void;
  onAddToBuilder?: (pokemon: Pokemon) => void;
  onToast: (msg: string) => void;
}

type SortOption =
  | 'num-asc'
  | 'num-desc'
  | 'name-asc'
  | 'bst-desc'
  | 'spe-desc'
  | 'atk-desc'
  | 'spa-desc'
  | 'def-desc'
  | 'hp-desc';

const PAGE_SIZE = 24;

export const PokemonDexView: React.FC<PokemonDexViewProps> = ({
  onSelectAttacker,
  onSelectDefender,
  onAddToBuilder,
  onToast,
}) => {
  const [search, setSearch] = useState('');
  const [selectedType1, setSelectedType1] = useState<string>('all');
  const [selectedType2, setSelectedType2] = useState<string>('all');
  const [activeModalSlot, setActiveModalSlot] = useState<1 | 2 | null>(null);
  const [selectedGen, setSelectedGen] = useState<number | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('num-asc');
  const [page, setPage] = useState(1);
  const [expandedPkId, setExpandedPkId] = useState<string | null>(null);

  // Filter & sort
  const filteredList = useMemo(() => {
    let result = rawDexList;

    // Filter by Gen
    if (selectedGen !== 'all') {
      result = result.filter(p => p.generation === selectedGen);
    }

    // Filter by Dual Type (Slot 1 and Slot 2)
    const hasType1 = selectedType1 !== 'all';
    const hasType2 = selectedType2 !== 'all';

    if (hasType1 && hasType2) {
      if (selectedType1 === selectedType2) {
        // Mono-type search (pure type)
        result = result.filter(
          p => p.tipo1 === selectedType1 && (!p.tipo2 || p.tipo2 === selectedType1)
        );
      } else {
        // Dual-type combination
        result = result.filter(
          p =>
            (p.tipo1 === selectedType1 && p.tipo2 === selectedType2) ||
            (p.tipo1 === selectedType2 && p.tipo2 === selectedType1)
        );
      }
    } else if (hasType1) {
      result = result.filter(p => p.tipo1 === selectedType1 || p.tipo2 === selectedType1);
    } else if (hasType2) {
      result = result.filter(p => p.tipo1 === selectedType2 || p.tipo2 === selectedType2);
    }

    // Filter by Search
    const q = search.trim().toLowerCase();
    if (q) {
      const cleanNum = q.replace(/^#/, '');
      result = result.filter(p => {
        if (p.nombre.toLowerCase().includes(q)) return true;
        if (String(p.num) === cleanNum || String(p.num).padStart(3, '0') === cleanNum) return true;
        if (p.tipo1.toLowerCase().includes(q) || (p.tipo2 && p.tipo2.toLowerCase().includes(q))) return true;
        if (p.abilities && p.abilities.some(a => a.toLowerCase().includes(q))) return true;
        return false;
      });
    }

    // Sort
    return [...result].sort((a, b) => {
      const bstA = a.hp + a.atk + a.def + a.spa + a.spd + a.spe;
      const bstB = b.hp + b.atk + b.def + b.spa + b.spd + b.spe;

      switch (sortBy) {
        case 'num-asc':
          return a.num - b.num || a.id.localeCompare(b.id);
        case 'num-desc':
          return b.num - a.num || b.id.localeCompare(a.id);
        case 'name-asc':
          return a.nombre.localeCompare(b.nombre);
        case 'bst-desc':
          return bstB - bstA;
        case 'spe-desc':
          return b.spe - a.spe;
        case 'atk-desc':
          return b.atk - a.atk;
        case 'spa-desc':
          return b.spa - a.spa;
        case 'def-desc':
          return b.def - a.def;
        case 'hp-desc':
          return b.hp - a.hp;
        default:
          return 0;
      }
    });
  }, [search, selectedType1, selectedType2, selectedGen, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredList.slice(start, start + PAGE_SIZE);
  }, [filteredList, currentPage]);

  const handlePickAttacker = (rawPk: RawDexPokemon) => {
    const pk = convertDexToPokemon(rawPk, 'ou');
    onSelectAttacker(pk);
    onToast(`⚡ ${rawPk.nombre} cargado como Atacante en la Calculadora.`);
  };

  const handlePickDefender = (rawPk: RawDexPokemon) => {
    const pk = convertDexToPokemon(rawPk, 'ou');
    onSelectDefender(pk);
    onToast(`🛡️ ${rawPk.nombre} cargado como Defensor en la Calculadora.`);
  };

  const handlePickBuilder = (rawPk: RawDexPokemon) => {
    if (onAddToBuilder) {
      const pk = convertDexToPokemon(rawPk, 'ou');
      onAddToBuilder(pk);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* HEADER CARD */}
      <section className="glass combat-card" aria-label="Pokemon Dex">
        <div className="section-head mb-2.5">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-emerald-400" />
            <span className="section-title">Pokemon dex · Pokédex General</span>
          </div>
          <span className="ko-badge">
            {filteredList.length} Pokémon
          </span>
        </div>

        {/* SEARCH BAR */}
        <div className="relative mb-2.5">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-700/60 text-white placeholder-slate-400 text-xs focus:outline-none focus:border-emerald-500"
            placeholder="Buscar por nombre, # número, tipo o habilidad..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* TWO TYPE SELECTION BUTTONS (MATCHING POKETYPE REFERENCE PHOTO) */}
        <div className="mb-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>Filtrado por Tipos</span>
              {(selectedType1 !== 'all' || selectedType2 !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType1('all');
                    setSelectedType2('all');
                    setPage(1);
                  }}
                  className="text-[10px] text-amber-400 hover:text-amber-300 font-normal underline lowercase cursor-pointer"
                >
                  restablecer
                </button>
              )}
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              {filteredList.length} Pokémon encontrados
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* BUTTON TYPE 1 */}
            <button
              type="button"
              onClick={() => setActiveModalSlot(1)}
              style={
                selectedType1 !== 'all'
                  ? {
                      backgroundColor: getPokeTypeColor(selectedType1),
                      borderColor: 'rgba(255, 255, 255, 0.35)',
                    }
                  : undefined
              }
              className={`h-11 px-3.5 rounded-xl flex items-center justify-between text-sm font-bold border transition-all active:scale-[0.98] ${
                selectedType1 !== 'all'
                  ? 'text-white shadow-md'
                  : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/60 text-slate-300'
              }`}
            >
              <span
                style={
                  selectedType1 !== 'all'
                    ? { textShadow: '0 1px 2px rgba(0,0,0,0.7), 0 0 1px rgba(0,0,0,0.9)' }
                    : undefined
                }
                className="truncate"
              >
                {selectedType1 !== 'all' ? getPokeTypeName(selectedType1) : 'Tipo 1'}
              </span>
              <span className="text-white/80 text-base font-bold ml-1">»</span>
            </button>

            {/* BUTTON TYPE 2 */}
            <button
              type="button"
              onClick={() => setActiveModalSlot(2)}
              style={
                selectedType2 !== 'all'
                  ? {
                      backgroundColor: getPokeTypeColor(selectedType2),
                      borderColor: 'rgba(255, 255, 255, 0.35)',
                    }
                  : undefined
              }
              className={`h-11 px-3.5 rounded-xl flex items-center justify-between text-sm font-bold border transition-all active:scale-[0.98] ${
                selectedType2 !== 'all'
                  ? 'text-white shadow-md'
                  : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/60 text-slate-300'
              }`}
            >
              <span
                style={
                  selectedType2 !== 'all'
                    ? { textShadow: '0 1px 2px rgba(0,0,0,0.7), 0 0 1px rgba(0,0,0,0.9)' }
                    : undefined
                }
                className="truncate"
              >
                {selectedType2 !== 'all' ? getPokeTypeName(selectedType2) : 'Tipo 2'}
              </span>
              <span className="text-white/80 text-base font-bold ml-1">»</span>
            </button>
          </div>
        </div>

        {/* GENERATIONS TABS */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          {(['all', 1, 2, 3, 4, 5] as const).map(gen => (
            <button
              key={String(gen)}
              type="button"
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                selectedGen === gen
                  ? 'bg-emerald-600 border-emerald-400 text-white'
                  : 'bg-slate-800/60 border-slate-700/40 text-slate-300 hover:bg-slate-800'
              }`}
              onClick={() => {
                setSelectedGen(gen);
                setPage(1);
              }}
            >
              {gen === 'all' ? 'Todas las Gen' : `Gen ${gen}`}
            </button>
          ))}
        </div>

        {/* SORT ROW */}
        <div className="pt-2 border-t border-slate-700/40">
          <div className="micro-field">
            <label htmlFor="dex-sort-filter">Ordenar por</label>
            <select
              id="dex-sort-filter"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
            >
              <option value="num-asc"># Número Pokédex (1 → 649)</option>
              <option value="num-desc"># Número Pokédex (649 → 1)</option>
              <option value="name-asc">Nombre (A → Z)</option>
              <option value="bst-desc">Total Base Stats (Mayor BST)</option>
              <option value="spe-desc">Velocidad (Mayor)</option>
              <option value="atk-desc">Ataque Físico (Mayor)</option>
              <option value="spa-desc">Ataque Especial (Mayor)</option>
              <option value="def-desc">Defensa Física (Mayor)</option>
              <option value="hp-desc">Puntos de Salud (Mayor PS)</option>
            </select>
          </div>
        </div>
      </section>

      {/* TYPE SELECTION MODAL */}
      <TypeSelectModal
        isOpen={activeModalSlot !== null}
        onClose={() => setActiveModalSlot(null)}
        currentType={activeModalSlot === 1 ? selectedType1 : selectedType2}
        slotTitle={activeModalSlot === 1 ? 'Seleccionar Tipo 1' : 'Seleccionar Tipo 2'}
        onSelectType={typeId => {
          if (activeModalSlot === 1) {
            setSelectedType1(typeId);
          } else if (activeModalSlot === 2) {
            setSelectedType2(typeId);
          }
          setPage(1);
        }}
      />

      {/* POKEMON LIST GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {pageItems.map(rawPk => {
          const bst = rawPk.hp + rawPk.atk + rawPk.def + rawPk.spa + rawPk.spd + rawPk.spe;
          const isExpanded = expandedPkId === rawPk.id;

          return (
            <div
              key={rawPk.id}
              className="glass p-3 rounded-xl flex flex-col justify-between border border-slate-700/40 hover:border-slate-600 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="dex-badge-num">
                      #{String(rawPk.num).padStart(3, '0')}
                    </span>
                    <strong className="text-sm font-bold text-white">{rawPk.nombre}</strong>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-300">
                    BST {bst}
                  </span>
                </div>

                {/* SPRITE & TYPES ROW (LARGER ANIMATED POKEAPI GIFS WITH AESTHETIC FRAME) */}
                <div className="flex items-center gap-3 mb-2.5">
                  <PokemonAnimatedSprite
                    num={rawPk.num}
                    name={rawPk.nombre}
                    pokemonId={rawPk.id}
                    type={rawPk.tipo1}
                    size="lg"
                  />
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <TypeBadge type={rawPk.tipo1} size="sm" />
                      {rawPk.tipo2 && <TypeBadge type={rawPk.tipo2} size="sm" />}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      Gen {rawPk.generation} · PokeMMO
                    </div>
                  </div>
                </div>

                {/* STATS BAR ROW */}
                <div className="grid grid-cols-6 gap-1 text-center py-1.5 px-2 rounded-lg bg-slate-900/60 mb-2">
                  <div>
                    <div className="text-[9px] text-slate-400">PS</div>
                    <div className="text-xs font-bold text-emerald-400">{rawPk.hp}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-400">Atk</div>
                    <div className="text-xs font-bold text-amber-400">{rawPk.atk}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-400">Def</div>
                    <div className="text-xs font-bold text-orange-400">{rawPk.def}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-400">SpA</div>
                    <div className="text-xs font-bold text-sky-400">{rawPk.spa}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-400">SpD</div>
                    <div className="text-xs font-bold text-indigo-400">{rawPk.spd}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-400">Vel</div>
                    <div className="text-xs font-bold text-pink-400">{rawPk.spe}</div>
                  </div>
                </div>

                {/* ABILITIES PREVIEW */}
                <div className="text-[11px] text-slate-300 mb-2 truncate">
                  <span className="text-slate-400">Habilidades:</span>{' '}
                  {rawPk.abilities?.join(', ') || 'Ninguna'}
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-slate-700/40">
                <button
                  type="button"
                  className="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold bg-emerald-700/60 hover:bg-emerald-600 text-white flex items-center justify-center gap-1 transition-colors"
                  onClick={() => handlePickAttacker(rawPk)}
                  title="Cargar como atacante en la calculadora"
                >
                  <Swords size={12} />
                  <span>Atacante</span>
                </button>

                <button
                  type="button"
                  className="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold bg-cyan-700/60 hover:bg-cyan-600 text-white flex items-center justify-center gap-1 transition-colors"
                  onClick={() => handlePickDefender(rawPk)}
                  title="Cargar como defensor en la calculadora"
                >
                  <Shield size={12} />
                  <span>Defensor</span>
                </button>

                {onAddToBuilder && (
                  <button
                    type="button"
                    className="py-1.5 px-2 rounded-lg text-xs font-bold bg-purple-700/60 hover:bg-purple-600 text-white flex items-center justify-center gap-1 transition-colors"
                    onClick={() => handlePickBuilder(rawPk)}
                    title="Añadir este Pokémon al Builder"
                  >
                    <FlaskConical size={12} />
                    <span>Builder</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-700/50 mt-1">
          <button
            type="button"
            className="action-btn-sm"
            disabled={currentPage <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            <ChevronLeft size={14} />
            <span>Anterior</span>
          </button>

          <span className="text-xs text-slate-300 font-medium">
            Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({filteredList.length} Pokémon)
          </span>

          <button
            type="button"
            className="action-btn-sm"
            disabled={currentPage >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            <span>Siguiente</span>
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
