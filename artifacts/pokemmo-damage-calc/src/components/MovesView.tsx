import React, { useMemo, useState } from 'react';
import {
  Edit2,
  Plus,
  PlusCircle,
  Search,
  Swords,
  Trash2,
  Zap,
} from 'lucide-react';
import {
  type Move,
  type Pokemon,
  STAT_LABELS,
  TypeBadge,
  TYPES,
  typeName,
} from '../pokemon-constants';

interface MovesViewProps {
  moves: Move[];
  onSelectMoveInCalc: (moveId: string) => void;
  onOpenCreateMoveModal: () => void;
  onOpenEditMoveModal: (move: Move) => void;
  onDeleteMove: (moveId: string) => void;
  onToast: (msg: string) => void;
}

export const MovesView: React.FC<MovesViewProps> = ({
  moves,
  onSelectMoveInCalc,
  onOpenCreateMoveModal,
  onOpenEditMoveModal,
  onDeleteMove,
  onToast,
}) => {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'physical' | 'special'>('all');

  // Filter moves
  const filteredMoves = useMemo(() => {
    return moves.filter(m => {
      if (selectedType !== 'all' && m.tipo !== selectedType) return false;
      if (selectedCategory !== 'all' && m.categoria !== selectedCategory) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!m.nombre.toLowerCase().includes(q) && !typeName(m.tipo).toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [moves, search, selectedType, selectedCategory]);

  return (
    <div className="flex flex-col gap-3">
      {/* HEADER CARD */}
      <section className="glass combat-card" aria-label="Movimientos">
        <div className="section-head">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-amber-400" />
            <span className="section-title">Movimientos · Base de Datos</span>
          </div>
          <span className="ko-badge">
            {filteredMoves.length} de {moves.length}
          </span>
        </div>

        <p className="text-xs text-slate-300 mt-1 mb-3">
          Explora los movimientos competitivos de PokéMMO y crea ataques personalizados con poder, tipo y efectos secundarios para calcular daño.
        </p>

        {/* SEARCH & CREATE BUTTON */}
        <div className="flex items-center gap-2 mb-2.5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-700/60 text-white placeholder-slate-400 text-xs focus:outline-none focus:border-emerald-500"
              placeholder="Buscar movimiento por nombre..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex-shrink-0"
            onClick={onOpenCreateMoveModal}
          >
            <PlusCircle size={15} />
            <span>Nuevo</span>
          </button>
        </div>

        {/* FILTERS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-700/40">
          <div className="micro-field">
            <label htmlFor="moves-type-filter">Tipo de movimiento</label>
            <select
              id="moves-type-filter"
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
            >
              <option value="all">Todos los tipos</option>
              {TYPES.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="micro-field">
            <label htmlFor="moves-cat-filter">Categoría</label>
            <select
              id="moves-cat-filter"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value as 'all' | 'physical' | 'special')}
            >
              <option value="all">Todas las categorías</option>
              <option value="physical">Físico</option>
              <option value="special">Especial</option>
            </select>
          </div>
        </div>
      </section>

      {/* MOVES LIST GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {filteredMoves.map(mv => (
          <div
            key={mv.id}
            className="glass p-3 rounded-xl flex flex-col justify-between border border-slate-700/40 hover:border-slate-600 transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <strong className="text-sm font-bold text-white">{mv.nombre}</strong>
                  {mv.priority ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Prio +{mv.priority}
                    </span>
                  ) : null}
                </div>
                <div className="text-xs font-bold text-emerald-300">
                  {mv.poder} Poder
                </div>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <TypeBadge type={mv.tipo} size="sm" />
                <span className={`move-category-chip ${mv.categoria}`}>
                  {mv.categoria === 'physical' ? 'Físico' : 'Especial'}
                </span>
                {mv.statChange && (
                  <span className="text-[10px] text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                    {STAT_LABELS[mv.statChange.stat]} {mv.statChange.stages > 0 ? '+' : ''}
                    {mv.statChange.stages}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 pt-2 border-t border-slate-700/40">
              <button
                type="button"
                className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold bg-emerald-600/70 hover:bg-emerald-600 text-white flex items-center justify-center gap-1.5 transition-colors"
                onClick={() => {
                  onSelectMoveInCalc(mv.id);
                  onToast(`Movimiento "${mv.nombre}" seleccionado en la Calculadora.`);
                }}
              >
                <Swords size={13} />
                <span>Probar en Calculadora</span>
              </button>

              <button
                type="button"
                className="icon-button"
                title="Editar movimiento"
                onClick={() => onOpenEditMoveModal(mv)}
              >
                <Edit2 size={13} />
              </button>

              <button
                type="button"
                className="icon-button text-rose-400 hover:text-rose-300"
                title="Eliminar movimiento"
                onClick={() => {
                  if (window.confirm(`¿Eliminar movimiento "${mv.nombre}"?`)) {
                    onDeleteMove(mv.id);
                  }
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
