import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { type Pokemon } from '../pokemon-constants';

interface PokemonSearchableSelectProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (pokemonId: string) => void;
  pokemonList: Pokemon[];
  equipoOU: Pokemon[];
  equipoUU: Pokemon[];
  equipoNU: Pokemon[];
  dataTestId?: string;
  placeholder?: string;
  className?: string;
}

// Normalize strings by removing accents, symbols and whitespace for robust predictive matching
function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Highlight the matched substring in the Pokémon name
function highlightMatch(name: string, query: string) {
  const cleanQ = query.trim().toLowerCase();
  if (!cleanQ) return <span>{name}</span>;

  const lowerName = name.toLowerCase();
  const idx = lowerName.indexOf(cleanQ);

  if (idx === -1) {
    return <span>{name}</span>;
  }

  const before = name.slice(0, idx);
  const match = name.slice(idx, idx + cleanQ.length);
  const after = name.slice(idx + cleanQ.length);

  return (
    <span>
      {before}
      <strong className="combobox-match-highlight">{match}</strong>
      {after}
    </span>
  );
}

export const PokemonSearchableSelect: React.FC<PokemonSearchableSelectProps> = ({
  id,
  label = 'Seleccionar Pokémon',
  value,
  onChange,
  pokemonList,
  equipoOU,
  equipoUU,
  equipoNU,
  dataTestId = 'select-pokemon',
  placeholder = 'Escribe el nombre del Pokémon...',
  className = '',
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Tracks cursor position to prevent cursor jumping to index 0 (which causes typing in reverse)
  const cursorRef = useRef<number | null>(null);

  const selectedPokemon = useMemo(() => {
    return pokemonList.find(p => p.id === value) || null;
  }, [pokemonList, value]);

  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState(selectedPokemon?.nombre ?? '');
  const [isTyping, setIsTyping] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Synchronously restore cursor position before browser paint so characters are NEVER inserted at 0
  useLayoutEffect(() => {
    if (cursorRef.current !== null && inputRef.current && document.activeElement === inputRef.current) {
      const pos = cursorRef.current;
      inputRef.current.setSelectionRange(pos, pos);
    }
  });

  // Keep input text synced with selected Pokémon when dropdown is closed or not typing
  useEffect(() => {
    if (!isOpen && !isTyping) {
      setInputText(selectedPokemon?.nombre ?? '');
      cursorRef.current = null;
    }
  }, [selectedPokemon, isOpen, isTyping]);

  // Real-time predictive search filtering
  const filteredOptions = useMemo(() => {
    const rawQuery = inputText.trim();
    const query = normalizeText(rawQuery);
    const numClean = rawQuery.replace(/^#/, '').trim();

    // If query is empty, show default ordered list (teams first, then dex)
    if (!query) {
      const seen = new Set<string>();
      const ordered: Pokemon[] = [];

      for (const p of [...equipoOU, ...equipoUU, ...equipoNU, ...pokemonList]) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          ordered.push(p);
        }
      }
      return ordered.slice(0, 50);
    }

    // Predictive scoring of matches
    const scored: { pokemon: Pokemon; score: number }[] = [];
    const seen = new Set<string>();

    for (const p of pokemonList) {
      if (seen.has(p.id)) continue;

      const normName = normalizeText(p.nombre);
      const normId = normalizeText(p.id);
      const numStr = String(p.num ?? '');

      let score = 0;

      // Exact match
      if (normName === query || normId === query) {
        score = 100;
      }
      // Starts with query (predictive prefix)
      else if (normName.startsWith(query)) {
        score = 80;
      }
      // Word inside name starts with query (e.g. "Mime" in "Mr. Mime")
      else if (
        p.nombre
          .toLowerCase()
          .split(/[\s.\-_]+/)
          .some(w => normalizeText(w).startsWith(query))
      ) {
        score = 75;
      }
      // Number match (#025 or 25)
      else if (numClean && (numStr === numClean || numStr.padStart(3, '0') === numClean)) {
        score = 70;
      }
      // Contains anywhere in name
      else if (normName.includes(query)) {
        score = 50;
      }
      // Contains in id
      else if (normId.includes(query)) {
        score = 40;
      }

      if (score > 0) {
        seen.add(p.id);
        scored.push({ pokemon: p, score });
      }
    }

    // Sort by match score descending, then by Dex number
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.pokemon.num ?? 999) - (b.pokemon.num ?? 999);
    });

    return scored.slice(0, 50).map(s => s.pokemon);
  }, [inputText, pokemonList, equipoOU, equipoUU, equipoNU]);

  // Close dropdown when clicking outside and restore selected name if not chosen
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsTyping(false);
        cursorRef.current = null;
        setInputText(selectedPokemon?.nombre ?? '');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedPokemon]);

  // Reset highlighted item when results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredOptions.length]);

  const handleSelect = (pk: Pokemon) => {
    onChange(pk.id);
    setInputText(pk.nombre);
    setIsTyping(false);
    cursorRef.current = null;
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart;
    cursorRef.current = pos;
    setInputText(val);
    setIsTyping(true);
    if (!isOpen) setIsOpen(true);
  };

  const handleSelectOrCursorChange = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const target = e.currentTarget;
    cursorRef.current = target.selectionStart;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(i => Math.min(filteredOptions.length - 1, i + 1));
      scrollIndexIntoView(highlightedIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(i => Math.max(0, i - 1));
      scrollIndexIntoView(highlightedIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filteredOptions[highlightedIndex];
      if (target) {
        handleSelect(target);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setIsTyping(false);
      cursorRef.current = null;
      setInputText(selectedPokemon?.nombre ?? '');
    }
  };

  const scrollIndexIntoView = (idx: number) => {
    if (listRef.current) {
      const items = listRef.current.querySelectorAll('.combobox-item');
      if (items[idx]) {
        (items[idx] as HTMLElement).scrollIntoView({ block: 'nearest' });
      }
    }
  };

  // Dynamic placeholder showing current selection when user focuses to type
  const dynamicPlaceholder = selectedPokemon ? `Actual: ${selectedPokemon.nombre}` : placeholder;

  return (
    <div className={`pokemon-searchable-combobox ${className}`} ref={containerRef}>
      <div className="combobox-input-wrapper">
        <Search size={15} className="combobox-search-icon" />
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          dir="ltr"
          className="combobox-input"
          data-testid={dataTestId}
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-label={label}
          placeholder={dynamicPlaceholder}
          value={inputText}
          autoComplete="off"
          spellCheck={false}
          onFocus={() => {
            setIsOpen(true);
            if (!isTyping && selectedPokemon && inputText === selectedPokemon.nombre) {
              setInputText('');
              setIsTyping(true);
              cursorRef.current = 0;
            }
          }}
          onClick={e => {
            setIsOpen(true);
            if (!isTyping && selectedPokemon && inputText === selectedPokemon.nombre) {
              setInputText('');
              setIsTyping(true);
              cursorRef.current = 0;
            } else {
              cursorRef.current = e.currentTarget.selectionStart;
            }
          }}
          onSelect={handleSelectOrCursorChange}
          onKeyUp={handleSelectOrCursorChange}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />

        {inputText && (
          <button
            type="button"
            className="combobox-clear-btn"
            aria-label="Limpiar búsqueda"
            onClick={() => {
              setInputText('');
              setIsTyping(true);
              cursorRef.current = 0;
              setIsOpen(true);
              inputRef.current?.focus();
            }}
          >
            <X size={13} />
          </button>
        )}

        <button
          type="button"
          className="combobox-toggle-btn"
          aria-label="Desplegar lista de Pokémon"
          tabIndex={-1}
          onClick={() => {
            setIsOpen(prev => !prev);
            if (!isOpen) {
              inputRef.current?.focus();
            }
          }}
        >
          <ChevronDown size={14} className={isOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
      </div>

      {isOpen && (
        <div className="combobox-dropdown" ref={listRef} role="listbox">
          {/* Real-time search status banner so the user clearly sees what they are writing */}
          {inputText.trim() && (
            <div className="combobox-search-status">
              <span>
                Escribiendo: <strong className="combobox-query-mark">{inputText}</strong>
              </span>
              <span className="combobox-count-badge">
                {filteredOptions.length} {filteredOptions.length === 1 ? 'resultado' : 'resultados'}
              </span>
            </div>
          )}

          {filteredOptions.length === 0 ? (
            <div className="combobox-empty">
              <span>No se encontró ningún Pokémon para "{inputText}".</span>
            </div>
          ) : (
            filteredOptions.map((pk, idx) => {
              const isSelected = selectedPokemon?.id === pk.id;
              const isHighlighted = idx === highlightedIndex;

              return (
                <div
                  key={`${pk.id}-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  className={`combobox-item ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={() => handleSelect(pk)}
                >
                  {/* Name only as requested - with highlight of what is being typed */}
                  <span className="combobox-item-name">
                    {highlightMatch(pk.nombre, inputText)}
                  </span>

                  {isSelected && <Check size={14} className="combobox-item-check" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
