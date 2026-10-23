import React from 'react';
import { X } from 'lucide-react';

export interface TypeDef {
  id: string;
  name: string;
  color: string;
}

export const LEFT_TYPES: TypeDef[] = [
  { id: 'normal', name: 'Normal', color: '#9FA278' },
  { id: 'fire', name: 'Fuego', color: '#EB8445' },
  { id: 'fighting', name: 'Lucha', color: '#CF625A' },
  { id: 'water', name: 'Agua', color: '#6B93E8' },
  { id: 'flying', name: 'Volador', color: '#A2A8E8' },
  { id: 'grass', name: 'Planta', color: '#78BE62' },
  { id: 'poison', name: 'Veneno', color: '#A4539E' },
  { id: 'electric', name: 'Eléctrico', color: '#E9CA4C' },
  { id: 'ground', name: 'Tierra', color: '#CEB36E' },
];

export const RIGHT_TYPES: TypeDef[] = [
  { id: 'psychic', name: 'Psíquico', color: '#E55F88' },
  { id: 'rock', name: 'Roca', color: '#AEA04B' },
  { id: 'ice', name: 'Hielo', color: '#77B7B2' },
  { id: 'bug', name: 'Bicho', color: '#A5B636' },
  { id: 'dragon', name: 'Dragón', color: '#157EE8' },
  { id: 'ghost', name: 'Fantasma', color: '#76678C' },
  { id: 'dark', name: 'Siniestro', color: '#7C6C63' },
  { id: 'steel', name: 'Acero', color: '#8FA3B2' },
];

export const ALL_POKETYPE_TYPES: TypeDef[] = [...LEFT_TYPES, ...RIGHT_TYPES];

export function getPokeTypeColor(typeId: string): string {
  const clean = typeId.toLowerCase().trim();
  const match = ALL_POKETYPE_TYPES.find(t => t.id === clean);
  return match?.color || '#334155';
}

export function getPokeTypeName(typeId: string): string {
  const clean = typeId.toLowerCase().trim();
  const match = ALL_POKETYPE_TYPES.find(t => t.id === clean);
  return match?.name || typeId;
}

interface TypeSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (typeId: string) => void;
  currentType?: string;
  slotTitle?: string;
}

export const TypeSelectModal: React.FC<TypeSelectModalProps> = ({
  isOpen,
  onClose,
  onSelectType,
  currentType,
  slotTitle,
}) => {
  if (!isOpen) return null;

  const handleSelect = (typeId: string) => {
    onSelectType(typeId);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[340px] bg-[#222222] rounded-xl overflow-hidden shadow-2xl border border-white/10 flex flex-col text-white"
        role="dialog"
        aria-modal="true"
        aria-label="Seleccione un Tipo"
      >
        {/* MODAL HEADER */}
        <div className="relative py-3.5 px-4 text-center border-b border-white/10">
          <h3 className="text-base font-semibold tracking-wide text-white">
            Seleccione un Tipo
          </h3>
          {slotTitle && (
            <span className="block text-[11px] text-slate-400 font-normal mt-0.5">
              {slotTitle}
            </span>
          )}
          <button
            type="button"
            className="absolute right-3 top-3.5 text-slate-400 hover:text-white transition-colors p-1"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* 2-COLUMN TYPE GRID (EXACT LAYOUT FROM SCREENSHOT) */}
        <div className="grid grid-cols-2 gap-[2px] bg-[#1a1a1a] p-[2px]">
          {/* LEFT COLUMN (9 TYPES) */}
          <div className="flex flex-col gap-[2px]">
            {LEFT_TYPES.map(t => {
              const isSelected = currentType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelect(t.id)}
                  style={{ backgroundColor: t.color }}
                  className={`w-full text-left px-3.5 py-2.5 font-bold text-white text-[15px] tracking-wide transition-transform active:scale-[0.98] select-none ${
                    isSelected ? 'ring-2 ring-white ring-inset' : ''
                  }`}
                >
                  <span
                    style={{
                      textShadow: '0 1px 2px rgba(0,0,0,0.65), 0 0 1px rgba(0,0,0,0.9)',
                    }}
                  >
                    {t.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* RIGHT COLUMN (8 TYPES - EXCLUDING HADA) */}
          <div className="flex flex-col gap-[2px]">
            {RIGHT_TYPES.map(t => {
              const isSelected = currentType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelect(t.id)}
                  style={{ backgroundColor: t.color }}
                  className={`w-full text-left px-3.5 py-2.5 font-bold text-white text-[15px] tracking-wide transition-transform active:scale-[0.98] select-none ${
                    isSelected ? 'ring-2 ring-white ring-inset' : ''
                  }`}
                >
                  <span
                    style={{
                      textShadow: '0 1px 2px rgba(0,0,0,0.65), 0 0 1px rgba(0,0,0,0.9)',
                    }}
                  >
                    {t.name}
                  </span>
                </button>
              );
            })}
            {/* Balance placeholder cell with subtle dark tone */}
            <div className="w-full flex-1 min-h-[42px] bg-[#222222]/60" />
          </div>
        </div>

        {/* BOTTOM "CUALQUIER" BUTTON */}
        <button
          type="button"
          onClick={() => handleSelect('all')}
          className="w-full py-3.5 bg-[#1e1e1e] hover:bg-[#282828] active:bg-[#151515] text-white font-bold text-base text-center tracking-wide border-t border-white/10 transition-colors"
        >
          Cualquier
        </button>
      </div>
    </div>
  );
};
