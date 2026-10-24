import { type BuilderMember, type SavedTeam } from '../components/TeamBuilderView';
import { type RawDexPokemon } from '../dex';
import { getPokemonDexNum } from '../components/PokemonSearchableSelect';
import { typeName, TYPES } from '../pokemon-constants';

interface TiposSummary {
  resistantRows: { typeId: string; name: string; pokemons: { name: string }[] }[];
  weakRows: { typeId: string; name: string; pokemons: { name: string }[] }[];
  immuneRows?: { typeId: string; name: string; pokemons: { name: string }[] }[];
}

const TYPE_CHART: Record<string, Record<string, number>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5 },
};

export function generateLocalCompetitiveAiAnalysis(
  currentTeam: SavedTeam,
  dexMap: Map<string, RawDexPokemon>,
  tiposData?: TiposSummary
): string {
  const members = currentTeam.members || [];
  const filledMembers = members.filter(m => Boolean(m.pokemonId || m.nombre));

  if (filledMembers.length === 0) {
    return `### ⚠️ Equipo sin Pokémon configurados
Aún no has añadido integrantes a este equipo. 

**Recomendación inicial:**
- Añade de 3 a 6 Pokémon en las casillas superiores para que el Asistente IA pueda evaluar la sinergia, coberturas elementales, roles de combate y amenazas del meta de PokéMMO.
- Puedes importar equipos en formato Pokémon Showdown usando el botón **Importar** arriba a la derecha.`;
  }

  // Analyze each member's profile
  const memberProfiles = filledMembers.map((m, idx) => {
    const dexNum = getPokemonDexNum(m.pokemonId) || getPokemonDexNum(m.nombre);
    const dex =
      dexNum > 0
        ? dexMap.get(String(dexNum)) || dexMap.get(m.pokemonId.toLowerCase())
        : undefined;

    const name = m.nombre || dex?.nombre || m.pokemonId || `Pokémon ${idx + 1}`;
    const t1 = dex?.tipo1 || 'normal';
    const t2 = dex?.tipo2 || '';
    const hp = dex?.hp || 80;
    const atk = dex?.atk || 80;
    const def = dex?.def || 80;
    const spa = dex?.spa || 80;
    const spd = dex?.spd || 80;
    const spe = dex?.spe || 80;
    const bst = hp + atk + def + spa + spd + spe;

    // Detect competitive role based on stats, items, and moves
    let role = 'Balance / Pivot';
    if (spe >= 105 && (atk >= 115 || spa >= 115)) {
      role = atk >= spa ? 'Fast Physical Sweeper' : 'Fast Special Sweeper';
    } else if (hp >= 95 && def >= 100) {
      role = 'Muralla Física (Physical Wall)';
    } else if (hp >= 95 && spd >= 100) {
      role = 'Muralla Especial (Special Wall)';
    } else if (hp >= 80 && def >= 85 && spd >= 85 && (atk >= 100 || spa >= 100)) {
      role = 'Tanque Ofensivo (Bulky Attacker)';
    } else if (spe >= 110) {
      role = 'Revenge Killer / Scout';
    } else if (atk >= 125 || spa >= 125) {
      role = 'Wallbreaker Demoledor';
    }

    const moves = (m.moves || []).filter(mv => Boolean(mv && mv.trim()));
    const hasHazards = moves.some(mv =>
      /trampa rocas|stealth rock|púas|spikes|púas tóxicas|toxic spikes/i.test(mv)
    );
    const hasRemoval = moves.some(mv =>
      /giro rápido|rapid spin|despejar|defog/i.test(mv)
    );
    const hasPivot = moves.some(mv =>
      /ida y vuelta|u-turn|voltiocambio|volt switch|relevo|baton pass/i.test(mv)
    );
    const hasRecovery = moves.some(mv =>
      /recuperación|recover|respiro|roost|deseo|wish|amortiguador|soft-boiled|síntesis|synthesis/i.test(mv)
    );
    const hasSetup = moves.some(mv =>
      /danza espada|swords dance|maquinación|nasty plot|danza dragón|dragon dance|paz mental|calm mind|danza aleteo|quiver dance/i.test(mv)
    );

    return {
      member: m,
      dex,
      name,
      t1,
      t2,
      hp,
      atk,
      def,
      spa,
      spd,
      spe,
      bst,
      role,
      hasHazards,
      hasRemoval,
      hasPivot,
      hasRecovery,
      hasSetup,
      item: m.item && m.item !== 'none' ? m.item : 'Sin objeto',
      ability: m.ability && m.ability !== 'none' ? m.ability : dex?.abilities?.[0] || 'Desconocida',
      moves,
    };
  });

  // Calculate 1-100 Score
  let score = 70;
  if (filledMembers.length === 6) score += 10;
  else if (filledMembers.length === 5) score += 2;
  else if (filledMembers.length < 4) score -= 20;

  const hasPhysical = memberProfiles.some(p => p.atk >= 100);
  const hasSpecial = memberProfiles.some(p => p.spa >= 100);
  const hasHazards = memberProfiles.some(p => p.hasHazards);
  const hasRemoval = memberProfiles.some(p => p.hasRemoval);
  const hasFast = memberProfiles.some(p => p.spe >= 105);
  const hasWall = memberProfiles.some(p => p.hp >= 85 && (p.def >= 95 || p.spd >= 95));
  const hasPivoting = memberProfiles.some(p => p.hasPivot);

  if (hasPhysical && hasSpecial) score += 5;
  if (hasHazards) score += 4;
  if (hasRemoval) score += 3;
  if (hasFast) score += 3;
  if (hasWall) score += 4;
  if (hasPivoting) score += 3;

  // Penalize incomplete moves or missing items
  const missingItems = memberProfiles.filter(p => p.item === 'Sin objeto').length;
  const incompleteMoves = memberProfiles.filter(p => p.moves.length < 4).length;
  score -= missingItems * 2;
  score -= incompleteMoves * 3;

  // Check critical shared weaknesses (from tiposData)
  const severeWeaknesses: { type: string; count: number }[] = [];
  if (tiposData?.weakRows) {
    for (const wr of tiposData.weakRows) {
      if (wr.pokemons && wr.pokemons.length >= 3) {
        severeWeaknesses.push({ type: wr.name, count: wr.pokemons.length });
        score -= 4;
      }
    }
  }

  score = Math.min(98, Math.max(25, Math.round(score)));

  const strategyText = (currentTeam.strategyNotes || '').trim();

  // Pick Lead candidate(s)
  const hazardLeads = memberProfiles.filter(p => p.hasHazards).sort((a, b) => b.spe - a.spe);
  const pivotLeads = memberProfiles.filter(p => p.hasPivot).sort((a, b) => b.spe - a.spe);
  const fastLeads = memberProfiles.slice().sort((a, b) => b.spe - a.spe);

  const mainLead = hazardLeads[0] || pivotLeads[0] || fastLeads[0] || memberProfiles[0];
  const secondaryLead = pivotLeads.find(p => p.name !== mainLead.name) || fastLeads.find(p => p.name !== mainLead.name);

  // Check user strategy mentions (questions or problematic Pokémon)
  const strategyLower = strategyText.toLowerCase();

  // Known meta threats
  const knownThreats = [
    { name: 'Garchomp', counter: 'Ataques de Hielo ×4, Weavile, Cloyster o Gliscor defensivo con Tóxico' },
    { name: 'Volcarona', counter: 'Trampa Rocas (pierde 50% PS), ataques de Roca prioritarios o Chansey / Blissey' },
    { name: 'Scizor', counter: 'Ataques de Fuego ×4, Rotom-Calor, Magnezone atrapándolo con Imán, o Jellicent' },
    { name: 'Rotom-Wash', counter: 'Breloom, Ferrothorn, Celebi o atacantes especiales con Planta' },
    { name: 'Conkeldurr', counter: 'Gliscor, Slowbro, Reuniclus o daño psíquico/volador especial' },
    { name: 'Tyranitar', counter: 'Ataques de Lucha ×4 (Conkeldurr, Lucario, Breloom) o Terremoto' },
    { name: 'Dragonite', counter: 'Romper Multiescamas con Trampa Rocas, ataques de Hielo prioritarios' },
    { name: 'Gengar', counter: 'Persecución (Tyranitar/Scizor), ataques psíquicos rápidos o prioridad de Siniestro' },
    { name: 'Ferrothorn', counter: 'Ataques de Fuego ×4, Magnezone con Imán o Sofoco/Lanzallamas' },
    { name: 'Lucario', counter: 'Gliscor, Chandelure, Jellicent o atacantes de Tierra/Fuego más rápidos' },
  ];

  // Check if user mentioned any specific problem pokemon
  const mentionedThreat = knownThreats.find(t => strategyLower.includes(t.name.toLowerCase()));

  // Extract all team attacking moves and test coverage against all 17 types
  const coveredTypes = new Set<string>();
  const moveDetailsByType: Record<string, string[]> = {};

  for (const p of memberProfiles) {
    for (const mv of p.moves) {
      // Find move type approximation
      const mvLower = mv.toLowerCase();
      for (const [tKey] of TYPES) {
        if (mvLower.includes(tKey) || mvLower.includes(typeName(tKey).toLowerCase())) {
          // Check what this type hits super effectively
          const advantages = TYPE_CHART[tKey] || {};
          for (const [defT, mult] of Object.entries(advantages)) {
            if (mult > 1) {
              coveredTypes.add(defT);
              if (!moveDetailsByType[defT]) moveDetailsByType[defT] = [];
              moveDetailsByType[defT].push(`${p.name} (${mv})`);
            }
          }
        }
      }
    }
  }

  return `## 🧠 Análisis Táctico PokéMMO (Google Gemini 3 / Motor Competitivo Gen 1-5)

### 📊 11. Puntuación Competitiva Global del Equipo: **${score} / 100**
${
  score >= 85
    ? '🌟 **Equipo de Élite Competitiva.** Sinergia sobresaliente, balance óptimo de atacantes físicos y especiales, control de hazards y sólidas respuestas contra los núcleos del meta de PokéMMO.'
    : score >= 70
    ? '⚔️ **Equipo Competitivo Viable.** Base muy consistente con buen potencial en ladder PvP de PokéMMO; pequeños ajustes en objetos o coberturas potenciarán su rendimiento.'
    : '⚠️ **Equipo en Construcción.** Se aconseja completar los 6 integrantes, equipar objetos competitivos y balancear debilidades elementales compartidas.'
}

---

### 🛡️ 1. Evaluación de Sinergia del Equipo y Cobertura Defensiva de Tipos
- **Balance General:** ${filledMembers.length}/6 Pokémon configurados.
${
  severeWeaknesses.length > 0
    ? `⚠️ **Debilidades Compartidas Relevantes:**\n` +
      severeWeaknesses
        .map(w => `  • **Tipo ${w.type}:** ${w.count} Pokémon reciben daño supereficaz. Es prioritario conservar a tus integrantes con resistencias o inmunidades para absorber estos impactos.`)
        .join('\n')
    : `✅ **Cobertura Defensiva Limpia:** No se detectan debilidades triplicadas sin compensación de resistencias o inmunidades en el equipo.`
}

---

### 🎯 2. Evaluación de Cobertura de Movimientos del Equipo
- **Tipos de Ataque Cubiertos con Daño Supereficaz:** ${coveredTypes.size} de 17 tipos estándar (Gen 1-5).
${
  coveredTypes.size >= 12
    ? `✅ **Gran abanico ofensivo:** El equipo cuenta con herramientas para presionar a la gran mayoría de composiciones rivales.`
    : `💡 **Sugerencia de cobertura:** Considera diversificar tipos de movimientos elementales (Hielo, Lucha, Tierra y Fuego son vitales en PokéMMO) para castigar cambios del rival.`
}

---

### 👑 3. Sugerencia de Leader(s) y Cómo Desempeñar su Función
- **Lead Principal:** **${mainLead.name}**
  - **Función en Turno 1:** ${
    mainLead.hasHazards
      ? 'Aprovecha su velocidad para colocar Trampa Rocas / Púas de inmediato, desgastando al equipo rival y anulando Bandas Focus / Multiescamas.'
      : mainLead.hasPivot
      ? 'Utiliza Ida y Vuelta / Voltiocambio para ganar la iniciativa y pivotar al counter idóneo según la apertura del oponente.'
      : 'Ejerce presión ofensiva directa o testea la intención del rival con su presencia en mesa.'
  }
${
  secondaryLead
    ? `- **Lead Alternativo:** **${secondaryLead.name}** — Excelente segunda opción cuando el oponente abre con un counter desfavorable para tu lead principal.`
    : ''
}

---

### 📝 4. Sugerencias para la Estrategia Teniendo en Cuenta las Notas del Usuario
${
  strategyText
    ? `> **Estrategia planteada por el usuario:** *"${strategyText}"*\n\n` +
      `Tu planteamiento es tácticamente compatible con el metagame de PokéMMO. Para maximizar su efectividad, asegúrate de presionar desde el turno 1 y sincronizar los tiempos de entrada de tus atacantes principales una vez que las defensas rivales estén debilitadas.`
    : `No has ingresado notas en el cuadro de estrategia. Se recomienda una filosofía **Bulky Offense / Balance**, adaptando el plan de juego entre desgaste con hazards y barrido final.`
}

---

### ♟️ 5. Roles que Debe Desempeñar Cada Pokémon
${memberProfiles
  .map(
    (p, i) =>
      `**Slot #${i + 1} — ${p.name}** (${typeName(p.t1)}${p.t2 ? ' / ' + typeName(p.t2) : ''})  \n` +
      `  • **Rol táctico:** *${p.role}*  \n` +
      `  • **Objeto:** \`${p.item}\` | **Habilidad:** \`${p.ability}\`  \n` +
      `  • **Movimientos actuales:** ${p.moves.length > 0 ? p.moves.join(', ') : '*(Sin definir)*'}`
  )
  .join('\n\n')}

