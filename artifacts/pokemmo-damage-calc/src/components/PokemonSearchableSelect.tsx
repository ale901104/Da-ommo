import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { allGen1To5Pokemon, rawDexList } from '../dex';
import { type Pokemon } from '../pokemon-constants';
import localSheetUrl from '../assets/pokemonicons-sheet.png';

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

// Normalize strings by removing accents and non-alphanumeric characters
function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Find Pokédex number from number, pokemon object, or pokemonId string with robust resolution
export function getPokemonDexNum(target?: unknown, fallbackNum?: number): number {
  if (fallbackNum && typeof fallbackNum === 'number' && fallbackNum > 0 && fallbackNum <= 649) {
    return fallbackNum;
  }
  if (target === null || target === undefined) return 0;
  if (typeof target === 'number' && target > 0 && target <= 649) return target;

  if (typeof target === 'object') {
    const obj = target as Record<string, unknown>;
    if (typeof obj.num === 'number' && obj.num > 0 && obj.num <= 649) return obj.num;
    if (typeof obj.dexNum === 'number' && obj.dexNum > 0 && obj.dexNum <= 649) return obj.dexNum;
    if (typeof obj.nombre === 'string' && obj.nombre) {
      const n = getPokemonDexNum(obj.nombre);
      if (n > 0) return n;
    }
    if (typeof obj.pokemonId === 'string' && obj.pokemonId) {
      const n = getPokemonDexNum(obj.pokemonId);
      if (n > 0) return n;
    }
    if (typeof obj.id === 'string' && obj.id) {
      const n = getPokemonDexNum(obj.id);
      if (n > 0) return n;
    }
  }

  if (typeof target === 'string') {
    const clean = target.trim().toLowerCase();
    const parsed = parseInt(clean, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 649) return parsed;

    // Check if target is a clean name or has prefixes like "pk-"
    const cleanNoPk = clean.replace(/^pk-/, '');
    const bareSlug = cleanNoPk.split('-')[0].replace(/[^a-z0-9]/g, '');
    const norm = clean.replace(/[^a-z0-9]/g, '');

    const match = rawDexList.find(d => {
      const dClean = d.id.toLowerCase().replace(/[^a-z0-9]/g, '');
      const dNom = d.nombre.toLowerCase().replace(/[^a-z0-9]/g, '');
      return (
        d.id.toLowerCase() === clean ||
        d.nombre.toLowerCase() === clean ||
        d.id.toLowerCase() === cleanNoPk ||
        d.nombre.toLowerCase() === cleanNoPk ||
        dClean === norm ||
        dNom === norm ||
        dClean === bareSlug ||
        dNom === bareSlug
      );
    });
    if (match) return match.num;
  }
  return 0;
}

export function getPokemonSpriteUrl(target?: unknown, fallbackNum?: number): string {
  const num = getPokemonDexNum(target, fallbackNum);
  if (num > 0 && num <= 649) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${num}.png`;
  }
  return '';
}

// Alternate form icon indexes on Pokemon Showdown pokemonicons-sheet.png
export const POKEMON_FORM_ICON_INDEXES: Record<string, number> = {
  // Rotom Appliance Forms
  rotomfan: 1080,
  rotomfrost: 1081,
  rotomheat: 1082,
  rotommow: 1083,
  rotomwash: 1084,

  // Other Gen 1-5 alternate forms
  castformrainy: 1067,
  castformsnowy: 1068,
  castformsunny: 1069,
  deoxysattack: 1070,
  deoxysdefense: 1071,
  deoxysspeed: 1072,
  wormadamsandy: 1075,
  wormadamtrash: 1076,
  giratinaorigin: 1085,
  shayminsky: 1086,
  basculinbluestriped: 1088,
  darmanitanzen: 1089,
  tornadustherian: 1098,
  thundurustherian: 1099,
  landorustherian: 1100,
  kyuremblack: 1101,
  kyuremwhite: 1102,
  keldeoresolute: 1103,
  meloettapirouette: 1104,
};

export function getPokemonIconIndex(target?: unknown, fallbackNum?: number): number {
  if (target !== null && target !== undefined) {
    let clean = '';
    if (typeof target === 'string') {
      clean = target.toLowerCase().replace(/^pk-/, '').replace(/[^a-z0-9]/g, '');
    } else if (typeof target === 'object') {
      const obj = target as Record<string, unknown>;
      const idStr = typeof obj.id === 'string' ? obj.id : '';
      const nameStr = typeof obj.nombre === 'string' ? obj.nombre : (typeof obj.name === 'string' ? obj.name : '');
      const pkIdStr = typeof obj.pokemonId === 'string' ? obj.pokemonId : '';
      clean = (idStr || pkIdStr || nameStr).toLowerCase().replace(/^pk-/, '').replace(/[^a-z0-9]/g, '');
    }
    if (clean && POKEMON_FORM_ICON_INDEXES[clean]) {
      return POKEMON_FORM_ICON_INDEXES[clean];
    }
  }

  // If a number was passed directly and it's already a high form index (> 649 and <= 1640), preserve it
  if (typeof target === 'number' && target > 649 && target <= 1640) {
    return target;
  }

  return getPokemonDexNum(target, fallbackNum);
}

// 100% Offline Pokémon Showdown icon sprite generator from local sheet asset
export function getPokemonShowdownSpriteStyle(target?: unknown, fallbackNum?: number): React.CSSProperties {
  const iconIndex = getPokemonIconIndex(target, fallbackNum);
  if (iconIndex <= 0 || iconIndex > 1640) return {};
  const left = (iconIndex % 12) * 40;
  const top = Math.floor(iconIndex / 12) * 30;
  const sheetSrc = localSheetUrl || '/pokemonicons-sheet.png';
  return {
    display: 'inline-block',
    width: '40px',
    height: '30px',
    backgroundImage: `url("${sheetSrc}")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: `-${left}px -${top}px`,
    imageRendering: 'pixelated',
  };
}

