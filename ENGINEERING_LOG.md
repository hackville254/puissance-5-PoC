### [2026-05-26T05:48:28Z] | Nettoyage des textes techniques et standardisation pnpm
- **Contexte :** Plusieurs ecrans exposaient encore des formulations internes ou trop techniques (`PoC`, `mode demo`, `cache local`, `RBAC`, messages de stockage), ce qui degradiait la perception produit. La documentation etait aussi trop pauvre pour un usage clair via `pnpm`.
- **Modifications effectuees :**
    - Simplification des textes visibles dans `app/sign-in.tsx`, `app/_layout.tsx`, `app/reports/index.tsx`, `app/(tabs)/controls/[id].tsx`, `app/(tabs)/profile.tsx`, `app/sites/index.tsx`, `app/sites/new.tsx`, `app/templates/[id].tsx`, `app/(tabs)/incidents/[id].tsx`, `app/(tabs)/incidents/edit/[id].tsx`, `app/(tabs)/controls/edit/[id].tsx`.
    - Remplacement des messages techniques par des formulations produit plus neutres et orientees utilisateur.
    - Mise a jour de `README.md` avec une base d'utilisation simple et uniquement `pnpm`.
    - Nettoyage d'un commentaire interne dans `lib/state.ts` pour supprimer la reference directe au PoC.
- **Decisions Techniques :** J'ai conserve les comportements applicatifs existants et j'ai limite l'intervention aux libelles et messages afin d'ameliorer l'experience sans rouvrir de chantiers fonctionnels. La documentation reste volontairement courte pour ne pas devenir une source de divergence.
- **Impacts & Dependances :** Fichiers touches: `app/_layout.tsx`, `app/sign-in.tsx`, `app/reports/index.tsx`, `app/(tabs)/controls/[id].tsx`, `app/(tabs)/profile.tsx`, `app/sites/index.tsx`, `app/sites/new.tsx`, `app/templates/[id].tsx`, `app/(tabs)/incidents/[id].tsx`, `app/(tabs)/incidents/edit/[id].tsx`, `app/(tabs)/controls/edit/[id].tsx`, `README.md`, `lib/state.ts`. La logique metier et la navigation restent inchangees.
- **Prochaines étapes :** Verifier visuellement les ecrans modifies sur mobile pour confirmer que le ton produit reste coherent partout, puis poursuivre le meme nettoyage sur les contenus d'aide si de nouveaux textes techniques reapparaissent.

### [2026-05-26T00:50:25Z] | Durcissement auth cache et ecrans proteges
- **Contexte :** Un audit transversal a revele deux failles concretes: des ecrans hors `sign-in` pouvaient rester atteignables si non enumeres dans `Stack.Protected`, et l'etat d'auth et le role etaient rehydrates depuis le cache local, donc modifiables par simple alteration du stockage.
- **Modifications effectuees :**
    - Enumeration explicite des ecrans racine prives dans `app/_layout.tsx` (`reports`, `sites`, `templates`) en plus du groupe `(tabs)`.
    - Ajout d'une redirection defensive vers `sign-in` quand une session n'est pas active et qu'une route privee est tentee.
    - Neutralisation de la persistance de `session` et `role` dans `lib/state.ts` afin de ne plus faire confiance au stockage local pour l'authentification et l'autorisation.
- **Decisions Techniques :** J'ai prefere rendre l'auth ephemere dans le PoC plutot que de deplacer le token vers un stockage "plus sur" mais toujours non verifiable cote client. Sans backend ni signature serveur, tout etat d'auth rehydrate depuis le device reste falsifiable; il vaut mieux ne pas le restaurer.
- **Impacts & Dependances :** Fichiers touches: `app/_layout.tsx`, `lib/state.ts`. Effet de bord volontaire: un redemarrage d'application renvoie vers `sign-in`, mais conserve les donnees metier locales et les preferences non sensibles.
- **Prochaines étapes :** Si le PoC evolue vers un backend, introduire une vraie session signee/verifiee, un stockage natif dedie aux secrets et une separation plus nette entre cache metier local et contexte d'auth.

