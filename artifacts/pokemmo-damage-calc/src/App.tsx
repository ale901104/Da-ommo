import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Activity, ChevronDown, ChevronRight, CircleHelp, CloudSun, Edit2, Gauge, Menu, Minus, Plus, PlusCircle, RotateCcw, Swords, Trash2, X } from 'lucide-react';
import { movimientosIniciales, pokemonIniciales } from './datos.js';

type Pokemon = { id: string; nombre: string; tipo1: string; tipo2: string; hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
type Move = { id: string; nombre: string; tipo: string; categoria: 'physical' | 'special'; poder: number };
type ModalKind = 'pokemon' | 'movimiento' | null;
type Weather = 'none' | 'sun' | 'rain' | 'sand' | 'hail';
type Field = 'none' | 'reflect' | 'light-screen' | 'aurora-veil' | 'tailwind';

const STORAGE_KEY = 'pokemmo-calc-v1';
const TYPES: [string, string][] = [['normal','Normal'],['fire','Fuego'],['water','Agua'],['electric','Eléctrico'],['grass','Planta'],['ice','Hielo'],['fighting','Lucha'],['poison','Veneno'],['ground','Tierra'],['flying','Volador'],['psychic','Psíquico'],['bug','Bicho'],['rock','Roca'],['ghost','Fantasma'],['dragon','Dragón'],['dark','Siniestro'],['steel','Acero'],['fairy','Hada']];
const typeName = (id: string) => TYPES.find(([key]) => key === id)?.[1] ?? id;
const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;
const EFFECT: Record<string, Record<string, number>> = {
  normal: { rock:.5, ghost:0, steel:.5 }, fire: { fire:.5, water:.5, grass:2, ice:2, bug:2, rock:.5, dragon:.5, steel:2 },
  water: { fire:2, water:.5, grass:.5, ground:2, rock:2, dragon:.5 }, electric: { water:2, electric:.5, grass:.5, ground:0, flying:2, dragon:.5 },
  grass: { fire:.5, water:2, grass:.5, poison:.5, ground:2, flying:.5, bug:.5, rock:2, dragon:.5, steel:.5 },
  ice: { fire:.5, water:.5, grass:2, ice:.5, ground:2, flying:2, dragon:2, steel:.5 },
  fighting: { normal:2, ice:2, poison:.5, flying:.5, psychic:.5, bug:.5, rock:2, ghost:0, dark:2, steel:2, fairy:.5 },
  poison: { grass:2, poison:.5, ground:.5, rock:.5, ghost:.5, steel:0, fairy:2 }, ground: { fire:2, electric:2, grass:.5, poison:2, flying:0, bug:.5, rock:2, steel:2 },
  flying: { electric:.5, grass:2, fighting:2, bug:2, rock:.5, steel:.5 }, psychic: { fighting:2, poison:2, psychic:.5, dark:0, steel:.5 },
  bug: { fire:.5, grass:2, fighting:.5, poison:.5, flying:.5, psychic:2, ghost:.5, dark:2, steel:.5, fairy:.5 },
  rock: { fire:2, ice:2, fighting:.5, ground:.5, flying:2, bug:2, steel:.5 }, ghost: { normal:0, psychic:2, ghost:2, dark:.5 },
  dragon: { dragon:2, steel:.5, fairy:0 }, dark: { fighting:.5, psychic:2, ghost:2, dark:.5 },
  steel: { fire:.5, water:.5, electric:.5, ice:2, rock:2, steel:.5, fairy:2 }, fairy: { fire:.5, fighting:2, poison:.5, dragon:2, dark:2, steel:.5 },
};
const abilityOptions = [
  ['none','Ninguna'],['adaptability','Adaptable (STAB ×2)'],['huge-power','Potencia (Ataque ×2)'],
  ['pure-power','Energía Pura (Ataque ×2)'],['technician','Experto (potencia ≤60 ×1,5)'],
  ['blaze','Mar Llamas (Fuego ×1,5, PS bajos)'],['torrent','Torrente (Agua ×1,5, PS bajos)'],
  ['overgrow','Espesura (Planta ×1,5, PS bajos)'],['swarm','Enjambre (Bicho ×1,5, PS bajos)'],
];
const items: [string,string][] = [['none','Ninguno'],['choice-band','Cinta Elegida (Ataque ×1,5)'],['choice-specs','Gafas Elegidas (At. Esp. ×1,5)'],['life-orb','Vidasfera (daño ×1,3)'],['expert-belt','Cinta Experto (supereficaz ×1,2)'],['muscle-band','Cinta Fuerte (Físico ×1,1)'],['wise-glasses','Gafas Especiales (Especial ×1,1)'],...TYPES.slice(1).map(([id,name]): [string,string] => [`${id}-gem`, `${name} Zafiro (+30% ${name})`])];
const weatherOptions: [Weather,string][] = [['none','Sin clima'],['sun','Sol intenso'],['rain','Lluvia'],['sand','Tormenta de arena'],['hail','Granizo']];
const fieldOptions: [Field,string][] = [['none','Sin efecto'],['reflect','Reflejo'],['light-screen','Pantalla de Luz'],['aurora-veil','Velo Aurora'],['tailwind','Viento Afín']];

function loadSaved() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed.pokemon) && Array.isArray(parsed.movimientos)) return { pokemon: parsed.pokemon as Pokemon[], movimientos: parsed.movimientos as Move[] };
    }
  } catch { /* Fall back to the curated local sample roster. */ }
  return { pokemon: pokemonIniciales as Pokemon[], movimientos: movimientosIniciales as Move[] };
}
function stat(base: number, level: number, hp = false) {
  return hp ? Math.floor(((2 * base + 31) * level) / 100) + level + 10 : Math.floor(((2 * base + 31) * level) / 100) + 5;
}
function effectiveness(moveType: string, defender: Pokemon) {
  const first = EFFECT[moveType]?.[defender.tipo1] ?? 1;
  const second = defender.tipo2 ? (EFFECT[moveType]?.[defender.tipo2] ?? 1) : 1;
  return first * second;
}
function fmt(n: number) { return Math.max(0, Math.floor(n)).toLocaleString('es-ES'); }

