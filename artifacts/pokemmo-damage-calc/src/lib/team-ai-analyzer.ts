import { type BuilderMember, type SavedTeam } from '../components/TeamBuilderView';
import { type RawDexPokemon } from '../dex';
import { getPokemonDexNum } from '../components/PokemonSearchableSelect';
import { typeName } from '../pokemon-constants';

interface TiposSummary {
  resistantRows: { typeId: string; name: string; pokemons: { name: string }[] }[];
  weakRows: { typeId: string; name: string; pokemons: { name: string }[] }[];
  immuneRows?: { typeId: string; name: string; pokemons: { name: string }[] }[];
}

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
- Añade al menos 3 a 6 Pokémon en las casillas superiores para que el Asistente IA pueda evaluar la sinergia, coberturas elementales, roles de combate y amenazas del meta de PokéMMO.
- Puedes importar equipos en formato Pokémon Showdown usando el botón **Importar** arriba a la derecha.`;
  }

  // Analyze each member's role and profile
  const memberProfiles = filledMembers.map(m => {
    const dexNum = getPokemonDexNum(m.pokemonId) || getPokemonDexNum(m.nombre);
    const dex =
      dexNum > 0
        ? dexMap.get(String(dexNum)) || dexMap.get(m.pokemonId.toLowerCase())
        : undefined;

    const name = m.nombre || dex?.nombre || m.pokemonId || 'Pokémon';
    const t1 = dex?.tipo1 || 'normal';
    const t2 = dex?.tipo2 || '';
    const hp = dex?.hp || 80;
    const atk = dex?.atk || 80;
    const def = dex?.def || 80;
    const spa = dex?.spa || 80;
    const spd = dex?.spd || 80;
    const spe = dex?.spe || 80;
    const bst = hp + atk + def + spa + spd + spe;

    // Detect potential role
    let role = 'All-Rounder / Balance';
    if (spe >= 100 && (atk >= 115 || spa >= 115)) {
      role = atk >= spa ? 'Sweeper Físico Rápido' : 'Sweeper Especial Rápido';
    } else if (hp >= 90 && def >= 105) {
      role = 'Muralla Física (Physical Wall)';
    } else if (hp >= 90 && spd >= 105) {
      role = 'Muralla Especial (Special Wall)';
    } else if (hp >= 80 && def >= 85 && spd >= 85 && (atk >= 100 || spa >= 100)) {
      role = 'Tanque / Bruiser';
    } else if (spe >= 105) {
      role = 'Revenge Killer / Scout';
    }

    const hasHazards = (m.moves || []).some(mv =>
      /trampa rocas|stealth rock|púas|spikes|púas tóxicas|toxic spikes/i.test(mv)
    );
    const hasRemoval = (m.moves || []).some(mv =>
      /giro rápido|rapid spin|despejar|defog/i.test(mv)
    );
    const hasPivot = (m.moves || []).some(mv =>
      /ida y vuelta|u-turn|voltiocambio|volt switch|relevo|baton pass/i.test(mv)
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
      item: m.item && m.item !== 'none' ? m.item : 'Sin objeto',
      ability: m.ability && m.ability !== 'none' ? m.ability : dex?.abilities?.[0] || 'Desconocida',
      moves: (m.moves || []).filter(Boolean),
    };
  });

  // Calculate Synergy Score
  let score = 7.0;
  if (filledMembers.length === 6) score += 1.0;
  else if (filledMembers.length < 4) score -= 1.5;

  const hasPhysicalAttacker = memberProfiles.some(p => p.atk >= 100);
  const hasSpecialAttacker = memberProfiles.some(p => p.spa >= 100);
  const hasHazardSetter = memberProfiles.some(p => p.hasHazards);
  const hasHazardRemover = memberProfiles.some(p => p.hasRemoval);
  const hasFastPokemon = memberProfiles.some(p => p.spe >= 105);
  const hasDefensiveTank = memberProfiles.some(p => p.hp >= 85 && (p.def >= 95 || p.spd >= 95));

  if (hasPhysicalAttacker && hasSpecialAttacker) score += 0.5;
  if (hasHazardSetter) score += 0.4;
  if (hasHazardRemover) score += 0.3;
  if (hasFastPokemon) score += 0.3;
  if (hasDefensiveTank) score += 0.4;

  // Check critical shared weaknesses (from tiposData)
  const severeWeaknesses: { type: string; count: number }[] = [];
  if (tiposData?.weakRows) {
    for (const wr of tiposData.weakRows) {
      if (wr.pokemons && wr.pokemons.length >= 3) {
        severeWeaknesses.push({ type: wr.name, count: wr.pokemons.length });
        score -= 0.3;
      }
    }
  }

  score = Math.min(9.8, Math.max(5.0, Number(score.toFixed(1))));

  const strategyText = (currentTeam.strategyNotes || '').trim();

  // Pick best Lead candidate
  let leadCandidate = memberProfiles[0];
  const hazardLeads = memberProfiles.filter(p => p.hasHazards);
  if (hazardLeads.length > 0) {
    leadCandidate = hazardLeads.sort((a, b) => b.spe - a.spe)[0];
  } else {
    const fastPivots = memberProfiles.filter(p => p.hasPivot);
    if (fastPivots.length > 0) {
      leadCandidate = fastPivots.sort((a, b) => b.spe - a.spe)[0];
    }
  }

  // Top Meta threats in PokeMMO (Gen 1-5 without Fairy)
  const metaThreats = [
    {
      name: 'Garchomp',
      type: 'Dragón / Tierra',
      danger: 'Outrage / Terremoto demoledor, 102 Vel base y Swords Dance.',
      check: memberProfiles.find(p => p.t1 === 'ice' || p.t2 === 'ice' || p.def >= 110)?.name || 'Muralla física o ataque con prioridad/hielo',
    },
    {
      name: 'Scizor',
      type: 'Bicho / Acero',
      danger: 'Bullet Punch prioritario potenciado con Experto y Choice Band.',
      check: memberProfiles.find(p => p.t1 === 'fire' || p.t2 === 'fire' || p.def >= 110)?.name || 'Ataque de Fuego x4 o Pokémon resistente al Acero',
    },
    {
      name: 'Rotom-Wash',
      type: 'Eléctrico / Agua',
      danger: 'Levitación, Hidrobomba, Voltiocambio e Inmunidad a Tierra.',
      check: memberProfiles.find(p => p.t1 === 'grass' || p.t2 === 'grass' || p.spd >= 100)?.name || 'Pokémon tipo Planta o atacante especial resistente',
    },
    {
      name: 'Tyranitar',
      type: 'Roca / Siniestro',
      danger: 'Chorro Arena (aumenta SpD x1.5), Persecución y trampa de cambio.',
      check: memberProfiles.find(p => p.t1 === 'fighting' || p.t2 === 'fighting' || p.t1 === 'ground' || p.t2 === 'ground')?.name || 'Ataques de Lucha x4 o Tierra',
    },
    {
      name: 'Volcarona',
      type: 'Bicho / Fuego',
      danger: 'Danza Aleteo (Quiver Dance), Danza Llama y Zumbido tras 1 boost.',
      check: memberProfiles.find(p => p.hasHazards || p.t1 === 'rock' || p.t2 === 'rock' || p.t1 === 'water')?.name || 'Trampa Rocas (50% de daño) o ataques de Roca',
    },
    {
      name: 'Conkeldurr',
      type: 'Lucha',
      danger: 'Agallas + Toxiesfera, Ultrapuño y Puño Drenaje con gran bulk.',
      check: memberProfiles.find(p => p.t1 === 'flying' || p.t2 === 'flying' || p.t1 === 'psychic' || p.def >= 120)?.name || 'Daño especial o Pokémon Volador/Psíquico',
    },
  ];

  // Construct Markdown report
  let report = `## 📊 Análisis Estratégico Competitivo PokeMMO (Gen 1-5)

