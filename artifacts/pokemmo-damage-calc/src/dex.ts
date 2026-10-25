import rawDexData from './pokedex-gen1-5.json';
import rawMovesData from './moves-gen1-5.json';
import { type Move, type Pokemon, type PokemonTier, type StageValues, type StatValues } from './pokemon-constants';

export interface RawDexPokemon {
  id: string;
  num: number;
  nombre: string;
  tipo1: string;
  tipo2: string;
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  abilities: string[];
  abilityNames: string[];
  learnset: string[];
  weightkg?: number;
  heightm?: number;
  generation: number;
  color?: string;
}

export const rawDexList: RawDexPokemon[] = rawDexData as RawDexPokemon[];

export function convertDexToPokemon(d: RawDexPokemon, tier: PokemonTier = 'dex'): Pokemon {
  let nature = 'serious';
  if (d.atk >= d.spa && d.atk >= 85) {
    nature = d.spe >= 85 ? 'jolly' : 'adamant';
  } else if (d.spa > d.atk && d.spa >= 85) {
    nature = d.spe >= 85 ? 'timid' : 'modest';
  } else if (d.def >= 95 || d.spd >= 95) {
    nature = d.def >= d.spd ? 'bold' : 'calm';
  }

  const zeroBoosts: StageValues = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  const maxIvs: StatValues = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
  const zeroEvs: StatValues = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

  return {
    id: d.id,
    num: d.num,
    nombre: d.nombre,
    tier,
    categoria: tier,
    tipo1: d.tipo1,
    tipo2: d.tipo2,
    hp: d.hp,
    atk: d.atk,
    def: d.def,
    spa: d.spa,
    spd: d.spd,
    spe: d.spe,
    ivs: { ...maxIvs },
    evs: { ...zeroEvs },
    nature,
    item: 'none',
    ability: d.abilities[0] || 'none',
    abilities: d.abilities,
    abilityNames: d.abilityNames,
    learnset: d.learnset,
    finalEvolution: true,
    boosts: { ...zeroBoosts },
    weightkg: d.weightkg,
    heightm: d.heightm,
    generation: d.generation,
    color: d.color,
  };
}

export const allGen1To5Pokemon: Pokemon[] = rawDexList.map(p => convertDexToPokemon(p));

export const dexPokemonMap = new Map<string, Pokemon>(
  allGen1To5Pokemon.map(p => [p.id, p])
);

import { HIDDEN_POWER_TYPES } from './pokemon-constants';

const rawMoves = rawMovesData as Move[];

export const hiddenPowerMoveVariants: Move[] = HIDDEN_POWER_TYPES.map(hp => ({
  num: 237,
  id: hp.id,
  showdownKey: 'hiddenpower',
  nombre: hp.moveName,
  tipo: hp.tipo,
  categoria: 'special',
  poder: 60,
  pp: 15,
  accuracy: 100,
  priority: 0,
  probEfecto: null,
  target: 'selected-pokemon',
  targetLabel: 'Un Pokémon adyacente o seleccionado',
  descripcion: `Poder Oculto de tipo ${hp.label} (Gen 5, 60 Potencia).`,
  learnersCount: 661,
}));

export const allGen1To5Moves: Move[] = [...rawMoves, ...hiddenPowerMoveVariants];

export const dexMoveMap = new Map<string, Move>(
  allGen1To5Moves.map(m => [m.id, m])
);


