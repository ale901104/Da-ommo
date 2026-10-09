export const pokemonIniciales: {
  id: string;
  nombre: string;
  tipo1: string;
  tipo2: string;
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}[];

export const movimientosIniciales: {
  id: string;
  nombre: string;
  tipo: string;
  categoria: 'physical' | 'special';
  poder: number;
}[];
