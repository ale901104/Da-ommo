import React from 'react';

export type StatKey = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';
export type StageKey = Exclude<StatKey, 'hp'>;
export type StatValues = Record<StatKey, number>;
export type StageValues = Record<StageKey, number>;

export type PokemonTier = 'ou' | 'uu' | 'nu' | 'custom';

export type Pokemon = {
  id: string;
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
  learnset?: string[];
  finalEvolution: boolean;
  boosts: StageValues;
};

export type Move = {
  id: string;
  nombre: string;
  tipo: string;
  categoria: 'physical' | 'special';
  poder: number;
  priority?: number;
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
  ['fairy', 'Hada'],
];

export const typeName = (id: string) => TYPES.find(([key]) => key === id)?.[1] ?? id;

// Authentic Pokémon Type Colors
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
  fairy:    { bg: '#EF70EF', text: '#450945', border: '#C446C4' },
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

  // Standard Battle Abilities
  'none': { name: 'Ninguna', desc: 'Sin habilidad' },
  'adaptability': { name: 'Adaptable', desc: 'STAB ×2' },
  'huge-power': { name: 'Potencia', desc: 'Ataque físico ×2' },
  'pure-power': { name: 'Energía Pura', desc: 'Ataque físico ×2' },
  'guts': { name: 'Agallas', desc: 'Ataque ×1,5 si está quemado' },
  'sheer-force': { name: 'Potencia Bruta', desc: 'Daño ×1,3' },
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
  'intimidate': { name: 'Intimidación', desc: '-1 Ataque rival' },
  'thick-fat': { name: 'Sebo', desc: '-50% daño de Fuego y Hielo' },
  'multiscale': { name: 'Multiescamas', desc: '-50% daño con PS lleno' },
  'fur-coat': { name: 'Pelaje Recio', desc: 'Defensa física ×2' },
  'unaware': { name: 'Ignorante', desc: 'Ignora boosts de ataque rival' },
  'solid-rock': { name: 'Roca Sólida', desc: '-25% daño supereficaz' },
  'filter': { name: 'Filtro', desc: '-25% daño supereficaz' },
  'water-absorb': { name: 'Absorbe Agua', desc: 'Inmune a Agua' },
  'flash-fire': { name: 'Absorbe Fuego', desc: 'Inmune a Fuego' },
  'volt-absorb': { name: 'Absorbe Elec.', desc: 'Inmune a Eléctrico' },
  'sap-sipper': { name: 'Herbívoro', desc: 'Inmune a Planta' },
  'wonder-guard': { name: 'Superguarda', desc: 'Solo daña si es supereficaz' },
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
    const def = ALL_ABILITY_DEFINITIONS[abilityId];
    return [abilityId, def ? `${def.name} (${def.desc})` : abilityId];
  });
}

/**
 * Returns strictly the learnable moves for a specific Pokémon.
 * If the Pokémon defines a learnset, filters the master moves list to only those moves.
 */
export function getPokemonMoves(pokemon?: Pokemon | null, allMoves: Move[] = []): Move[] {
  if (!pokemon || !pokemon.learnset || pokemon.learnset.length === 0) {
    return allMoves;
  }
  const set = new Set(pokemon.learnset);
  const filtered = allMoves.filter(m => set.has(m.id));
  return filtered.length > 0 ? filtered : allMoves;
}