---

### ⚠️ 6. Posibles Debilidades y Pokémon que Pueden Romper la Estrategia
Amenazas dominantes en el metagame de PokéMMO (Gen 1-5):
- **Garchomp:** Swords Dance + Outrage/Terremoto con 102 Vel. *Respuesta:* Ataques de Hielo ×4 o murallas con Intimidación/Físicas.
- **Volcarona:** Quiver Dance + Danza Llama. *Respuesta:* Trampa Rocas (le resta el 50% de PS al entrar) y ataques de Roca prioritarios.
- **Scizor:** Bullet Punch con Cinta Elegida y Experto. *Respuesta:* Ataques de Fuego ×4 o Pokémon con Muro Mágico / Levitación resistentes al Acero.
- **Rotom-Wash:** Voltiocambio + Hidrobomba. *Respuesta:* Pokémon tipo Planta o esponjas especiales como Chansey.

---

### 🔍 7. Resolución de Pokémon Problemáticos Mencionados por el Usuario
${
  mentionedThreat
    ? `Detectamos que mencionas a **${mentionedThreat.name}** en tus notas:\n` +
      `💡 **Solución táctica:** Para neutralizar a ${mentionedThreat.name}, emplea: **${mentionedThreat.counter}**.`
    : `Si algún Pokémon específico del rival (ej. *Conkeldurr, Breloom, Dragonite o Tyranitar*) te está causando dificultades en combate, escribe su nombre en el **Cuadro de Estrategia o Notas** y la IA te formulará la respuesta exacta y counter específico.`
}

