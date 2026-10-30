import React from 'react';

export type StatKey = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';
export type StageKey = Exclude<StatKey, 'hp'>;
export type StatValues = Record<StatKey, number>;
export type StageValues = Record<StageKey, number>;

export type PokemonTier = 'ou' | 'uu' | 'nu' | 'custom' | 'dex';

export type Pokemon = {
  id: string;
  num?: number;
  nombre: string;
  tier?: PokemonTier;
  categoria?: string;
  tipo1: string;
  tipo2: string;
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  ivs: StatValues;
  evs: StatValues;
  nature: string;
  item: string;
  ability?: string;
  abilities?: string[];
  abilityNames?: string[];
  learnset?: string[];
  finalEvolution: boolean;
  boosts: StageValues;
  weightkg?: number;
  heightm?: number;
  generation?: number;
  color?: string;
};

export type MoveCategory = 'physical' | 'special' | 'status';

export type Move = {
  id: string;
  num?: number;
  nombre: string;
  showdownKey?: string;
  tipo: string;
  categoria: MoveCategory;
  poder: number;
  pp?: number;
  accuracy?: number | null;
  priority?: number;
  probEfecto?: number | null;
  target?: string;
  targetLabel?: string;
  descripcion?: string;
  learnersCount?: number;
  learners?: string[];
  statChange?: { stat: StageKey; stages: number };
};

export type AbilityEffect = 'damage' | 'stage' | 'contrary';
export type CustomAbility = {
  id: string;
  nombre: string;
  effect: AbilityEffect;
  moveId: string;
  multiplier: number;
  stat: StageKey;
  stages: number;
};

export const STAT_KEYS: StatKey[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
export const STAGE_KEYS: StageKey[] = ['atk', 'def', 'spa', 'spd', 'spe'];
export const STAT_LABELS: Record<StatKey, string> = {
  hp: 'PS',
  atk: 'Ataque',
  def: 'Defensa',
  spa: 'At. Esp.',
  spd: 'Def. Esp.',
  spe: 'Velocidad',
};

export const TYPES: [string, string][] = [
  ['normal', 'Normal'],
  ['fire', 'Fuego'],
  ['water', 'Agua'],
  ['electric', 'Eléctrico'],
  ['grass', 'Planta'],
  ['ice', 'Hielo'],
  ['fighting', 'Lucha'],
  ['poison', 'Veneno'],
  ['ground', 'Tierra'],
  ['flying', 'Volador'],
  ['psychic', 'Psíquico'],
  ['bug', 'Bicho'],
  ['rock', 'Roca'],
  ['ghost', 'Fantasma'],
  ['dragon', 'Dragón'],
  ['dark', 'Siniestro'],
  ['steel', 'Acero'],
];

export const typeName = (id: string) => TYPES.find(([key]) => key === id)?.[1] ?? id;

// Authentic Pokémon Type Colors (Gen 1-5)
export const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  normal:   { bg: '#9FA19F', text: '#ffffff', border: '#818381' },
  fire:     { bg: '#E62829', text: '#ffffff', border: '#B81A1B' },
  water:    { bg: '#2980EF', text: '#ffffff', border: '#1761BE' },
  electric: { bg: '#FAC000', text: '#2e2600', border: '#C99B00' },
  grass:    { bg: '#3FA129', text: '#ffffff', border: '#2B7A1A' },
  ice:      { bg: '#3DCEF3', text: '#063945', border: '#1BA7CA' },
  fighting: { bg: '#FF8000', text: '#ffffff', border: '#C76300' },
  poison:   { bg: '#9141CB', text: '#ffffff', border: '#6E2A9F' },
  ground:   { bg: '#915121', text: '#ffffff', border: '#6F3A12' },
  flying:   { bg: '#81B9EF', text: '#0d2d4c', border: '#5A94CB' },
  psychic:  { bg: '#EF4179', text: '#ffffff', border: '#C22659' },
  bug:      { bg: '#91A119', text: '#ffffff', border: '#6E7C0C' },
  rock:     { bg: '#AFA981', text: '#262417', border: '#898460' },
  ghost:    { bg: '#704170', text: '#ffffff', border: '#532C53' },
  dragon:   { bg: '#5060E1', text: '#ffffff', border: '#3240B8' },
  dark:     { bg: '#50413F', text: '#ffffff', border: '#362B2A' },
  steel:    { bg: '#60A1B8', text: '#ffffff', border: '#427A8F' },
};

