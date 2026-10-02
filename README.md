# Pas à pas

Outil statique en français pour clarifier un problème, préparer une aide à une personne ou à un groupe et repérer les situations où une aide spécialisée est préférable.

## Développement

```sh
npm ci
npm run build
npm test
npm run test:print
```

`index.html` est généré à partir de `index.template.html`, des pages de `pages/`, des styles de `styles/` et des scripts de `scripts/`. Le fichier généré reste autonome pour un hébergement statique. Après chaque modification des sources, lancer `npm run build` et inclure le fichier généré dans le changement.

Les tests navigateur demandent Chromium pour Playwright : `npx playwright install chromium`. Sur Windows, définir `QA_OUTPUT` vers un dossier accessible pour les captures et rapports. Aucun service, compte ou base de données n'est requis pour utiliser la page.

## Parcours

L’accueil distingue deux intentions : **agir sur un problème** ou **soutenir d’autres personnes**. La première ouvre le choix du niveau ; la seconde mène à l’aide à une personne ou à un groupe. Les repères sur les violences, l’aide urgente et l’aide à un proche restent accessibles directement.

- **Mon problème** : je prépare l’exercice en choisissant un niveau (personnel, entre personnes, équipe ou institution, collectif ou politique), puis un contexte propre à ce niveau, et en vérifiant ma sécurité. Les contextes servent de portes d’entrée pratiques : ils ne constituent pas une classification scientifique validée. Chaque contexte apporte des questions, des exemples fictifs, un outil et des points de vigilance adaptés ; « Autre situation » permet de partir sans catégorie imposée. Puis je suis cinq phases : décrire, chercher, choisir, essayer et faire le point. Dans « Clarifier », les trois questions sur les faits, le changement souhaité et l’obstacle apparaissent successivement, avec un exemple fictif visible près du champ ; je peux passer une question. Les réponses du brouillon restent en place si je change de niveau ou de contexte : les exemples changent, et je suis invité à relire mes réponses.
- **Aider une personne** : écouter, vérifier le besoin, proposer une aide avec l'accord de la personne et faire le point. Le cas du médecin expérimenté et des jeunes médecins est un exemple, pas une limitation du public.
- **Aider un groupe** : cadrer une décision réelle, écouter avec une méthode proportionnée, analyser et restituer les constats, choisir un objectif, tester une action puis faire le point. Chaque étape propose une consigne et un exemple fictif ; ceux d’écoute et d’analyse s’adaptent à la méthode choisie. Le sondage est facultatif. Ce guide ne crée pas de sondage et n’analyse pas automatiquement les réponses. Les notes de planification restent en mémoire pendant l’ouverture de la page ; l’outil ne recueille pas les réponses individuelles.
- **Comment aider un proche ?** : situations particulières, présence et limites de l'aide d'un proche.
- **Sécurité et sources** : repères face aux violences, aides et limites scientifiques.

Les termes soulignés donnent une explication brève au survol ou au focus clavier. Un clic, une activation clavier ou un toucher ouvre un panneau avec une définition, un exemple et, lorsque pertinent, une référence. Le panneau se ferme avec son bouton ou Échap ; le focus revient au terme. Le glossaire complet reste accessible dans « Comprendre ».

Le niveau choisi sur l’accueil est affiché seul à l’arrivée dans l’exercice, avec un contrôle « Changer de niveau » replié. Chaque niveau a une URL partageable (`#outil-personal`, `#outil-shared`, `#outil-organization`, `#outil-public`). Le lien général `#outil` ouvre le choix des niveaux si aucun n’a encore été sélectionné. Sur téléphone, « Menu » ouvre la navigation principale ; l’étape actuelle reste visible et la liste complète s’ouvre sur demande. Les explications plus techniques restent accessibles depuis « Comprendre » et la bibliographie. Les méthodes et sources citées ne prouvent pas l’efficacité de cette interface ; son efficacité propre n’a pas été évaluée.

Les réponses de « Mon problème » ne sont pas envoyées par le site. Elles restent dans la page pendant son ouverture ; leur conservation dans le navigateur est facultative et doit être activée dans « Gérer mon brouillon ». Un fichier téléchargé contient les réponses ou notes que l’utilisateur a choisi d’y inscrire.

Les anciens brouillons (version 1) sont lus lors de l’import et, s’ils étaient conservés dans le navigateur, au prochain chargement. Les réponses sont préservées. Quand l’ancien « domaine » ne correspond pas clairement à un nouveau contexte, « Autre situation » est retenu et une relecture est demandée. Les nouveaux brouillons utilisent la version 2.

Cinq schémas SVG intégrés illustrent les étapes générales, l'aide à une personne, le test dans une équipe, la démarche collective et le parcours d’aide à un groupe. Chaque schéma porte ses libellés dans la figure, un titre et une description accessibles ; sa légende ajoute les limites et les exceptions utiles. Les cartes de choix des niveaux et le violentomètre sont déjà des supports visuels interactifs et ne sont pas redessinés en SVG.

## Choix technique

Les pages et workflows sont modulaires dans les sources, puis assemblés sans framework. React et TypeScript pourraient devenir utiles si le nombre de composants, de contributeurs et d'intégrations continue de croître. Ils n'améliorent pas à eux seuls le rendu visuel, et une migration immédiate compliquerait le maintien du brouillon et de la fiche imprimable.

Les références servent à étayer les démarches proposées selon leur champ d’application. Les exemples et la répartition des contextes sont des choix de conception à évaluer avec des utilisateurs ; les études citées ne démontrent pas l’efficacité de l’outil lui-même. La page « Repérer les violences » distingue ses cinq repères de l’outil officiel Violentomètre et crédite ses conceptrices et concepteurs.
