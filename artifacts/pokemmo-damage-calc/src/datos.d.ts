export const pokemonIniciales: {
  id: string;
  nombre: string;
  tier?: string;
  categoria?: string;
  tipo1: string;
  tipo2: string;
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  nature?: string;
  item?: string;
  ability?: string;
  abilities?: string[];
  learnset?: string[];
}[];

export const movimientosIniciales: {
  id: string;
  nombre: string;
  tipo: string;
  categoria: 'physical' | 'special';
  poder: number;
  priority?: number;
  statChange?: {
    stat: 'atk' | 'def' | 'spa' | 'spd' | 'spe';
    stages: number;
  };
}[];
