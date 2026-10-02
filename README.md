# Pas à pas — Résolution de problème

Application en français pour clarifier une difficulté du quotidien, explorer des options, préparer une action et réévaluer son résultat.

**Adapté en version numérique par Dr. FENOHASINA - Psychiatre - développeur d'application web.**

## Ouvrir l’application

Ouvrir `index.html` dans un navigateur moderne. Le fichier est autonome : aucun serveur applicatif, compte, service tiers ou compilation n’est nécessaire. Les fonctions principales fonctionnent hors ligne ; les références et annuaires d’aide nécessitent Internet.

Pour servir localement :

```sh
python3 -m http.server 8000
```

Puis ouvrir `http://localhost:8000`.

L’application peut être hébergée comme site statique. Pour GitHub Pages, sélectionner **Settings → Pages → Deploy from a branch → main → / (root)**. Le dépôt ne contient pas de workflow de déploiement automatique.

## Contenu

- Parcours en six étapes : cadrer, clarifier, imaginer, choisir, agir et réévaluer.
- Exemples fictifs adaptés à six contextes : quotidien, travail, couple, famille, études, santé.
- Comparaison des options sans score automatique ; récapitulatif, impression/PDF via le navigateur et export texte.
- Brouillon JSON exportable/importable ; conservation locale facultative.
- Aide à un proche selon son besoin : écouter, chercher ensemble ou aider concrètement.
- Violentomètre interactif décliné dans cinq relations, avec 30 exemples pédagogiques.
- Explications repliables, glossaire au survol/focus/toucher, avantages, limites, mises en garde et bibliographie commentée.
- Aide internationale avec annuaires par pays, sans numéro d’urgence supposé universel.

## Choix de conception

Un seul fichier HTML, avec CSS et JavaScript intégrés, facilite l’utilisation hors ligne, la diffusion et l’hébergement sans infrastructure. Ce choix minimise les dépendances et les requêtes externes. Pour un développement plus important, il serait pertinent de séparer styles, données éditoriales et logique, tout en générant un fichier autonome à distribuer.

Le parcours privilégie une tâche à la fois, des libellés visibles, des exemples séparés des réponses, un retour possible aux étapes et une présentation progressive des détails. Les sections théoriques sont distinctes du travail personnel. Les couleurs sont toujours accompagnées de texte. Les choix d’ergonomie s’appuient sur les recommandations NN/g et WCAG 2.2 référencées dans la page, sans revendiquer un audit complet ni une validation par des utilisateurs.

## Confidentialité

- Aucun envoi des réponses par l’application ; aucun outil d’analyse d’audience, police externe, CDN, cookie ou API.
- Par défaut, réponses en mémoire dans l’onglet ; elles disparaissent au rechargement.
- Sauvegarde `localStorage` uniquement après activation explicite, non chiffrée. Ne pas l’utiliser sur un appareil partagé ou surveillé.
- Import JSON validé et limité en taille ; données insérées dans le HTML après échappement.
- L’effacement ne supprime pas les téléchargements, impressions ou l’historique du navigateur.
- Une sortie rapide vers Wikipédia n’efface pas les traces locales ; cette limite est indiquée avant le bouton.
- L’hébergement et les sites externes peuvent conserver leurs propres journaux techniques.

## Sources et portée

Démarche inspirée du _Module 6 : Résolution de problèmes_, Projet IPT, mars 2003 (C. Briand, R. Bélanger, V. Hamel, K. Villeneuve, L. Hébert), fourni comme support de travail. Les annexes comportant une restriction de modification ne sont pas reproduites. Le PDF source n’est pas redistribué dans le dépôt.

La page contient 17 notices de sources : thérapie de résolution de problème, psychologie sociale, santé mentale communautaire, soutien psychosocial, violences, droits, déterminants sociaux, ergonomie et accessibilité. Les résultats cliniques d’interventions accompagnées ne sont pas présentés comme une preuve d’efficacité de l’application.

Les cinq violentomètres sont des **adaptations pédagogiques originales, sans score ni validation clinique ou prédictive**. Ils ne sont pas des avis juridiques. Les protocoles, ressources et recours varient selon les pays. Les items ne doivent pas être interprétés comme une progression nécessaire de la violence.

## Vérification

La suite `tests/app.spec.cjs` vérifie le parcours, la préservation des saisies, les exports/imports, le stockage facultatif, l’échappement des entrées, les cinq contextes du violentomètre, le responsive et des critères d’accessibilité automatisables.

```sh
npm install --no-save playwright@1.55.1 @axe-core/playwright@4.10.2
npx playwright install chromium
node tests/app.spec.cjs
```

Pour utiliser des dépendances déjà installées, définir `QA_NODE_MODULES` avec leur chemin. Les captures de test sont écrites hors du dépôt, dans `/tmp/pas-a-pas-checks` par défaut (modifiable via `QA_OUTPUT`). Aucun test automatisé ne remplace une évaluation clinique ou des tests d’utilisabilité avec des personnes concernées.

## Mise en page de l’impression PDF

La fiche est paginée en A4 portrait avec des marges de 15 mm et une numérotation des pages. Les petits blocs sont conservés entiers. Un bloc plus long est réparti entre les pages en gardant ensemble chaque libellé et sa réponse ; une réponse dépassant la hauteur d’une page est poursuivie à une limite de paragraphe, de phrase ou de mot, avec la mention « suite ». Aucun texte n’est tronqué. Le formulaire original reste inchangé.

Les essais de `tests/print.spec.cjs` couvrent des réponses courtes, développées, très longues et une saisie sans espaces, ainsi que la conservation intégrale des réponses et l’absence de débordement. Exécuter avec les mêmes dépendances que la suite principale :

```sh
node tests/print.spec.cjs
```

Pour le rendu prévu, conserver le format A4 portrait et désactiver les en-têtes et pieds de page ajoutés par le navigateur. Une modification du format de papier, des marges ou de l’échelle dans la boîte de dialogue d’impression peut modifier le rendu.