### [2026-05-26T00:31:54Z] | Refonte Accueil et realignement tab bar
- **Contexte :** La capture de l’accueil montrait des artefacts visuels en haut, une carte dashboard incoherente, un texte tronque et une tab bar encore trop proche d’un style WhatsApp vert hors charte.
- **Modifications effectuees :**
    - Remplacement de l’usage de `AppBar` sur `app/(tabs)/index.tsx` par un header dedie a l’accueil avec avatar initiales, statut role et fond uniforme.
    - Deplacement de l’aide ambigue `Repere / Action` vers un composant `OnboardingTooltip` affiche seulement sur les 3 premieres visites via stockage local.
    - Reconstruction de la carte dashboard avec palette unifiee, engrenage isole dans son propre bouton, deux chips statistiques homogènes et deux actions coherentes.
    - Normalisation des cartes de contenu de l’accueil sur un rayon 16px et des textes secondaires plus sobres.
    - Recentrage de `components/navigation/WhatsAppTabBar.tsx` sur la palette primaire bleue, avec item actif coherent et FAB `Plus` aligne au systeme visuel.
    - Alignement de `components/ui/Card.tsx` sur un rayon 16px pour renforcer la coherence du design system.
- **Decisions Techniques :** J’ai prefere sortir l’accueil de l’`AppBar` generique au lieu de le surcharger d’exceptions, afin d’obtenir une vraie hierarchie mobile premium sans casser les autres pages. L’onboarding est borne a 3 affichages pour conserver l’aide sans polluer l’interface long terme.
- **Impacts & Dependances :** Fichiers touches: `app/(tabs)/index.tsx`, `components/navigation/WhatsAppTabBar.tsx`, `components/ui/Card.tsx`. `pnpm run test` passe et les diagnostics sont propres sur les fichiers modifies.
- **Prochaines étapes :** Verifier en simulateur iPhone SE et iPhone 14 Pro que le nouveau header, la carte dashboard et la tab bar gardent le meme equilibre visuel en conditions reelles.

### [2026-05-26T00:17:59Z] | Resserage AppBar et modale visible
- **Contexte :** L’en-tete restait encore trop verbeux et la symetrie des zones d’icones pouvait varier selon les pages. La modale d’aide devait aussi rester strictement dans l’espace visible.
- **Modifications effectuees :**
    - Reequilibrage de `components/ui/AppBar.tsx` avec largeurs laterales harmonisees pour les zones d’icones de navigation.
    - Passage des actions d’en-tete en mode icone seule pour garder une lecture plus nette et plus stable.
    - Reduction des textes d’aide et des libelles secondaires pour ne conserver que l’information utile.
    - Limitation explicite de la hauteur de la modale a la hauteur visible de l’ecran avec scroll interne borne.
- **Decisions Techniques :** J’ai prefere une AppBar plus compacte et plus reguliere, meme si cela reduit la quantite de texte exposee directement, car l’ergonomie mobile y gagne en clarte et en stabilite visuelle.
- **Impacts & Dependances :** Fichier touche: `components/ui/AppBar.tsx`. `pnpm run test` passe apres ce resserrage.
- **Prochaines étapes :** Verifier en simulateur que les pages avec plusieurs actions a droite gardent bien la meme impression d’equilibre visuel.

