import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { type Pokemon } from '../pokemon-constants';

interface PokemonSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRole: 'attacker' | 'defender' | null;
  currentPokemonId: string;
  onSelectPokemon: (pokemon: Pokemon) => void;
  pokemonList: Pokemon[];
  equipoOU: Pokemon[];
  equipoUU: Pokemon[];
  equipoNU: Pokemon[];
}

// Normalize strings by removing accents, symbols and whitespace for fast predictive matching
function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Highlight the matched letters in the Pokémon name
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
      <strong className="pokemon-select-highlight">{match}</strong>
      {after}
    </span>
  );
}

export const PokemonSelectModal: React.FC<PokemonSelectModalProps> = ({
  isOpen,
  onClose,
  targetRole,
  currentPokemonId,
  onSelectPokemon,
  pokemonList,
  equipoOU,
  equipoUU,
  equipoNU,
}) => {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset search and auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Predictive search results
  const filteredList = useMemo(() => {
    const raw = search.trim();
    const query = normalizeText(raw);
    const numClean = raw.replace(/^#/, '').trim();

    if (!query) {
      // Default view: Team Pokemon first, then all Gen 1-5 Dex
      const seen = new Set<string>();
      const ordered: Pokemon[] = [];

      for (const p of [...equipoOU, ...equipoUU, ...equipoNU, ...pokemonList]) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          ordered.push(p);
        }
      }
      return ordered.slice(0, 100);
    }

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
      // Word inside name starts with query
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

    // Sort by score descending, then by Dex number
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.pokemon.num ?? 999) - (b.pokemon.num ?? 999);
    });

    return scored.slice(0, 80).map(s => s.pokemon);
  }, [search, pokemonList, equipoOU, equipoUU, equipoNU]);

  if (!isOpen) return null;

  const roleTitle = targetRole === 'attacker' ? 'Pokémon Atacante' : 'Pokémon Defensor';

  return (
    <div className="pokemon-select-backdrop" onClick={onClose}>
      <div
        className="pokemon-select-modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pokemon-select-title"
      >
        {/* Header */}
        <div className="pokemon-select-header">
          <div>
            <span className="pokemon-select-kicker">CUADRO DE ENFRENTAMIENTO</span>
            <h2 id="pokemon-select-title" className="pokemon-select-title">
              Seleccionar {roleTitle}
            </h2>
          </div>
          <button
            type="button"
            className="pokemon-select-close-btn"
            aria-label="Cerrar selector"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* Search input field: native, wide, no reverse typing */}
        <div className="pokemon-select-search-wrap">
          <Search size={18} className="pokemon-select-search-icon" />
          <input
            ref={inputRef}
            type="search"
            dir="ltr"
            className="pokemon-select-search-input"
            placeholder="Escribe el nombre del Pokémon (ej. Lucario, Garchomp, #448)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          {search && (
            <button
              type="button"
              className="pokemon-select-clear-btn"
              aria-label="Borrar búsqueda"
              onClick={() => {
                setSearch('');
                inputRef.current?.focus();
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Real-time search status banner */}
        <div className="pokemon-select-status-bar">
          {search.trim() ? (
            <span>
              Resultados para: <strong>"{search.trim()}"</strong>
            </span>
          ) : (
            <span>Todos los Pokémon (Equipos guardados & Pokédex Gen 1-5)</span>
          )}
          <span className="pokemon-select-count">{filteredList.length} disponibles</span>
        </div>

        {/* Options list: ONLY NAMES, NO ICONS */}
        <div className="pokemon-select-list" role="listbox">
          {filteredList.length === 0 ? (
            <div className="pokemon-select-empty">
              <p>No se encontró ningún Pokémon con "{search}".</p>
              <button
                type="button"
                className="pokemon-select-reset-btn"
                onClick={() => {
                  setSearch('');
                  inputRef.current?.focus();
                }}
              >
                Limpiar búsqueda
              </button>
            </div>
          ) : (
            filteredList.map(pk => {
              const isSelected = pk.id === currentPokemonId;

              return (
                <button
                  key={pk.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`pokemon-select-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    onSelectPokemon(pk);
                    onClose();
                  }}
                >
                  {/* Name only as requested */}
                  <span className="pokemon-select-item-name">
                    {highlightMatch(pk.nombre, search)}
                  </span>

                  {isSelected && <Check size={16} className="pokemon-select-item-check" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
