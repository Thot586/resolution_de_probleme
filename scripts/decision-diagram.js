      // Ce logigramme aide à préparer une action ; il ne juge pas le danger à la place de la personne.
      const firstStepDecisionDiagram = (scale) => {
        const decision = {
          personal: {
            inFigure: "Moi ou une autre personne",
            inText: "Pour un pas personnel, je vérifie si quelqu’un d’autre est concerné et doit donner son accord.",
          },
          shared: {
            inFigure: "L’autre personne",
            inText: "Entre personnes, l’autre doit pouvoir accepter ou refuser librement, sans pression ni peur.",
          },
          organization: {
            inFigure: "Responsable du test",
            inText: "Dans une équipe, je vérifie qui peut autoriser le test et j’écoute les personnes qu’il touche.",
          },
          public: {
            inFigure: "Personnes représentées",
            inText: "Dans une démarche publique, je demande l’accord avant de parler au nom d’autres personnes ; l’autorité compétente décide de la mesure demandée.",
          },
        }[scale];
        return `<details class="decision-guide section-gap" id="action-decision-diagram">
          <summary>Avant d’agir : voir les choix en logigramme</summary>
          <div class="details-body">
            <p class="hint diagram-scroll-hint">Sur un écran étroit, je peux faire glisser le dessin horizontalement. Les choix sont aussi écrits sous le dessin.</p>
            <figure class="teaching-figure decision-figure scrollable-diagram" tabindex="0">
              <svg viewBox="0 0 360 565" role="img" aria-labelledby="first-step-flow-title first-step-flow-desc" xmlns="http://www.w3.org/2000/svg">
                <title id="first-step-flow-title">Vérifier la sécurité et l’accord avant mon premier pas</title>
                <desc id="first-step-flow-desc">Si le pas n’est pas sûr ou si j’ai un doute, je fais une pause et cherche un soutien adapté. S’il est sûr, je vérifie l’accord nécessaire. Sans accord, je le demande ; avec l’accord ou s’il n’est pas requis, j’essaie un petit pas et j’observe un signe de progrès.</desc>
                <!-- Les sorties de gauche arrêtent l'essai ; les sorties de droite permettent de poursuivre. Les mots indiquent le sens sans dépendre des couleurs. -->
                <g font-family="system-ui, sans-serif" text-anchor="middle">
                  <rect x="27" y="12" width="306" height="62" rx="13" fill="#ffffff" stroke="#567d69" stroke-width="2"/>
                  <text x="180" y="50" fill="#203b36" font-size="17" font-weight="700">Mon premier pas envisagé</text>
                  <path d="M180 75v16m-5-6 5 6 5-6" fill="none" stroke="#24594d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M180 94 337 148 180 202 23 148Z" fill="#f1f7f1" stroke="#39705c" stroke-width="2"/>
                  <text x="180" y="142" fill="#203b36" font-size="17" font-weight="700">Ce pas est-il sûr</text>
                  <text x="180" y="164" fill="#203b36" font-size="15">pour moi et les autres ?</text>
                  <path d="M23 148H12v67m-5-5 5 5 5-5M337 148h11v67m-5-5 5 5 5-5" fill="none" stroke="#24594d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <text x="90" y="221" fill="#75490f" font-size="13" font-weight="700">Non ou doute</text>
                  <text x="270" y="221" fill="#24594d" font-size="13" font-weight="700">Oui</text>
                  <rect x="17" y="229" width="146" height="77" rx="12" fill="#fff4dc" stroke="#a56b23" stroke-width="2"/>
                  <text x="90" y="259" fill="#51370f" font-size="14" font-weight="700">Je fais une pause</text>
                  <text x="90" y="282" fill="#51370f" font-size="13">et cherche de l’aide</text>
                  <rect x="197" y="229" width="146" height="77" rx="12" fill="#edf6ee" stroke="#39705c" stroke-width="2"/>
                  <text x="270" y="256" fill="#203b36" font-size="14" font-weight="700">Je vérifie l’accord</text>
                  <text x="270" y="280" fill="#4a5e55" font-size="12" data-decision-actor>${decision.inFigure}</text>
                  <path d="M270 307v18h-90v9m-5-5 5 5 5-5" fill="none" stroke="#24594d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M180 338 337 390 180 442 23 390Z" fill="#f1f7f1" stroke="#39705c" stroke-width="2"/>
                  <text x="180" y="385" fill="#203b36" font-size="17" font-weight="700">Ai-je l’accord</text>
                  <text x="180" y="407" fill="#203b36" font-size="15">requis pour ce pas ?</text>
                  <path d="M23 390H12v72m-5-5 5 5 5-5M337 390h11v72m-5-5 5 5 5-5" fill="none" stroke="#24594d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <text x="90" y="467" fill="#75490f" font-size="13" font-weight="700">Non</text>
                  <text x="270" y="467" fill="#24594d" font-size="12" font-weight="700">Oui ou pas requis</text>
                  <rect x="17" y="475" width="146" height="77" rx="12" fill="#fff4dc" stroke="#a56b23" stroke-width="2"/>
                  <text x="90" y="505" fill="#51370f" font-size="14" font-weight="700">Je demande l’accord</text>
                  <text x="90" y="528" fill="#51370f" font-size="13">ou change de piste</text>
                  <rect x="197" y="475" width="146" height="77" rx="12" fill="#edf6ee" stroke="#39705c" stroke-width="2"/>
                  <text x="270" y="505" fill="#203b36" font-size="14" font-weight="700">J’essaie petit</text>
                  <text x="270" y="528" fill="#203b36" font-size="13">et je fais le point</text>
                </g>
              </svg>
              <figcaption>${decision.inText} Ce dessin aide à préparer une décision ; il ne détermine pas si une situation est sans danger.</figcaption>
            </figure>
            <ol class="diagram-reading diagram-text">
              <li><strong>Si je ne suis pas sûr ou si j’ai un doute :</strong> je fais une pause et cherche une aide adaptée. <a href="#securite">Voir les repères de sécurité</a>.</li>
              <li><strong>Si le pas est sûr :</strong> je vérifie qui doit décider ou donner son accord. ${decision.inText}</li>
              <li><strong>Si l’accord manque :</strong> je le demande sans forcer. En cas de refus, je change de piste ou cherche un autre soutien. S’il est présent ou non requis, je peux essayer un petit pas, observer un signe de progrès et faire le point.</li>
            </ol>
            <p class="source-note">Repère pédagogique, pas un test de sécurité ou une règle valable dans toute situation. <a href="#ref-4">[4]</a> <a href="#ref-22">[22]</a> <a href="#ref-33">[33]</a></p>
          </div>
        </details>`;
      };
