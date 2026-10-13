export const pokemonIniciales = [
  { id: 'garchomp', nombre: 'Garchomp', tipo1: 'dragon', tipo2: 'ground', hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 },
  { id: 'scizor', nombre: 'Scizor', tipo1: 'bug', tipo2: 'steel', hp: 70, atk: 130, def: 100, spa: 55, spd: 80, spe: 65 },
  { id: 'tyranitar', nombre: 'Tyranitar', tipo1: 'rock', tipo2: 'dark', hp: 100, atk: 134, def: 110, spa: 95, spd: 100, spe: 61 },
];

export const movimientosIniciales = [
  { id: 'earthquake', nombre: 'Terremoto', tipo: 'ground', categoria: 'physical', poder: 100 },
  { id: 'dragon-claw', nombre: 'Garra Dragón', tipo: 'dragon', categoria: 'physical', poder: 80 },
  { id: 'iron-head', nombre: 'Cabeza de Hierro', tipo: 'steel', categoria: 'physical', poder: 80 },
  { id: 'bullet-punch', nombre: 'Puño Bala', tipo: 'steel', categoria: 'physical', poder: 40, priority: 1 },
  { id: 'extreme-speed', nombre: 'Velocidad Extrema', tipo: 'normal', categoria: 'physical', poder: 80, priority: 2 },
  { id: 'aqua-jet', nombre: 'Acua Jet', tipo: 'water', categoria: 'physical', poder: 40, priority: 1 },
  { id: 'stone-edge', nombre: 'Roca Afilada', tipo: 'rock', categoria: 'physical', poder: 100 },
  { id: 'crunch', nombre: 'Triturar', tipo: 'dark', categoria: 'physical', poder: 80 },
  { id: 'close-combat', nombre: 'A Bocajarro', tipo: 'fighting', categoria: 'physical', poder: 120, statChange: { stat: 'def', stages: -1 } },
  { id: 'leaf-storm', nombre: 'Lluevehojas', tipo: 'grass', categoria: 'special', poder: 130, statChange: { stat: 'spa', stages: -2 } },
  { id: 'draco-meteor', nombre: 'Cometa Draco', tipo: 'dragon', categoria: 'special', poder: 130, statChange: { stat: 'spa', stages: -2 } },
  { id: 'flamethrower', nombre: 'Lanzallamas', tipo: 'fire', categoria: 'special', poder: 90 },
  { id: 'surf', nombre: 'Surf', tipo: 'water', categoria: 'special', poder: 90 },
  { id: 'ice-beam', nombre: 'Rayo Hielo', tipo: 'ice', categoria: 'special', poder: 90 },
  { id: 'thunderbolt', nombre: 'Rayo', tipo: 'electric', categoria: 'special', poder: 90 },
];
