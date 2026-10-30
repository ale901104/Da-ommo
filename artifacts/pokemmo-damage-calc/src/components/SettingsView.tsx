import React, { useState, useEffect, type ChangeEvent } from 'react';
import {
  AlertCircle,
  Bot,
  Brain,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Eye,
  EyeOff,
  ImagePlus,
  Key,
  Loader2,
  LogOut,
  Mail,
  Moon,
  Palette,
  Pin,
  PinOff,
  Settings,
  Sparkles,
  Sun,
  Trash2,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  initDriveAuth,
  signInWithGoogle,
  signOutGoogle,
  getCurrentGoogleUser,
} from '../lib/google-drive';

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
      {/* SECTION 1: MODO OSCURO & MODO DÍA (SWITCH TOGGLE) */}
      <section className="glass combat-card" aria-label="Modo de color">
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl border transition-colors ${
                theme === 'dark'
                  ? 'bg-indigo-950/70 border-indigo-700/60 text-indigo-300'
                  : 'bg-amber-100 border-amber-300 text-amber-600'
              }`}
            >
              {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white">
                {theme === 'dark' ? 'Modo Oscuro' : 'Modo Día'}
              </span>
            </div>
          </div>

          {/* Switch Toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label="Alternar entre modo oscuro y modo día"
            onClick={() => {
              onToggleTheme();
              onToast(theme === 'dark' ? 'Modo día activado.' : 'Modo oscuro activado.');
            }}
            className={`relative inline-flex h-8 w-16 items-center rounded-full p-1 transition-colors duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
              theme === 'dark' ? 'bg-indigo-600 border border-indigo-400/50' : 'bg-amber-400 border border-amber-500/60'
            }`}
          >
            <span
              className={`inline-flex items-center justify-center h-6 w-6 transform rounded-full bg-slate-950 shadow-md transition-transform duration-300 ${
                theme === 'dark' ? 'translate-x-8 text-indigo-300' : 'translate-x-0 bg-white text-amber-500'
              }`}
            >
              {theme === 'dark' ? <Moon size={13} /> : <Sun size={13} />}
            </span>
          </button>
        </div>
      </section>

      {/* SECTION: ASOCIAR GMAIL */}
      <GoogleAccountSection onToast={onToast} />

      {/* SECTION 2: PERSONALIZACIÓN DE FONDO */}
      <section className="glass combat-card" aria-label="Personalización de fondo">
        <div className="section-head mb-3">
          <div className="flex items-center gap-2">
            <ImagePlus size={16} className="text-emerald-400" />
            <strong className="text-sm text-white font-bold">Personalización de Fondo</strong>
          </div>
          {background === 'custom' && (
            <span className="ko-badge">Fondo Personalizado</span>
          )}
        </div>

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

      {/* SECTION 3: AI PROVIDER CONFIGURATION (GEMINI, OPENAI, GROQ) */}
      <AiProviderSection onToast={onToast} />
    </div>
  );
};

export const GoogleAccountSection: React.FC<{ onToast: (msg: string) => void }> = ({ onToast }) => {
  const [googleUser, setGoogleUser] = useState<User | null>(() => getCurrentGoogleUser());
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    initDriveAuth(u => {
      setGoogleUser(u);
    });
  }, []);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res?.user) {
        setGoogleUser(res.user);
        onToast(`Gmail asociado: ${res.user.email}`);
      }
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : 'Error al asociar cuenta de Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await signOutGoogle();
      setGoogleUser(null);
      onToast('Cuenta de Gmail desvinculada.');
    } catch {
      onToast('Error al desvincular cuenta.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="glass combat-card" aria-label="Cuenta de Gmail">
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl border bg-rose-950/70 border-rose-700/60 text-rose-300">
            <Mail size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white">Cuenta de Gmail</span>
            {googleUser ? (
              <span className="text-xs text-slate-300 font-mono truncate max-w-[200px] sm:max-w-xs">
                {googleUser.email}
              </span>
            ) : (
              <span className="text-xs text-slate-400">Sin cuenta asociada</span>
            )}
          </div>
        </div>

        {googleUser ? (
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={isLoading}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            {isLoading ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
            <span>Desvincular</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleConnect}
            disabled={isLoading}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition-all cursor-pointer"
          >
            {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
            <span>Vincular Gmail</span>
          </button>
        )}
      </div>
    </section>
  );
};

export type AiProvider = 'gemini' | 'openai' | 'groq';

export interface AiProviderConfig {
  id: AiProvider;
  name: string;
  model: string;
  apiUrl?: string;
  placeholder: string;
  apiKeyHelpUrl: string;
  apiKeyHelpText: string;
  badge: string;
  description: string;
}

export const AI_PROVIDERS: Record<AiProvider, AiProviderConfig> = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini 3',
    model: 'gemini-3.8-flash',
    placeholder: 'AIzaSy...',
    apiKeyHelpUrl: 'https://aistudio.google.com/app/apikey',
    apiKeyHelpText: 'Obtener en Google AI Studio (Gratis)',
    badge: 'gemini-3.8-flash',
    description: 'Google Gemini 3 (gemini-3.8-flash). Máximo razonamiento táctico y análisis competitivo.',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI ChatGPT',
    model: 'gpt-4o-mini',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    placeholder: 'sk-proj-...',
    apiKeyHelpUrl: 'https://platform.openai.com/api-keys',
    apiKeyHelpText: 'Obtener en OpenAI Platform',
    badge: 'gpt-4o-mini',
    description: 'Razonamiento táctico y evaluación de sinergias para Pokémon competitivo.',
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    model: 'llama-3.3-70b-versatile',
    apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
    placeholder: 'gsk_...',
    apiKeyHelpUrl: 'https://console.groq.com/keys',
    apiKeyHelpText: 'Obtener en Groq Console (Gratis)',
    badge: 'llama-3.3-70b-versatile',
    description: 'Ultra veloz y de código abierto (Llama 3.3 70B Versatile).',
  },
};

export const STORAGE_SELECTED_PROVIDER = 'selected_provider';
export const STORAGE_API_KEY = 'api_key';

interface AiProviderSectionProps {
  onToast: (msg: string) => void;
}

export const AiProviderSection: React.FC<AiProviderSectionProps> = ({ onToast }) => {
  const [provider, setProvider] = useState<AiProvider>('gemini');
  const [apiKey, setApiKey] = useState<string>('');
  const [savedKey, setSavedKey] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load provider and key on mount
  useEffect(() => {
    try {
      const storedProvider = (localStorage.getItem(STORAGE_SELECTED_PROVIDER) as AiProvider) || 'gemini';
      const validProvider = AI_PROVIDERS[storedProvider] ? storedProvider : 'gemini';
      setProvider(validProvider);

      // Load specific or general api_key (support backward compat with gemini_api_key)
      const storedKey =
        localStorage.getItem(`api_key_${validProvider}`) ||
        localStorage.getItem(STORAGE_API_KEY) ||
        (validProvider === 'gemini' ? localStorage.getItem('gemini_api_key') || '' : '') ||
        '';

      setApiKey(storedKey);
      setSavedKey(storedKey);
    } catch {
      // ignore
    }
  }, []);

  // When changing provider in dropdown
  const handleProviderChange = (newProvider: AiProvider) => {
    setProvider(newProvider);
    setTestResult(null);
    try {
      localStorage.setItem(STORAGE_SELECTED_PROVIDER, newProvider);

      // Check if we have a key saved for this provider
      const providerKey =
        localStorage.getItem(`api_key_${newProvider}`) ||
        (newProvider === 'gemini' ? localStorage.getItem('gemini_api_key') || '' : '') ||
        '';

      setApiKey(providerKey);
      setSavedKey(providerKey);
      if (providerKey) {
        localStorage.setItem(STORAGE_API_KEY, providerKey);
      }
      window.dispatchEvent(new Event('storage'));
      onToast(`Proveedor cambiado a ${AI_PROVIDERS[newProvider].name}`);
    } catch {
      // ignore
    }
  };

  const handleSave = () => {
    const trimmed = apiKey.trim();
    try {
      localStorage.setItem(STORAGE_SELECTED_PROVIDER, provider);
      if (trimmed) {
        localStorage.setItem(STORAGE_API_KEY, trimmed);
        localStorage.setItem(`api_key_${provider}`, trimmed);
        if (provider === 'gemini') {
          localStorage.setItem('gemini_api_key', trimmed);
        }
        setSavedKey(trimmed);
        setTestResult(null);
        window.dispatchEvent(new Event('storage'));
        onToast(`Clave API para ${AI_PROVIDERS[provider].name} guardada.`);
      } else {
        localStorage.removeItem(STORAGE_API_KEY);
        localStorage.removeItem(`api_key_${provider}`);
        if (provider === 'gemini') {
          localStorage.removeItem('gemini_api_key');
        }
        setSavedKey('');
        setTestResult(null);
        window.dispatchEvent(new Event('storage'));
        onToast('Clave API eliminada.');
      }
    } catch {
      onToast('Error al guardar la clave en almacenamiento local.');
    }
  };

  const handleClear = () => {
    try {
      localStorage.removeItem(STORAGE_API_KEY);
      localStorage.removeItem(`api_key_${provider}`);
      if (provider === 'gemini') {
        localStorage.removeItem('gemini_api_key');
      }
      setApiKey('');
      setSavedKey('');
      setTestResult(null);
      window.dispatchEvent(new Event('storage'));
      onToast(`Clave de ${AI_PROVIDERS[provider].name} eliminada.`);
    } catch {
      onToast('Error al borrar la clave.');
    }
  };

  const handleTestKey = async () => {
    const keyToTest = (apiKey || savedKey).trim();
    if (!keyToTest) {
      onToast('Ingresa una clave API primero.');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const activeConfig = AI_PROVIDERS[provider];
    let lastError = '';

    try {
      if (provider === 'gemini') {
        // Test Google Gemini 3
        const models = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
        for (const model of models) {
          try {
            const resp = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(keyToTest)}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: 'Responde únicamente "OK".' }] }],
                }),
              }
            );

            if (resp.ok) {
              setIsTesting(false);
              setTestResult({
                success: true,
                message: `¡Conexión exitosa con Google Gemini (${model})! Clave válida y lista.`,
              });
              onToast('¡Clave de Google Gemini verificada con éxito!');
              return;
            } else {
              const err = await resp.json().catch(() => ({}));
              lastError = err?.error?.message || `HTTP ${resp.status}: ${resp.statusText}`;
            }
          } catch (e: unknown) {
            lastError = (e as Error)?.message || 'Error de conexión.';
          }
        }
      } else if (provider === 'openai') {
        // Test OpenAI ChatGPT
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${keyToTest}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Responde OK' }],
            max_tokens: 5,
          }),
        });

        if (resp.ok) {
          setIsTesting(false);
          setTestResult({
            success: true,
            message: `¡Conexión exitosa con OpenAI ChatGPT (gpt-4o-mini)! Clave válida.`,
          });
          onToast('¡Clave de OpenAI ChatGPT verificada con éxito!');
          return;
        } else {
          const err = await resp.json().catch(() => ({}));
          lastError = err?.error?.message || `HTTP ${resp.status}: ${resp.statusText}`;
        }
      } else if (provider === 'groq') {
        // Test Groq (OpenAI-compatible endpoint)
        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${keyToTest}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: 'Responde OK' }],
            max_tokens: 5,
          }),
        });

        if (resp.ok) {
          setIsTesting(false);
          setTestResult({
            success: true,
            message: `¡Conexión exitosa con Groq (llama-3.3-70b-versatile)! Clave válida.`,
          });
          onToast('¡Clave de Groq verificada con éxito!');
          return;
        } else {
          const err = await resp.json().catch(() => ({}));
          lastError = err?.error?.message || `HTTP ${resp.status}: ${resp.statusText}`;
        }
      }
    } catch (err: unknown) {
      lastError = (err as Error)?.message || 'Error de red al conectar con el proveedor.';
    }

    setIsTesting(false);
    setTestResult({
      success: false,
      message: `Error al validar clave de ${activeConfig.name}: ${lastError}`,
    });
    onToast(`Error al validar clave de ${activeConfig.name}.`);
  };

  const currentConfig = AI_PROVIDERS[provider];
  const isConfigured = Boolean(savedKey && savedKey.trim());

  return (
    <section className="glass combat-card" aria-label="Proveedor de Inteligencia Artificial">
      <div className="section-head mb-3">
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-violet-400" />
          <strong className="text-sm text-white font-bold">
            Inteligencia Artificial · Asistente Estratégico
          </strong>
        </div>
        <span
          className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
            isConfigured
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60'
              : 'bg-amber-950/80 text-amber-300 border-amber-500/60'
          }`}
        >
          {isConfigured ? '✓ Clave Configurada' : 'Sin Clave'}
        </span>
      </div>

      {/* SELECTOR DE PROVEEDOR (DROPDOWN / SPINNER) */}
      <div className="flex flex-col gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-700/60">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-white flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Bot size={14} className="text-violet-400" />
              <span>Proveedor de Inteligencia Artificial:</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-violet-950/80 text-violet-300 border border-violet-700/50 font-mono">
              {currentConfig.badge}
            </span>
          </label>

          <div className="relative">
            <select
              value={provider}
              onChange={e => handleProviderChange(e.target.value as AiProvider)}
              className="w-full py-2.5 pl-3 pr-10 text-xs font-bold bg-slate-950 border border-slate-700 rounded-lg text-white appearance-none focus:outline-none focus:border-violet-500 transition-colors cursor-pointer"
            >
              <option value="gemini">1. Google Gemini 3 (modelo: gemini-3.8-flash)</option>
              <option value="openai">2. OpenAI ChatGPT (modelo: gpt-4o-mini)</option>
              <option value="groq">3. Groq (modelo: llama-3.3-70b-versatile)</option>
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>

        {/* INPUT DE API KEY */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800">
          <label className="text-xs font-semibold text-white flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Key size={14} className="text-violet-400" />
              <span>Clave API ({currentConfig.name}):</span>
            </div>
            {isConfigured && (
              <span className="text-[10px] text-emerald-400 font-mono">
                ••••••••{savedKey.slice(-4)}
              </span>
            )}
          </label>

          <div className="relative flex items-center">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={`Pega tu clave: ${currentConfig.placeholder}`}
              className="w-full py-2 pl-3 pr-10 text-xs font-mono bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
            <button
              type="button"
              className="absolute right-2.5 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
              onClick={() => setShowKey(v => !v)}
              title={showKey ? 'Ocultar clave' : 'Mostrar clave'}
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Key size={13} />
            <span>Guardar Clave</span>
          </button>

          <button
            type="button"
            onClick={handleTestKey}
            disabled={isTesting || (!apiKey.trim() && !savedKey.trim())}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {isTesting ? <Loader2 size={13} className="animate-spin text-violet-400" /> : <Bot size={13} />}
            <span>{isTesting ? 'Probando...' : 'Probar Conexión'}</span>
          </button>

          {isConfigured && (
            <button
              type="button"
              onClick={handleClear}
              className="p-2 rounded-lg text-xs font-bold bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-700/50 transition-colors cursor-pointer"
              title="Borrar clave guardada"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {/* TEST RESULT MESSAGE */}
        {testResult && (
          <div
            className={`flex items-start gap-2 p-2.5 rounded-lg text-xs border ${
              testResult.success
                ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200'
                : 'bg-rose-950/70 border-rose-500/60 text-rose-200'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={15} className="text-rose-400 flex-shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{testResult.message}</span>
          </div>
        )}
      </div>

      {/* ENLACE DINÁMICO SEGÚN PROVEEDOR ("OBTENER MI API KEY") */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-violet-950/30 border border-violet-700/40 mt-1">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-violet-200">
            ¿No tienes una API Key para {currentConfig.name}?
          </span>
          <span className="text-[11px] text-slate-300">
            {currentConfig.apiKeyHelpText}
          </span>
        </div>

        <a
          href={currentConfig.apiKeyHelpUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold bg-violet-600/80 hover:bg-violet-600 text-white border border-violet-400/50 shadow transition-all hover:scale-102 flex-shrink-0"
        >
          <span>Obtener Clave</span>
          <ExternalLink size={13} />
        </a>
      </div>
    </section>
  );
};