// Reusable 100% offline crisp Pokemon Sprite (No network request needed)
export const PokemonSprite: React.FC<{
  target?: unknown;
  fallbackNum?: number;
  name?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}> = ({ target, fallbackNum, name = 'Pokemon', className = '', size = 'md' }) => {
  const dexNum = getPokemonDexNum(target, fallbackNum);
  if (!dexNum) {
    return (
      <div className={`flex items-center justify-center text-slate-600 text-xs ${className}`}>
        —
      </div>
    );
  }

  const scale = size === 'xs' ? 'scale-[0.55]' : size === 'sm' ? 'scale-75' : size === 'lg' ? 'scale-125' : 'scale-100';
  const boxSize = size === 'xs' ? 'w-6 h-5' : size === 'sm' ? 'w-8 h-6' : size === 'lg' ? 'w-14 h-10' : 'w-10 h-[30px]';

  return (
    <div className={`${boxSize} flex items-center justify-center flex-shrink-0 overflow-hidden ${className}`}>
      <span
        style={getPokemonShowdownSpriteStyle(dexNum)}
        className={`image-pixelated origin-center ${scale}`}
        role="img"
        aria-label={name}
      />
    </div>
  );
};

// Highlight matched characters in search query
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
      <strong className="pokemon-dropdown-match">{match}</strong>
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
  placeholder = 'Buscar Pokémon...',
  className = '',
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Selected Pokémon based on current value
  const selectedPokemon = useMemo(() => {
    return pokemonList.find(p => p.id === value) || null;
  }, [pokemonList, value]);

  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState(selectedPokemon?.nombre ?? '');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Keep input text in sync when value changes externally and dropdown is closed
  useEffect(() => {
    if (!isOpen) {
      setInputText(selectedPokemon?.nombre ?? '');
    }
  }, [selectedPokemon, isOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setInputText(selectedPokemon?.nombre ?? '');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedPokemon]);

  // Combined master list of all Pokémon (teams first, custom, then all Gen 1-5 Dex)
  const masterList = useMemo(() => {
    const map = new Map<string, Pokemon>();
    for (const p of pokemonList) map.set(p.id, p);
    for (const p of equipoOU) map.set(p.id, p);
    for (const p of equipoUU) map.set(p.id, p);
    for (const p of equipoNU) map.set(p.id, p);
    for (const p of allGen1To5Pokemon) {
      if (!map.has(p.id)) {
        map.set(p.id, p);
      }
    }
    return Array.from(map.values());
  }, [pokemonList, equipoOU, equipoUU, equipoNU]);

  // Real-time predictive search filtering without any cursor manipulation
  const filteredOptions = useMemo(() => {
    const rawQuery = inputText.trim();
    const query = normalizeText(rawQuery);
    const numClean = rawQuery.replace(/^#/, '').trim();

    // If query matches the currently selected pokemon name, show all options ordered by Dex/team
    if (!query || (selectedPokemon && rawQuery.toLowerCase() === selectedPokemon.nombre.toLowerCase())) {
      const sorted = [...masterList].sort((a, b) => {
        const numA = getPokemonDexNum(a);
        const numB = getPokemonDexNum(b);
        return numA - numB;
      });
      return sorted.slice(0, 80);
    }

    const scored: { pokemon: Pokemon; score: number }[] = [];
    const seen = new Set<string>();

    for (const p of masterList) {
      if (seen.has(p.id)) continue;

      const normName = normalizeText(p.nombre);
      const normId = normalizeText(p.id);
      const dexNum = getPokemonDexNum(p);
      const numStr = String(dexNum);

      let score = 0;

      // Exact match
      if (normName === query || normId === query) {
        score = 100;
      }
      // Starts with query (prefix match, e.g. "g" -> Golbat, Gloom, Golduck, Growlithe...)
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
      // Number match
      else if (numClean && (numStr === numClean || numStr.padStart(3, '0') === numClean)) {
        score = 70;
      }
      // Contains in name
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

    // Sort: highest score first, then by Pokédex number
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const numA = getPokemonDexNum(a.pokemon);
      const numB = getPokemonDexNum(b.pokemon);
      return numA - numB;
    });

    return scored.slice(0, 80).map(s => s.pokemon);
  }, [masterList, inputText, selectedPokemon]);

  // Reset highlighted item when list changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredOptions.length]);

  const handleSelect = (pk: Pokemon) => {
    onChange(pk.id);
    setInputText(pk.nombre);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!isOpen) setIsOpen(true);
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
      setInputText(selectedPokemon?.nombre ?? '');
    }
  };

  const scrollIndexIntoView = (idx: number) => {
    if (listRef.current) {
      const items = listRef.current.querySelectorAll('.pokemon-dropdown-item');
      if (items[idx]) {
        (items[idx] as HTMLElement).scrollIntoView({ block: 'nearest' });
      }
    }
  };

  return (
    <div className={`pokemon-search-field-wrapper ${className}`} ref={containerRef}>
      {/* ONLY THE CLEAN TEXT INPUT FIELD (No top bar, no quick action buttons, no filter) */}
      <div className="pokemon-search-input-box">
        {selectedPokemon && !isOpen && getPokemonDexNum(selectedPokemon) > 0 ? (
          <span
            className="pokemon-search-icon-showdown flex-shrink-0"
            style={getPokemonShowdownSpriteStyle(selectedPokemon)}
            role="img"
            aria-hidden="true"
          />
        ) : (
          <Search size={16} className="pokemon-search-icon-left" />
        )}

        <input
          id={inputId}
          ref={inputRef}
          type="text"
          dir="ltr"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className={`pokemon-search-input ${selectedPokemon && !isOpen ? 'has-showdown-icon' : ''}`}
          data-testid={dataTestId}
          aria-label={label}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          role="combobox"
          title={selectedPokemon?.nombre || inputText}
          placeholder={selectedPokemon?.nombre || placeholder}
          value={inputText}
          style={
            selectedPokemon && !isOpen
              ? {
                  fontSize:
                    inputText.length > 15
                      ? '11px'
                      : inputText.length > 11
                      ? '12px'
                      : '13px',
                }
              : undefined
          }
          onFocus={e => {
            setIsOpen(true);
            e.target.select();
          }}
          onClick={() => {
            if (!isOpen) setIsOpen(true);
          }}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />

        {inputText && (
          <button
            type="button"
            className="pokemon-search-clear-right"
            aria-label="Limpiar campo"
            onClick={() => {
              setInputText('');
              setIsOpen(true);
              inputRef.current?.focus();
            }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* DROPDOWN LIST WITH DARK THEME, SPRITES AND NAMES (EXACT MATCH TO REFERENCE IMAGE) */}
      {isOpen && (
        <div className="pokemon-search-dropdown" ref={listRef} role="listbox">
          {filteredOptions.length === 0 ? (
            <div className="pokemon-dropdown-empty">
              <span>No se encontró ningún Pokémon para "{inputText}".</span>
            </div>
          ) : (
            filteredOptions.map((pk, idx) => {
              const dexNum = getPokemonDexNum(pk);
              const isSelected = selectedPokemon?.id === pk.id;
              const isHighlighted = idx === highlightedIndex;

              return (
                <div
                  key={`${pk.id}-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  className={`pokemon-dropdown-item ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                  onMouseDown={e => {
                    e.preventDefault();
                    handleSelect(pk);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                >
                  {/* Left: Offline Pokémon Showdown Sprite Sheet Icon */}
                  <div className="pokemon-dropdown-sprite-wrap">
                    {dexNum > 0 ? (
                      <span
                        className="pokemon-dropdown-icon"
                        style={getPokemonShowdownSpriteStyle(pk)}
                        role="img"
                        aria-label={pk.nombre}
                      />
                    ) : (
                      <div className="pokemon-dropdown-sprite-blank" />
                    )}
                  </div>

                  {/* Name in Crisp White Text */}
                  <span className="pokemon-dropdown-name">
                    {highlightMatch(pk.nombre, inputText)}
                  </span>

                  {/* Checkmark indicator for currently selected */}
                  {isSelected && <Check size={16} className="pokemon-dropdown-check" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