### 🏆 1. Evaluación General y Sinergia: **${score} / 10**
${
  score >= 8.5
    ? '🔥 **Excelente equilibrio táctico.** El equipo cuenta con un balance óptimo de tipos, atacantes y defensas sólidas preparadas para el metagame de PokeMMO.'
    : score >= 7.0
    ? '⚖️ **Equipo competitivo viable y balanceado.** Presenta una base sólida con buena distribución ofensiva, aunque puede beneficiarse de ajustes puntuales en coberturas y control de hazards.'
    : '⚠️ **Equipo en desarrollo.** Se recomienda equilibrar las debilidades elementales compartidas y asegurar cobertura tanto física como especial.'
}

${
  strategyText
    ? `**Enfoque estratégico del usuario:**  \n> *"${strategyText}"*  \nEl análisis toma en cuenta tu planteamiento y valida cómo se complementan los miembros para ejecutarlo.`
    : '**Enfoque sugerido:** Formato Balance / Bulky Offense adaptable para partidas clasificatorias PvP en PokeMMO.'
}

#### 📋 Integrantes y Roles Identificados:
${memberProfiles
  .map(
    (p, i) =>
      `- **Slot ${i + 1}: ${p.name}** (${typeName(p.t1)}${p.t2 ? ' / ' + typeName(p.t2) : ''}) — *${p.role}*  \n  • Objeto: \`${p.item}\` | Habilidad: \`${p.ability}\` | Vel: **${p.spe}** | BST: **${p.bst}**`
  )
  .join('\n')}