function App() {
  const initial = useMemo(loadSaved, []);
  const [pokemon, setPokemon] = useState<Pokemon[]>(initial.pokemon);
  const [moves, setMoves] = useState<Move[]>(initial.movimientos);
  const [attackerId, setAttackerId] = useState(initial.pokemon[0]?.id ?? '');
  const [defenderId, setDefenderId] = useState(initial.pokemon[1]?.id ?? initial.pokemon[0]?.id ?? '');
  const [moveId, setMoveId] = useState(initial.movimientos[0]?.id ?? '');
  const [attackerLevel, setAttackerLevel] = useState(50);
  const [defenderLevel, setDefenderLevel] = useState(50);
  const [weather, setWeather] = useState<Weather>('none');
  const [ability, setAbility] = useState('none');
  const [item, setItem] = useState('none');
  const [field, setField] = useState<Field>('none');
  const [drawer, setDrawer] = useState(false);
  const [openSections, setOpenSections] = useState({ pokemon: true, moves: false });
  const [modal, setModal] = useState<ModalKind>(null);
  const [editing, setEditing] = useState<Pokemon | Move | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify({ pokemon, movimientos: moves })); }, [pokemon, moves]);
  useEffect(() => {
    if (toast) { const timer = window.setTimeout(() => setToast(''), 2400); return () => window.clearTimeout(timer); }
    return undefined;
  }, [toast]);
  useEffect(() => {
    if (!pokemon.some(p => p.id === attackerId)) setAttackerId(pokemon[0]?.id ?? '');
    if (!pokemon.some(p => p.id === defenderId)) setDefenderId(pokemon.find(p => p.id !== attackerId)?.id ?? pokemon[0]?.id ?? '');
  }, [pokemon, attackerId, defenderId]);
  useEffect(() => { if (!moves.some(m => m.id === moveId)) setMoveId(moves[0]?.id ?? ''); }, [moves, moveId]);

  const attacker = pokemon.find(p => p.id === attackerId);
  const defender = pokemon.find(p => p.id === defenderId);
  const move = moves.find(m => m.id === moveId);
  const calc = useMemo(() => {
    if (!attacker || !defender || !move) return null;
    const hp = stat(defender.hp, defenderLevel, true);
    const atk = stat(move.categoria === 'physical' ? attacker.atk : attacker.spa, attackerLevel);
    let def = stat(move.categoria === 'physical' ? defender.def : defender.spd, defenderLevel);
    if (weather === 'sand' && move.categoria === 'special' && (defender.tipo1 === 'rock' || defender.tipo2 === 'rock')) def = Math.floor(def * 1.5);
    const eff = effectiveness(move.tipo, defender);
    const stab = attacker.tipo1 === move.tipo || attacker.tipo2 === move.tipo ? (ability === 'adaptability' ? 2 : 1.5) : 1;
    let weatherMod = 1;
    if ((weather === 'sun' && move.tipo === 'fire') || (weather === 'rain' && move.tipo === 'water')) weatherMod = 1.5;
    if ((weather === 'sun' && move.tipo === 'water') || (weather === 'rain' && move.tipo === 'fire')) weatherMod = .5;
    let abilityMod = 1;
    if (ability === 'technician' && move.poder <= 60) abilityMod = 1.5;
    if ((ability === 'blaze' && move.tipo === 'fire') || (ability === 'torrent' && move.tipo === 'water') || (ability === 'overgrow' && move.tipo === 'grass') || (ability === 'swarm' && move.tipo === 'bug')) abilityMod = 1.5;
    let itemStatMod = 1;
    if ((item === 'choice-band' && move.categoria === 'physical') || (item === 'choice-specs' && move.categoria === 'special')) itemStatMod = 1.5;
    if ((item === 'muscle-band' && move.categoria === 'physical') || (item === 'wise-glasses' && move.categoria === 'special')) itemStatMod = 1.1;
    const attackAbilityMod = move.categoria === 'physical' && ['huge-power','pure-power'].includes(ability) ? 2 : 1;
    const effectiveAtk = Math.floor(atk * itemStatMod * attackAbilityMod);
    let itemPower = item === `${move.tipo}-gem` ? 1.3 : item === 'life-orb' ? 1.3 : 1;
    if (item === 'expert-belt' && eff > 1) itemPower = 1.2;
    const screen = ((['reflect','aurora-veil'].includes(field) && move.categoria === 'physical') || (['light-screen','aurora-veil'].includes(field) && move.categoria === 'special')) ? .5 : 1;
    const base = Math.floor(Math.floor((Math.floor(2 * attackerLevel / 5 + 2) * move.poder * effectiveAtk) / Math.max(1, def)) / 50) + 2;
    const modifier = stab * eff * weatherMod * abilityMod * itemPower * screen;
    const lo = Math.floor(base * modifier * .85), hi = Math.floor(base * modifier);
    return { hp, eff, lo, hi, pct: hp ? hi / hp * 100 : 0, atk: effectiveAtk, def };
  }, [attacker, defender, move, attackerLevel, defenderLevel, weather, ability, item, field]);
  const koChance = calc ? calc.lo >= calc.hp ? 'KO seguro' : calc.hi >= calc.hp ? 'Posible KO' : 'No es KO' : 'Sin datos';
  const openForm = (kind: Exclude<ModalKind, null>, itemToEdit: Pokemon | Move | null = null) => { setEditing(itemToEdit); setModal(kind); };

  function savePokemon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('nombre') ?? '').trim();
    if (!name) return;
    const next: Pokemon = { id: editing?.id ?? `pk-${Date.now()}`, nombre: name.slice(0, 24), tipo1: String(data.get('tipo1')), tipo2: String(data.get('tipo2') ?? ''),
      hp: Number(data.get('hp')), atk: Number(data.get('atk')), def: Number(data.get('def')), spa: Number(data.get('spa')), spd: Number(data.get('spd')), spe: Number(data.get('spe')) };
    if (Object.values(next).some(value => typeof value === 'number' && (!Number.isFinite(value) || value < 1 || value > 255))) { setToast('Cada estadística debe estar entre 1 y 255.'); return; }
    setPokemon(existing => editing ? existing.map(p => p.id === editing.id ? next : p) : [...existing, next]);
    if (!editing) setAttackerId(next.id);
    setModal(null); setToast(editing ? 'Pokémon actualizado.' : 'Pokémon añadido al equipo.');
  }
  function saveMove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('nombre') ?? '').trim(), power = Number(data.get('poder'));
    if (!name || !Number.isFinite(power) || power < 1 || power > 250) { setToast('Indica un nombre y potencia entre 1 y 250.'); return; }
    const next: Move = { id: editing?.id ?? `mv-${Date.now()}`, nombre: name.slice(0, 28), tipo: String(data.get('tipo')), categoria: data.get('categoria') === 'special' ? 'special' : 'physical', poder: power };
    setMoves(existing => editing ? existing.map(m => m.id === editing.id ? next : m) : [...existing, next]);
    if (!editing) setMoveId(next.id);
    setModal(null); setToast(editing ? 'Movimiento actualizado.' : 'Movimiento añadido.');
  }
  function deletePokemon(id: string) {
    const p = pokemon.find(item => item.id === id);
    if (p && window.confirm(`¿Eliminar a ${p.nombre} del equipo?`)) { setPokemon(list => list.filter(item => item.id !== id)); setToast('Pokémon eliminado.'); }
  }
  function deleteMove(id: string) {
    const m = moves.find(item => item.id === id);
    if (m && window.confirm(`¿Eliminar el movimiento ${m.nombre}?`)) { setMoves(list => list.filter(item => item.id !== id)); setToast('Movimiento eliminado.'); }
  }
  const updateLevel = (which: 'attacker' | 'defender', by: number) => (which === 'attacker' ? setAttackerLevel : setDefenderLevel)(level => Math.max(1, Math.min(100, level + by)));
  const chosenTypePills = (p: Pokemon | undefined) => p ? <div className="type-pills"><span className="type-pill">{typeName(p.tipo1)}</span>{p.tipo2 && <span className="type-pill">{typeName(p.tipo2)}</span>}</div> : null;

  return <main className="app-shell">
    <header className="topbar">
      <button className="icon-button" aria-label="Abrir menú" data-testid="button-open-menu" onClick={() => setDrawer(true)}><Menu size={19}/></button>
      <div className="brand"><div className="brand-mark"><Swords size={18}/></div><div><div className="brand-name">PokéMMO</div><div className="brand-kicker">calculadora de daño</div></div></div>
      <button className="icon-button" aria-label="Restablecer escenario" data-testid="button-reset" onClick={() => { setWeather('none');setAbility('none');setItem('none');setField('none');setAttackerLevel(50);setDefenderLevel(50);setToast('Escenario restablecido.'); }}><RotateCcw size={17}/></button>
    </header>
    <section className="hero">
      <div className="eyebrow">Herramienta de combate · v1.0</div>
      <h1>Calcula tu<br/>siguiente turno.</h1>
      <p>Daño al instante. Decide con ventaja.</p>
    </section>
    <section className="glass combat-card" aria-label="Escenario de combate">
      <div className="section-head"><span className="section-title">Enfrentamiento</span><Activity size={15} color="#6d9290"/></div>
      <div className="versus">
        <div className="combatant"><div className="combatant-label">Atacante</div><select aria-label="Pokémon atacante" data-testid="select-attacker" value={attackerId} onChange={e => setAttackerId(e.target.value)}>{pokemon.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select>{chosenTypePills(attacker)}</div>
        <div className="versus-mark">VS</div>
        <div className="combatant defender"><div className="combatant-label">Defensor</div><select aria-label="Pokémon defensor" data-testid="select-defender" value={defenderId} onChange={e => setDefenderId(e.target.value)}>{pokemon.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select>{chosenTypePills(defender)}</div>
      </div>
      <div className="move-row"><div className="move-icon"><Swords size={17}/></div><div className="field"><label htmlFor="move-choice">Movimiento</label><select id="move-choice" data-testid="select-move" value={moveId} onChange={e => setMoveId(e.target.value)}>{moves.map(m => <option key={m.id} value={m.id}>{m.nombre} · {typeName(m.tipo)}</option>)}</select></div><div className="move-power">{move ? `${move.poder} P` : '—'}</div></div>
      <div className="levels">{([['attacker','Nivel atacante',attackerLevel],['defender','Nivel defensor',defenderLevel]] as const).map(([who,label,level]) => <div className="level-control" key={who}><span>{label}</span><div className="stepper"><button aria-label={`Bajar ${label}`} data-testid={`button-level-down-${who}`} onClick={() => updateLevel(who,-1)}><Minus size={13}/></button><strong data-testid={`text-level-${who}`}>{level}</strong><button aria-label={`Subir ${label}`} data-testid={`button-level-up-${who}`} onClick={() => updateLevel(who,1)}><Plus size={13}/></button></div></div>)}</div>
    </section>
    <section className="glass conditions">
      <div className="section-head"><span className="section-title">Condiciones de batalla</span><CloudSun size={15} color="#6d9290"/></div>
      <div className="conditions-grid">
        <div className="field"><label htmlFor="weather">Clima</label><select id="weather" data-testid="select-weather" value={weather} onChange={e => setWeather(e.target.value as Weather)}>{weatherOptions.map(([v,label]) => <option key={v} value={v}>{label}</option>)}</select></div>
        <div className="field"><label htmlFor="ability">Habilidad atacante</label><select id="ability" data-testid="select-ability" value={ability} onChange={e => setAbility(e.target.value)}>{abilityOptions.map(([v,label]) => <option key={v} value={v}>{label}</option>)}</select></div>
        <div className="field"><label htmlFor="item">Objeto atacante</label><select id="item" data-testid="select-item" value={item} onChange={e => setItem(e.target.value)}>{items.map(([v,label]) => <option key={v} value={v}>{label}</option>)}</select></div>
        <div className="field"><label htmlFor="field-effect">Efecto de campo</label><select id="field-effect" data-testid="select-field-effect" value={field} onChange={e => setField(e.target.value as Field)}>{fieldOptions.map(([v,label]) => <option key={v} value={v}>{label}</option>)}</select></div>
      </div>
    </section>
    <section className="glass results" aria-live="polite">
      <div className="result-top"><span className="section-title">Daño estimado</span><span className="ko-badge" data-testid="status-ko">{koChance}</span></div>
      {calc && move && defender ? <>
        <div className="damage-number" data-testid="text-damage-range">{fmt(calc.lo)}<small> – </small>{fmt(calc.hi)} <small>PS</small></div>
        <p className="result-caption">{move.nombre} contra {defender.nombre} · <span data-testid="text-effectiveness">{calc.eff === 0 ? 'Sin efecto' : calc.eff > 1 ? `Supereficaz ×${calc.eff}` : calc.eff < 1 ? `Poco eficaz ×${calc.eff}` : 'Daño normal'}</span></p>
        <div className="hp-track"><div className="hp-fill" style={{width:`${Math.min(100,calc.pct)}%`}}/></div>
        <div className="result-bottom"><span>PS del defensor: {calc.hp}</span><strong data-testid="text-damage-percent">{calc.pct.toFixed(1)}% máx.</strong></div>
        <div className="modifiers"><span className="modifier">STAB ×{attacker?.tipo1 === move.tipo || attacker?.tipo2 === move.tipo ? (ability === 'adaptability' ? '2' : '1,5') : '1'}</span><span className="modifier">{field === 'tailwind' ? 'Viento Afín: no modifica daño' : field === 'none' ? 'Sin pantallas' : `Pantalla: ${fieldOptions.find(([v])=>v===field)?.[1]}`}</span>{weather !== 'none' && <span className="modifier">{weatherOptions.find(([v])=>v===weather)?.[1]}</span>}</div>
      </> : <div className="empty-state">Añade Pokémon y movimientos para calcular el daño.</div>}
    </section>
    <p className="assumption"><b>Modelo estimado:</b> naturaleza neutra, IV 31 y 0 EV en todas las estadísticas. Sin crítico, variación aleatoria estándar 85–100%. El cálculo es orientativo para PokéMMO.</p>
    <div className="subhead"><h2>Estadísticas calculadas</h2><span>NIVEL · {attackerLevel} / {defenderLevel}</span></div>
    {attacker && defender && <div className="quick-stats"><div className="stat-chip"><small>Ataque efectivo</small><strong data-testid="text-effective-attack">{calc ? calc.atk : '—'}</strong></div><div className="stat-chip"><small>Defensa rival</small><strong data-testid="text-effective-defense">{calc ? calc.def : '—'}</strong></div><div className="stat-chip"><small>Velocidad</small><strong>{stat(attacker.spe,attackerLevel)}</strong></div></div>}
    <div className="subhead"><h2>Atajo de equipo</h2><span>{pokemon.length} POKÉMON</span></div>
    <div className="quick-stats">{pokemon.slice(0,3).map(p => <button className="stat-chip" style={{border:0}} key={p.id} data-testid={`button-roster-${p.id}`} onClick={() => setAttackerId(p.id)}><small>{typeName(p.tipo1)}</small><strong>{p.nombre}</strong></button>)}</div>
    {drawer && <div className="drawer-backdrop" onMouseDown={e => {if(e.target===e.currentTarget)setDrawer(false);}}>
      <nav className="drawer" aria-label="Navegación">
        <div className="drawer-head"><div><div className="brand-kicker">PokéMMO · FIELD KIT</div><div className="drawer-title">Tu espacio de batalla</div></div><button className="icon-button" aria-label="Cerrar menú" data-testid="button-close-menu" onClick={() => setDrawer(false)}><X size={18}/></button></div>
        <button className="drawer-link active" data-testid="nav-calculator" onClick={() => setDrawer(false)}><Gauge size={16}/> Calculadora de daño</button>
        <div className="drawer-section"><button data-testid="button-toggle-pokemon-section" onClick={() => setOpenSections(s => ({...s,pokemon:!s.pokemon}))}><span>Pokémon</span>{openSections.pokemon?<ChevronDown size={16}/>:<ChevronRight size={16}/>}</button>
          {openSections.pokemon && <><button className="drawer-link" data-testid="button-add-pokemon" onClick={() => openForm('pokemon')}><PlusCircle size={15}/> Añadir Pokémon</button><button className="drawer-link" data-testid="button-manage-pokemon" onClick={() => openForm('pokemon')}><Activity size={15}/> Gestionar equipo ({pokemon.length})</button></>}</div>
        <div className="drawer-section"><button data-testid="button-toggle-moves-section" onClick={() => setOpenSections(s => ({...s,moves:!s.moves}))}><span>Movimientos</span>{openSections.moves?<ChevronDown size={16}/>:<ChevronRight size={16}/>}</button>
          {openSections.moves && <><button className="drawer-link" data-testid="button-add-move" onClick={() => openForm('movimiento')}><PlusCircle size={15}/> Añadir movimiento</button><button className="drawer-link" data-testid="button-manage-moves" onClick={() => openForm('movimiento')}><Swords size={15}/> Gestionar movimientos ({moves.length})</button></>}</div>
        <div className="drawer-note"><strong><CircleHelp size={12} style={{verticalAlign:'-2px',marginRight:5}}/> Sobre el cálculo</strong>Daño estimado con fórmula estándar y datos editables en este dispositivo. Viento Afín afecta a la velocidad, no al daño.</div>
      </nav>
    </div>}
    {modal && <div className="modal-backdrop" onMouseDown={e => {if(e.target===e.currentTarget)setModal(null);}}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-head"><div><div className="brand-kicker">ROSTER LOCAL · SE GUARDA EN TU DISPOSITIVO</div><h2 id="modal-title">{modal === 'pokemon' ? 'Equipo Pokémon' : 'Biblioteca de movimientos'}</h2></div><button className="icon-button" aria-label="Cerrar" data-testid="button-close-modal" onClick={() => setModal(null)}><X size={18}/></button></div>
        {modal === 'pokemon' ? <>
          <form className="modal-form" key={editing?.id ?? 'new-pokemon'} onSubmit={savePokemon}>
            <div className="form-field"><label htmlFor="pokemon-name">Nombre</label><input id="pokemon-name" name="nombre" data-testid="input-pokemon-name" defaultValue={(editing as Pokemon | null)?.nombre ?? ''} maxLength={24} required placeholder="Ej. Garchomp"/></div>
            <div className="form-grid"><FormType name="tipo1" label="Tipo 1" initial={(editing as Pokemon | null)?.tipo1 ?? 'normal'}/><FormType name="tipo2" label="Tipo 2 (opcional)" initial={(editing as Pokemon | null)?.tipo2 ?? ''} optional/></div>
            <div className="form-grid">{STAT_KEYS.map((key,index) => <div className="form-field" key={key}><label htmlFor={`stat-${key}`}>{['PS base','Ataque base','Defensa base','At. Esp. base','Def. Esp. base','Velocidad base'][index]}</label><input id={`stat-${key}`} name={key} data-testid={`input-pokemon-${key}`} type="number" min="1" max="255" required defaultValue={(editing as Pokemon | null)?.[key] ?? [80,100,80,80,80,80][index]}/></div>)}</div>
            <div className="form-actions"><button type="button" className="btn btn-muted" data-testid="button-new-pokemon" onClick={() => setEditing(null)}>Nuevo registro</button><button className="btn btn-primary" data-testid="button-save-pokemon">{editing?'Guardar cambios':'Añadir Pokémon'}</button></div>
          </form>
          <div className="roster-list">{pokemon.length ? pokemon.map(p => <div className="roster-row" key={p.id}><div className="roster-info"><strong>{p.nombre}</strong><small>{typeName(p.tipo1)}{p.tipo2?` / ${typeName(p.tipo2)}`:''} · PS {p.hp} · Atq. {p.atk}</small></div><button className="tiny-action" aria-label={`Editar ${p.nombre}`} data-testid={`button-edit-pokemon-${p.id}`} onClick={() => setEditing(p)}><Edit2 size={14}/></button><button className="tiny-action delete" aria-label={`Eliminar ${p.nombre}`} data-testid={`button-delete-pokemon-${p.id}`} onClick={() => deletePokemon(p.id)}><Trash2 size={14}/></button></div>) : <div className="empty-state">Tu equipo está vacío. Añade un Pokémon arriba.</div>}</div>
        </> : <>
          <form className="modal-form" key={editing?.id ?? 'new-move'} onSubmit={saveMove}>
            <div className="form-field"><label htmlFor="move-name">Nombre</label><input id="move-name" name="nombre" data-testid="input-move-name" defaultValue={(editing as Move | null)?.nombre ?? ''} maxLength={28} required placeholder="Ej. Terremoto"/></div>
            <div className="form-grid"><FormType name="tipo" label="Tipo" initial={(editing as Move | null)?.tipo ?? 'normal'}/><div className="form-field"><label htmlFor="move-category">Categoría</label><select id="move-category" name="categoria" data-testid="select-move-category" defaultValue={(editing as Move | null)?.categoria ?? 'physical'}><option value="physical">Físico</option><option value="special">Especial</option></select></div></div>
            <div className="form-field"><label htmlFor="move-power">Potencia base</label><input id="move-power" name="poder" data-testid="input-move-power" type="number" min="1" max="250" required defaultValue={(editing as Move | null)?.poder ?? 80}/></div>
            <div className="form-actions"><button type="button" className="btn btn-muted" data-testid="button-new-move" onClick={() => setEditing(null)}>Nuevo registro</button><button className="btn btn-primary" data-testid="button-save-move">{editing?'Guardar cambios':'Añadir movimiento'}</button></div>
          </form>
          <div className="roster-list">{moves.length ? moves.map(m => <div className="roster-row" key={m.id}><div className="roster-info"><strong>{m.nombre}</strong><small>{typeName(m.tipo)} · {m.categoria==='physical'?'Físico':'Especial'} · {m.poder} potencia</small></div><button className="tiny-action" aria-label={`Editar ${m.nombre}`} data-testid={`button-edit-move-${m.id}`} onClick={() => setEditing(m)}><Edit2 size={14}/></button><button className="tiny-action delete" aria-label={`Eliminar ${m.nombre}`} data-testid={`button-delete-move-${m.id}`} onClick={() => deleteMove(m.id)}><Trash2 size={14}/></button></div>) : <div className="empty-state">No hay movimientos. Añade uno arriba.</div>}</div>
        </>}
      </section>
    </div>}
    {toast && <div role="status" className="toast" data-testid="status-toast">{toast}</div>}
  </main>;
}

function FormType({ name, label, initial, optional = false }: { name: string; label: string; initial: string; optional?: boolean }) {
  return <div className="form-field"><label htmlFor={`form-${name}`}>{label}</label><select id={`form-${name}`} name={name} data-testid={`select-form-${name}`} defaultValue={initial} required={!optional}><option value="">{optional?'Sin tipo':'Elige un tipo'}</option>{TYPES.map(([id,title]) => <option value={id} key={id}>{title}</option>)}</select></div>;
}

export default App;
