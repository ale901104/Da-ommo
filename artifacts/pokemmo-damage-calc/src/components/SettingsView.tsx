import React, { type ChangeEvent } from 'react';
import {
  ImagePlus,
  Moon,
  Palette,
  Pin,
  PinOff,
  Settings,
  Sun,
  Trash2,
} from 'lucide-react';

export type BackgroundChoice = 'mint' | 'dusk' | 'aurora' | 'custom';
export type ThemeChoice = 'light' | 'dark';

interface SettingsViewProps {
  theme: ThemeChoice;
  onToggleTheme: () => void;
  background: BackgroundChoice;
  onSelectBackground: (bg: BackgroundChoice) => void;
  customBackground: string;
  onUploadCustomBackground: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveCustomBackground: () => void;
  lockCustomBackground: boolean;
  onToggleLockCustomBackground: () => void;
  backgrounds: { id: Exclude<BackgroundChoice, 'custom'>; name: string; image: string }[];
  onToast: (msg: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  theme,
  onToggleTheme,
  background,
  onSelectBackground,
  customBackground,
  onUploadCustomBackground,
  onRemoveCustomBackground,
  lockCustomBackground,
  onToggleLockCustomBackground,
  backgrounds,
  onToast,
}) => {
  return (
    <div className="flex flex-col gap-3">
      {/* HEADER CARD */}
      <section className="glass combat-card" aria-label="Configuración">
        <div className="section-head">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-emerald-400" />
            <span className="section-title">Configuración · Apariencia & Fondo</span>
          </div>
        </div>

        <p className="text-xs text-slate-300 mt-1">
          Personaliza la estética de la app: alterna entre modo oscuro o modo día y elige fondos oficiales o sube tus propios fondos de pantalla.
        </p>
      </section>

      {/* SECTION 1: MODO OSCURO & MODO DÍA */}
      <section className="glass combat-card" aria-label="Modo de color">
        <div className="section-head">
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-indigo-400" />
            <strong className="text-sm text-white font-bold">Modo oscuro & Modo día</strong>
          </div>
          <span className="ko-badge">
            {theme === 'dark' ? 'Modo Oscuro Activo' : 'Modo Día Activo'}
          </span>
        </div>

        <p className="text-xs text-slate-300 mt-1 mb-3">
          Elige el modo visual que prefieras. El modo oscuro está optimizado para sesiones nocturnas y pantallas OLED; el modo día ofrece máxima legibilidad bajo el sol.
        </p>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
              theme === 'dark'
                ? 'bg-slate-900 border-emerald-500 text-emerald-300 shadow-md ring-1 ring-emerald-500'
                : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
            onClick={() => {
              if (theme !== 'dark') {
                onToggleTheme();
                onToast('Modo oscuro activado.');
              }
            }}
          >
            <Moon size={16} />
            <span>Modo Oscuro</span>
          </button>

          <button
            type="button"
            className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
              theme === 'light'
                ? 'bg-slate-100 border-emerald-600 text-emerald-800 shadow-md ring-1 ring-emerald-600'
                : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
            onClick={() => {
              if (theme !== 'light') {
                onToggleTheme();
                onToast('Modo día activado.');
              }
            }}
          >
            <Sun size={16} />
            <span>Modo Día</span>
          </button>
        </div>
      </section>

      {/* SECTION 2: PERSONALIZACIÓN DE FONDO */}
      <section className="glass combat-card" aria-label="Personalización de fondo">
        <div className="section-head">
          <div className="flex items-center gap-2">
            <ImagePlus size={16} className="text-emerald-400" />
            <strong className="text-sm text-white font-bold">Personalización de Fondo</strong>
          </div>
          {background === 'custom' && (
            <span className="ko-badge">Fondo Personalizado</span>
          )}
        </div>

        <p className="text-xs text-slate-300 mt-1 mb-3">
          Selecciona un gradiente temático o carga tu propia imagen de wallpaper desde tu dispositivo. Cuando seleccionas climas activos, el fondo puede adaptarse automáticamente o permanecer fijo según prefieras.
        </p>

        {/* PRESET WALLPAPERS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
          {backgrounds.map(option => {
            const isSelected = background === option.id;
            return (
              <button
                key={option.id}
                type="button"
                className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all ${
                  isSelected
                    ? 'border-emerald-400 bg-emerald-600/20 ring-1 ring-emerald-400'
                    : 'border-slate-700/60 bg-slate-800/40 hover:bg-slate-800/70'
                }`}
                onClick={() => {
                  onSelectBackground(option.id);
                  onToast(`Fondo "${option.name}" aplicado.`);
                }}
              >
                <div
                  className="w-full h-12 rounded-lg border border-slate-600/50 shadow-inner"
                  style={{ backgroundImage: option.image, backgroundSize: 'cover' }}
                />
                <span className="text-xs font-semibold text-white mt-1">
                  {option.name}
                </span>
                {isSelected && (
                  <span className="text-[10px] text-emerald-300 font-bold">✓ Seleccionado</span>
                )}
              </button>
            );
          })}
        </div>

        {/* CUSTOM IMAGE UPLOAD */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 flex flex-col gap-2.5">
          <label className="text-xs font-semibold text-white flex items-center gap-2">
            <ImagePlus size={14} className="text-emerald-400" />
            <span>Subir imagen o wallpaper propio:</span>
          </label>

          <input
            id="custom-bg-input"
            type="file"
            accept="image/*"
            className="text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
            onChange={e => {
              onUploadCustomBackground(e);
              onToast('Imagen de fondo cargada con éxito.');
            }}
          />

          {customBackground && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-700/40">
              <button
                type="button"
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  lockCustomBackground
                    ? 'bg-amber-600/30 border-amber-400 text-amber-200'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
                onClick={onToggleLockCustomBackground}
              >
                {lockCustomBackground ? <PinOff size={13} /> : <Pin size={13} />}
                <span>
                  {lockCustomBackground
                    ? 'Fondo fijado (Inmune a climas)'
                    : 'Fijar mi imagen vs clima'}
                </span>
              </button>

              <button
                type="button"
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-rose-200"
                onClick={() => {
                  onRemoveCustomBackground();
                  onToast('Fondo personalizado eliminado.');
                }}
              >
                <Trash2 size={13} />
                <span>Eliminar imagen</span>
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