### [2026-05-26T00:09:38Z] | Refonte AppBar et neutralisation du warning notifications
- **Contexte :** L’utilisateur demandait de repenser `components/ui/AppBar.tsx` de zero avec une meilleure ergonomie, tout en supprimant le warning `expo-notifications` observe dans Expo Go.
- **Modifications effectuees :**
    - Recomposition majeure de `components/ui/AppBar.tsx` avec une structure plus lisible: meta-informations centrees, bloc titre plus stable, cartes d’orientation plus symetriques et modale d’aide mieux hierarchisee.
    - Ajout de nouveaux sous-elements UI internes (`MetaPill`, `HelpBullet`) pour clarifier la lecture sans alourdir les ecrans consommateurs.
    - Durcissement de `lib/notifications.ts` avec detection d’Expo Go via `expo-constants` et abandon propre de l’initialisation notifications quand l’environnement ne les supporte pas de maniere fiable.
    - Remplacement des appels directs a `expo-notifications` dans `app/(tabs)/controls/new.tsx` et `app/(tabs)/incidents/new.tsx` par un helper de planification local centralise.
    - Revalidation runtime via `pnpm exec expo start --ios --go --clear --port 8085` pour confirmer la disparition du warning au bundling Expo Go.
- **Decisions Techniques :** J’ai choisi de traiter Expo Go comme un environnement a capacites reduites pour les notifications afin d’eviter les warnings repetitifs et les comportements incoherents. Cote UI, la refonte s’appuie sur une hiérarchie visuelle plus calme et des blocs d’information courts plutot que sur une AppBar monolithique.
- **Impacts & Dependances :** Fichiers touches: `components/ui/AppBar.tsx`, `lib/notifications.ts`, `app/(tabs)/controls/new.tsx`, `app/(tabs)/incidents/new.tsx`. `pnpm run test` passe, et le bundling iOS Expo Go sur `8085` ne remonte plus le warning notifications.
- **Prochaines étapes :** Verifier visuellement sur simulateur le confort de lecture du nouvel en-tete page par page, puis migrer vers un development build si l’on veut reintroduire des tests notifications natifs plus complets.

### [2026-05-25T23:59:58Z] | Finition visuelle de l’accueil
- **Contexte :** Apres la correction de l’en-tete et de la barre basse, l’ecran d’accueil restait en retrait visuellement, surtout sur la carte `Aujourd’hui` et les cartes `Sites du jour`.
- **Modifications effectuees :**
    - Refonte de la carte hero dans `app/(tabs)/index.tsx` avec meilleure hierarchie, deux blocs d’information symetriques et un texte d’accompagnement plus premium.
    - Harmonisation des boutons d’action de l’accueil avec des libelles plus nets et une meilleure respiration.
    - Recomposition des cartes `Sites du jour` avec index visuel, ville separee, statut mieux pose et ligne d’informations basse plus equilibree.
    - Amelioration des cartes `Rapports recents` pour conserver le meme niveau de finition.
- **Decisions Techniques :** J’ai prefere renforcer la structure de l’accueil directement dans l’ecran plutot que de complexifier `Card` globalement, afin de garder un composant de base simple et reutilisable.
- **Impacts & Dependances :** Fichier touche: `app/(tabs)/index.tsx`. Validation effectuee avec `pnpm run test`.
- **Prochaines étapes :** Faire une ultime passe sur `Alertes & Non-conformites` et `Raccourcis` si l’on veut un niveau de polish identique sur tout l’ecran d’accueil.

### [2026-05-25T23:57:43Z] | Reequilibrage visuel AppBar et barre basse
- **Contexte :** La capture montrait deux zones encore desequilibrees: l’en-tete semblait casse entre titre et icones, et la barre basse manquait de symetrie avec des labels trop serres.
- **Modifications effectuees :**
    - Recomposition de `components/ui/AppBar.tsx` avec une colonne titre plus stable et un groupe d’actions compact aligne a droite.
    - Mise en avant plus nette de l’action d’aide dans l’en-tete.
    - Remplacement du texte d’information trop technique par une formulation plus naturelle et orientee utilisateur.
    - Refonte de `components/navigation/WhatsAppTabBar.tsx` avec une vraie structure symetrique, des items uniformes, des labels plus compacts et un bouton central mieux integre.