export const TypeBadge: React.FC<{ type: string; size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  type,
  size = 'md',
  className = '',
}) => {
  if (!type) return null;
  const color = TYPE_COLORS[type.toLowerCase()] || { bg: '#6b7280', text: '#ffffff', border: '#4b5563' };
  const label = typeName(type);
  const sizeClass = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : '';

  return (
    <span
      className={`type-badge ${sizeClass} ${className}`}
      style={{
        backgroundColor: color.bg,
        color: color.text,
        borderColor: color.border,
      }}
    >
      {label}
    </span>
  );
};

export const NATURES: [string, string, StageKey, StageKey, string][] = [
  ['hardy', 'Fuerte (Neutra)', 'atk', 'atk', 'Sin cambios'],
  ['adamant', 'Firme (+Atq -SpA)', 'atk', 'spa', '+Ataque, -At. Esp.'],
  ['brave', 'Audaz (+Atq -Vel)', 'atk', 'spe', '+Ataque, -Velocidad'],
  ['lonely', 'Huraña (+Atq -Def)', 'atk', 'def', '+Ataque, -Defensa'],
  ['naughty', 'Pícara (+Atq -SpD)', 'atk', 'spd', '+Ataque, -Def. Esp.'],

  ['modest', 'Modesta (+SpA -Atq)', 'spa', 'atk', '+At. Esp., -Ataque'],
  ['timid', 'Miedosa (+Vel -Atq)', 'spe', 'atk', '+Velocidad, -Ataque'],
  ['jolly', 'Alegre (+Vel -SpA)', 'spe', 'spa', '+Velocidad, -At. Esp.'],
  ['naive', 'Ingenua (+Vel -SpD)', 'spe', 'spd', '+Velocidad, -Def. Esp.'],
  ['hasty', 'Activa (+Vel -Def)', 'spe', 'def', '+Velocidad, -Defensa'],

  ['bold', 'Osada (+Def -Atq)', 'def', 'atk', '+Defensa, -Ataque'],
  ['impish', 'Agitada (+Def -SpA)', 'def', 'spa', '+Defensa, -At. Esp.'],
  ['relaxed', 'Plácida (+Def -Vel)', 'def', 'spe', '+Defensa, -Velocidad'],
  ['lax', 'Floja (+Def -SpD)', 'def', 'spd', '+Defensa, -Def. Esp.'],

  ['calm', 'Serena (+SpD -Atq)', 'spd', 'atk', '+Def. Esp., -Ataque'],
  ['careful', 'Cauta (+SpD -SpA)', 'spd', 'spa', '+Def. Esp., -At. Esp.'],
  ['sassy', 'Grosera (+SpD -Vel)', 'spd', 'spe', '+Def. Esp., -Velocidad'],
  ['gentle', 'Amable (+SpD -Def)', 'spd', 'def', '+Def. Esp., -Defensa'],

  ['quiet', 'Mansa (+SpA -Vel)', 'spa', 'spe', '+At. Esp., -Velocidad'],
  ['mild', 'Afable (+SpA -Def)', 'spa', 'def', '+At. Esp., -Defensa'],
  ['rash', 'Alocada (+SpA -SpD)', 'spa', 'spd', '+At. Esp., -Def. Esp.'],

  ['docile', 'Dócil (Neutra)', 'def', 'def', 'Sin cambios'],
  ['serious', 'Seria (Neutra)', 'spe', 'spe', 'Sin cambios'],
  ['bashful', 'Tímida (Neutra)', 'spa', 'spa', 'Sin cambios'],
  ['quirky', 'Rara (Neutra)', 'spd', 'spd', 'Sin cambios'],
];

