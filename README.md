# Pas à pas

Outil statique en français pour clarifier un problème, préparer une aide à une autre personne et repérer les situations où une aide spécialisée est préférable.

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
- **Comment aider un proche ?** : situations particulières, présence et limites de l'aide d'un proche.
- **Sécurité et sources** : repères face aux violences, aides et limites scientifiques.

L'accueil donne une vue très courte des étapes avant l'exercice. Les détails méthodologiques restent accessibles depuis « Comprendre ». Les méthodes et sources sont identifiées dans la bibliographie ; leur présence ne valide pas l'efficacité de ce site lui-même.

## Choix technique

Les pages et workflows sont modulaires dans les sources, puis assemblés sans framework. React et TypeScript pourraient devenir utiles si le nombre de composants, de contributeurs et d'intégrations continue de croître. Ils n'améliorent pas à eux seuls le rendu visuel, et une migration immédiate compliquerait le maintien du brouillon et de la fiche imprimable.
