      const contexts = {
        daily: {
          label: "Vie quotidienne",
          situation:
            "Depuis deux semaines, je repousse le rangement de mes papiers et je ne retrouve plus les factures.",
          goal: "Retrouver les deux factures à régler cette semaine.",
          obstacle:
            "Les papiers sont mélangés et je ne sais pas par quoi commencer.",
          control: "Choisir un dossier et y consacrer dix minutes.",
          outside: "Le temps de réponse des organismes.",
          ideas: [
            "Trier seulement les courriers de ce mois.",
            "Demander à une personne de confiance de m’aider dix minutes.",
            "Demander une copie de la facture à l’organisme.",
          ],
          action:
            "Ouvrir les cinq courriers les plus récents pendant dix minutes.",
          support: "Une personne de confiance, à côté de moi ou au téléphone.",
          backup:
            "Si je me sens débordé, je m’arrête après une enveloppe et je demande un appui.",
          measure: "J’ai identifié les deux factures et leur date limite.",
          result:
            "J’ai retrouvé une facture. Je dois demander une copie de la seconde.",
        },
        work: {
          label: "Travail",
          situation:
            "Cette semaine, deux responsables m’ont confié trois dossiers urgents avec la même échéance.",
          goal: "Obtenir un ordre de priorité et un délai réaliste pour ces dossiers.",
          obstacle:
            "Je n’ai pas assez de temps et les priorités ne sont pas partagées.",
          control:
            "Lister les tâches et demander lesquelles sont prioritaires.",
          outside: "La décision finale et les effectifs disponibles.",
          ideas: [
            "Lister les tâches et demander un ordre de priorité écrit.",
            "Demander plus de temps pour un dossier en expliquant pourquoi.",
            "Demander l’appui d’un collègue ou d’un représentant du personnel.",
          ],
          action:
            "Préparer la liste des trois dossiers et le temps nécessaire pour chacun.",
          support: "Un collègue de confiance ou un représentant du personnel.",
          backup:
            "Si mon responsable est absent, j’envoie la liste des tâches pour demander les priorités.",
          measure:
            "Je sais quel dossier traiter en premier, ou un rendez-vous est fixé pour en décider.",
          result:
            "Deux priorités ont été clarifiées ; le délai du troisième dossier reste à négocier.",
        },
        couple: {
          label: "Couple & relations",
          situation:
            "Cette semaine, nous avons annulé deux moments ensemble car nos horaires n’étaient pas coordonnés.",
          goal: "Proposer un moment ensemble compatible avec nos deux horaires.",
          obstacle: "Nous n’avons pas comparé nos disponibilités.",
          control: "Exprimer mon besoin et proposer deux créneaux.",
          outside: "La disponibilité et la réponse de mon partenaire.",
          ideas: [
            "Proposer un échange calme de quinze minutes.",
            "Mettre nos disponibilités sur un calendrier partagé, avec notre accord.",
            "Prévoir une activité courte et peu coûteuse.",
          ],
          action:
            "Demander un moment pour parler de nos disponibilités, si je me sens en sécurité.",
          support: "Un moment calme, sans interruption.",
          backup:
            "Si le moment ne convient pas, je propose un autre créneau sans insister.",
          measure: "Nous avons choisi un créneau qui convient à chacun.",
          result:
            "Nous avons prévu une promenade ; le calendrier partagé ne nous convenait pas.",
        },
        family: {
          label: "Famille",
          situation:
            "Le matin, mon enfant et moi nous pressons et nous arrivons souvent en retard.",
          goal: "Préparer un départ plus calme deux matins cette semaine.",
          obstacle:
            "Les affaires ne sont pas prêtes et la routine est trop longue.",
          control:
            "Préparer mes affaires et proposer une routine adaptée à l’âge de mon enfant.",
          outside: "Les imprévus et le rythme de mon enfant.",
          ideas: [
            "Préparer les sacs ensemble la veille.",
            "Dessiner une courte routine avec mon enfant.",
            "Réduire une tâche non indispensable le matin.",
          ],
          action:
            "Préparer le sac et les vêtements avec mon enfant ce soir, sans pression.",
          support: "Un autre adulte sûr si disponible.",
          backup:
            "Si mon enfant est fatigué, je prépare l’essentiel et nous essayons ensemble un autre soir.",
          measure: "Le départ s’est fait avec une étape de moins à gérer.",
          result:
            "Le sac était prêt. Le petit-déjeuner a demandé plus de temps que prévu.",
        },
        study: {
          label: "Études",
          situation:
            "Je dois rendre un travail la semaine prochaine et je n’ai pas commencé le plan.",
          goal: "Rédiger un plan provisoire en trois parties.",
          obstacle:
            "La consigne me semble floue et j’essaie de tout lire avant d’écrire.",
          control: "Écrire mes questions et commencer un brouillon.",
          outside: "La date de réponse de l’enseignant.",
          ideas: [
            "Écrire un plan provisoire sans chercher la perfection.",
            "Demander une précision sur la consigne.",
            "Travailler vingt minutes avec un camarade.",
          ],
          action:
            "Relire la consigne et noter trois idées pendant quinze minutes.",
          support: "La consigne et un camarade disponible.",
          backup:
            "Si je bloque, je note une seule question à poser à l’enseignant.",
          measure: "J’ai un plan de trois titres, même imparfait.",
          result: "J’ai rédigé deux titres et identifié une question précise.",
        },
        health: {
          label: "Santé & soins",
          situation:
            "J’ai manqué deux rendez-vous car le trajet était difficile à organiser.",
          goal: "Préparer le déplacement pour mon prochain rendez-vous.",
          obstacle: "Le coût du transport et l’absence d’accompagnement.",
          control:
            "Informer l’équipe de mes difficultés et demander les options disponibles.",
          outside: "Les transports et les aides réellement accessibles.",
          ideas: [
            "Demander un autre horaire ou une modalité à distance si elle convient aux soins.",
            "Chercher une aide au transport avec un travailleur social.",
            "Demander à un proche s’il peut accompagner le trajet.",
          ],
          action:
            "Contacter le secrétariat pour expliquer l’obstacle de transport.",
          support: "Un proche ou un intervenant social, avec mon accord.",
          backup:
            "Si je n’arrive pas à téléphoner, je prépare un court message avec une personne sûre.",
          measure:
            "J’ai une option de déplacement ou une autre modalité convenue avec l’équipe.",
          result:
            "Le secrétariat m’a proposé un autre horaire ; le transport reste à confirmer.",
        },
        collective: {
          label: "Vie collective",
          situation: "Dans mon quartier, l’arrêt de bus le plus proche reste difficile d’accès pour plusieurs habitants.",
          goal: "Faire connaître les difficultés d’accès et obtenir une réponse de l’autorité compétente.",
          obstacle: "Je ne sais pas qui décide ni quelles demandes ont déjà été faites.",
          control: "Recueillir des faits publics et chercher le bon interlocuteur avec les personnes concernées.",
          outside: "La décision de l’autorité, le budget et le calendrier de travaux.",
          ideas: ["Demander aux personnes concernées ce qui leur serait utile, avec leur accord.", "Identifier le service responsable et consulter les informations publiques.", "Préparer une demande collective claire avec un objectif précis."],
          action: "Identifier le service responsable de l’arrêt et une source publique sur les démarches possibles.",
          support: "Des personnes concernées qui souhaitent participer et une association locale.",
          backup: "Si l’interlocuteur n’est pas clair, demander une orientation à la collectivité locale.",
          measure: "Nous connaissons le bon interlocuteur et pouvons formuler une demande vérifiable.",
          result: "Le service responsable a été identifié ; nous préparons une demande avec les personnes intéressées.",
        },
      };
      const scales = {
        personal: ["Personnel", "Je peux agir, avec ou sans aide."],
        shared: ["Entre personnes", "Une autre personne est concernée par la situation."],
        organization: ["Équipe ou institution", "Une équipe, ses règles ou ses moyens sont en jeu."],
        public: ["Collectif ou politique", "Une décision collective ou publique est en jeu."],
      };
      // Après « J’ai un doute » ou « Je me sens en danger », le texte suit le niveau choisi.
      // Personnel et Entre personnes gardent le texte d’origine. Collectif renvoie vers le repère non gradué
      // « authority » (voir violenceLists) : aucune relation interpersonnelle ne correspond à ce niveau.
      const interpersonalSafety = {
        hint: "",
        doubt: "La peur, les menaces ou le contrôle méritent de l’aide.",
        guideLink: "Voir les repères de violence",
        dangerTitle: "Ma sécurité passe avant l’exercice.",
        dangerBody: "Je peux chercher de l’aide maintenant.",
        dangerGuide: "Repérer une violence",
        reminder: "Peur, menaces ou contrôle ?",
        guides: true,
      };
      const safetyByScale = {
        personal: interpersonalSafety,
        shared: interpersonalSafety,
        organization: {
          hint: "Je pense aussi à la sécurité des autres personnes de l’équipe.",
          doubt: "La peur, les pressions ou les représailles méritent de l’aide, pour moi comme pour mon équipe.",
          guideLink: "Choisir des repères de violence",
          dangerTitle: "Ma sécurité et celle des autres passent avant l’exercice.",
          dangerBody: "Je peux chercher de l’aide maintenant. Je n’impose ni confrontation ni médiation tant que la peur ou les représailles sont là.",
          dangerGuide: "Repérer une violence",
          reminder: "Peur, pressions ou représailles dans l’équipe ?",
          guides: true,
        },
        public: {
          hint: "Je pense aussi à la sécurité des personnes qui agissent avec moi.",
          doubt: "La peur, les menaces ou les représailles méritent de l’aide, pour moi comme pour le groupe.",
          guideLink: "Voir les repères sur les pressions",
          dangerTitle: "Ma sécurité et celle des autres passent avant l’exercice.",
          dangerBody: "Je peux chercher de l’aide maintenant.",
          dangerGuide: "Repérer des pressions ou des représailles",
          reminder: "Peur, menaces ou représailles pour moi ou pour le groupe ?",
          reminderHref: "#securite",
          guides: true,
        },
      };
      const glossary = {
        ipt: [
          "IPT — programme intégratif de thérapies psychologiques",
          "IPT désigne ici le programme intégratif de thérapies psychologiques développé par Brenner et ses collaborateurs pour des personnes vivant avec une schizophrénie. Il comprend un travail sur la résolution de problèmes interpersonnels. Ce site cite l’IPT parmi ses points de départ, sans publier ses supports ni proposer le protocole clinique.",
        ],
        meta: [
          "Méta-analyse",
          "Méthode qui combine statistiquement les résultats de plusieurs études portant sur une question comparable. Sa fiabilité dépend de la qualité et de la compatibilité des études.",
        ],
        random: [
          "Essai randomisé",
          "Étude dans laquelle le hasard détermine le groupe d’intervention ou de comparaison. Cela réduit certains biais, sans les éliminer tous.",
        ],
        cluster: [
          "Essai randomisé en grappes",
          "Étude où le hasard répartit des groupes entiers, par exemple des centres de santé, et non chaque personne séparément.",
        ],
        heterogeneity: [
          "Hétérogénéité",
          "Variabilité entre les résultats des études. Elle peut refléter des différences de populations, de méthodes, de traitements ou de contexte.",
        ],
        interval: [
          "Intervalle de confiance",
          "Intervalle calculé pour exprimer l’incertitude statistique autour d’une estimation. À 95 %, la méthode couvrirait la vraie valeur dans 95 % des répétitions idéales de l’étude ; cela ne prend pas en compte tous les biais.",
        ],
        effect: [
          "g de Hedges",
          "Différence moyenne standardisée entre groupes, exprimée en unités d’écart-type. Ce n’est ni un pourcentage de guérison ni la probabilité qu’une personne aille mieux.",
        ],
        power: [
          "Asymétrie de pouvoir",
          "Situation où une personne dispose de davantage d’autorité, de ressources ou de moyens de pression que l’autre.",
        ],
        control: [
          "Marge de manœuvre",
          "Ce sur quoi vous pouvez agir, seul ou avec de l’aide. Elle dépend aussi des ressources et des contraintes autour de vous.",
        ],
        rumination: [
          "Rumination",
          "Revenir en boucle sur les mêmes pensées sans avancer vers une décision ou un soutien utile.",
        ],
        implementation: [
          "Intention de mise en œuvre",
          "Un plan « si… alors… » : vous prévoyez ce que vous ferez lorsqu’une situation précise se présentera.",
        ],
        coercion: [
          "Contrôle coercitif",
          "Ensemble de comportements qui restreignent la liberté par la surveillance, l’isolement, les menaces ou la dépendance imposée.",
        ],
        consent: [
          "Consentement",
          "Accord libre et éclairé, qui peut être retiré. Le silence, la peur ou une pression ne valent pas accord.",
        ],
        validation: [
          "Valider une émotion",
          "Reconnaître ce que la personne ressent, sans devoir approuver toutes ses interprétations ou tous ses actes.",
        ],
        bias: [
          "Biais",
          "Élément d’une étude qui peut déformer systématiquement ses résultats.",
        ],
        efficacy: [
          "Efficacité",
          "Capacité d’une intervention à produire un effet dans les conditions où elle a été étudiée. Ce résultat ne se transfère pas automatiquement à d’autres situations.",
        ],
        survey: [
          "Sondage",
          "Quelques questions posées à plusieurs personnes pour connaître leurs réponses. Les résultats décrivent les répondants ; ils ne représentent pas forcément tout le groupe.",
        ],
        indicator: [
          "Indicateur",
          "Signe concret choisi à l’avance pour voir si une situation évolue. Il doit éclairer la décision, sans réduire le vécu des personnes à un chiffre.",
        ],
        feedback: [
          "Restitution",
          "Retour des constats aux personnes concernées, avec leurs limites. Elles peuvent corriger une erreur et savoir ce qui sera fait ensuite.",
        ],
        personalData: [
          "Données personnelles",
          "Informations qui permettent d’identifier une personne directement ou indirectement, par exemple un nom ou une réponse très reconnaissable dans un petit groupe.",
        ],
        violentometer: [
          "Violentomètre",
          "Support visuel de sensibilisation qui donne des exemples de comportements respectueux, de contrôle et de violences. Parmi les travaux antérieurs figurent le Violentómetro de l’Institut polytechnique national du Mexique (2009), le Violentomètre français consacré aux relations amoureuses (2018) et des déclinaisons créées par d’autres équipes. Les guides de cette page sont distincts de ces outils et ne donnent pas de score de danger. Les crédits figurent dans « Origine et limites de ces repères ».",
        ],
        workHarassment: [
          "Harcèlement moral au travail",
          "En France, des agissements hostiles répétés qui dégradent les conditions de travail et peuvent atteindre la dignité, la santé ou l'avenir professionnel. Un désaccord ne suffit pas à établir ce harcèlement ; une agression ou une menace unique peut cependant demander une aide immédiate.",
        ],
        evidence: [
          "Données probantes",
          "Informations issues de recherches ou d’évaluations dont on examine la qualité, les limites et la pertinence pour la situation. Elles éclairent une décision avec l’expérience des personnes et le contexte ; elles ne garantissent pas un résultat individuel.",
        ],
        sharedDecision: [
          "Décision partagée",
          "Échange dans lequel les personnes concernées examinent les options, leurs effets possibles et leurs préférences avant de choisir ensemble, dans la mesure où chacune peut participer librement.",
        ],
        balancingIndicator: [
          "Indicateur d’équilibrage",
          "Signe suivi pour vérifier qu’une amélioration recherchée ne crée pas un autre problème important ailleurs. Il complète l’indicateur du résultat principal.",
        ],
        culturalFormulation: [
          "Formulation culturelle",
          "Façon d’explorer comment une personne comprend son problème, ce qui compte pour elle, les soutiens qu’elle souhaite et les obstacles qu’elle rencontre. L’entretien de formulation culturelle de l’APA est un outil clinique ; les questions ouvertes de ce site ne sont pas cet entretien.",
        ],
      };
      // The first sentence is the quick hint; the existing glossary entry gives the full definition.
      const glossaryHelp = {
        ipt: ["Un programme clinique de réadaptation psychosociale.", "Il comprend un travail sur la résolution de problèmes interpersonnels. Ce site en tire des repères généraux, parmi d’autres sources, sans publier les supports de formation ni proposer le programme de soins.", 1],
        meta: ["Résultats de plusieurs études combinés.", "Plusieurs essais sur une même question sont regroupés. Si les études sont de mauvaise qualité ou trop différentes, le résultat combiné peut tromper.", 2],
        random: ["Le hasard répartit les participants entre des groupes.", "Par exemple, une personne reçoit une intervention et une autre une comparaison selon un tirage au sort. Cette méthode réduit certaines différences initiales entre groupes.", 2],
        cluster: ["Le hasard répartit des groupes entiers.", "Dans une étude portant sur des centres de soins, chaque centre peut être tiré au sort. Les personnes d’un même centre ne sont pas réparties séparément.", 13],
        heterogeneity: ["Les études donnent des résultats différents.", "On examine si les différences viennent des publics, des méthodes ou des situations. Une moyenne peut masquer des résultats opposés.", 2],
        interval: ["Une fourchette qui exprime une incertitude statistique.", "Un intervalle plus large indique moins de précision. Il ne corrige pas les erreurs de méthode ni les biais d’une étude.", 2],
        effect: ["Une façon de comparer l’ampleur moyenne d’un effet.", "Un g de 0,34 compare des moyennes en unités d’écart-type. Cela ne veut pas dire que 34 % des personnes vont mieux.", 2],
        power: ["Une personne a plus de pouvoir que l’autre.", "Un responsable peut décider d’un emploi ou d’une formation. Cette différence peut rendre un refus difficile à exprimer.", 18],
        control: ["Ce sur quoi je peux agir.", "Je peux parfois demander un rendez-vous ou chercher un soutien, même si je ne peux pas changer seul une règle ou une décision.", 12],
        rumination: ["Les mêmes pensées reviennent sans aider à avancer.", "Si je répète une inquiétude sans information nouvelle, je peux revenir à une question concrète ou demander un appui.", 1],
        implementation: ["Un plan précis sous la forme « si… alors… ».", "Si j’ai dix minutes demain matin, alors je préparerai les deux premières lignes de mon courrier. Le plan indique quand agir.", 4],
        coercion: ["Des actes répétés réduisent la liberté d’une personne.", "Surveiller ses messages, l’isoler ou la menacer peut l’empêcher de faire des choix libres. Dans ce cas, la sécurité passe avant une discussion commune.", 6],
        consent: ["Un accord libre, compris et révocable.", "Avant de partager le récit d’une personne, je lui explique pourquoi et avec qui. Elle peut refuser ou changer d’avis.", 5],
        validation: ["Reconnaître une émotion sans tout approuver.", "« Je vois que cela t’a blessé » reconnaît une peine. Cela ne signifie pas que je connais déjà toute la situation.", 18],
        bias: ["Un facteur peut déformer un résultat.", "Si seules les personnes satisfaites répondent au sondage, le résultat risque de surestimer la satisfaction du groupe.", 23],
        efficacy: ["Un effet observé dans des conditions étudiées.", "Une méthode utile dans un essai accompagné par des professionnels n’a pas forcément le même effet dans un outil utilisé seul.", 2],
        survey: ["Des questions posées à plusieurs personnes.", "Avant d’interpréter les réponses, je regarde qui a été invité, qui a répondu et qui manque. Une discussion peut suffire si le groupe est petit.", 23],
        indicator: ["Un signe concret pour suivre un changement.", "Pour des horaires d’accueil, le nombre de personnes qui peuvent obtenir un rendez-vous peut être utile. Je vérifie aussi leur expérience.", 22],
        feedback: ["Rendre les constats au groupe.", "Je présente ce qui ressort, ce qui reste incertain et la décision à venir. Je demande ce que les personnes veulent corriger.", 25],
        personalData: ["Des informations permettant de reconnaître une personne.", "Dans un petit groupe, une citation très précise peut révéler son auteur même sans nom. Je limite ce que je recueille et partage.", 26],
        violentometer: ["Des exemples pour reconnaître le contrôle ou la violence.", "Le Violentómetro mexicain, le Violentomètre français et d’autres déclinaisons ont précédé ce site. Leurs créateurs sont crédités dans la page « Repérer une violence selon la relation ». Les guides de ce site sont distincts et ne calculent pas un niveau de danger.", 7],
        workHarassment: ["Des agissements hostiles répétés au travail.", "Un conflit ou une critique professionnelle ne suffit pas à conclure à un harcèlement moral. Je peux toutefois demander de l'aide dès qu'un fait me préoccupe, sans attendre qu'il se répète.", 35],
        evidence: ["Des résultats de recherche examinés avec leurs limites.", "Une étude menée auprès d’élèves peut suggérer une piste pour apprendre, sans démontrer qu’elle aidera de la même façon un adulte utilisant seul cet outil.", 31],
        sharedDecision: ["Chercher une décision avec les personnes concernées.", "Lors d’un soin, le professionnel explique les options et les risques ; la personne dit ce qui compte pour elle et participe au choix, selon ce qu’elle souhaite et peut décider.", 30],
        balancingIndicator: ["Vérifier qu’un progrès ne crée pas un autre problème.", "Si l’équipe réduit le temps d’attente, elle vérifie aussi que les personnes ayant besoin de plus de temps reçoivent encore une aide adaptée.", 22],
        culturalFormulation: ["Comprendre le point de vue de la personne.", "Je demande ce qui compte pour elle et quelle aide lui semblerait utile, sans supposer sa réponse à partir de son origine. L’entretien complet est un outil clinique distinct.", 41],
      };
      const comparisonExamples = {
        daily: [
          "Un tri limité est plus facile à commencer.",
          "Je peux ne pas retrouver une facture plus ancienne.",
        ],
        work: [
          "Une liste factuelle rend la charge visible.",
          "Cela prend du temps et ne garantit pas une réponse.",
        ],
        couple: [
          "Un temps calme permet de comparer nos disponibilités.",
          "Mon partenaire peut ne pas être disponible à ce moment.",
        ],
        family: [
          "Le matin comporte moins de tâches.",
          "Il faut trouver un moment adapté le soir.",
        ],
        study: [
          "Un premier brouillon donne une base à améliorer.",
          "Je devrai peut-être le revoir après une précision de consigne.",
        ],
        health: [
          "L’équipe connaît mon obstacle et peut proposer des options.",
          "Une autre modalité de consultation peut être indisponible ou inadaptée.",
        ],
        collective: [
          "Une demande documentée rend la difficulté visible.",
          "Une réponse publique peut prendre du temps et ne garantit pas un changement.",
        ],
      };
      const supportModes = {
        listen: `<div class="mini-steps"><div class="mini-step"><span class="callout-number">1</span><div><strong>Faites une place à son récit</strong><p>« Qu’est-ce qui est le plus difficile pour toi aujourd’hui ? » Laissez des silences ; ne cherchez pas les détails à tout prix.</p></div></div><div class="mini-step"><span class="callout-number">2</span><div><strong>Reformulez sans interpréter</strong><p>« Si je comprends bien, ce qui te pèse surtout, c’est… » Vérifiez que vous avez compris.</p></div></div><div class="mini-step"><span class="callout-number">3</span><div><strong>Reconnaissez l’émotion</strong><p>« Cela semble vraiment éprouvant. » Reconnaître sa peine ne vous oblige pas à être d’accord sur tout.</p></div></div></div><div class="say">« Je n’ai pas forcément de réponse, mais je peux rester un moment avec toi. »</div>`,
        solve: `<div class="mini-steps"><div class="mini-step"><span class="callout-number">1</span><div><strong>Obtenez son accord</strong><p>« Est-ce que tu veux qu’on cherche ensemble un petit pas possible ? » Un non est une réponse valable.</p></div></div><div class="mini-step"><span class="callout-number">2</span><div><strong>Partez de sa priorité</strong><p>Demandez le changement qu’elle souhaite. Faites émerger ses idées avant de proposer les vôtres.</p></div></div><div class="mini-step"><span class="callout-number">3</span><div><strong>Laissez-lui le choix</strong><p>Comparez deux ou trois pistes. Aidez à préparer une action ; proposez de refaire le point à un moment convenu.</p></div></div></div><div class="say">« Laquelle de ces pistes te conviendrait le mieux ? »</div><a class="btn" href="#outil">Ouvrir le parcours ensemble →</a><p class="hint">Écrivez avec son accord, si possible sur son appareil. Le parcours en cours n’est pas effacé.</p>`,
        practical: `<div class="mini-steps"><div class="mini-step"><span class="callout-number">1</span><div><strong>Proposez quelque chose de précis</strong><p>Un repas, un trajet, vingt minutes pour un formulaire, ou une présence à un rendez-vous si elle le souhaite.</p></div></div><div class="mini-step"><span class="callout-number">2</span><div><strong>Convenez de vos limites</strong><p>Précisez ce que vous pouvez faire et quand. N’agissez pas à son insu, hors nécessité de protection urgente.</p></div></div><div class="mini-step"><span class="callout-number">3</span><div><strong>Vérifiez que l’aide convient</strong><p>« Tu préfères que je fasse avec toi ou que je m’occupe seulement de cette partie ? »</p></div></div></div><div class="say">« Je peux t’aider à préparer cet appel demain. Est-ce que cela te serait utile ? »</div>`,
      };
      const supportContexts = {
        mental: [
          "Détresse ou trouble psychique",
          "Proposez une tâche simple et une présence calme. Évitez « secoue-toi » ou « pense autrement ». Demandez si la personne souhaite contacter un professionnel ou un proche sûr.",
          "Si elle rapporte une expérience que vous ne partagez pas : « Je vois que cela t’inquiète. Je ne le perçois pas de la même façon, mais je veux t’aider à te sentir en sécurité. »",
          "Si la personne devient très confuse, ne peut plus gérer les gestes du quotidien ou évoque le suicide, cherchez une aide professionnelle. En cas de danger immédiat, une aide urgente est nécessaire. Ne modifiez pas son traitement.",
        ],
        couple: [
          "Difficulté dans le couple",
          "Écoutez sans décider à sa place de rester ou de partir. Demandez si elle peut exprimer un désaccord sans avoir peur.",
          "« Te sens-tu libre de dire non ? Qu’est-ce qui te ferait te sentir plus en sécurité ? »",
          "S’il y a peur, contrôle, menace ou crainte d’une punition, privilégiez une aide individuelle spécialisée. N’organisez pas vous-même une confrontation ou une médiation de couple.",
        ],
        work: [
          "Travail ou études",
          "Aidez à distinguer la charge de travail, les ressources manquantes et les relations de pouvoir. Un problème d’organisation n’est pas toujours un manque de compétences.",
          "« On peut lister ce qui est demandé, ce qui est possible et l’appui qui te serait utile. »",
          "En cas de harcèlement ou de discrimination, chercher un interlocuteur sûr : représentant du personnel, association, service de santé ou instance indépendante selon le contexte. Ne promettez pas la confidentialité d’une procédure que vous ne connaissez pas.",
        ],
        grief: [
          "Deuil, perte ou maladie",
          "Il n’y a pas toujours de solution à chercher. Proposez une présence, une aide matérielle, un moment de repos. Respectez les pratiques culturelles ou spirituelles souhaitées par la personne.",
          "« Je ne peux pas enlever cette peine. Je peux être là, ou t’aider pour une chose concrète aujourd’hui. »",
          "Évitez les délais imposés au deuil, les comparaisons et l’obligation de tirer une leçon positive. Une souffrance intense ou persistante peut justifier un soutien professionnel.",
        ],
        material: [
          "Précarité, démarches ou isolement",
          "Commencez par le besoin prioritaire : logement, alimentation, revenu, soins, lien social. Aidez à repérer les droits et ressources réellement accessibles.",
          "« Qu’est-ce qui est le plus urgent ? Veux-tu qu’on fasse cette démarche ensemble ? »",
          "Ne ramenez pas une contrainte économique ou administrative à la motivation de la personne. Demandez son accord avant de partager une information ou de contacter un service.",
        ],
        young: [
          "Enfant ou adolescent",
          "Utilisez des mots adaptés à l’âge, laissez le temps et proposez des choix simples. L’adulte reste responsable de la protection.",
          "« Merci de me l’avoir dit. Ce n’est pas ta faute. Je vais chercher de l’aide pour te protéger et t’expliquer ce qui se passe. »",
          "En cas de violence, ne menez pas d’interrogatoire et ne promettez pas un secret absolu. Cherchez un professionnel ou un adulte sûr, hors de l’entourage impliqué si nécessaire.",
        ],
      };
      const needGuidance = {
        listen: [
          "Écouter sans interrompre",
          "« Je t’écoute. Qu’est-ce que tu voudrais que je comprenne ? »",
          "Reformuler avec ses mots. Vérifier : « Est-ce que j’ai bien compris ? » Ne proposer une piste que si la personne le souhaite.",
        ],
        clarify: [
          "Aider à voir plus clair",
          "« Quel point aimerais-tu éclaircir en premier ? »",
          "Distinguer les faits, le ressenti, les contraintes et les ressources. Laisser la personne choisir ce qui compte pour elle.",
        ],
        practical: [
          "Proposer une aide précise",
          "« Est-ce que ce serait utile que je fasse cette tâche avec toi ? »",
          "Proposer une action limitée dans le temps. Demander l’accord avant de contacter quelqu’un ou de partager une information.",
        ],
        advice: [
          "Partager un avis avec son accord",
          "« J’ai une idée. Est-ce que tu veux l’entendre ? »",
          "Donner une idée brève, puis demander ce qu’elle en pense. Son contexte peut rendre votre expérience peu applicable.",
        ],
      };
      // Les groupes organisent le choix sans afficher toutes les relations à l'accueil.
      // Les clés servent aussi de liens directs : #violences-colleague, etc.
      const violenceGroups = [
        ["Vie personnelle", [
          ["couple", "Couple ou ex-partenaire"],
          ["sibling", "Frères et sœurs"],
          ["peers", "Amis, camarades ou colocataires"],
          ["family", "Parent ou adulte responsable / enfant"],
          ["vulnerable", "Proche adulte aidé ou vulnérable"],
        ]],
        ["Travail et études", [
          ["colleague", "Entre collègues"],
          ["work", "Responsable / salarié"],
          ["education", "Enseignant / élève ou étudiant"],
        ]],
        ["Soins", [["care", "Professionnel de santé / personne soignée"]]],
        ["Droits et signalement", [["authority", "Autorité, entreprise ou groupe puissant"]]],
        ["Autre situation", [["other", "Une autre relation"]]],
      ];
      // Où se place la personne : quelles relations montrer en premier sur la page des repères de violence.
      // Seul l'ordre change : aucune relation n'est masquée, aucune n'est choisie à la place de la personne, « Autre situation » reste en dernier.
      // Clé « niveau/contexte » : précision ; clé « niveau » : valeur par défaut du niveau ; rien : l'ordre d'origine ci-dessus.
      // Règle éditoriale : on met en tête la relation que décrit le contexte, puis celle vers laquelle son guide renvoie ou qui s'en approche
      // le plus ; on n'ajoute rien par simple ressemblance (mieux vaut l'ordre d'origine qu'une proximité inventée).
      const violenceFirst = {
        // Équipe ou institution : le travail d'abord (responsable / salarié, collègues), puis les pressions et représailles (autorité).
        organization: ["work", "colleague", "authority"],
        // Priorités et coordination : un désaccord entre collègues d'abord (le guide « collègues » renvoie vers « responsable / salarié » si l'autre décide de mon emploi).
        "organization/coordination": ["colleague", "work"],
        // Accès et qualité d'un service : signaler un manquement (autorité), puis les relations avec les usagers (soins, enseignement).
        "organization/service": ["authority", "care", "education"],
        // Collectif ou politique : toujours le repère non gradué sur les pressions et les représailles.
        public: ["authority"],
        "personal/study": ["education", "peers"],
        "personal/work": ["work", "colleague"],
        // Accéder à un soin : la relation avec un professionnel de santé. Le guide « proche adulte aidé » vise une relation d'aide familiale : pas de lien établi ici.
        "personal/health": ["care"],
        "shared/family": ["family", "sibling", "vulnerable"],
        "shared/sibling": ["sibling", "family"],
        // Amis, camarades ou colocataires : cette relation seule (la fratrie est un autre guide).
        "shared/peers": ["peers"],
        "shared/colleague": ["colleague", "work"],
        // Encadrement ou formation : encadrer et évaluer relèvent de la relation responsable / salarié ; « enseignant / élève » ne couvre que l'école et les études.
        "shared/mentoring": ["work", "education"],
        // Voisins ou association : aucun guide ne correspond ; la colocation (partage d'un lieu et de règles) est le plus proche.
        "shared/neighbors": ["peers"],
      };
      const violenceData = {
        couple: {
          note: "Tous les genres et toutes les orientations sont concernés. Des moments respectueux n’effacent pas les violences.",
          refs: "[6, 7]",
          items: [
            [
              "Respect",
              "Vos choix, vos relations et vos refus sont respectés.",
              "Vous pouvez exprimer un désaccord sans avoir peur. Chacun garde ses liens, son intimité et une liberté de choix.",
              "Continuez à respecter les limites et les besoins de chacun.",
            ],
            [
              "Désaccord sans peur",
              "Vous n’êtes pas d’accord, mais pouvez en parler librement.",
              "Un désaccord n’est pas en lui-même une violence. L’absence de peur, de pression et de punition est un repère important.",
              "Choisissez un moment calme si chacun le souhaite. Un désaccord n’oblige pas à trouver immédiatement un compromis.",
            ],
            [
              "Signal préoccupant",
              "Votre partenaire insiste après un refus ou vous rabaisse.",
              "Les remarques dégradantes et les pressions méritent d’être prises au sérieux, même présentées comme de l’humour.",
              "Parlez-en à une personne sûre. Vous n’avez pas à prouver que cela se produit assez souvent pour demander du soutien.",
            ],
            [
              "Contrôle / violence",
              "Votre téléphone, vos relations ou votre argent sont contrôlés.",
              "La surveillance imposée, l’isolement et la privation de ressources peuvent relever du contrôle coercitif.",
              "Cherchez un appui confidentiel depuis un appareil sûr si possible. Une confrontation peut augmenter le danger.",
            ],
            [
              "Violence / menace",
              "Votre partenaire vous menace ou vous impose un acte sexuel.",
              "La menace, la contrainte sexuelle et le chantage sont des violences. Être en couple ne vaut jamais consentement.",
              "Priorisez votre sécurité et demandez un soutien spécialisé. Des soins peuvent être nécessaires.",
            ],
            [
              "Urgence possible",
              "Votre partenaire vous frappe, vous étrangle ou vous enferme.",
              "Ces actes peuvent mettre la vie en danger. Une strangulation peut entraîner des complications même sans trace visible.",
              "Cherchez un lieu sûr et une aide urgente. Après une strangulation, demandez rapidement une évaluation médicale.",
            ],
          ],
        },
        work: {
          note: "Un responsable dispose de moyens de pression sur le salarié. Les droits et recours dépendent du pays.",
          refs: "[8, 35]",
          priorWork: [["Violentomètre de la Ville de Paris sur les violences au travail (2020)", 51], ["Violent’hospitomètre des collectifs de jeunes soignants", 55]],
          items: [
            [
              "Respect",
              "Les tâches sont claires et vos questions sont accueillies.",
              "Le travail et ses contraintes peuvent être discutés sans humiliation ni discrimination.",
              "Les demandes restent compatibles avec la dignité, la santé et les droits applicables.",
            ],
            [
              "Désaccord professionnel",
              "Un retour critique porte sur le travail, sans vous dénigrer.",
              "Une critique sur le travail ou un désaccord ne constitue pas automatiquement un harcèlement. La forme, les faits et le contexte comptent.",
              "Demandez des critères et des attentes précis, si cette discussion est sûre.",
            ],
            [
              "Signal préoccupant",
              "Les remarques dévalorisantes ou exclusions se multiplient.",
              "Des moqueries, une mise à l’écart ou des remarques discriminatoires doivent être prises au sérieux. Un seul acte peut déjà être grave.",
              "Cherchez un interlocuteur fiable et extérieur à l’auteur. Notez les faits seulement si cela est sûr pour vous.",
            ],
            [
              "Abus de pouvoir",
              "On vous humilie ou vous menace pour vous faire céder.",
              "Des moyens de pression, des tâches délibérément humiliantes ou une dépendance économique exploitée peuvent constituer des violences.",
              "Un représentant du personnel, un service de santé ou une association peut aider à évaluer les options locales.",
            ],
            [
              "Violence / coercition",
              "Des faveurs sexuelles sont exigées ou des représailles annoncées.",
              "L’emploi, le salaire ou l’évolution professionnelle ne doivent pas servir à imposer des actes sexuels ou à faire taire une alerte.",
              "Cherchez une aide spécialisée, indépendante si le canal interne n’est pas sûr.",
            ],
            [
              "Urgence possible",
              "Vous êtes agressé, retenu de force ou menacé physiquement.",
              "La priorité devient la protection immédiate, indépendamment de la position hiérarchique.",
              "Éloignez-vous si possible et sollicitez les secours locaux ou une aide sûre à proximité.",
            ],
          ],
        },
        care: {
          note: "Repères centrés sur les droits de la personne soignée. Une procédure contraignante exige une analyse clinique et juridique propre au pays ; l’outil ne tranche pas sa légalité.",
          refs: "[11, 43]",
          priorWork: [["Déontomètre de la confiance thérapeutique de l’Ordre des masseurs-kinésithérapeutes et de l’association Du côté des femmes (2022)", 54]],
          items: [
            [
              "Respect",
              "On vous explique les soins et on écoute vos choix.",
              "Vous êtes traité avec dignité ; votre intimité, vos questions et votre participation sont prises en compte.",
              "Demandez une explication, un interprète ou un accompagnement si vous en avez besoin.",
            ],
            [
              "Désaccord de soins",
              "Vous discutez d’une recommandation sans être rabaissé.",
              "Ne pas partager un avis médical ne suffit pas à caractériser une violence. Vous devez pouvoir comprendre le raisonnement et les options.",
              "Vous pouvez demander des précisions ou un autre avis selon les possibilités locales.",
            ],
            [
              "Signal préoccupant",
              "Vos douleurs, vos questions ou votre intimité sont négligées.",
              "Le manque d’écoute ou une exposition injustifiée de l’intimité mérite d’être signalé, même sans intention de nuire connue.",
              "Demandez un interlocuteur sûr, une personne de confiance ou un représentant des usagers si disponible.",
            ],
            [
              "Maltraitance",
              "On vous humilie ou vous menace pour obtenir l’obéissance.",
              "L’autorité de soin ne justifie pas la dégradation, la discrimination ou la punition.",
              "Cherchez une aide indépendante de l’auteur et demandez que les soins restent assurés en sécurité.",
            ],
            [
              "Violence / exploitation",
              "On vous impose des gestes sexuels ou vous exploite.",
              "La relation de soins ne justifie aucune exploitation sexuelle ou financière.",
              "Sollicitez une aide spécialisée et, si nécessaire, des soins dans un autre lieu sûr.",
            ],
            [
              "Urgence possible",
              "Vous subissez une agression ou une privation de soins vitaux.",
              "Une violence en cours, une blessure grave ou l’impossibilité d’accéder à un soin urgent nécessite une réponse immédiate.",
              "Contactez un professionnel sûr, les urgences locales ou une instance de protection selon ce qui est accessible.",
            ],
          ],
        },
        education: {
          note: "« Enseignant / élève ou étudiant » : le repère vaut pour l’école et l’enseignement supérieur, en tenant compte de l’âge et de la dépendance pédagogique.",
          refs: "[9, 10]",
          priorWork: [["SafeProf de Nous Toutes UPEC et de ses partenaires (2021)", 52], ["Violentomètre de l’apprentissage d’Eléonore (2025)", 58]],
          items: [
            [
              "Respect",
              "Vous pouvez poser des questions et être traité avec dignité.",
              "Les règles et évaluations sont expliquées ; les erreurs peuvent servir à apprendre.",
              "Une exigence pédagogique est compatible avec le respect.",
            ],
            [
              "Désaccord pédagogique",
              "Une correction ou une note est expliquée sans humiliation.",
              "Une note décevante ou une règle raisonnable n’est pas, à elle seule, une violence.",
              "Demandez un retour précis et les possibilités de réexamen selon le contexte.",
            ],
            [
              "Signal préoccupant",
              "On vous ridiculise ou fait des commentaires déplacés.",
              "Les moqueries et remarques sexistes, racistes ou dégradantes ne sont pas des outils pédagogiques acceptables.",
              "Parlez-en à un adulte sûr ou à un interlocuteur indépendant dans l’établissement.",
            ],
            [
              "Abus d’autorité",
              "On vous humilie publiquement ou vous isole pour vous punir.",
              "Cette asymétrie pédagogique peut rendre difficile le fait de dire non ou de signaler un abus.",
              "Vous pouvez chercher un soutien extérieur à la personne qui vous évalue.",
            ],
            [
              "Violence / coercition",
              "On impose un secret ou un contact sexuel en usant de l’autorité.",
              "Les menaces sur les notes, le diplôme ou l’avenir pour obtenir un acte sexuel sont graves. Pour un mineur, la responsabilité de protection appartient aux adultes.",
              "Cherchez un adulte sûr ou un service de protection. Ne rencontrez pas seul l’auteur pour régler la situation.",
            ],
            [
              "Urgence possible",
              "Vous êtes frappé, agressé ou retenu de force.",
              "La violence physique ou sexuelle et les menaces immédiates nécessitent une protection.",
              "Éloignez-vous si possible et cherchez une aide urgente ou un adulte sûr à proximité.",
            ],
          ],
        },
        family: {
          note: "Ces repères portent sur les responsabilités des adultes. Un enfant n’a jamais à résoudre seul la violence d’un parent.",
          refs: "[10]",
          items: [
            [
              "Respect",
              "L’adulte vous écoute et pose des limites sans violence.",
              "Des règles adaptées à l’âge peuvent protéger l’enfant sans l’humilier. Ses besoins et sa dignité sont pris en compte.",
              "Les adultes expliquent les limites et restent responsables de la sécurité.",
            ],
            [
              "Frustration sans violence",
              "Vous êtes contrarié par une règle, mais pouvez en parler.",
              "Ne pas obtenir tout ce que l’on souhaite n’est pas en soi une maltraitance. Une règle doit rester adaptée à l’âge, aux besoins et à la sécurité.",
              "Vous pouvez exprimer votre ressenti à un adulte qui vous écoute.",
            ],
            [
              "Signal préoccupant",
              "On se moque de vous ou vous fait porter les problèmes des adultes.",
              "Le dénigrement, les insultes ou la culpabilisation peuvent être des violences psychologiques.",
              "Parlez à un adulte sûr, y compris en dehors de la famille. Ce n’est pas votre faute.",
            ],
            [
              "Maltraitance",
              "On vous fait peur, vous humilie ou vous prive de besoins essentiels.",
              "L’intimidation, la négligence et les privations mettant en danger la santé ou le développement nécessitent une aide.",
              "Un professionnel de santé, un enseignant sûr ou la protection de l’enfance peut être un appui.",
            ],
            [
              "Violence",
              "On vous frappe ou vous impose des gestes sexuels.",
              "Les coups ne sont pas un moyen éducatif acceptable. Aucun enfant n’est responsable des violences subies.",
              "Cherchez un adulte sûr ou un service de protection. Vous n’avez pas à confronter l’auteur.",
            ],
            [
              "Urgence possible",
              "Vous êtes blessé, menacé gravement ou empêché de vous mettre à l’abri.",
              "La protection immédiate passe avant toute explication ou exercice de résolution de problème.",
              "Rejoignez si possible un adulte sûr et demandez une aide urgente locale.",
            ],
          ],
        },
        sibling: {
          note: "Fratrie mineure ou adulte : une dispute n'autorise ni coups ni intimidation. Si un enfant est concerné, un adulte sûr reste responsable de sa protection. Une agression grave n'a pas besoin de se répéter pour être prise au sérieux.",
          refs: "[34, 38, 40]",
          items: [
            [
              "Respect",
              "Nos affaires, nos limites et nos refus sont respectés.",
              "Nous pouvons partager un espace ou des tâches sans que l'un impose sa volonté par la peur. Une différence d'âge ou de force demande une attention particulière.",
              "Nous pouvons convenir de règles concrètes si chacun peut participer librement ; les adultes gardent leur rôle de protection auprès des mineurs.",
            ],
            [
              "Désaccord sans peur",
              "Nous nous disputons, mais pouvons nous arrêter et demander de l'aide.",
              "Rivaliser pour une attention ou discuter d'une règle n'est pas en soi une violence. Ce qui compte aussi est la possibilité de refuser, de se retirer et d'être entendu.",
              "Si nous sommes mineurs, un adulte sûr peut aider à poser des limites sans nous demander de régler seuls une situation dangereuse.",
            ],
            [
              "Signal préoccupant",
              "On me rabaisse souvent ou on abîme exprès mes affaires.",
              "L'intimidation répétée, les humiliations et la destruction volontaire d'objets dépassent une simple rivalité. Je peux demander de l'aide sans établir moi-même une qualification.",
              "J'en parle à une personne sûre, hors de l'entourage impliqué si nécessaire. Je ne suis pas obligé de minimiser parce que nous sommes de la même famille.",
            ],
            [
              "Agression ou intimidation",
              "On me frappe, me bloque ou me menace pour me faire céder.",
              "Des coups ou menaces ne deviennent pas acceptables parce qu'ils ont lieu entre frères et sœurs. La peur et le déséquilibre de force comptent, même après un seul fait grave.",
              "Je cherche une protection et un soutien adaptés ; si je suis mineur, je contacte un adulte sûr ou un service de protection de l'enfance.",
            ],
            [
              "Violence sexuelle ou grave",
              "On m'impose un contact sexuel, un secret ou un acte humiliant.",
              "Un lien de fratrie ne donne aucun droit sur le corps de l'autre. Une exploitation sexuelle ou une agression grave exige une aide de protection, sans médiation imposée.",
              "Je peux parler à un adulte ou à un professionnel sûr, et chercher une aide spécialisée sans confronter la personne qui a agi.",
            ],
            [
              "Urgence possible",
              "Je suis blessé, menacé avec une arme ou empêché de partir.",
              "Une agression en cours, une blessure ou une menace grave demande une réponse immédiate. Le lien familial ne réduit pas le danger.",
              "Je rejoins si possible un lieu sûr et je contacte les secours locaux ou une personne sûre à proximité.",
            ],
          ],
        },
        peers: {
          note: "Amitié, camarades ou colocation : le groupe, l'âge et la dépendance au logement peuvent changer la liberté de dire non. La source UNESCO porte sur l'école ; son extension aux autres liens entre pairs est un choix pédagogique. Pour un mineur, un adulte sûr peut devoir protéger.",
          refs: "[36]",
          priorWork: [["Harcèlomètre du service de santé étudiant de l’Université de Toulouse", 53]],
          items: [
            [
              "Respect",
              "Mes limites et mes informations privées sont respectées.",
              "Je peux garder d'autres liens, refuser une invitation et demander une règle commune sans être puni ou exclu pour cela.",
              "Nous pouvons définir ce qui est partagé et ce qui reste personnel.",
            ],
            [
              "Désaccord ordinaire",
              "Nous ne sommes pas d'accord sur une activité ou un espace commun.",
              "Un désaccord ou une déception n'est pas en soi une violence si chacun peut s'exprimer, partir et refuser sans craindre de représailles.",
              "Nous pouvons chercher une règle pratique seulement si chacun se sent libre de participer.",
            ],
            [
              "Signal préoccupant",
              "Des moqueries, rumeurs ou exclusions se répètent.",
              "La répétition, l'effet de groupe et les messages en ligne peuvent rendre l'intimidation difficile à arrêter. Un acte isolé grave mérite aussi une aide.",
              "J'en parle à une personne fiable ; si cela se passe à l'école, je cherche un adulte sûr ou une voie de signalement adaptée.",
            ],
            [
              "Pression ou atteinte à la vie privée",
              "On diffuse mes messages ou mes images, ou on me menace si je refuse.",
              "Partager des informations intimes sans accord, exercer un chantage ou profiter d'une dépendance au groupe ou au logement peut causer un préjudice sérieux.",
              "Je cherche une aide sûre et indépendante du groupe. Je ne dois pas négocier seul sous la menace.",
            ],
            [
              "Violence",
              "On m'agresse ou m'impose un contact sexuel.",
              "Une agression physique ou sexuelle n'est pas une simple dispute entre amis ou camarades. Elle peut être grave dès le premier acte.",
              "Je privilégie ma sécurité et une aide spécialisée ; pour un mineur, je cherche aussi un adulte protecteur.",
            ],
            [
              "Urgence possible",
              "Je suis menacé maintenant, blessé ou empêché de partir.",
              "La priorité est de sortir du danger et d'obtenir une aide immédiate, quel que soit le lien avec les autres personnes.",
              "Je rejoins si possible un lieu sûr et j'appelle les secours locaux ou demande une aide sûre à proximité.",
            ],
          ],
        },
        colleague: {
          note: "Entre collègues, un désaccord professionnel n'est pas en soi un harcèlement. Des humiliations répétées, des représailles ou une agression justifient de chercher de l'aide. Si l'autre personne décide de votre emploi ou de votre formation, choisissez plutôt le guide lié à cette autorité.",
          refs: "[8, 35]",
          priorWork: [["Violentomètre de la Ville de Paris sur les violences au travail (2020)", 51], ["Violentomètre du monde de la recherche de l’équipe G-RIRE et de la Fondation L’Oréal (2024)", 57]],
          items: [
            [
              "Respect professionnel",
              "Nos questions et désaccords portent sur le travail, sans humiliation.",
              "Une répartition des tâches peut être discutée et chacun peut demander des critères clairs. Le respect n'exige pas d'être toujours d'accord.",
              "Je peux clarifier les attentes et les moyens disponibles, si l'échange est sûr.",
            ],
            [
              "Critique du travail",
              "Un collègue critique une tâche ou une décision de façon précise.",
              "Une critique professionnelle ou un conflit ponctuel ne suffit pas à conclure à un harcèlement moral au travail. La forme, la répétition et les effets comptent.",
              "Je peux demander un exemple concret et une manière de corriger le travail, si cela ne m'expose pas.",
            ],
            [
              "Signal préoccupant",
              "Les moqueries, rumeurs ou mises à l'écart se répètent.",
              "Des agissements hostiles répétés peuvent dégrader les conditions de travail. Je n'ai pas à prouver une qualification juridique avant de demander conseil.",
              "Je cherche un interlocuteur fiable, par exemple un représentant du personnel ou le service de santé au travail selon mon pays.",
            ],
            [
              "Intimidation ou représailles",
              "On m'humilie, sabote mon travail ou me menace si je parle.",
              "Un collègue peut exercer une pression sans être mon supérieur. Les faits, les témoins éventuels et les risques de représailles orientent la suite.",
              "Je privilégie un canal sûr et indépendant de la personne concernée ; je note les faits uniquement si cela ne m'expose pas davantage.",
            ],
            [
              "Violence ou coercition sexuelle",
              "On m'agresse ou me fait subir des gestes sexuels non voulus.",
              "Une agression ou un acte sexuel imposé est grave même s'il ne s'est produit qu'une fois et même entre personnes de même niveau.",
              "Je cherche un soutien spécialisé et une protection au travail, sans confrontation imposée.",
            ],
            [
              "Urgence possible",
              "Je suis menacé physiquement, blessé ou retenu de force.",
              "Une violence en cours nécessite une protection immédiate ; la procédure interne peut attendre que je sois en sécurité.",
              "Je m'éloigne si possible et sollicite les secours locaux ou une aide sûre à proximité.",
            ],
          ],
        },
        vulnerable: {
          note: "Ce guide vise une relation d'aide avec un adulte âgé, malade ou dépendant. Une difficulté de soin ou une erreur ne prouve pas à elle seule une maltraitance ; la sécurité et les besoins de la personne doivent être examinés. Le guide OMS cité porte surtout sur les personnes âgées.",
          refs: "[37, 39]",
          items: [
            [
              "Respect et autonomie",
              "La personne aidée reçoit des explications et garde une voix dans les choix.",
              "Son intimité, ses ressources et ses préférences sont respectées selon ses capacités et les décisions qui lui appartiennent.",
              "Je demande ce qu'elle souhaite et ce dont elle a besoin, sans supposer qu'un proche peut décider à sa place.",
            ],
            [
              "Difficulté à résoudre",
              "Une aide prévue ne convient pas et la personne peut le signaler.",
              "Un désaccord sur l'organisation de l'aide ne suffit pas à caractériser une maltraitance. Il faut écouter la personne et vérifier ce qui lui est effectivement accessible.",
              "Je cherche une autre organisation ou un avis compétent avec elle, si elle peut participer librement.",
            ],
            [
              "Signal préoccupant",
              "Ses demandes sont écartées ou ses besoins sont négligés à répétition.",
              "Une négligence peut être liée à des moyens insuffisants ou à des actes de maltraitance ; dans les deux cas, les besoins de la personne méritent une réponse.",
              "Je cherche un interlocuteur sûr, extérieur à la personne mise en cause si nécessaire, et je vérifie les besoins essentiels.",
            ],
            [
              "Emprise ou exploitation",
              "On l'isole, l'intimide ou utilise son argent sans son accord.",
              "Une relation de confiance peut être utilisée pour contrôler les contacts, les décisions ou les ressources d'une personne dépendante.",
              "Je cherche un service ou professionnel compétent et j'évite une confrontation qui pourrait accroître la dépendance ou les représailles.",
            ],
            [
              "Maltraitance grave",
              "On la frappe, lui impose un geste sexuel ou la prive de besoins essentiels.",
              "Une agression, une exploitation sexuelle ou une privation grave demande une protection, même après un seul événement.",
              "Je contacte une aide spécialisée ou un service de protection adapté au pays ; les soins nécessaires ne doivent pas être retardés.",
            ],
            [
              "Urgence possible",
              "Elle est blessée, menacée ou sans accès à un soin vital.",
              "Une violence en cours, une blessure grave ou l'absence de soin urgent nécessite une réponse immédiate.",
              "Je sollicite les secours locaux ou un professionnel sûr et cherche à mettre la personne à l'abri si c'est possible.",
            ],
          ],
        },
        other: {
          note: "Si la relation n'est pas dans la liste, ces exemples généraux peuvent aider à poser une question. Ils n'établissent pas la sécurité d'une situation et ne remplacent pas un appui adapté à votre contexte.",
          refs: "[6, 8]",
          items: [
            ["Respect", "Je peux exprimer une limite sans craindre une punition.", "Mes choix, mon intimité et mes liens sont respectés. Cela ne garantit pas que toute la relation soit sans risque.", "Je peux préciser ce que je souhaite changer si chacun peut participer librement."],
            ["Désaccord sans peur", "Nous ne sommes pas d'accord, mais pouvons nous arrêter.", "Un conflit n'est pas en soi une violence. La peur, la pression, les menaces et les conséquences d'un refus changent la situation.", "Je peux chercher une clarification seulement si elle est sûre et souhaitée."],
            ["Signal préoccupant", "On me rabaisse ou ignore mes refus de manière répétée.", "Des humiliations, une mise à l'écart ou des pressions méritent d'être prises au sérieux, même si je ne sais pas les nommer.", "J'en parle à une personne sûre et cherche quel soutien existe dans ce contexte."],
            ["Contrôle ou intimidation", "On surveille mes contacts ou me menace pour obtenir quelque chose.", "La peur ou la dépendance peut empêcher un accord libre. Je n'ai pas à régler cela seul par une discussion avec l'auteur.", "Je cherche un soutien indépendant et prépare une suite qui ne m'expose pas davantage."],
            ["Violence", "On m'agresse ou m'impose un acte sexuel.", "Une seule agression peut être grave. Je n'ai pas besoin d'attendre d'autres faits pour demander une aide adaptée.", "Je donne priorité à ma sécurité et à un soutien spécialisé."],
            ["Urgence possible", "Je suis blessé, enfermé ou menacé maintenant.", "La priorité est une protection immédiate, avant cet exercice ou toute tentative de médiation.", "Je rejoins si possible un lieu sûr et contacte les secours locaux ou une personne sûre à proximité."],
          ],
        },
      };
      // Repère NON gradué : ce que décrivent des organisations, sans échelle ni couleurs, car aucune source ne soutient un ordre.
      // Chaque phrase renvoie à une source vérifiée (références 59 à 64) et ne va pas au-delà de ce qu’elle dit ; ce qui n’est pas
      // dans les sources est écrit dans la voix de l’appli (permissions, conditions de sûreté). Omissions volontaires : internement ou
      // orientation psychiatrique, chiffres de seconde main, conseils numériques de 2011, conseils d’arrestation propres à un pays,
      // « en cas de doute, supposer qu’on est surveillé ». Clé de lien : #violences-authority. Pas de score ; droits selon le pays.
      const violenceLists = {
        authority: {
          note: "Pour une personne qui défend des droits humains par des moyens pacifiques, ou qui signale un manquement dans son travail. Ces repères décrivent ce que des organisations observent ; ils ne mesurent pas un danger. Les droits et recours dépendent du pays.",
          title: "Quand je défends des droits humains ou que je signale un manquement",
          lead: [
            "Défendre des droits humains, seul ou avec d’autres, n’expose pas toujours à un risque, mais cela peut exposer à des pressions ou à des représailles.",
            "Je peux chercher de l’aide sans preuve et sans savoir comment nommer ce que je vis.",
          ],
          facts: {
            title: "Ce que des organisations ont constaté",
            hint: "Cette liste n’est pas classée par gravité : un seul de ces faits peut déjà être grave, et ce que je vis peut ne pas y figurer.",
            items: [
              ["Mise en cause publique", "Étiquettes, accusations, campagnes pour salir la réputation.", "Des organisations décrivent des personnes présentées publiquement comme « terroristes », « subversives » ou « corrompues », comme des agents de puissances étrangères (par exemple « occidentales ») ou comme agissant pour des partis d’opposition, souvent par des autorités ou des médias d’État, avec des campagnes de diffamation. Ce repère ne dit pas si une accusation précise est fondée."],
              ["Menaces", "Menaces contre une personne, ses collègues, son organisation ou ses proches.", "Menaces, y compris de mort, directes ou à mots couverts, en personne, par téléphone ou message, sur les réseaux sociaux, par un mot glissé sous la porte, par l’envoi de photos montrant que soi ou sa famille sont surveillés depuis longtemps, ou par l’inscription sur une liste publiée de personnes à abattre. Des organisations décrivent aussi du chantage visant les proches. Beaucoup de personnes menacées ont dit à l’ONU que la menace, à elle seule, les affaiblit et les laisse dans une peur constante."],
              ["Surveillance", "Être surveillé ou mis sur écoute.", "Des organisations décrivent des personnes surveillées, dont la ligne téléphonique est écoutée ou coupée. Ce repère ne dit pas si ce que je vis correspond à l’un de ces faits."],
              ["Mesures qui gênent l’action", "Arrestations, poursuites ou amendes que des organisations jugent injustifiées ; saisies ; fermetures de locaux.", "Des organisations décrivent des arrestations arbitraires ou des poursuites pour des motifs variés, des amendes lourdes pour des infractions mineures, l’obligation de se présenter à répétition à un bureau sans raison claire, des convocations par la police, la confiscation de papiers ou de matériel, la fermeture de locaux, des entraves aux déplacements et aux associations. Un contrôle ou une amende ordinaire n’est pas forcément une pression : les textes décrivent des mesures arbitraires, répétées, disproportionnées ou prises sous un prétexte, parfois utilisées pour harceler et occuper le temps des personnes."],
              ["Travail ou études", "Perte d’emploi, sanction ou mise à l’écart liées à un signalement ou à un engagement.", "Après un signalement ou un engagement pour des droits, des organisations décrivent une perte d’emploi ou de possibilités d’études ; la directive européenne cite aussi sanction, mutation, évaluation négative, mise à l’écart ou intimidation. La directive parle de représailles quand un acte, dans le cadre du travail, est provoqué par un signalement et cause ou peut causer un préjudice injustifié. Une critique ou une évaluation ordinaire n’est pas, à elle seule, une représaille."],
            ],
          },
          alert: "Des organisations conseillent de prendre toute menace au sérieux : la situation peut changer vite. Cela vaut pour toute menace, y compris une menace de mort ou visant mes proches, même si elle est isolée. Je n’ai pas à attendre une répétition ou une preuve pour chercher de l’aide.",
          steps: {
            title: "Premiers pas",
            hint: "Pratiques décrites par des organisations, surtout pour des contextes à risque. Elles ne conviennent pas à toutes les situations, et les documents cités n’en mesurent pas l’effet.",
            items: [
              "Ce que je vis, et ma peur, méritent de l’attention. Je n’ai pas à rester seul avec cela.",
              "J’en parle à une personne de confiance ou à une organisation spécialisée, par un moyen que je juge sûr. Je décide de la suite.",
              "Si c’est sûr pour moi, je note les faits et je les range en lieu sûr.",
              "Si l’appareil que j’utilise est partagé ou surveillé, mieux vaut ne rien y garder : ni ici, ni dans mes notes.",
            ],
          },
          volets: [
            {
              title: "Autres conseils",
              items: [
                "Je note ce que j’ai vu ou reçu : quoi, quand, où, qui (si je le sais), comment, et si cela se répète. Si je pense savoir qui est derrière, je le note à part, comme une hypothèse : les menaces sont souvent anonymes, et l’auteur est difficile à identifier avec certitude.",
                "Ces notes peuvent me nuire, ou nuire à d’autres, si quelqu’un les trouve : leur utilité varie selon le pays.",
                "Personne ne doit me pousser à agir contre mon gré.",
                "Je prends soin de moi, avec du soutien si je le souhaite.",
                "Dans le doute, je choisis ce qui me semble le plus sûr. Cela peut être continuer, changer ma façon de faire ou m’arrêter pour un temps : le choix m’appartient.",
              ],
            },
            {
              title: "Police, médias, réponse publique : à bien peser",
              paragraphs: [
                "Ce repère ne dit pas s’il faut s’adresser à la police, rendre une situation publique ou répondre publiquement à une accusation : cela dépend du contexte.",
                "Les forces de l’ordre peuvent être une option lorsque les contacter est sûr et pertinent dans mon contexte. Selon le Haut-Commissariat de l’ONU aux droits de l’homme, les autorités de l’État sont les auteurs les plus fréquents de violations contre les personnes qui défendent les droits humains, alors qu’elles ont aussi la responsabilité première de les protéger ; en leur sein, certaines personnes s’y efforcent. Dans certains pays, la police refuse parfois d’enregistrer les plaintes de personnes qui défendent des droits.",
                "Des organisations présentent le fait de rendre une situation publique comme une option à n’utiliser que si l’on pense que c’est sûr, et à éviter si l’on estime que cela peut envenimer la situation ; beaucoup de personnes qui défendent des droits disent à l’ONU qu’une couverture médiatique rapide et visible des menaces aide à les protéger. Des organisations invitent aussi à se demander si répondre publiquement à une accusation risque de la faire circuler davantage.",
                "En cas de danger immédiat, la page Sécurité reste la voie d’urgence.",
              ],
            },
            {
              title: "Droits et recours : cela dépend du pays",
              paragraphs: [
                "Les droits et les recours dépendent du pays où je vis. Une déclaration de l’ONU de 1998 reconnaît le droit de défendre les droits humains, seul ou avec d’autres. Elle n’oblige pas les États en elle-même, mais elle s’appuie sur des droits inscrits dans des traités.",
                "Dans l’Union européenne, une directive demande aux États de protéger certaines personnes qui signalent, dans un cadre professionnel, certaines violations du droit de l’Union. Elle ne couvre pas toutes les situations, la protection dépend de conditions (par exemple, avoir de bonnes raisons de croire l’information vraie et passer par les canaux prévus), et elle passe par les lois de chaque pays.",
              ],
            },
            {
              title: "Limites de ce repère",
              intro: "Ce repère décrit des situations. Il ne sert pas à :",
              items: [
                "mesurer un danger, ni savoir si une menace sera mise à exécution : on n’en est jamais sûr à 100 % ;",
                "dire si ces faits sont fréquents ;",
                "confirmer ou exclure que je sois visé ou surveillé : je peux avoir un doute sans certitude ;",
                "dire qui a raison, ni prendre parti pour une cause ;",
                "remplacer l’avis d’un juriste ou l’aide d’une organisation spécialisée.",
              ],
              paragraphs: [
                "Il concerne des actions pacifiques. Il s’appuie sur des textes sur la défense des droits humains et sur le signalement au travail : il ne porte ni sur la compétition entre partis, ni sur les désaccords ordinaires dans un syndicat, une association ou un voisinage ; une personne élue ou syndiquée qui défend un droit humain peut toutefois s’y reconnaître. Pour un problème au travail, à l’école ou dans les soins, le guide de la relation correspondante convient peut-être mieux.",
              ],
            },
          ],
          refs: "[59, 60, 61, 62, 63, 64]",
          credit: "Travaux antérieurs sur la violence politique envers les femmes au Mexique :",
          creditRef: 65,
        },
      };