export const ITEMS: [string, string][] = [
  ['none', 'Ninguno'],
  ['choice-band', 'Cinta Elegida · Ataque ×1,5'],
  ['choice-specs', 'Gafas Elegidas · At. Esp. ×1,5'],
  ['choice-scarf', 'Pañuelo Elegido · Velocidad ×1,5'],
  ['life-orb', 'Vidasfera · Daño ×1,3 (pierde 10% PS)'],
  ['expert-belt', 'Cinta Experto · Supereficaz ×1,2'],
  ['muscle-band', 'Cinta Fuerte · Físico ×1,1'],
  ['wise-glasses', 'Gafas Especiales · Especial ×1,1'],
  ['eviolite', 'Mineral Evolutivo · Defensas ×1,5 (no finales)'],
  ['assault-vest', 'Chaleco Asalto · Def. Esp. ×1,5'],
  ['leftovers', 'Restos · Recupera +1/16 PS'],
  ['rocky-helmet', 'Casco Dentado · Daña al contacto'],
  ['focus-sash', 'Banda Focus · Resiste con 1 PS'],
  ['black-sludge', 'Lodo Negro · Recupera si es Veneno'],
  ['iron-ball', 'Bola Férrea · Velocidad ×0,5'],
  ...TYPES.slice(1).map(([id, name]): [string, string] => [`${id}-gem`, `${name} Zafiro (+30% ${name})`]),
];

