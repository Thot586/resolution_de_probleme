      // Dérivés purs : ils lisent des données et des valeurs qu'on leur donne, jamais le DOM ni l'état de la page.
      // Ils se testent donc dans Node (tests/unit.spec.cjs) et les écrans (effets de app.js) n'ont plus qu'à les afficher.

      // ---- Page des repères de violence : les relations les plus proches du problème en cours viennent d'abord.
      const violenceFirstFor = (scale, context) => violenceFirst[`${scale}/${context}`] || violenceFirst[scale] || [];
      // groups : [[titre, [[clé, libellé], ...]], ...] ; first : clés de relations à mettre en tête, dans cet ordre.
      // Un groupe monte avec sa relation la plus proche ; dans un groupe, les relations proches passent devant ; « Autre situation » reste en dernier.
      function orderViolenceGroups(groups, first) {
        if (!first.length) return groups;
        const rank = (key) => (first.includes(key) ? first.indexOf(key) : first.length);
        return groups
          .map(([title, items], index) => ({
            title,
            index,
            items: [...items].sort((a, b) => rank(a[0]) - rank(b[0])),
            best: Math.min(...items.map(([key]) => rank(key))),
            last: items.some(([key]) => key === "other") ? 1 : 0,
          }))
          .sort((a, b) => a.last - b.last || a.best - b.best || a.index - b.index)
          .map(({ title, items }) => [title, items]);
      }
      // scale vide : aucun problème choisi, ordre d'origine.
      const violenceGroupsFor = (scale, context) => orderViolenceGroups(violenceGroups, scale ? violenceFirstFor(scale, context) : []);
      // Phrase qui explique l'ordre ; vide quand l'ordre n'a pas bougé (rien à expliquer).
      function violenceOriginNote(scale, context) {
        if (!scale || !Object.hasOwn(scales, scale)) return "";
        if (JSON.stringify(violenceGroupsFor(scale, context)) === JSON.stringify(violenceGroups)) return "";
        const where = Object.hasOwn(contextCatalog[scale], context) ? `${scales[scale][0]} · ${contextCatalog[scale][context].label}` : scales[scale][0];
        return `Classement d’après mon problème (${where}) : les relations les plus proches d’abord. Rien n’est choisi à ma place.`;
      }

      // ---- Adresse (hash) -> où on est. Une adresse inconnue renvoie à l'accueil.
      const PAGES = ["accueil", "outil", "soutenir", "groupe", "proche", "violences", "comprendre", "bibliographie", "securite", "recap"];
      function parseRoute(hash) {
        const name = String(hash || "").replace(/^#/, "") || "accueil";
        const scale = /^outil-(personal|shared|organization|public)$/.exec(name)?.[1] || "";
        const relation = /^violences-([a-z]+)$/.exec(name)?.[1] || "";
        const violenceKey = relation && (Object.hasOwn(violenceData, relation) || Object.hasOwn(violenceLists, relation)) ? relation : "";
        const ref = name.startsWith("ref-");
        const page = ref ? "bibliographie" : scale ? "outil" : violenceKey ? "violences" : PAGES.includes(name) ? name : "accueil";
        // violence : l'adresse concerne le choix de la relation (liste d'accueil ou relation précise).
        return { name, page, scale, violenceKey, violence: name === "violences" || Boolean(violenceKey), ref };
      }
