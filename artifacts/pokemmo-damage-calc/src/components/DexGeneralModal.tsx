import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  Search,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Swords,
  X,
  Zap,
} from 'lucide-react';
import { allGen1To5Pokemon, convertDexToPokemon, type RawDexPokemon, rawDexList } from '../dex';
import {
  ALL_ABILITY_DEFINITIONS,
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

interface DexGeneralModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToTeam: (pokemon: Pokemon, tier: 'ou' | 'uu' | 'nu') => void;
  onSelectAttacker: (pokemon: Pokemon) => void;
  onSelectDefender: (pokemon: Pokemon) => void;
  targetRole?: 'attacker' | 'defender' | null;
  equipoOU: Pokemon[];
  equipoUU: Pokemon[];
  equipoNU: Pokemon[];
}

type SortOption = 'num-asc' | 'num-desc' | 'name-asc' | 'bst-desc' | 'spe-desc' | 'atk-desc' | 'spa-desc' | 'def-desc' | 'hp-desc';

const PAGE_SIZE = 30;

export const DexGeneralModal: React.FC<DexGeneralModalProps> = ({
  isOpen,
  onClose,
  onAddToTeam,
  onSelectAttacker,
  onSelectDefender,
  targetRole = null,
  equipoOU,
  equipoUU,
  equipoNU,
}) => {
  const [search, setSearch] = useState('');
  const [selectedType1, setSelectedType1] = useState<string>('all');
  const [selectedType2, setSelectedType2] = useState<string>('all');
  const [activeModalSlot, setActiveModalSlot] = useState<1 | 2 | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('num-asc');
  const [page, setPage] = useState(1);
  const [expandedPkId, setExpandedPkId] = useState<string | null>(null);

  // Filter and sort the imported Dex list (Gen 1-5 without Fairy)
  const filteredList = useMemo(() => {
    let result = rawDexList;

    // Filter by Dual Type (Slot 1 and Slot 2)
    const hasType1 = selectedType1 !== 'all';
    const hasType2 = selectedType2 !== 'all';

    if (hasType1 && hasType2) {
      if (selectedType1 === selectedType2) {
        // Mono-type
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

    // Filter by Search Query (name, number, abilities)
    const q = search.trim().toLowerCase();
    if (q) {
      const cleanNum = q.replace(/^#/, '');
      result = result.filter(p => {
        if (p.nombre.toLowerCase().includes(q)) return true;
        if (String(p.num) === cleanNum || String(p.num).padStart(3, '0') === cleanNum) return true;
        if (p.tipo1.toLowerCase().includes(q) || (p.tipo2 && p.tipo2.toLowerCase().includes(q))) return true;
        if (p.abilities.some(a => a.toLowerCase().includes(q))) return true;
        if (p.abilityNames && p.abilityNames.some(a => a.toLowerCase().includes(q))) return true;
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
          return a.num - b.num;
      }
    });
  }, [selectedType1, selectedType2, search, sortBy]);

  // Reset page when filter changes
  React.useEffect(() => {
    setPage(1);
  }, [search, selectedType1, selectedType2, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredList.slice(start, start + PAGE_SIZE);
  }, [filteredList, currentPage]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dex-modal" role="dialog" aria-modal="true" aria-label="Pokédex General">
        {/* Modal Header */}
        <div className="dex-modal-header">
          <div className="flex items-center gap-2.5">
            <div className="dex-header-icon">
              <BookOpen size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="dex-modal-title">Pokédex General · Gen 1 a 5</h2>
                <span className="dex-badge-count">#001 — #649</span>
              </div>
              <p className="dex-modal-subtitle">
                Datos de combate oficiales importados desde Smogon / Pokémon Showdown con stats base, tipos y habilidades.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            data-testid="button-close-dex-modal"
            aria-label="Cerrar Pokédex"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Target role announcement banner if picking for attacker/defender */}
        {targetRole && (
          <div className="dex-target-banner">
            {targetRole === 'attacker' ? (
              <>
                <Swords size={16} />
                <span>
                  Modo de selección: Pulsa <strong>"Usar como Atacante"</strong> en cualquier Pokémon para cargarlo
                  directamente en la calculadora.
                </span>
              </>
            ) : (
              <>
                <Shield size={16} />
                <span>
                  Modo de selección: Pulsa <strong>"Usar como Defensor"</strong> en cualquier Pokémon para cargarlo
                  directamente en la calculadora.
                </span>
              </>
            )}
          </div>
        )}

        {/* Filter controls bar */}
        <div className="dex-controls">
          <div className="dex-search-and-filters">
            {/* Search box */}
            <div className="dex-search-wrapper">
              <Search size={16} className="dex-search-icon" />
              <input
                type="search"
                className="dex-search-input"
                placeholder="Buscar por nombre, número (#006, 649) o habilidad..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus={!targetRole}
              />
              {search && (
                <button
                  type="button"
                  className="dex-search-clear"
                  onClick={() => setSearch('')}
                  aria-label="Limpiar búsqueda"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* TWO TYPE SELECTION BUTTONS (MATCHING POKETYPE REFERENCE) */}
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => setActiveModalSlot(1)}
                style={
                  selectedType1 !== 'all'
                    ? {
                        backgroundColor: getPokeTypeColor(selectedType1),
                        borderColor: 'rgba(255, 255, 255, 0.4)',
                      }
                    : undefined
                }
                className={`flex-1 h-9 px-3 rounded-lg flex items-center justify-between text-xs font-bold border transition-all active:scale-[0.98] ${
                  selectedType1 !== 'all'
                    ? 'text-white shadow-sm'
                    : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/60 text-slate-300'
                }`}
              >
                <span
                  style={
                    selectedType1 !== 'all'
                      ? { textShadow: '0 1px 2px rgba(0,0,0,0.7)' }
                      : undefined
                  }
                  className="truncate"
                >
                  {selectedType1 !== 'all' ? getPokeTypeName(selectedType1) : 'Tipo 1'}
                </span>
                <span className="text-white/80 text-sm font-bold ml-1">»</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModalSlot(2)}
                style={
                  selectedType2 !== 'all'
                    ? {
                        backgroundColor: getPokeTypeColor(selectedType2),
                        borderColor: 'rgba(255, 255, 255, 0.4)',
                      }
                    : undefined
                }
                className={`flex-1 h-9 px-3 rounded-lg flex items-center justify-between text-xs font-bold border transition-all active:scale-[0.98] ${
                  selectedType2 !== 'all'
                    ? 'text-white shadow-sm'
                    : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/60 text-slate-300'
                }`}
              >
                <span
                  style={
                    selectedType2 !== 'all'
                      ? { textShadow: '0 1px 2px rgba(0,0,0,0.7)' }
                      : undefined
                  }
                  className="truncate"
                >
                  {selectedType2 !== 'all' ? getPokeTypeName(selectedType2) : 'Tipo 2'}
                </span>
                <span className="text-white/80 text-sm font-bold ml-1">»</span>
              </button>

              {(selectedType1 !== 'all' || selectedType2 !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType1('all');
                    setSelectedType2('all');
                    setPage(1);
                  }}
                  className="px-2 py-1 text-[11px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
                  title="Restablecer filtros de tipo"
                >
                  Limpiar
                </button>
              )}
            </div>

            <div className="dex-filters-row">

              {/* Sort selector */}
              <div className="dex-filter-item">
                <label htmlFor="dex-sort-by">Ordenar por:</label>
                <select
                  id="dex-sort-by"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortOption)}
                  className="dex-select"
                >
                  <option value="num-asc">Número (#001 a #649)</option>
                  <option value="num-desc">Número (#649 a #001)</option>
                  <option value="name-asc">Nombre (A — Z)</option>
                  <option value="bst-desc">Estadísticas totales (BST)</option>
                  <option value="spe-desc">Mayor Velocidad</option>
                  <option value="atk-desc">Mayor Ataque Físico</option>
                  <option value="spa-desc">Mayor Ataque Especial</option>
                  <option value="def-desc">Mayor Defensa Física</option>
                  <option value="hp-desc">Mayor PS / Puntos de Salud</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Results summary & pagination bar */}
        <div className="dex-results-bar">
          <span className="dex-results-count">
            Mostrando <strong>{filteredList.length}</strong> Pokémon en la Pokédex General (#001 a #649)
          </span>

          {totalPages > 1 && (
            <div className="dex-pagination">
              <button
                type="button"
                className="dex-page-btn"
                disabled={currentPage <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                aria-label="Página anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="dex-page-indicator">
                Pág. {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                className="dex-page-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                aria-label="Página siguiente"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Pokémon Cards Grid */}
        <div className="dex-cards-grid">
          {paginatedList.length === 0 ? (
            <div className="dex-empty-state">
              <Search size={32} />
              <p>No se encontraron Pokémon con los filtros especificados.</p>
              <button
                type="button"
                className="btn btn-muted mt-2"
                onClick={() => {
                  setSearch('');
                  setSelectedType('all');
                }}
              >
                Limpiar todos los filtros
              </button>
            </div>
          ) : (
            paginatedList.map(rawPk => {
              const bst = rawPk.hp + rawPk.atk + rawPk.def + rawPk.spa + rawPk.spd + rawPk.spe;
              const formattedNum = `#${String(rawPk.num).padStart(3, '0')}`;
              const isExpanded = expandedPkId === rawPk.id;
              const appPk = convertDexToPokemon(rawPk, 'dex');

              // Check if already in teams
              const inOU = equipoOU.some(p => p.id === rawPk.id || p.nombre === rawPk.nombre);
              const inUU = equipoUU.some(p => p.id === rawPk.id || p.nombre === rawPk.nombre);
              const inNU = equipoNU.some(p => p.id === rawPk.id || p.nombre === rawPk.nombre);

              return (
                <div className="dex-card" key={rawPk.id} data-testid={`dex-card-${rawPk.id}`}>
                  {/* Card Header */}
                  <div className="dex-card-top">
                    <span className="dex-card-num">{formattedNum}</span>
                    <span className="dex-card-gen">Gen {rawPk.generation}</span>
                  </div>

                  {/* Sprite & Identity */}
                  <div className="dex-card-identity">
                    <PokemonAnimatedSprite
                      num={rawPk.num}
                      name={rawPk.nombre}
                      pokemonId={rawPk.id}
                      type={rawPk.tipo1}
                      size="md"
                    />
                    <div className="dex-card-info">
                      <strong className="dex-card-name">{rawPk.nombre}</strong>
                      <div className="dex-card-types">
                        <TypeBadge type={rawPk.tipo1} size="sm" />
                        {rawPk.tipo2 && <TypeBadge type={rawPk.tipo2} size="sm" />}
                      </div>
                      <div className="dex-card-metrics">
                        {rawPk.heightm !== undefined && <span>{rawPk.heightm}m</span>}
                        {rawPk.weightkg !== undefined && <span>{rawPk.weightkg}kg</span>}
                        <span className="dex-card-bst">BST {bst}</span>
                      </div>
                    </div>
                  </div>

                  {/* Base Stats Bar List */}
                  <div className="dex-card-stats">
                    {STAT_KEYS.map(key => {
                      const val = rawPk[key];
                      const maxStat = 255;
                      const pct = Math.min(100, Math.round((val / maxStat) * 100));
                      let barColor = '#48bb78';
                      if (val < 50) barColor = '#e53e3e';
                      else if (val < 80) barColor = '#dd6b20';
                      else if (val < 105) barColor = '#38a169';
                      else if (val < 130) barColor = '#319795';
                      else barColor = '#3182ce';

                      return (
                        <div className="dex-stat-row" key={key}>
                          <span className="dex-stat-label">{STAT_LABELS[key]}</span>
                          <span className="dex-stat-val">{val}</span>
                          <div className="dex-stat-track">
                            <div
                              className="dex-stat-fill"
                              style={{ width: `${pct}%`, backgroundColor: barColor }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Abilities Pills */}
                  <div className="dex-card-abilities">
                    <span className="dex-abilities-title">Habilidades:</span>
                    <div className="dex-abilities-chips">
                      {rawPk.abilities.map((abilityId, idx) => {
                        const def = ALL_ABILITY_DEFINITIONS[abilityId];
                        const name = def ? def.name : rawPk.abilityNames?.[idx] || abilityId;
                        return (
                          <span
                            key={abilityId}
                            className="dex-ability-chip"
                            title={def ? def.desc : name}
                          >
                            {name}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="dex-card-actions">
                    {/* Role Buttons for direct calculator loading */}
                    <div className="dex-action-group">
                      <button
                        type="button"
                        className={`dex-btn dex-btn-atk ${targetRole === 'attacker' ? 'highlight' : ''}`}
                        title="Cargar como Atacante en la calculadora de daño"
                        onClick={() => {
                          onSelectAttacker(appPk);
                          if (targetRole === 'attacker') onClose();
                        }}
                      >
                        <Swords size={12} />
                        <span>Atacante</span>
                      </button>

                      <button
                        type="button"
                        className={`dex-btn dex-btn-def ${targetRole === 'defender' ? 'highlight' : ''}`}
                        title="Cargar como Defensor en la calculadora de daño"
                        onClick={() => {
                          onSelectDefender(appPk);
                          if (targetRole === 'defender') onClose();
                        }}
                      >
                        <Shield size={12} />
                        <span>Defensor</span>
                      </button>
                    </div>

                    {/* Team Add Buttons */}
                    <div className="dex-tier-add-group">
                      <button
                        type="button"
                        className={`dex-tier-btn ou ${inOU ? 'added' : ''}`}
                        title={inOU ? 'Ya en equipo OU (pulsa para añadir otro)' : 'Añadir al equipo Tier OU'}
                        onClick={() => onAddToTeam(appPk, 'ou')}
                      >
                        <Plus size={10} /> OU {inOU && '✓'}
                      </button>
                      <button
                        type="button"
                        className={`dex-tier-btn uu ${inUU ? 'added' : ''}`}
                        title={inUU ? 'Ya en equipo UU (pulsa para añadir otro)' : 'Añadir al equipo Tier UU'}
                        onClick={() => onAddToTeam(appPk, 'uu')}
                      >
                        <Plus size={10} /> UU {inUU && '✓'}
                      </button>
                      <button
                        type="button"
                        className={`dex-tier-btn nu ${inNU ? 'added' : ''}`}
                        title={inNU ? 'Ya en equipo NU (pulsa para añadir otro)' : 'Añadir al equipo Tier NU'}
                        onClick={() => onAddToTeam(appPk, 'nu')}
                      >
                        <Plus size={10} /> NU {inNU && '✓'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Pagination if multiple pages */}
        {totalPages > 1 && (
          <div className="dex-modal-footer">
            <span className="dex-footer-summary">
              Página {currentPage} de {totalPages} ({filteredList.length} Pokémon)
            </span>
            <div className="dex-pagination">
              <button
                type="button"
                className="dex-page-btn"
                disabled={currentPage <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} /> Anterior
              </button>
              <button
                type="button"
                className="dex-page-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Siguiente <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

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
      </div>
    </div>
  );
};
