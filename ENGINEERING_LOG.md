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