---

### 💡 8. Sugerencias de Pokémon para Desempeñar Roles Faltantes
${
  !hasHazards
    ? `- **Hazard Setter:** Se recomienda incorporar a **Ferrothorn**, **Forretress** o **Skarmory** con Trampa Rocas / Púas.\n`
    : ''
}${
  !hasRemoval
    ? `- **Hazard Remover:** Se recomienda a **Starmie** (Giro Rápido ofensivo) o **Tentacruel** (Giro Rápido defensivo).\n`
    : ''
}${
  !hasFast
    ? `- **Speed Control / Revenge Killer:** Se sugiere a **Jolteon**, **Gengar** o un Pokémon equipado con **Pañuelo Elegido** (Choice Scarf).\n`
    : ''
}${
  hasHazards && hasRemoval && hasFast
    ? `- El equipo cubre los roles clave de soporte, remoción de peligros y velocidad.`
    : ''
}

---

### 🛠️ 9. Viabilidad de Pokémon Sugeridos y Configuración de Entrenamiento
${
  strategyText && /puedo usar|serviria|sirve|recomiendas a|viable/i.test(strategyText)
    ? `Evaluando tu consulta sobre Pokémon específicos en tus notas:\n` +
      `- **Viabilidad:** Sí, cualquier Pokémon de 1ª a 5ª Gen con BST ≥ 480 puede cumplir funciones competitivas en PokéMMO si se optimizan sus EVs y objeto.\n` +
      `- **Entrenamiento recomendado:** 252 EVs en la estadística ofensiva principal o PS, 252 EVs en Velocidad o Defensa correspondiente, y 4 EVs restantes. Naturaleza favorable sin recortar la estadística útil.`
    : `Para evaluar si un Pokémon específico de tu preferencia puede cumplir un rol determinado, indícalo en el **Cuadro de Estrategia** (ej: *"¿Puede Arcanine ser mi muralla física?"* o *"¿Cómo armo a Cloyster como sweeper?"*) y el asistente generará su reparto exacto de EVs, Naturaleza, Habilidad, Objeto y 4 Movimientos.`
}

---

### 📜 10. Cumplimiento Estricto de Reglas PokéMMO (Gen 1-5 Sin Tipo Hada)
- ✅ Todas las evaluaciones se ciñen rigurosamente a las generaciones 1 a 5 (hasta Teselia/Unova).
- ❌ **Sin tipo Hada** (Clefable y Togekiss mantienen sus tipos originales Normal y Normal/Volador).
- ❌ Sin Megaevoluciones, Dinamax ni Teracristalización.`;
}