// Master Dictionary with descriptive Spanish names for all abilities
export const ALL_ABILITY_DEFINITIONS: Record<string, { name: string; desc: string }> = {
  // Slowbro
  'oblivious': { name: 'Despiste', desc: 'Inmune a atracción y mofa' },
  'own-tempo': { name: 'Ritmo Propio', desc: 'Inmune a confusión' },
  'regenerator': { name: 'Regenerador', desc: 'Recupera 1/3 PS al cambiar' },

  // Gengar
  'levitate': { name: 'Levitación', desc: 'Inmune a Tierra' },
  'cursed-body': { name: 'Cuerpo Maldito', desc: '30% anula ataque recibido' },

  // Weezing
  'neutralizing-gas': { name: 'Gas Reactivo', desc: 'Anula habilidades en el campo' },
  'stench': { name: 'Hedor', desc: '10% de amedrentar al golpear' },

  // Chansey
  'natural-cure': { name: 'Cura Natural', desc: 'Cura estados al cambiar' },
  'serene-grace': { name: 'Dicha', desc: 'Duplica probabilidad de efectos secundarios' },
  'healer': { name: 'Alma Cura', desc: '30% cura estados de aliados' },

  // Starmie
  'illuminate': { name: 'Iluminación', desc: 'Evita bajadas de precisión' },
  'analytic': { name: 'Cálculo Final (Analítico)', desc: 'Daño ×1,3 si ataca después' },

  // Garchomp
  'sand-veil': { name: 'Velo Arena', desc: '+20% evasión en Tormenta Arena' },
  'rough-skin': { name: 'Piel Tosca', desc: 'Daña 1/8 PS al contacto' },

  // Scizor
  'technician': { name: 'Experto', desc: 'Potencia ≤60 ×1,5' },
  'swarm': { name: 'Enjambre', desc: 'Bicho ×1,5 con PS bajos' },
  'light-metal': { name: 'Metal Liviano', desc: 'Reduce peso a la mitad' },

  // Tyranitar
  'sand-stream': { name: 'Chorro Arena', desc: 'Invoca Tormenta de Arena' },
  'unnerve': { name: 'Nerviosismo', desc: 'Impide comer bayas al rival' },

  'none': { name: 'Ninguna', desc: 'Sin habilidad' },
  'adaptability': { name: 'Adaptable', desc: 'STAB ×2' },
  'huge-power': { name: 'Potencia', desc: 'Ataque físico ×2' },
  'pure-power': { name: 'Energía Pura', desc: 'Ataque físico ×2' },
  'guts': { name: 'Agallas', desc: 'Ataque ×1,5 si tiene problema de estado' },
  'sheer-force': { name: 'Potencia Bruta', desc: 'Daño ×1,3 anulando efecto secundario' },
  'sniper': { name: 'Francotirador', desc: 'Críticos ×2,25' },
  'tinted-lens': { name: 'Cromolente', desc: 'Poco eficaz ×2' },
  'contrary': { name: 'Respondón', desc: 'Invierte cambios de stats' },
  'blaze': { name: 'Mar Llamas', desc: 'Fuego ×1,5 con PS bajos' },
  'torrent': { name: 'Torrente', desc: 'Agua ×1,5 con PS bajos' },
  'overgrow': { name: 'Espesura', desc: 'Planta ×1,5 con PS bajos' },
  'swift-swim': { name: 'Nado Rápido', desc: 'Velocidad ×2 en Lluvia' },
  'chlorophyll': { name: 'Clorofila', desc: 'Velocidad ×2 en Sol' },
  'sand-rush': { name: 'Ímpetu Arena', desc: 'Velocidad ×2 en Tormenta' },
  'slush-rush': { name: 'Quitanieves', desc: 'Velocidad ×2 en Granizo' },
  'intimidate': { name: 'Intimidación', desc: '-1 Ataque al rival al entrar' },
  'thick-fat': { name: 'Sebo', desc: '-50% daño recibido de Fuego y Hielo' },
  'multiscale': { name: 'Multiescamas', desc: '-50% daño con PS lleno' },
  'fur-coat': { name: 'Pelaje Recio', desc: 'Defensa física ×2' },
  'unaware': { name: 'Ignorante', desc: 'Ignora boosts defensivos/ofensivos rivales' },
  'solid-rock': { name: 'Roca Sólida', desc: '-25% daño recibido supereficaz' },
  'filter': { name: 'Filtro', desc: '-25% daño recibido supereficaz' },
  'water-absorb': { name: 'Absorbe Agua', desc: 'Inmune e hidrata con ataques de Agua' },
  'flash-fire': { name: 'Absorbe Fuego', desc: 'Inmune y potencia Fuego al recibir fuego' },
  'volt-absorb': { name: 'Absorbe Elec.', desc: 'Inmune e hidrata con Eléctrico' },
  'motor-drive': { name: 'Electromotor', desc: 'Inmune a Eléctrico y sube +1 Velocidad' },
  'sap-sipper': { name: 'Herbívoro', desc: 'Inmune a Planta y sube +1 Ataque' },
  'wonder-guard': { name: 'Superguarda', desc: 'Solo recibe daño de movimientos supereficaces' },
  'moxie': { name: 'Autoestima', desc: '+1 Ataque al derrotar a un oponente' },
  'magic-guard': { name: 'Muro Mágico', desc: 'Inmune a todo daño indirecto (clima, vidaesfera, veneno)' },
  'magic-bounce': { name: 'Espejomágico', desc: 'Rebota movimientos de estado y trampas' },
  'iron-fist': { name: 'Puño Férreo', desc: '+20% daño en ataques basados en puñetazos' },
  'reckless': { name: 'Audaz', desc: '+20% daño en ataques con daño de retroceso' },
  'rock-head': { name: 'Cabeza Roca', desc: 'Evita daño de retroceso' },
  'speed-boost': { name: 'Impulso', desc: '+1 Velocidad al final de cada turno' },
  'drought': { name: 'Sequía', desc: 'Invoca Sol brillante al entrar al combate' },
  'drizzle': { name: 'Llovizna', desc: 'Invoca Lluvia al entrar al combate' },
  'snow-warning': { name: 'Nevada', desc: 'Invoca Granizo al entrar al combate' },
  'prankster': { name: 'Bromista', desc: 'Prioridad +1 en movimientos de estado' },
  'download': { name: 'Descarga', desc: '+1 Ataque o Atq Esp según la menor defensa rival' },
  'infiltrator': { name: 'Allanamiento', desc: 'Ignora Reflejo, Pantalla Luz, Velo Sagrado y Sustituto' },
  'sturdy': { name: 'Robustez', desc: 'Evita K.O. directo de un solo golpe con PS llenos' },
  'mold-breaker': { name: 'Rompemoldes', desc: 'Ignora las habilidades defensivas rivales' },
  'teravolt': { name: 'Teravoltio', desc: 'Rompemoldes de Zekrom' },
  'turboblaze': { name: 'Turbollama', desc: 'Rompemoldes de Reshiram' },
  'solar-power': { name: 'Poder Solar', desc: '+50% Atq Esp con Sol, pierde 1/8 PS por turno' },
  'rain-dish': { name: 'Cura Lluvia', desc: 'Recupera 1/16 PS al final de turno con Lluvia' },
  'ice-body': { name: 'Gélido', desc: 'Recupera 1/16 PS al final de turno con Granizo' },
  'sand-force': { name: 'Poder Arena', desc: '+30% poder Roca, Tierra y Acero en Tormenta Arena' },
  'defiant': { name: 'Competitivo (Defiant)', desc: '+2 Ataque cuando bajan sus estadísticas' },
  'competitive': { name: 'Tenacidad', desc: '+2 Atq Esp cuando bajan sus estadísticas' },
  'poison-heal': { name: 'Antídoto', desc: 'Recupera 1/8 PS por turno al estar envenenado' },
  'iron-barbs': { name: 'Punta Acero', desc: 'Daña 1/8 PS al rival por contacto' },
  'scrappy': { name: 'Intrépido', desc: 'Permite golpear a tipo Fantasma con Normal y Lucha' },
  'super-luck': { name: 'Afortunado', desc: '+1 nivel al ratio de golpe crítico' },
  'skill-link': { name: 'Encadenado', desc: 'Ataques de múltiples golpes siempre golpean 5 veces' },
  'compound-eyes': { name: 'Ojo Compuesto', desc: '+30% de precisión en todos los ataques' },
  'hustle': { name: 'Entusiasmo', desc: '+50% Ataque físico a cambio de -20% precisión' },
  'sheer-cold': { name: 'Frío Extremo', desc: 'Inmunidad a congelación' },
  'static': { name: 'Elec. Estática', desc: '30% probabilidad de paralizar por contacto' },
  'flame-body': { name: 'Cuerpo Llama', desc: '30% probabilidad de quemar por contacto' },
  'poison-point': { name: 'Punto Tóxico', desc: '30% probabilidad de envenenar por contacto' },
  'effect-spore': { name: 'Efecto Espora', desc: '30% probabilidad de dormir, paralizar o envenenar' },
  'cute-charm': { name: 'Gran Encanto', desc: '30% probabilidad de enamorar por contacto' },
  'lightning-rod': { name: 'Pararrayos', desc: 'Atrae Eléctrico, otorga inmunidad y +1 Atq Esp' },
  'storm-drain': { name: 'Colector', desc: 'Atrae Agua, otorga inmunidad y +1 Atq Esp' },
  'dry-skin': { name: 'Piel Seca', desc: 'Cura con Agua, débil a Fuego' },
  'synchronize': { name: 'Sincronía', desc: 'Traspasa quemadura, parálisis y veneno al rival' },
  'trace': { name: 'Rastro', desc: 'Copia la habilidad del oponente al entrar' },
  'clear-body': { name: 'Cuerpo Puro', desc: 'Evita que el rival reduzca sus estadísticas' },
  'white-smoke': { name: 'Humo Blanco', desc: 'Evita bajada de estadísticas' },
  'hyper-cutter': { name: 'Corte Fuerte', desc: 'Evita que bajen su estadística de Ataque' },
  'keen-eye': { name: 'Vista Lince', desc: 'Evita bajadas de precisión e ignora evasión rival' },
  'vital-spirit': { name: 'Espíritu Vital', desc: 'Inmune al estado de sueño' },
  'insomnia': { name: 'Insomnio', desc: 'Inmune al estado de sueño' },
  'immunity': { name: 'Inmunidad', desc: 'Inmune al envenenamiento' },
  'limber': { name: 'Flexibilidad', desc: 'Inmune a la parálisis' },
  'magma-armor': { name: 'Escudo Magma', desc: 'Inmune al congelamiento' },
  'water-veil': { name: 'Velo Agua', desc: 'Inmune a quemaduras' },
  'soundproof': { name: 'Insonorizar', desc: 'Inmune a movimientos de sonido' },
  'cloud-nine': { name: 'Aclimatación', desc: 'Anula los efectos del clima en combate' },
  'air-lock': { name: 'Bucle Aire', desc: 'Anula los efectos del clima de Rayquaza' },
  'arena-trap': { name: 'Trampa Arena', desc: 'Impide huir a rivales en el suelo' },
  'shadow-tag': { name: 'Sombra Trampa', desc: 'Impide huir o cambiar a Pokémon rivales' },
  'magnet-pull': { name: 'Imán', desc: 'Impide huir o cambiar a Pokémon de tipo Acero' },
  'suction-cups': { name: 'Ventosas', desc: 'Evita ser forzado a cambiar por Rugido/Remolino' },
  'simple': { name: 'Simple', desc: 'Duplica todos los cambios de estadísticas (+2 pasa a +4)' },
  'unburden': { name: 'Liviano', desc: 'Duplica Velocidad al consumir su objeto equipado' },
  'weak-armor': { name: 'Armadura Frágil', desc: '-1 Defensa y +2 Velocidad al recibir golpe físico' },
  'justified': { name: 'Justiciero', desc: '+1 Ataque al recibir ataques de tipo Siniestro' },
  'rattled': { name: 'Cobardía', desc: '+1 Velocidad al recibir Bicho, Fantasma o Siniestro' },
  'mummy': { name: 'Momia', desc: 'Transmite Momia al rival al recibir contacto' },
  'illusion': { name: 'Ilusión', desc: 'Adopta el aspecto del último Pokémon del equipo' },
  'imposter': { name: 'Impostor', desc: 'Se transforma automáticamente en el rival' },
  'protean': { name: 'Mutatipo', desc: 'Cambia su tipo al del movimiento que va a ejecutar' },
  'victory-star': { name: 'Tinovictoria', desc: '+10% precisión para el usuario y aliados' },
  'zen-mode': { name: 'Modo Daruma', desc: 'Cambia de forma Darmanitan al tener menos del 50% PS' },
};