- **Decisions Techniques :** J’ai privilegie une grille explicite et des largeurs maitrisees plutot qu’un layout auto qui se degrade vite sur petit ecran. Les textes ont ete simplifies pour rester lisibles et non techniques.
- **Impacts & Dependances :** Fichiers touches: `components/ui/AppBar.tsx`, `components/navigation/WhatsAppTabBar.tsx`. `pnpm run test` passe apres la refonte.
- **Prochaines étapes :** Verifier visuellement sur simulateur l’equilibre des zones corrigees en mode clair et sombre, puis ajuster au besoin les espacements du hero de la page d’accueil.

### [2026-05-25T23:49:42Z] | Validation runtime iOS Expo Go et correction des routes layout
- **Contexte :** Le test de lancement iOS devait etre confirme en conditions reelles apres migration SDK 55. Le premier echec venait du mauvais dossier de lancement, puis le runtime a revele des warnings Expo Router sur des noms d’ecrans incorrects dans les layouts.
- **Modifications effectuees :**
    - Validation du demarrage depuis le bon dossier projet `puissance5`.
    - Installation effective de `Expo Go 55.0.34` sur le simulateur iOS pour aligner la version client avec SDK 55.
    - Correction de `app/_layout.tsx` pour cibler `reports/index`.
    - Correction de `app/(tabs)/_layout.tsx` pour cibler `controls/index` et `incidents/index`.
    - Revalidation runtime du bundling iOS pour confirmer la disparition des warnings de routes.
- **Decisions Techniques :** Les noms de routes ont ete corriges au niveau des layouts plutot que contournes dans la navigation personnalisee afin de garder Expo Router comme source unique de verite et d’eviter des incoherences futures.
- **Impacts & Dependances :** Fichiers touches: `app/_layout.tsx`, `app/(tabs)/_layout.tsx`. Le serveur Expo tourne proprement sur le port `8084` avec le simulateur iPhone 17 Pro. Les seuls warnings restants proviennent des limitations connues de `expo-notifications` dans Expo Go.
- **Prochaines étapes :** Si l’on veut tester les notifications de maniere fidele, passer sur un development build iOS plutot que sur Expo Go.

### [2026-05-25T23:21:12Z] | Correction AppBar mobile et migration Expo SDK 55
- **Contexte :** La nouvelle AppBar introduisait une regression mobile visible sur iPhone: les actions se repliaient mal et l’ensemble devenait visuellement fragile. En parallele, le projet devait etre aligne sur Expo SDK 55 sans dette de compatibilite.
- **Modifications effectuees :**
    - Correction de `components/ui/AppBar.tsx` pour forcer des boutons d’action compacts avec largeur explicite en mode icone seule, supprimer le degrade et utiliser des surfaces unies coherentes.
    - Suppression des degradés restants dans `app/(tabs)/index.tsx` et `app/sign-in.tsx`.
    - Migration de `package.json` vers Expo SDK 55 avec React 19.2.0, React Native 0.83.6, Expo Router 55 et dependances Expo compatibles.
    - Nettoyage de `app.json` pour retirer le faux plugin `expo-status-bar` puis ajout du package `expo-font` explicite afin de satisfaire `expo-symbols` et eliminer les doublons detectes par `expo-doctor`.
    - Ajout de `react-native-worklets` requis par `react-native-reanimated` sous SDK 55.
- **Decisions Techniques :** La correction UI a privilegie des couleurs pleines et des dimensions deterministes plutot qu’un layout plus "artistique" mais instable. Pour la migration SDK, les versions ont ete alignees via `expo install` afin de suivre la matrice officielle Expo 55 plutot que des mises a jour manuelles fragiles.
- **Impacts & Dependances :** Fichiers touches: `components/ui/AppBar.tsx`, `app/(tabs)/index.tsx`, `app/sign-in.tsx`, `package.json`, `app.json`, `pnpm-lock.yaml`. Les commandes `pnpm run test` et `npx expo-doctor@latest` passent apres correction.
- **Prochaines étapes :** Revalider visuellement sur simulateur iOS le rendu de l’AppBar, puis relancer un `expo start --ios` si l’on veut confirmer le comportement runtime sous SDK 55.

