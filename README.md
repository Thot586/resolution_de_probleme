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

- **Mon problème** : quatre échelles (personnelle, relationnelle, organisationnelle, collective ou politique) avec questions, exemples et outils adaptés. Les réponses du brouillon gardent la même structure quand l'échelle change ; les exemples changent, pas le texte saisi.
- **Soutenir quelqu'un** : écouter, vérifier le besoin, proposer une aide avec l'accord de la personne et faire le point. Le cas du médecin expérimenté et des jeunes médecins est un exemple, pas une limitation du public.
- **Aider un groupe** : cadrer une décision réelle, écouter avec une méthode proportionnée, analyser et restituer les constats, choisir un objectif, tester une action puis faire le point. Le sondage est facultatif. Les notes de planification restent en mémoire pendant l’ouverture de la page ; l’outil ne recueille pas les réponses individuelles.
- **Comment aider un proche ?** : situations particulières, présence et limites de l'aide d'un proche.
- **Sécurité et sources** : repères face aux violences, aides et limites scientifiques.

L'accueil permet de choisir directement l'un des quatre niveaux. Le niveau choisi est affiché seul à l’arrivée dans l’exercice, avec un contrôle « Changer de niveau » replié. Chaque niveau a une URL partageable (`#outil-personal`, `#outil-shared`, `#outil-organization`, `#outil-public`). Le lien général `#outil` ouvre le choix des niveaux si aucun n’a encore été sélectionné. Les étapes sont visibles sur demande ; les détails méthodologiques restent accessibles depuis « Comprendre ». Les méthodes et sources sont identifiées dans la bibliographie ; leur présence ne valide pas l'efficacité de ce site lui-même.

Cinq schémas SVG intégrés illustrent les étapes générales, l'aide à une personne, le test dans une équipe, la démarche collective et le parcours d’aide à un groupe. Chaque schéma porte ses libellés dans la figure, un titre et une description accessibles ; sa légende ajoute les limites et les exceptions utiles. Les cartes de choix des niveaux et le violentomètre sont déjà des supports visuels interactifs et ne sont pas redessinés en SVG.

## Choix technique

Les pages et workflows sont modulaires dans les sources, puis assemblés sans framework. React et TypeScript pourraient devenir utiles si le nombre de composants, de contributeurs et d'intégrations continue de croître. Ils n'améliorent pas à eux seuls le rendu visuel, et une migration immédiate compliquerait le maintien du brouillon et de la fiche imprimable.
