import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Edit2,
  ExternalLink,
  PlusCircle,
  Search,
  Sparkles,
  Swords,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import {
  type Move,
  type MoveCategory,
  type Pokemon,
  TYPE_COLORS,
  TypeBadge,
  TYPES,
  typeName,
} from '../pokemon-constants';
import { allGen1To5Pokemon, dexPokemonMap } from '../dex';
import { getPokemonDexNum, getPokemonShowdownSpriteStyle } from './PokemonSearchableSelect';

interface MovesViewProps {
  moves: Move[];
  onSelectMoveInCalc: (moveId: string) => void;
  onOpenCreateMoveModal: () => void;
  onOpenEditMoveModal: (move: Move) => void;
  onDeleteMove: (moveId: string) => void;
  onToast: (msg: string) => void;
  onSelectPokemonAndMoveInCalc?: (pokemon: Pokemon, moveId: string) => void;
}

type SortField = 'power' | 'accuracy' | 'pp' | 'name';

export const MovesView: React.FC<MovesViewProps> = ({
  moves,
  onSelectMoveInCalc,
  onOpenCreateMoveModal,
  onOpenEditMoveModal,
  onDeleteMove,
  onToast,
  onSelectPokemonAndMoveInCalc,
}) => {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'physical' | 'special' | 'status'>('all');
  const [sortBy, setSortBy] = useState<SortField>('power');

  // Dropdown visibility state
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const dropdownsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside without any blurring or interaction blocking
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownsRef.current && !dropdownsRef.current.contains(e.target as Node)) {
        setIsTypeDropdownOpen(false);
        setIsCategoryDropdownOpen(false);
        setIsSortDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Detail Modal state
  const [detailMove, setDetailMove] = useState<Move | null>(null);
  const [showLearners, setShowLearners] = useState(false);
  const [learnerSearch, setLearnerSearch] = useState('');

  // Filter & Sort
  const filteredMoves = useMemo(() => {
    const result = moves.filter(m => {
      if (selectedType !== 'all' && m.tipo.toLowerCase() !== selectedType.toLowerCase()) return false;
      if (selectedCategory !== 'all' && m.categoria !== selectedCategory) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesName = m.nombre.toLowerCase().includes(q);
        const matchesEn = (m.id || '').toLowerCase().includes(q);
        const matchesNum = m.num !== undefined && String(m.num).includes(q);
        const matchesType = typeName(m.tipo).toLowerCase().includes(q);
        if (!matchesName && !matchesEn && !matchesNum && !matchesType) {
          return false;
        }
      }
      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'power') {
        const pA = a.categoria === 'status' ? -1 : a.poder || 0;
        const pB = b.categoria === 'status' ? -1 : b.poder || 0;
        if (pB !== pA) return pB - pA;
        return a.nombre.localeCompare(b.nombre);
      }
      if (sortBy === 'accuracy') {
        const accA = a.accuracy === null ? -1 : a.accuracy;
        const accB = b.accuracy === null ? -1 : b.accuracy;
        if (accB !== accA) return accB - accA;
        return a.nombre.localeCompare(b.nombre);
      }
      if (sortBy === 'pp') {
        const ppA = a.pp || 0;
        const ppB = b.pp || 0;
        if (ppB !== ppA) return ppB - ppA;
        return a.nombre.localeCompare(b.nombre);
      }
      return a.nombre.localeCompare(b.nombre);
    });

    return result;
  }, [moves, search, selectedType, selectedCategory, sortBy]);

  // Pokémon that learn the current detailMove
  const learnerPokemonList = useMemo(() => {
    if (!detailMove) return [];
    const moveKey = detailMove.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const showdownKey = (detailMove.showdownKey || '').toLowerCase();

    const matches: Pokemon[] = [];
    const seen = new Set<string>();

    for (const p of allGen1To5Pokemon) {
      if (seen.has(p.id)) continue;
      let learns = false;
      if (detailMove.learners && detailMove.learners.length > 0) {
        if (detailMove.learners.includes(p.id) || detailMove.learners.includes(p.id.toLowerCase())) {
          learns = true;
        }
      }
      if (!learns && p.learnset && p.learnset.length > 0) {
        for (const lsMove of p.learnset) {
          const clean = lsMove.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (clean === moveKey || (showdownKey && clean === showdownKey)) {
            learns = true;
            break;
          }
        }
      }

      if (learns) {
        seen.add(p.id);
        matches.push(p);
      }
    }

    matches.sort((a, b) => (a.num || 999) - (b.num || 999));
    return matches;
  }, [detailMove]);

  const filteredLearners = useMemo(() => {
    if (!learnerSearch.trim()) return learnerPokemonList;
    const q = learnerSearch.trim().toLowerCase();
    return learnerPokemonList.filter(
      p =>
        p.nombre.toLowerCase().includes(q) ||
        (p.num !== undefined && String(p.num).includes(q)) ||
        typeName(p.tipo1).toLowerCase().includes(q)
    );
  }, [learnerPokemonList, learnerSearch]);

  const getSortLabel = (sort: SortField) => {
    switch (sort) {
      case 'power':
        return 'Poder »';
      case 'accuracy':
        return 'Precisión »';
      case 'pp':
        return 'PP »';
      case 'name':
        return 'Nombre »';
    }
  };

  const getTypeLabel = (typeKey: string) => {
    if (typeKey === 'all') return 'Todo »';
    return `${typeName(typeKey)} »`;
  };

  const closeAllDropdowns = () => {
    setIsTypeDropdownOpen(false);
    setIsCategoryDropdownOpen(false);
    setIsSortDropdownOpen(false);
  };

  return (
    <div className="flex flex-col gap-2 relative">
      {/* HEADER SECTION: TITLE & SEARCH */}
      <section className="glass combat-card relative z-20 overflow-visible" aria-label="Move Dex Header">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-700/40">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-amber-400" />
            <span className="section-title">Move Dex · 1ra a 5ta Gen (559 Movimientos)</span>
          </div>
          <span className="ko-badge">
            {filteredMoves.length} / {moves.length}
          </span>
        </div>

        {/* SEARCH BAR & NEW BUTTON */}
        <div className="flex items-center gap-2 mb-2.5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-900/90 border border-slate-700/70 text-white placeholder-slate-400 text-xs focus:outline-none focus:border-emerald-500"
              placeholder="Buscar movimiento por nombre o # (ej. Explosión, 153)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                onClick={() => setSearch('')}
              >
                <X size={14} />
              </button>
            )}
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

        {/* 3-COLUMN DROPDOWN BAR EXACTLY LIKE POKETYPE SCREENSHOT */}
        <div ref={dropdownsRef} className="grid grid-cols-3 gap-1.5 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 relative z-30">
          {/* 1. TYPE DROPDOWN - FLOATS OVER MOVES LIST ON TOP */}
          <div className="relative">
            <button
              type="button"
              className={`w-full py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-between transition-colors ${
                selectedType !== 'all'
                  ? 'bg-slate-800 text-white border border-slate-600 shadow'
                  : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
              }`}
              onClick={e => {
                e.stopPropagation();
                setIsTypeDropdownOpen(prev => !prev);
                setIsCategoryDropdownOpen(false);
                setIsSortDropdownOpen(false);
              }}
            >
              <div className="flex items-center gap-1.5 truncate">
                {selectedType !== 'all' && (
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: TYPE_COLORS[selectedType]?.bg || '#999' }}
                  />
                )}
                <span className="truncate">{getTypeLabel(selectedType)}</span>
              </div>
              <ChevronDown size={14} className="text-slate-400 flex-shrink-0 ml-1" />
            </button>

            {/* DROPDOWN MENU RENDERED ON TOP (z-50) */}
            {isTypeDropdownOpen && (
              <div
                className="absolute top-full left-0 mt-1.5 w-52 max-h-80 overflow-y-auto rounded-xl bg-slate-950 border border-slate-700 shadow-2xl z-50 py-1.5 backdrop-blur-md"
                onClick={e => e.stopPropagation()}
              >
                <button
                  type="button"
                  className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center justify-between hover:bg-slate-800 transition-colors ${
                    selectedType === 'all' ? 'text-emerald-400 bg-slate-900' : 'text-slate-200'
                  }`}
                  onClick={() => {
                    setSelectedType('all');
                    setIsTypeDropdownOpen(false);
                  }}
                >
                  <span>Todo »</span>
                  {selectedType === 'all' && <Check size={14} />}
                </button>
                <div className="my-1 border-t border-slate-800" />
                {TYPES.map(([id, label]) => {
                  const typeColor = TYPE_COLORS[id] || { bg: '#666', text: '#fff' };
                  return (
                    <button
                      key={id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-xs font-bold flex items-center justify-between hover:opacity-90 transition-opacity"
                      style={{
                        backgroundColor: typeColor.bg,
                        color: typeColor.text,
                      }}
                      onClick={() => {
                        setSelectedType(id);
                        setIsTypeDropdownOpen(false);
                      }}
                    >
                      <span className="drop-shadow-sm">{label} »</span>
                      {selectedType === id && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. CATEGORY BUTTON / DROPDOWN */}
          <div className="relative">
            <button
              type="button"
              className={`w-full py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                selectedCategory !== 'all'
                  ? 'bg-amber-600/30 text-amber-200 border border-amber-500/50 shadow'
                  : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
              }`}
              onClick={e => {
                e.stopPropagation();
                setIsCategoryDropdownOpen(prev => !prev);
                setIsTypeDropdownOpen(false);
                setIsSortDropdownOpen(false);
              }}
              title="Filtrar por categoría (Físico / Especial / Estado)"
            >
              {selectedCategory === 'all' && <span className="text-amber-400">💥🌀🛡️</span>}
              {selectedCategory === 'physical' && <span>💥 Físico</span>}
              {selectedCategory === 'special' && <span>🌀 Especial</span>}
              {selectedCategory === 'status' && <span>🛡️ Estado</span>}
              <ChevronDown size={14} className="text-slate-400 ml-0.5" />
            </button>

            {isCategoryDropdownOpen && (
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-44 rounded-xl bg-slate-950 border border-slate-700 shadow-2xl z-50 py-1.5 backdrop-blur-md"
                onClick={e => e.stopPropagation()}
              >
                <button
                  type="button"
                  className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center justify-between hover:bg-slate-800 transition-colors ${
                    selectedCategory === 'all' ? 'text-amber-300 bg-slate-900' : 'text-slate-300'
                  }`}
                  onClick={() => {
                    setSelectedCategory('all');
                    setIsCategoryDropdownOpen(false);
                  }}
                >
                  <span>Todas »</span>
                  {selectedCategory === 'all' && <Check size={14} />}
                </button>
                <button
                  type="button"
                  className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center justify-between hover:bg-slate-800 transition-colors ${
                    selectedCategory === 'physical' ? 'text-orange-400 bg-slate-900' : 'text-slate-300'
                  }`}
                  onClick={() => {
                    setSelectedCategory('physical');
                    setIsCategoryDropdownOpen(false);
                  }}
                >
                  <span>💥 Físico »</span>
                  {selectedCategory === 'physical' && <Check size={14} />}
                </button>
                <button
                  type="button"
                  className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center justify-between hover:bg-slate-800 transition-colors ${
                    selectedCategory === 'special' ? 'text-indigo-400 bg-slate-900' : 'text-slate-300'
                  }`}
                  onClick={() => {
                    setSelectedCategory('special');
                    setIsCategoryDropdownOpen(false);
                  }}
                >
                  <span>🌀 Especial »</span>
                  {selectedCategory === 'special' && <Check size={14} />}
                </button>
                <button
                  type="button"
                  className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center justify-between hover:bg-slate-800 transition-colors ${
                    selectedCategory === 'status' ? 'text-slate-200 bg-slate-900' : 'text-slate-300'
                  }`}
                  onClick={() => {
                    setSelectedCategory('status');
                    setIsCategoryDropdownOpen(false);
                  }}
                >
                  <span>🛡️ Estado »</span>
                  {selectedCategory === 'status' && <Check size={14} />}
                </button>
              </div>
            )}
          </div>

          {/* 3. SORT DROPDOWN */}
          <div className="relative">
            <button
              type="button"
              className="w-full py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-between bg-slate-900/90 text-slate-300 hover:bg-slate-800 border border-slate-700/60 transition-colors"
              onClick={e => {
                e.stopPropagation();
                setIsSortDropdownOpen(prev => !prev);
                setIsTypeDropdownOpen(false);
                setIsCategoryDropdownOpen(false);
              }}
            >
              <span className="truncate">{getSortLabel(sortBy)}</span>
              <ChevronDown size={14} className="text-slate-400 flex-shrink-0 ml-1" />
            </button>

            {isSortDropdownOpen && (
              <div
                className="absolute top-full right-0 mt-1.5 w-40 rounded-xl bg-slate-950 border border-slate-700 shadow-2xl z-50 py-1.5 backdrop-blur-md"
                onClick={e => e.stopPropagation()}
              >
                <button
                  type="button"
                  className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center justify-between hover:bg-slate-800 transition-colors ${
                    sortBy === 'power' ? 'text-emerald-400 bg-slate-900' : 'text-slate-300'
                  }`}
                  onClick={() => {
                    setSortBy('power');
                    setIsSortDropdownOpen(false);
                  }}
                >
                  <span>Poder »</span>
                  {sortBy === 'power' && <Check size={14} />}
                </button>
                <button
                  type="button"
                  className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center justify-between hover:bg-slate-800 transition-colors ${
                    sortBy === 'accuracy' ? 'text-emerald-400 bg-slate-900' : 'text-slate-300'
                  }`}
                  onClick={() => {
                    setSortBy('accuracy');
                    setIsSortDropdownOpen(false);
                  }}
                >
                  <span>Precisión »</span>
                  {sortBy === 'accuracy' && <Check size={14} />}
                </button>
                <button
                  type="button"
                  className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center justify-between hover:bg-slate-800 transition-colors ${
                    sortBy === 'pp' ? 'text-emerald-400 bg-slate-900' : 'text-slate-300'
                  }`}
                  onClick={() => {
                    setSortBy('pp');
                    setIsSortDropdownOpen(false);
                  }}
                >
                  <span>PP »</span>
                  {sortBy === 'pp' && <Check size={14} />}
                </button>
                <button
                  type="button"
                  className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center justify-between hover:bg-slate-800 transition-colors ${
                    sortBy === 'name' ? 'text-emerald-400 bg-slate-900' : 'text-slate-300'
                  }`}
                  onClick={() => {
                    setSortBy('name');
                    setIsSortDropdownOpen(false);
                  }}
                >
                  <span>Nombre »</span>
                  {sortBy === 'name' && <Check size={14} />}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* COLUMN HEADERS ROW: Explicitly labels Movimiento, PP, Precisión, Poder */}
      <div className="flex items-center px-2 py-1 bg-slate-950/70 border border-slate-800/80 rounded-lg text-[11px] font-bold uppercase tracking-wider text-slate-400">
        <div className="w-1/2 pl-2">Movimiento</div>
        <div className="w-1/2 flex items-center">
          <div className="w-1/3 text-center">PP</div>
          <div className="w-1/3 text-center">Precisión</div>
          <div className="w-1/3 text-center text-rose-400">Poder</div>
        </div>
      </div>

      {/* MOVES LIST - EXACT FORMAT SHOWN IN USER SCREENSHOTS */}
      <div className="flex flex-col gap-1.5 relative z-10">
        {filteredMoves.length === 0 ? (
          <div className="glass p-8 text-center text-slate-400 text-xs rounded-xl">
            No se encontraron movimientos con los filtros actuales.
          </div>
        ) : (
          filteredMoves.map(mv => {
            const typeColor = TYPE_COLORS[mv.tipo.toLowerCase()] || { bg: '#475569', text: '#ffffff', border: '#334155' };
            const isStatus = mv.categoria === 'status';

            return (
              <div
                key={mv.id}
                className="w-full flex items-stretch h-11 rounded-md overflow-hidden border border-slate-800/80 hover:border-slate-500 transition-all cursor-pointer shadow-sm active:scale-[0.995]"
                onClick={() => {
                  setDetailMove(mv);
                  setShowLearners(false);
                  setLearnerSearch('');
                }}
              >
                {/* LEFT 50%: COLOR BLOCK WITH MOVE NAME & CATEGORY ICON */}
                <div
                  className="w-1/2 flex items-center justify-between px-3 min-w-0"
                  style={{
                    backgroundColor: typeColor.bg,
                    color: typeColor.text,
                  }}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs sm:text-sm font-semibold tracking-wide drop-shadow-sm truncate">
                      {mv.nombre}
                    </span>
                    {mv.priority ? (
                      <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-black/40 text-amber-200 border border-black/20 flex-shrink-0">
                        +{mv.priority}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-1 opacity-90">
                    {mv.categoria === 'physical' && <span title="Físico" className="text-xs">💥</span>}
                    {mv.categoria === 'special' && <span title="Especial" className="text-xs">🌀</span>}
                    {mv.categoria === 'status' && <span title="Estado" className="text-xs">🛡️</span>}
                  </div>
                </div>

                {/* RIGHT 50%: DARK CHARCOAL PANEL WITH 3 EQUAL COLUMNS: PP, PREC., PODER */}
                <div className="w-1/2 flex items-center bg-[#252830] text-slate-300 text-xs font-mono border-l border-black/25">
                  {/* 1. PP */}
                  <div className="w-1/3 text-center text-slate-300 font-sans font-medium text-[11px] sm:text-xs">
                    {mv.pp ?? 20} PP
                  </div>

                  {/* 2. Precisión */}
                  <div className="w-1/3 text-center text-slate-400 font-sans text-[11px] sm:text-xs">
                    {mv.accuracy === null ? '—' : `${mv.accuracy}%`}
                  </div>

                  {/* 3. Poder (Soft red / coral color as in Screenshot 1) */}
                  <div className="w-1/3 text-center text-rose-400 font-bold font-sans text-xs sm:text-sm">
                    {isStatus ? '—' : mv.poder || '—'}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MOVE DETAIL MODAL - EXACT FORMAT AS SHOWN IN SCREENSHOT 3 */}
      {detailMove && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3"
          style={{ zIndex: 9999 }}
          onClick={() => setDetailMove(null)}
        >
          <div
            className="relative z-[10000] w-full max-w-md max-h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-slate-700/80 bg-slate-950 text-slate-200 animate-in fade-in zoom-in-95 duration-150"
            style={{ zIndex: 10000 }}
            onClick={e => e.stopPropagation()}
          >
            {/* MODAL HEADER - COLOR BANNER WITH MOVE NAME & TYPE */}
            {(() => {
              const headerColor = TYPE_COLORS[detailMove.tipo.toLowerCase()] || { bg: '#475569', text: '#ffffff', border: '#334155' };
              return (
                <div
                  className="py-4 px-5 relative flex flex-col items-center justify-center text-center shadow-md flex-shrink-0"
                  style={{
                    backgroundColor: headerColor.bg,
                    color: headerColor.text,
                  }}
                >
                  <button
                    type="button"
                    className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors shadow"
                    onClick={() => setDetailMove(null)}
                  >
                    <X size={16} />
                  </button>

                  <h2 className="text-xl font-black uppercase tracking-wider drop-shadow-md">
                    {detailMove.nombre}
                  </h2>
                  <div className="text-xs font-semibold uppercase tracking-widest opacity-90 mt-0.5">
                    {typeName(detailMove.tipo)}
                  </div>
                </div>
              );
            })()}

            {/* MODAL BODY */}
            <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-4 text-xs">
              {/* DESCRIPTION & COMPLETE EFFECT */}
              <div className="flex flex-col gap-2 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 text-xs">
                <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={13} />
                  <span>Efecto en Combate</span>
                </div>
                <p className="text-slate-100 leading-relaxed text-xs">
                  {detailMove.descripcion || 'Sin descripción detallada.'}
                </p>
                {detailMove.competitiveDesc && detailMove.competitiveDesc !== detailMove.descripcion && (
                  <div className="mt-1 pt-2 border-t border-slate-800/80 text-[11px] text-slate-300 leading-relaxed">
                    <strong className="text-emerald-400 font-semibold block mb-0.5">Mecánica Competitiva (Showdown / PokéMMO):</strong>
                    <span>{detailMove.competitiveDesc}</span>
                  </div>
                )}
                {detailMove.priority ? (
                  <div className="text-[11px] text-amber-300 font-medium">
                    ⚡ Prioridad de ataque: <span className="font-bold">+{detailMove.priority}</span> (actúa antes que movimientos estándar).
                  </div>
                ) : null}
              </div>

              {/* STAT SUMMARY TABLE (Power, Accuracy, PP, Effect Chance) */}
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <div className="grid grid-cols-4 gap-2 text-center pb-2 border-b border-slate-800 text-[11px] font-semibold text-slate-400">
                  <div className="flex flex-col items-center gap-1">
                    {detailMove.categoria === 'physical' && <span className="text-sm">💥</span>}
                    {detailMove.categoria === 'special' && <span className="text-sm">🌀</span>}
                    {detailMove.categoria === 'status' && <span className="text-sm">🛡️</span>}
                    <span>Poder</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm">🎯</span>
                    <span>Precisión</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm">⚡</span>
                    <span>P.P.</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm">🎲</span>
                    <span>Prob. Efecto</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center pt-2.5 font-bold text-sm">
                  <div className="text-rose-400">
                    {detailMove.categoria === 'status' ? '—' : detailMove.poder || '—'}
                  </div>
                  <div className="text-cyan-300">
                    {detailMove.accuracy === null ? '—' : `${detailMove.accuracy}%`}
                  </div>
                  <div className="text-emerald-300">{detailMove.pp ?? 20}</div>
                  <div className="text-amber-300">
                    {detailMove.probEfecto !== null && detailMove.probEfecto !== undefined
                      ? `${detailMove.probEfecto}%`
                      : '—'}
                  </div>
                </div>
              </div>

              {/* TRIPLE/DOUBLE BATTLE TARGET VISUAL DIAGRAM - EXACTLY AS IN SCREENSHOT 3 */}
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
                  Distribución de Objetivos en Combate
                </div>

                {(() => {
                  const t = detailMove.target || 'selected-pokemon';
                  const isAllOther = t === 'all-other-pokemon';
                  const isAllOpponents = t === 'all-opponents';
                  const isSelected = t === 'selected-pokemon' || t === 'selected-pokemon-me-first';
                  const isUser = t === 'user';
                  const isEntireField = t === 'entire-field' || t === 'all-pokemon';
                  const isUsersField = t === 'users-field' || t === 'user-and-allies';
                  const isOpponentsField = t === 'opponents-field';
                  const isAlly = t === 'ally';

                  const enemy1Active = isAllOther || isAllOpponents || isEntireField || isOpponentsField;
                  const enemy2Active = isAllOther || isAllOpponents || isEntireField || isOpponentsField || isSelected;
                  const enemy3Active = isAllOther || isAllOpponents || isEntireField || isOpponentsField;

                  const userActive = isUser || isEntireField || isUsersField;
                  const ally1Active = isAllOther || isEntireField || isUsersField || isAlly;
                  const ally2Active = isAllOther || isEntireField || isUsersField;

                  return (
                    <div className="flex flex-col gap-2">
                      {/* ENEMIES ROW */}
                      <div className="grid grid-cols-3 gap-1.5">
                        <div
                          className={`py-1.5 text-center text-xs font-bold rounded-lg border transition-all ${
                            enemy1Active
                              ? 'bg-amber-600/30 text-amber-200 border-amber-500/60 shadow-inner'
                              : 'bg-slate-950/60 text-slate-600 border-slate-800'
                          }`}
                        >
                          Enemigo
                        </div>
                        <div
                          className={`py-1.5 text-center text-xs font-bold rounded-lg border transition-all ${
                            enemy2Active
                              ? 'bg-amber-600/30 text-amber-200 border-amber-500/60 shadow-inner'
                              : 'bg-slate-950/60 text-slate-600 border-slate-800'
                          }`}
                        >
                          Enemigo
                        </div>
                        <div
                          className={`py-1.5 text-center text-xs font-bold rounded-lg border transition-all ${
                            enemy3Active
                              ? 'bg-amber-600/30 text-amber-200 border-amber-500/60 shadow-inner'
                              : 'bg-slate-950/60 text-slate-600 border-slate-800'
                          }`}
                        >
                          Enemigo
                        </div>
                      </div>

                      {/* USER & ALLIES ROW */}
                      <div className="grid grid-cols-3 gap-1.5">
                        <div
                          className={`py-1.5 text-center text-xs font-bold rounded-lg border transition-all ${
                            userActive
                              ? 'bg-indigo-600/50 text-indigo-100 border-indigo-400 shadow-inner'
                              : 'bg-indigo-950/60 text-indigo-300 border-indigo-800/80'
                          }`}
                        >
                          ‹ Usted ›
                        </div>
                        <div
                          className={`py-1.5 text-center text-xs font-bold rounded-lg border transition-all ${
                            ally1Active
                              ? 'bg-amber-600/30 text-amber-200 border-amber-500/60 shadow-inner'
                              : 'bg-slate-950/60 text-slate-600 border-slate-800'
                          }`}
                        >
                          Aliado
                        </div>
                        <div
                          className={`py-1.5 text-center text-xs font-bold rounded-lg border transition-all ${
                            ally2Active
                              ? 'bg-amber-600/30 text-amber-200 border-amber-500/60 shadow-inner'
                              : 'bg-slate-950/60 text-slate-600 border-slate-800'
                          }`}
                        >
                          Aliado
                        </div>
                      </div>

                      {/* TARGET EXPLANATION LABEL */}
                      <div className="text-center text-xs text-slate-300 font-medium mt-1">
                        {detailMove.targetLabel || 'Objetivos del movimiento'}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* BIG BUTTON: "Mostrar Pokémon que aprenden esto »" (Screenshot 3) */}
              <button
                type="button"
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-center border transition-all shadow-md flex items-center justify-center gap-2 bg-[#706c59]/60 hover:bg-[#858069] text-amber-100 border-[#999276]/60 active:scale-[0.99]"
                onClick={() => setShowLearners(prev => !prev)}
              >
                <span>
                  {showLearners
                    ? 'Ocultar Pokémon que aprenden esto «'
                    : `Mostrar Pokémon que aprenden esto » (${learnerPokemonList.length})`}
                </span>
              </button>

              {/* EXPANDABLE LEARNERS LIST */}
              {showLearners && (
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex flex-col gap-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300">
                      {learnerPokemonList.length} Pokémon de 1ra a 5ta Gen aprenden {detailMove.nombre}:
                    </span>
                  </div>

                  {/* Filter inside learners */}
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700/80 text-white placeholder-slate-400 text-xs focus:outline-none focus:border-amber-500"
                      placeholder="Buscar entre los que aprenden esto..."
                      value={learnerSearch}
                      onChange={e => setLearnerSearch(e.target.value)}
                    />
                  </div>

                  {/* List of Pokémon cards */}
                  <div className="max-h-60 overflow-y-auto flex flex-col gap-1.5 pr-1">
                    {filteredLearners.length === 0 ? (
                      <div className="text-slate-400 text-center py-4 text-xs">
                        No se encontró ningún Pokémon con ese nombre.
                      </div>
                    ) : (
                      filteredLearners.map(p => {
                        const spriteStyle = getPokemonShowdownSpriteStyle(p.id, p.num);
                        return (
                          <div
                            key={p.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center overflow-hidden flex-shrink-0"
                                style={spriteStyle}
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-400 font-mono font-bold">
                                    #{getPokemonDexNum(p.num)}
                                  </span>
                                  <span className="text-xs font-bold text-white truncate">{p.nombre}</span>
                                </div>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <TypeBadge type={p.tipo1} size="sm" />
                                  {p.tipo2 && <TypeBadge type={p.tipo2} size="sm" />}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="py-1 px-2.5 rounded-lg text-[11px] font-bold bg-emerald-700/80 hover:bg-emerald-600 text-white flex items-center gap-1 flex-shrink-0 transition-colors shadow"
                              onClick={() => {
                                if (onSelectPokemonAndMoveInCalc) {
                                  onSelectPokemonAndMoveInCalc(p, detailMove.id);
                                } else {
                                  onSelectMoveInCalc(detailMove.id);
                                }
                                onToast(`${p.nombre} y ${detailMove.nombre} listos en la Calculadora.`);
                                setDetailMove(null);
                              }}
                            >
                              <Swords size={12} />
                              <span>Usar en Calc</span>
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* ACTION BUTTONS (TRY IN CALCULATOR) */}
              <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                <button
                  type="button"
                  className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 transition-all shadow-md"
                  onClick={() => {
                    onSelectMoveInCalc(detailMove.id);
                    onToast(`Movimiento "${detailMove.nombre}" seleccionado en la Calculadora.`);
                    setDetailMove(null);
                  }}
                >
                  <Swords size={14} />
                  <span>Probar en Calculadora</span>
                </button>

                {/* Edit & Delete for custom moves */}
                {detailMove.id.startsWith('mv-') && (
                  <>
                    <button
                      type="button"
                      className="icon-button"
                      title="Editar"
                      onClick={() => {
                        onOpenEditMoveModal(detailMove);
                        setDetailMove(null);
                      }}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-button text-rose-400 hover:text-rose-300"
                      title="Eliminar"
                      onClick={() => {
                        if (window.confirm(`¿Eliminar movimiento "${detailMove.nombre}"?`)) {
                          onDeleteMove(detailMove.id);
                          setDetailMove(null);
                        }
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