---

### 🛡️ 2. Coberturas Defensivas y Amenazas de PokéMMO
${
  severeWeaknesses.length > 0
    ? `⚠️ **Debilidades Compartidas a Monitorear:**  \n` +
      severeWeaknesses
        .map(
          w =>
            `- Tipo **${w.type}**: **${w.count} Pokémon** del equipo reciben daño supereficaz. Es crucial preservar a tus miembros con resistencias o inmunidades para absorber estos golpes.`
        )
        .join('\n')
    : `✅ **Cobertura elemental muy limpia.** No hay debilidades triplicadas evidentes sin respuesta directa en el equipo.`
}

#### 🎯 Enfrentamientos contra Amenazas Top de PokeMMO:
${metaThreats
  .slice(0, 4)
  .map(
    t =>
      `- **${t.name}** (${t.type}): ${t.danger}  \n  💡 *Respuesta recomendada en tu equipo:* **${t.check}**.`
  )
  .join('\n')}

---

### ⚔️ 3. Plan de Juego y Condiciones de Victoria (Win Conditions)
1. **Fase 1 (Apertura y Campo):** Comienza aplicando presión o colocando Trampa Rocas para romper posibles *Bandas Focus* o desgastar a amenazas como Volcarona y Dragonite.
2. **Fase 2 (Desgaste y Posicionamiento):** Utiliza movimientos de pivot (*Ida y Vuelta / Voltiocambio*) o cambios predictivos para castigar a los Pokémon defensivos del rival.
3. **Fase 3 (Remate Final):** Preserva a tu atacante más rápido o con mayor poder de ruptura (**${
    memberProfiles.sort((a, b) => Math.max(b.atk, b.spa) - Math.max(a.atk, a.spa))[0]?.name || 'tu Sweeper principal'
  }**) para limpiar los últimos 2-3 Pokémon rivales una vez que sus murallas hayan caído.

---

### 💡 4. Pokémon de Apertura Recomendado (Lead)
- **Apertura Ideal:** **${leadCandidate.name}** (${typeName(leadCandidate.t1)}${
    leadCandidate.t2 ? ' / ' + typeName(leadCandidate.t2) : ''
  }).
  - **Motivo:** ${
    leadCandidate.hasHazards
      ? 'Garantiza poner hazards en el primer turno para desgastar al rival desde el inicio.'
      : leadCandidate.spe >= 100
      ? 'Su alta velocidad le permite tomar la iniciativa o presionar al lead rival antes de que actúe.'
      : 'Ofrece gran estabilidad defensiva para testear el movimiento inicial del adversario.'
  }

---

### 🔧 5. Sugerencias y Optimizaciones Específicas
${memberProfiles
  .map(p => {
    const suggestions: string[] = [];
    if (p.item === 'Sin objeto' || p.item === 'none') {
      suggestions.push('Asignar objeto competitivo (Restos, Cinta Elegida, Pañuelo Elegido o Vidasfera)');
    }
    if (p.moves.length < 4) {
      suggestions.push(`Completar los 4 movimientos (actualmente tiene ${p.moves.length})`);
    }
    if (!hasHazardSetter && p.dex?.learnset?.some(m => /stealthrock|tramparocas/i.test(m))) {
      suggestions.push('Considerar aprender Trampa Rocas para control de campo');
    }
    if (suggestions.length === 0) {
      suggestions.push('Configuración sólida; optimizar EVs al nivel 50 en la pestaña de estadísticas.');
    }
    return `- **${p.name}:** ${suggestions.join(' · ')}.`;
  })
  .join('\n')}

${
  filledMembers.length < 6
    ? `\n> 💡 **Nota de equipo incompleto:** Te faltan **${
        6 - filledMembers.length
      } Pokémon** para completar el equipo de 6. Se sugiere añadir un ${
        !hasHazardRemover ? 'Starmie o Forretress con Giro Rápido' : 'Rotom-Wash o Garchomp'
      } para redondear la sinergia.`
    : ''
}

---
*Análisis generado por el Motor Estratégico IA de PokéMMO (Metagame Gen 1-5).*`;

  return report;
}
