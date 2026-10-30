import React, { useState, useEffect, useRef, useMemo, useId } from 'react';
import { Search, X, ChevronDown, Check, Zap, Shield, Swords, Sparkles } from 'lucide-react';
import { type Move, TYPE_COLORS, typeName, HIDDEN_POWER_TYPES } from '../pokemon-constants';

interface MoveSearchableSelectProps {
  id?: string;
  label?: string;
  value: string; // can be move.id or move.nombre
  onChange: (moveId: string, moveName: string, moveObj: Move) => void;
  availableMoves: Move[];
  placeholder?: string;
  slotNumber?: number;
  theme?: 'light' | 'dark';
  className?: string;
  allowClear?: boolean;
  onClear?: () => void;
}

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export const MoveSearchableSelect: React.FC<MoveSearchableSelectProps> = ({
  id,
  label,
  value,
  onChange,
  availableMoves,
  placeholder = 'Escribe para buscar (ej. Hidrobomba, Terremoto)...',
  slotNumber,
  theme = 'dark',
  className = '',
  allowClear = true,
  onClear,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [selectedHpType, setSelectedHpType] = useState<string>('ice');

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const inputId = id || generatedId;

  const isLight = theme === 'light';

  // Find currently selected move object
  const currentMove = useMemo(() => {
    if (!value) return null;
    const vNorm = normalize(value);
    return (
      availableMoves.find(
        m =>
          m.id === value ||
          m.nombre === value ||
          normalize(m.id) === vNorm ||
          normalize(m.nombre) === vNorm ||
          m.showdownKey === value
      ) || null
    );
  }, [value, availableMoves]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsTyping(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter moves based on query
  const filteredMoves = useMemo(() => {
    const q = isTyping ? normalize(query) : '';
    if (!q) {
      return availableMoves.slice(0, 80);
    }

    const isSearchingHp = q.includes('poder') || q.includes('oculto') || q.includes('hidden') || q.includes('hp');

    return availableMoves
      .filter(m => {
        const nom = normalize(m.nombre);
        const mid = normalize(m.id);
        const tip = normalize(typeName(m.tipo));
        const engTip = normalize(m.tipo);

        if (nom.includes(q) || mid.includes(q) || tip.includes(q) || engTip.includes(q)) {
          return true;
        }

        if (isSearchingHp && (mid.startsWith('hidden-power') || nom.includes('poder oculto'))) {
          return true;
        }

        return false;
      })
      .slice(0, 80);
  }, [query, isTyping, availableMoves]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredMoves.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredMoves.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredMoves[highlightedIndex]) {
        handleSelectMove(filteredMoves[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setIsTyping(false);
      setQuery('');
    }
  };

  const handleSelectMove = (m: Move) => {
    onChange(m.id, m.nombre, m);
    setIsOpen(false);
    setIsTyping(false);
    setQuery('');
  };

  const handleClear = () => {
    if (onClear) onClear();
    else onChange('', '', {} as Move);
    setIsTyping(false);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const typeColor = currentMove?.tipo
    ? TYPE_COLORS[currentMove.tipo.toLowerCase()] || { bg: '#64748b', text: '#ffffff', border: '#475569' }
    : { bg: '#64748b', text: '#ffffff', border: '#475569' };

  // Current text to display in the input field
  const displayedText = isTyping ? query : (currentMove ? currentMove.nombre : '');

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col gap-1 w-full ${isOpen ? 'z-50' : 'z-10'} ${className}`}
    >
      {/* Label with optional Slot Number */}
      {label && (
        <div className="flex items-center justify-between text-xs font-bold">
          <label htmlFor={inputId} className={isLight ? 'text-slate-700' : 'text-slate-300'}>
            {slotNumber ? `Movimiento #${slotNumber}: ${label}` : label}
          </label>
        </div>
      )}

      {/* SEARCH BAR THAT SOLELY CONTAINS THE SELECTED MOVE */}
      <div className="relative w-full">
        <div
          className={`flex items-center w-full rounded-xl border px-3 py-2 transition-all ${
            isOpen
              ? 'border-emerald-500 ring-2 ring-emerald-500/25 bg-slate-900 shadow-lg'
              : isLight
              ? 'border-slate-300 hover:border-slate-400 bg-white shadow-xs'
              : 'border-slate-700/80 hover:border-slate-600 bg-slate-950/90 shadow-xs'
          }`}
        >
          {/* Type Badge inside input if move is selected and not actively typing */}
          {currentMove && !isTyping ? (
            <span
              className="mr-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white shrink-0 shadow-xs"
              style={{ backgroundColor: typeColor.bg }}
            >
              {typeName(currentMove.tipo)}
            </span>
          ) : (
            <Search
              size={16}
              className={`mr-2.5 shrink-0 ${isOpen ? 'text-emerald-400' : 'text-slate-400'}`}
            />
          )}

          <input
            ref={inputRef}
            id={inputId}
            type="text"
            value={displayedText}
            onChange={e => {
              setIsTyping(true);
              setQuery(e.target.value);
              setIsOpen(true);
              setHighlightedIndex(0);
            }}
            onFocus={e => {
              setIsOpen(true);
              e.currentTarget.select();
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`w-full bg-transparent text-xs sm:text-sm font-semibold outline-none ${
              isLight ? 'text-slate-900 placeholder:text-slate-400' : 'text-white placeholder:text-slate-400'
            }`}
          />

          {/* Action buttons (Clear / Dropdown toggle) */}
          {(currentMove || query) && allowClear ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-white cursor-pointer ml-1"
              title="Borrar movimiento"
            >
              <X size={15} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsOpen(v => !v);
                if (!isOpen) setTimeout(() => inputRef.current?.focus(), 50);
              }}
              className="p-1 text-slate-400 hover:text-white cursor-pointer ml-1"
            >
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>
          )}
        </div>

        {/* FLOATING PREDICTIVE DROPDOWN */}
        {isOpen && (
          <div
            ref={listRef}
            className={`absolute left-0 right-0 top-full mt-1.5 rounded-xl border shadow-2xl overflow-hidden max-h-72 flex flex-col z-[99999] ${
              isLight
                ? 'bg-white border-slate-300 divide-slate-100 shadow-slate-400/30'
                : 'bg-slate-950 border-slate-700 divide-slate-800 shadow-black/80'
            }`}
            style={{ minWidth: '100%' }}
          >
            {/* Header info */}
            <div
              className={`px-3 py-1.5 border-b flex items-center justify-between text-[11px] font-bold ${
                isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              <span>{filteredMoves.length} movimientos predictivos</span>
              <span className="text-[10px] font-normal italic">Escribe para filtrar</span>
            </div>

            {/* Scrollable move options */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-800/40">
              {allowClear && (
                <button
                  type="button"
                  onClick={() => {
                    if (onClear) onClear();
                    else onChange('', '', {} as Move);
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                    isLight ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-slate-900 text-slate-400'
                  }`}
                >
                  <span>(Sin movimiento seleccionado)</span>
                </button>
              )}

              {filteredMoves.map((m, idx) => {
                const isSelected = currentMove?.id === m.id || currentMove?.nombre === m.nombre;
                const isHighlighted = idx === highlightedIndex;
                const mColor = TYPE_COLORS[m.tipo.toLowerCase()] || { bg: '#64748b', text: '#ffffff' };

                return (
                  <button
                    key={`${m.id}-${idx}`}
                    type="button"
                    onClick={() => handleSelectMove(m)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? isLight
                          ? 'bg-emerald-50 text-emerald-900 font-bold'
                          : 'bg-emerald-950/70 text-emerald-200 font-bold'
                        : isHighlighted
                        ? isLight
                          ? 'bg-slate-100 text-slate-900'
                          : 'bg-slate-900 text-white'
                        : isLight
                        ? 'text-slate-800 hover:bg-slate-50'
                        : 'text-slate-200 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {/* Type badge */}
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase shrink-0 shadow-xs"
                        style={{ backgroundColor: mColor.bg }}
                      >
                        {typeName(m.tipo)}
                      </span>

                      {/* Full move name */}
                      <span className="text-xs font-bold truncate">
                        {m.nombre}
                      </span>

                      {/* Category tag */}
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-medium shrink-0 ${
                          m.categoria === 'physical'
                            ? 'bg-orange-500/20 text-orange-400'
                            : m.categoria === 'special'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-slate-500/20 text-slate-400'
                        }`}
                      >
                        {m.categoria === 'physical'
                          ? 'Físico'
                          : m.categoria === 'special'
                          ? 'Especial'
                          : 'Estado'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-[11px]">
                      <span className="font-semibold text-slate-400">
                        {m.poder > 0 ? `${m.poder} P` : '—'}
                      </span>
                      {isSelected && <Check size={14} className="text-emerald-400" />}
                    </div>
                  </button>
                );
              })}

              {filteredMoves.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400">
                  No se encontró ningún movimiento con &quot;{query}&quot;
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MoveSearchableSelect;
