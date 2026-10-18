# nudge
Projet maketing


# Nudge : lire les programmes en jouant

Site web ludique qui invite à lire directement des extraits de programmes électoraux, en devinant à quel candidat appartient chaque citation.

## 1. Contexte et constat

Chiffres issus de YouGov (2017) :

- Environ 50 % des Français affirment ne pas avoir pris connaissance de tous les programmes.
- Environ 2/3 des Français qui se sont renseignés sur les programmes l'ont fait via les médias ou les débats télévisés.
- Les électeurs de gauche s'informent plutôt par les médias, ceux de droite plutôt par les débats.
- Les électeurs de droite sont ceux qui connaissent le moins l'ensemble des programmes.

## 2. Objectif du nudge

Amener les gens à **lire directement des extraits de programmes**, grâce à une mécanique de gamification.

## 3. Le nudge

Un jeu dans lequel il faut **attribuer une citation extraite d'un programme à un candidat déclaré**.

Déroulé :

1. Une citation est affichée, sans le nom du candidat.
2. Le joueur choisit un candidat parmi la liste.
3. Après la réponse, le candidat est révélé.
4. Le site propose un **lien vers le programme** et **d'autres citations sur le même thème** issues d'autres programmes, afin de **comparer les programmes**.

Liste des candidats : on part de la liste des candidats testés dans les sondages (à ce jour, peu de programmes sont publiés).

### Biais comportementaux ciblés

- **Aversion à l'effort** : la flemme de lire les programmes.
- **Biais de confirmation** : être d'accord avec un candidat parce que c'est « mon candidat », plutôt que par intérêt pour ses idées.
- **Biais du statu quo** : voter par défaut pour le candidat qu'on préférait au départ.

## 4. Intérêt de la démarche

Le site *pourquijevote* propose des idées de candidats (identité masquée) pour dessiner la « carte politique » d'un électeur : c'est avant tout un **diagnostic**.

Notre approche : une façon **amusante de s'informer** et de **confronter directement les idées**, en portant un regard critique sur des extraits de programmes.

## 5. Méthodologie

1. **Sélection des candidats** selon un critère objectif (ex. candidats testés dans les sondages à une date donnée).
2. **Sélection des grands thèmes** abordés dans tous les programmes.
3. **Sélection d'une citation par thème et par programme.**
4. Les citations sont **choisies au hasard**.
5. Les candidats sont **répartis de gauche à droite**, dans l'ordre dans lequel leurs groupes sont assis à l'Assemblée.

## 6. Questions ouvertes

- **Que faire des petits candidats ?** (ex. Nathalie Artaud)
- **Faut-il éviter les questions clivantes ?** Avis personnel : non, surtout pas.
- **Risques liés au choix des programmes comme source** : les programmes sont la version la plus polie de la parole politique. Le nudge pourrait :
  1. normaliser les partis les plus extrêmes, qui n'écrivent pas toutes leurs mesures dans leurs programmes (par rapport à leurs prises de parole) ;
  2. normaliser les fausses promesses qu'on peut y trouver.

  Position retenue : s'appuyer sur les programmes reste l'option la plus objective et la plus défendable. Il faut garder ces deux points en tête et chercher à les atténuer autant que possible.

## 7. Spécifications techniques (proposition)

- Site statique (HTML / CSS / JavaScript), responsive, sans backend.
- Données dans un fichier JSON : candidats (nom, groupe, position gauche-droite), thèmes, citations (texte, candidat, thème, page, lien vers le programme).
- Écran de jeu : citation, boutons candidats classés de gauche à droite, retour immédiat sur la réponse.
- Écran de révélation : candidat, lien vers le programme, autres citations du même thème pour les autres candidats.
- Sélection aléatoire des citations.
- Hébergement envisagé : GitHub Pages.

## 8. Implémentation

### Structure du site

```
nudge/
├── index.html            # SPA : accueil + jeu + révélation
├── sources.html          # page « Sources & méthode »
├── css/style.css         # styles (responsive)
├── js/app.js             # logique du jeu
└── data/programmes.json  # candidats, thèmes, citations (avec sources)
```

### Fichier de données modifiable

Toutes les données (candidats, thèmes, **citations**, sources, liens) sont dans
`data/programmes.json`, chargé dynamiquement par le JavaScript. Pour changer une
citation, ajouter un candidat ou un thème, **il suffit d'éditer ce fichier** puis de
pousser : le site se met à jour sans toucher au code.

Chaque citation suit ce schéma :

```json
{
  "id": 1,
  "candidat": "melenchon",
  "theme": "retraites",
  "texte": "…extrait verbatim…",
  "source": {
    "document": "L'Avenir en commun (édition 2025)",
    "section": "Garantir une retraite digne",
    "url": "https://melenchon2027.fr/programme2025/livre/"
  }
}
```

### Contenu

- **6 candidats**, un par bord politique, classés de gauche à droite (ordre des bancs de l'Assemblée) :
  Mélenchon (LFI), Tondelier (Les Écologistes), Attal (Renaissance), Édouard Philippe (Horizons),
  Retailleau (LR), Le Pen (RN).
- **4 thèmes** traités par tous les programmes : Économie & pouvoir d'achat, Retraites,
  Climat & énergie, Éducation.
- **24 citations** (4 par candidat), extraites à l'identique des documents officiels,
  avec source traçable (document, section, lien).

### Notes sur les sources

- **Marine Le Pen** : programme **2022** « Le Projet » (22 mesures) — le programme 2027 du RN
  n'étant pas encore publié.
- **Bruno Retailleau** : programme du parti **LR** (2025-2026) — il n'était pas candidat en 2022.

Ces deux cas sont signalés explicitement dans le site (page « Sources & méthode »).

### Tester en local

Le JSON est chargé en `fetch()`, ce qui ne fonctionne pas en ouvrant `index.html`
directement (protocole `file://`). Lancer un mini-serveur :

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

### Déploiement GitHub Pages

1. Pousser les fichiers à la **racine** du repo, branche `nathan`.
2. Sur GitHub : *Settings → Pages → Build and deployment* → Source : **Deploy from a branch**,
  Branch : `nathan`, Folder : `/ (root)`.
3. Le site sera servi sur `https://<utilisateur>.github.io/nudge/`.

Aucun build n'est nécessaire : les fichiers statiques sont servis tels quels.

## Score et statistiques partagées

Le score personnel (bonnes réponses / réponses totales) est conservé dans le stockage
local du navigateur. Les réponses partagées sont agrégées par citation et candidat ;
aucun nom de joueur ni historique individuel n'est enregistré. La répartition apparaît
après avoir répondu, pour ne pas influencer le choix.

Pour activer les statistiques partagées :

1. Créer un projet Supabase.
2. Exécuter `supabase/schema.sql` dans le SQL Editor du projet.
3. Renseigner l'URL du projet et sa clé publique `anon` dans `js/stats-config.js`.
  Ne jamais utiliser la clé `service_role` dans le site.
4. Déployer le site. Le score local fonctionne même sans configuration Supabase.

La table ne contient que des compteurs, mais son endpoint public ne limite pas les
envois automatisés : les statistiques peuvent être manipulées. Ajouter une protection
anti-abus (par exemple CAPTCHA ou Edge Function avec limitation de débit) avant de
considérer ces chiffres comme fiables. Si les identifiants des candidats changent,
mettre aussi à jour la contrainte correspondante dans `supabase/schema.sql`.