export const ATTACKER_ABILITIES: [string, string][] = Object.entries(ALL_ABILITY_DEFINITIONS).map(
  ([id, def]) => [id, `${def.name} (${def.desc})`]
);

export const DEFENDER_ABILITIES: [string, string][] = Object.entries(ALL_ABILITY_DEFINITIONS).map(
  ([id, def]) => [id, `${def.name} (${def.desc})`]
);

/**
 * Returns strictly the allowed abilities for a specific Pokémon.
 * If the Pokémon defines a specific abilities list, returns only those.
 */
export function getPokemonAbilities(pokemon?: Pokemon | null): [string, string][] {
  if (!pokemon) return [['none', 'Ninguna']];
  const list = pokemon.abilities && pokemon.abilities.length > 0 ? pokemon.abilities : [];
  if (list.length === 0) {
    return [['none', 'Ninguna']];
  }
  return list.map(abilityId => {
    const slug = abilityId.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const def = ALL_ABILITY_DEFINITIONS[slug] || ALL_ABILITY_DEFINITIONS[abilityId];
    if (def) {
      return [slug, `${def.name} (${def.desc})`];
    }
    // Fallback: title-case formatting
    const formatted = abilityId
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    return [slug, formatted];
  });
}

export interface HiddenPowerTypeOption {
  id: string;
  tipo: string;
  label: string;
  moveName: string;
}

