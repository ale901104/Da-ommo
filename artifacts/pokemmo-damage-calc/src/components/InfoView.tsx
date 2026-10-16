import React from 'react';
import {
  Apple,
  CheckCircle,
  CircleHelp,
  Download,
  Flame,
  Globe,
  HardDrive,
  Info,
  Monitor,
  Shield,
  Smartphone,
  Swords,
  WifiOff,
  Zap,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/use-pwa-install';

interface InfoViewProps {
  onToast: (msg: string) => void;
}

export const InfoView: React.FC<InfoViewProps> = ({ onToast }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  return (
    <div className="flex flex-col gap-3">
      {/* HEADER CARD */}
      <section className="glass combat-card" aria-label="Información y Guía">
        <div className="section-head">
          <div className="flex items-center gap-2">
            <CircleHelp size={18} className="text-emerald-400" />
            <span className="section-title">Información · Guía APK & Offline</span>
          </div>
          <span className="offline-chip">
            <span className="offline-pulse" />
            <span>100% Offline Ready</span>
          </span>
        </div>

        <p className="text-xs text-slate-300 mt-1">
          Guía de instalación de la aplicación como APK móvil nativa en Android, iPhone o PC, y resumen de las mecánicas de cálculo de daño para PokéMMO.
        </p>

        {/* INSTALL BUTTON IF AVAILABLE */}
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <button
            type="button"
            className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 transition-all shadow-lg"
            onClick={() => {
              if (isInstallable) {
                install();
              } else if (isInstalled) {
                onToast('¡La aplicación ya está instalada en tu dispositivo!');
              } else {
                onToast('Sigue los pasos indicados abajo según tu navegador móvil.');
              }
            }}
          >
            <Smartphone size={16} />
            <span>
              {isInstalled
                ? '✅ App / APK instalada en este dispositivo'
                : isInstallable
                  ? '📲 Instalar APK / App Móvil Ahora'
                  : '📲 Cómo instalar la App / APK en tu móvil'}
            </span>
          </button>
        </div>
      </section>

      {/* GUÍA DE INSTALACIÓN EN DISPOSITIVOS */}
      <section className="glass combat-card" aria-label="Instalación en dispositivos">
        <div className="section-head">
          <div className="flex items-center gap-2">
            <Smartphone size={16} className="text-sky-400" />
            <strong className="text-sm text-white font-bold">Cómo instalar la APK en Android</strong>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 text-xs text-slate-300 mt-1">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/50 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 font-bold text-white text-xs">
              <span className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[10px]">1</span>
              <span>Abre el menú de tu navegador móvil</span>
            </div>
            <p className="text-slate-300 pl-7">
              En Google Chrome, Brave o navegador de Android, pulsa los <strong>tres puntos (⋮)</strong> en la esquina superior derecha.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/50 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 font-bold text-white text-xs">
              <span className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[10px]">2</span>
              <span>Selecciona "Instalar aplicación"</span>
            </div>
            <p className="text-slate-300 pl-7">
              Toca la opción <strong>"Instalar aplicación"</strong> o <strong>"Añadir a la pantalla de inicio"</strong>.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/50 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 font-bold text-white text-xs">
              <span className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[10px]">3</span>
              <span>¡Listo! Acceso directo como APK nativa</span>
            </div>
            <p className="text-slate-300 pl-7">
              La app se instalará con su icono oficial en tu cajón de aplicaciones. Se abrirá a pantalla completa sin barra de direcciones, exactamente igual que una APK nativa de Android.
            </p>
          </div>
        </div>
      </section>

      {/* GUÍA IPHONE Y PC */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <section className="glass p-3 rounded-xl border border-slate-700/50" aria-label="Instalación en iPhone">
          <div className="flex items-center gap-2 mb-1.5">
            <Apple size={16} className="text-slate-300" />
            <strong className="text-xs text-white font-bold">Instalar en iOS / iPhone (Safari)</strong>
          </div>
          <ol className="text-[11px] text-slate-300 list-decimal pl-4 space-y-1">
            <li>Abre la app en <strong>Safari</strong>.</li>
            <li>Toca el botón <strong>Compartir</strong> (cuadrado con flecha hacia arriba).</li>
            <li>Desliza y selecciona <strong>"Añadir a pantalla de inicio"</strong>.</li>
            <li>Pulsa <strong>Añadir</strong> en la esquina superior derecha.</li>
          </ol>
        </section>

        <section className="glass p-3 rounded-xl border border-slate-700/50" aria-label="Instalación en PC">
          <div className="flex items-center gap-2 mb-1.5">
            <Monitor size={16} className="text-slate-300" />
            <strong className="text-xs text-white font-bold">Instalar en PC / Mac</strong>
          </div>
          <ol className="text-[11px] text-slate-300 list-decimal pl-4 space-y-1">
            <li>En Chrome o Edge, pulsa el icono de <strong>Instalar</strong> en la barra de URL.</li>
            <li>O ve al menú ⋮ &gt; <strong>Instalar PokéMMO Calc</strong>.</li>
            <li>Se añadirá como ventana de escritorio independiente.</li>
          </ol>
        </section>
      </div>

      {/* FUNCIONAMIENTO OFFLINE */}
      <section className="glass combat-card" aria-label="Modo Offline">
        <div className="section-head">
          <div className="flex items-center gap-2">
            <WifiOff size={16} className="text-amber-400" />
            <strong className="text-sm text-white font-bold">100% Offline · Sin conexión a internet</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 mt-1">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/50">
            <strong className="text-white block mb-1">Sprites locales de Pokémon Showdown</strong>
            <p>
              Toda la hoja de iconos de Pokémon (#001 a #649) está empaquetada dentro de la aplicación. Los iconos se muestran al instante incluso sin WiFi ni datos móviles.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/50">
            <strong className="text-white block mb-1">Almacenamiento en el dispositivo</strong>
            <p>
              Tus equipos de combate del Builder, movimientos personalizados y preferencias se guardan de forma segura en el almacenamiento local de tu navegador.
            </p>
          </div>
        </div>
      </section>

      {/* REGLAS DE COMBATE POKEMMO */}
      <section className="glass combat-card" aria-label="Mecánicas PokéMMO">
        <div className="section-head">
          <div className="flex items-center gap-2">
            <Swords size={16} className="text-emerald-400" />
            <strong className="text-sm text-white font-bold">Fórmulas y Mecánicas de PokéMMO</strong>
          </div>
        </div>

        <div className="flex flex-col gap-2 text-xs text-slate-300 mt-1">
          <p>
            • <strong>5ª Generación (Blanco/Negro):</strong> PokéMMO utiliza las mecánicas base de combate de Gen 5, sin tipos Hada ni megaevoluciones.
          </p>
          <p>
            • <strong>Rolls de daño aleatorio:</strong> Cada ataque genera 16 números aleatorios entre 85% y 100% del daño teórico. La calculadora te muestra el rango exacto (mínimo y máximo) y la probabilidad precisa de KO.
          </p>
          <p>
            • <strong>Velocidades y turnos:</strong> Se consideran objetos multiplicadores (Pañuelo Elección ×1,5, Cola Férrea), climas (Nado Rápido ×2, Clorofila ×2, Ímpetu Arena ×2), parálisis (reducción al 25%) y efectos de campo como Viento Afín y Espacio Raro.
          </p>
        </div>
      </section>
    </div>
  );
};
