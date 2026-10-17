// Script to generate the complete 559 moves of Gen 1-5 with Spanish metadata, targets, and Showdown learnsets
const fs = require('fs');
const path = require('path');

async function run() {
  console.log('Fetching datasets from Veekun and Pokémon Showdown...');
  const [movesRes, namesRes, flavorRes, showdownRes] = await Promise.all([
    fetch('https://raw.githubusercontent.com/veekun/pokedex/master/pokedex/data/csv/moves.csv'),
    fetch('https://raw.githubusercontent.com/veekun/pokedex/master/pokedex/data/csv/move_names.csv'),
    fetch('https://raw.githubusercontent.com/veekun/pokedex/master/pokedex/data/csv/move_flavor_text.csv'),
    fetch('https://raw.githubusercontent.com/smogon/pokemon-showdown/master/data/learnsets.ts'),
  ]);

  const movesText = await movesRes.text();
  const namesText = await namesRes.text();
  const flavorText = await flavorRes.text();
  const showdownText = await showdownRes.text();

  // Spanish Names (language 7)
  const esNames = new Map();
  for (const line of namesText.split('\n')) {
    const parts = line.split(',');
    if (parts[1] === '7') {
      esNames.set(parts[0], parts[2]?.trim());
    }
  }

  // Spanish Descriptions (language 7, Gen 5 / BW flavor texts preferred)
  const esFlavors = new Map();
  for (const line of flavorText.split('\n')) {
    const m = line.match(/^(\d+),(\d+),(\d+),\"?([^\"]+)\"?/);
    if (m && m[3] === '7') {
      const moveId = parseInt(m[1], 10);
      if (moveId <= 559 && !esFlavors.has(moveId)) {
        esFlavors.set(moveId, m[4].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim());
      }
    }
  }

  // Types Map (Gen 1-5 only, no Fairy)
  const typesMap = {
    1: 'normal', 2: 'fighting', 3: 'flying', 4: 'poison', 5: 'ground',
    6: 'rock', 7: 'bug', 8: 'ghost', 9: 'steel', 10: 'fire',
    11: 'water', 12: 'grass', 13: 'electric', 14: 'psychic',
    15: 'ice', 16: 'dragon', 17: 'dark',
  };

  // Damage Category
  const classMap = { 1: 'status', 2: 'physical', 3: 'special' };

  // Battle Target mapping
  const targetMap = {
    1: { id: 'specific-move', label: 'Movimiento específico' },
    2: { id: 'selected-pokemon-me-first', label: 'Un Pokémon adyacente' },
    3: { id: 'ally', label: 'Un aliado adyacente' },
    4: { id: 'users-field', label: 'Todo el bando del usuario' },
    5: { id: 'user-or-ally', label: 'El usuario o un aliado' },
    6: { id: 'opponents-field', label: 'Todo el bando rival' },
    7: { id: 'user', label: 'El usuario' },
    8: { id: 'random-opponent', label: 'Un rival adyacente al azar' },
    9: { id: 'all-other-pokemon', label: 'Objetivos todos los Pokémon adyacentes' },
    10: { id: 'selected-pokemon', label: 'Un Pokémon adyacente o seleccionado' },
    11: { id: 'all-opponents', label: 'Todos los Pokémon rivales adyacentes' },
    12: { id: 'entire-field', label: 'Todo el terreno de combate' },
    13: { id: 'user-and-allies', label: 'El usuario y todos los aliados' },
    14: { id: 'all-pokemon', label: 'Todos los Pokémon en combate' },
  };

  // Parse Showdown Learnsets for Gen 1-5
  const moveLearners = new Map(); // moveKey -> Set of pokemonId
  const pokemonLearnedMoves = new Map(); // pKey -> Set of moveSlug

  const pokemonRegex = /\t([a-z0-9]+):\s*\{\s*learnset:\s*\{([^}]+)\}/g;
  let pMatch;
  while ((pMatch = pokemonRegex.exec(showdownText)) !== null) {
    const pId = pMatch[1];
    const movesContent = pMatch[2];
    const moveRegex = /([a-z0-9]+):\s*\[([^\]]+)\]/g;
    let mMatch;
    while ((mMatch = moveRegex.exec(movesContent)) !== null) {
      const moveKey = mMatch[1];
      const sources = mMatch[2];
      // Gen 1 to 5 sources
      if (/[1-5][LMTES]|7V|[1-5]D/.test(sources)) {
        if (!moveLearners.has(moveKey)) moveLearners.set(moveKey, new Set());
        moveLearners.get(moveKey).add(pId);

        if (!pokemonLearnedMoves.has(pId)) pokemonLearnedMoves.set(pId, new Set());
        pokemonLearnedMoves.get(pId).add(moveKey);
      }
    }
  }

  // Load existing pokedex-gen1-5.json
  const pokedexFile = path.resolve(__dirname, '../artifacts/pokemmo-damage-calc/src/pokedex-gen1-5.json');
  const pokedex = JSON.parse(fs.readFileSync(pokedexFile, 'utf8'));

  // Build the 559 moves list
  const movesLines = movesText.trim().split('\n');
  const moves559 = [];
  const moveKeyToSlug = new Map();

  for (let i = 1; i < movesLines.length; i++) {
    const cols = movesLines[i].split(',');
    const idNum = parseInt(cols[0], 10);
    if (idNum >= 1 && idNum <= 559) {
      const identifier = cols[1];
      const showdownKey = identifier.replace(/[^a-z0-9]/g, '');
      moveKeyToSlug.set(showdownKey, identifier);

      const esName = esNames.get(String(idNum)) || identifier;
      const typeStr = typesMap[parseInt(cols[3], 10)] || 'normal';
      const cat = classMap[parseInt(cols[9], 10)] || 'physical';
      const power = cols[4] ? parseInt(cols[4], 10) : 0;
      const pp = cols[5] ? parseInt(cols[5], 10) : 0;
      const accuracy = cols[6] ? parseInt(cols[6], 10) : null;
      const priority = cols[7] ? parseInt(cols[7], 10) : 0;
      const targetId = parseInt(cols[8], 10);
      const targetInfo = targetMap[targetId] || { id: 'selected-pokemon', label: 'Un objetivo' };
      const effectChance = cols[11] ? parseInt(cols[11], 10) : null;
      const desc = esFlavors.get(idNum) || '';

      // Find all pokedex pokemon that can learn this move
      const rawLearners = moveLearners.get(showdownKey) || new Set();
      const validLearners = [];

      for (const p of pokedex) {
        const pKey = p.id.toLowerCase().replace(/[^a-z0-9]/g, '');
        // Also check if base form learns it (e.g. for rotomwash -> check rotom, wormadamtrash -> wormadam)
        const baseKey = pKey.replace(/(wash|heat|frost|fan|mow|attack|defense|speed|origin|sky|therian|black|white|resolute|pirouette|sunny|rainy|snowy|sunshine|bluestriped|zen)$/, '');
        
        if (rawLearners.has(pKey) || rawLearners.has(p.id.toLowerCase()) || (baseKey && rawLearners.has(baseKey))) {
          validLearners.push(p.id);
        }
      }

      moves559.push({
        num: idNum,
        id: identifier,
        showdownKey,
        nombre: esName,
        tipo: typeStr,
        categoria: cat,
        poder: power,
        pp,
        accuracy,
        priority,
        probEfecto: effectChance,
        target: targetInfo.id,
        targetLabel: targetInfo.label,
        descripcion: desc,
        learnersCount: validLearners.length,
        learners: validLearners,
      });
    }
  }

  // Update learnset array for all 701 Pokémon in pokedex-gen1-5.json
  for (const p of pokedex) {
    const pKey = p.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const baseKey = pKey.replace(/(wash|heat|frost|fan|mow|attack|defense|speed|origin|sky|therian|black|white|resolute|pirouette|sunny|rainy|snowy|sunshine|bluestriped|zen)$/, '');
    
    const learnedSet = new Set();
    const pMoves = pokemonLearnedMoves.get(pKey);
    if (pMoves) {
      for (const mKey of pMoves) {
        const slug = moveKeyToSlug.get(mKey);
        if (slug) learnedSet.add(slug);
      }
    }
    if (baseKey && baseKey !== pKey) {
      const baseMoves = pokemonLearnedMoves.get(baseKey);
      if (baseMoves) {
        for (const mKey of baseMoves) {
          const slug = moveKeyToSlug.get(mKey);
          if (slug) learnedSet.add(slug);
        }
      }
    }

    if (learnedSet.size > 0) {
      p.learnset = Array.from(learnedSet);
    }
  }

  // Save moves-gen1-5.json
  const movesOutPath = path.resolve(__dirname, '../artifacts/pokemmo-damage-calc/src/moves-gen1-5.json');
  fs.writeFileSync(movesOutPath, JSON.stringify(moves559, null, 2), 'utf8');
  console.log(`Successfully generated ${moves559.length} moves at ${movesOutPath}`);

  // Save updated pokedex-gen1-5.json
  fs.writeFileSync(pokedexFile, JSON.stringify(pokedex, null, 2), 'utf8');
  console.log(`Successfully updated learnsets for ${pokedex.length} Pokémon in ${pokedexFile}`);
}

run().catch(err => {
  console.error('Build error:', err);
  process.exit(1);
});