export const HIDDEN_POWER_TYPES: HiddenPowerTypeOption[] = [
  { id: 'hidden-power-fire', tipo: 'fire', label: 'Fuego', moveName: 'Poder Oculto [Fuego]' },
  { id: 'hidden-power-water', tipo: 'water', label: 'Agua', moveName: 'Poder Oculto [Agua]' },
  { id: 'hidden-power-grass', tipo: 'grass', label: 'Planta', moveName: 'Poder Oculto [Planta]' },
  { id: 'hidden-power-electric', tipo: 'electric', label: 'Eléctrico', moveName: 'Poder Oculto [Eléctrico]' },
  { id: 'hidden-power-ice', tipo: 'ice', label: 'Hielo', moveName: 'Poder Oculto [Hielo]' },
  { id: 'hidden-power-fighting', tipo: 'fighting', label: 'Lucha', moveName: 'Poder Oculto [Lucha]' },
  { id: 'hidden-power-poison', tipo: 'poison', label: 'Veneno', moveName: 'Poder Oculto [Veneno]' },
  { id: 'hidden-power-ground', tipo: 'ground', label: 'Tierra', moveName: 'Poder Oculto [Tierra]' },
  { id: 'hidden-power-flying', tipo: 'flying', label: 'Volador', moveName: 'Poder Oculto [Volador]' },
  { id: 'hidden-power-psychic', tipo: 'psychic', label: 'Psíquico', moveName: 'Poder Oculto [Psíquico]' },
  { id: 'hidden-power-bug', tipo: 'bug', label: 'Bicho', moveName: 'Poder Oculto [Bicho]' },
  { id: 'hidden-power-rock', tipo: 'rock', label: 'Roca', moveName: 'Poder Oculto [Roca]' },
  { id: 'hidden-power-ghost', tipo: 'ghost', label: 'Fantasma', moveName: 'Poder Oculto [Fantasma]' },
  { id: 'hidden-power-dragon', tipo: 'dragon', label: 'Dragón', moveName: 'Poder Oculto [Dragón]' },
  { id: 'hidden-power-dark', tipo: 'dark', label: 'Siniestro', moveName: 'Poder Oculto [Siniestro]' },
  { id: 'hidden-power-steel', tipo: 'steel', label: 'Acero', moveName: 'Poder Oculto [Acero]' },
];