### [2026-05-25T23:06:03Z] | Refonte AppBar et modale d’accueil de page
- **Contexte :** L’en-tete et la modale d’aide etaient fonctionnels mais encore trop simples pour un rendu premium. Il fallait aussi memoriser la preference "ne plus afficher" de maniere fiable sur le web sans casser les autres plateformes.
- **Modifications effectuees :**
    - Refonte complete de `components/ui/AppBar.tsx` avec meilleure hierarchie visuelle, actions uniformes, adaptation responsive via `useWindowDimensions` et meilleure lisibilite sur mobile/tablette/desktop.
    - Transformation de la modale d’aide en vraie fenetre de presentation de page avec ouverture automatique au premier chargement de la page, fermeture accessible, support `Escape` sur le web et preference persistante par page/utilisateur.
    - Ajout d’une case a cocher visuelle "ne plus afficher automatiquement" avec icone de desactivation claire.
    - Durcissement de `lib/storage.ts` pour tolerer les navigateurs ou contextes ou `localStorage` est indisponible ou protege.
    - Ajout de l’icone `eye-off` dans `components/ui/Icon.tsx`.
- **Decisions Techniques :** La preference d’affichage est stockee par route fonctionnelle et par utilisateur local plutot que par URL brute pour eviter les cles instables ou liees a des IDs dynamiques. Le stockage passe par l’abstraction existante afin de conserver le comportement coherent entre web et mobile.
- **Impacts & Dependances :** Fichiers touches: `components/ui/AppBar.tsx`, `components/ui/Icon.tsx`, `lib/storage.ts`. Tous les ecrans qui utilisent `AppBar` beneficient maintenant du nouveau rendu et du comportement auto-help sans modifications locales.
- **Prochaines étapes :** Verifier en execution web et iOS le focus clavier, la fermeture `Escape`, le rendu en fenetre large et la persistence du choix "ne plus afficher" apres rechargement.

### [2026-05-25T22:58:30Z] | Durcissement RBAC et invariants reducer
- **Contexte :** Le PoC avait deja beneficie d'un gros nettoyage structurel, mais des risques restaient ouverts au niveau des frontieres de confiance: certaines routes client restaient atteignables, et plusieurs invariants metier n'etaient verifies qu'en UI.
- **Modifications effectuees :**
    - Durcissement des acces dans `lib/models.ts` pour bloquer `client` sur `controls`, `incidents` et `planning`, avec refus explicite par defaut sur les routes inconnues.
    - Filtrage des onglets visibles et interception de navigation dans `components/navigation/WhatsAppTabBar.tsx`.
    - Adaptation de `app/(tabs)/index.tsx` pour afficher un accueil oriente rapports quand le role ne doit pas voir les flux operationnels.
    - Verification des droits d'edition dans `app/(tabs)/controls/[id].tsx`.
    - Validation defensive dans `lib/store.tsx` pour les entites upsert, la fenetre horaire, les notes, la notation, les incidents, les patches de certification et la completion d'inspection.
    - Export des normalisateurs utiles depuis `lib/state.ts` et correction du placeholder invalide dans `pnpm-workspace.yaml`.
- **Decisions Techniques :** Les controles critiques ont ete deplaces dans le reducer afin de traiter l'UI comme non fiable. Cette approche ferme les bypass par navigation directe, dispatch manuel ou composant defectueux, tout en conservant l'ergonomie actuelle.
- **Impacts & Dependances :** Fichiers touches: `lib/models.ts`, `lib/store.tsx`, `lib/state.ts`, `components/navigation/WhatsAppTabBar.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/controls/[id].tsx`, `pnpm-workspace.yaml`. Les roles sont maintenant plus coherents entre navigation, UI et mutations de donnees.
- **Prochaines etapes :** Verifier le comportement runtime sur iOS simulateur pour les transitions de role, le menu `Plus`, la completion de controle et les parcours lecture seule client.