/**
 * Returns strictly the learnable moves for a specific Pokémon.
 * If the Pokémon defines a learnset, filters the master moves list to only those moves.
 */
export function getPokemonMoves(pokemon?: Pokemon | null, allMoves: Move[] = []): Move[] {
  if (!pokemon || !pokemon.learnset || pokemon.learnset.length === 0) {
    return allMoves;
  }
  const set = new Set(pokemon.learnset.map(s => s.toLowerCase().replace(/[^a-z0-9]/g, '')));

  const pId = (pokemon.id || '').toLowerCase();
  const pName = (pokemon.nombre || '').toLowerCase();

  const isRotomWash =
    pId.includes('rotom-wash') ||
    pId.includes('rotomwash') ||
    pName.includes('rotom wash') ||
    pName.includes('rotom lavado');
  const isSableye = pId.includes('sableye') || pName.includes('sableye');

  if (isRotomWash) {
    set.add('hydropump');
    set.add('hidrobomba');
  }
  if (isSableye) {
    set.add('lightscreen');
    set.add('pantallaluz');
    set.add('reflect');
    set.add('reflejo');
  }

  const learnsHiddenPower =
    set.has('hiddenpower') ||
    set.has('poderoculto') ||
    pokemon.learnset.some(l => l.includes('hidden-power') || l.includes('hiddenpower') || l.includes('poder-oculto'));

  const filtered = allMoves.filter(m => {
    const slugKey = m.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const showdownKey = (m.showdownKey || '').toLowerCase();
    if (
      learnsHiddenPower &&
      (m.id.startsWith('hidden-power') || m.id === 'hiddenpower' || m.nombre.toLowerCase().startsWith('poder oculto'))
    ) {
      return true;
    }
    if (isRotomWash && (slugKey === 'hydropump' || slugKey === 'hidrobomba' || showdownKey === 'hydropump')) {
      return true;
    }
    if (
      isSableye &&
      (slugKey === 'lightscreen' ||
        slugKey === 'pantallaluz' ||
        showdownKey === 'lightscreen' ||
        slugKey === 'reflect' ||
        slugKey === 'reflejo' ||
        showdownKey === 'reflect')
    ) {
      return true;
    }
    return set.has(slugKey) || (showdownKey && set.has(showdownKey));
  });
  return filtered.length > 0 ? filtered : allMoves;
}


