### [2026-06-02T15:20:00Z] | Build APK local “rapide” (EAS local + preflight JDK/SDK + Gradle debug optimized)
- **Contexte :** Le build APK local via `eas build --local` échouait sur l’environnement (Java/Android SDK manquants) et la commande n’utilisait pas systématiquement le Node supporté. Objectif: rendre l’obtention d’un APK locale plus rapide et plus actionnable.
- **Modifications effectuees :**
    - Ajout de scripts `pnpm run eas` et `pnpm run apk` pour standardiser les commandes EAS via le wrapper Node.
    - Profil `preview` ajusté pour utiliser `android.gradleCommand=:app:assembleDebugOptimized` afin d’accélérer la génération d’un APK installable.
    - Ajout d’un preflight dans `pnpm run apk` pour échouer tôt avec un message clair si Java (JDK) ou Android SDK ne sont pas installés/configurés.
- **Decisions Techniques :** `assembleDebugOptimized` fournit un binaire installable plus vite que le release classique, adapté aux itérations terrain PoC. Le preflight évite de “perdre” plusieurs minutes de build avant une erreur de tooling.
- **Impacts & Dependances :** Fichiers touches: `package.json`, `eas.json`.
- **Prochaines étapes :** Si besoin, ajouter un script “install” (adb) après build et documenter les prérequis (JDK 17 + Android SDK) dans le runbook interne.

### [2026-06-02T15:35:00Z] | Runbook exécutable pour build Android (android:doctor + scripts cloud/local)
- **Contexte :** Les erreurs “Java runtime introuvable” / “Android SDK introuvable” doivent être diagnostiquées en quelques secondes, sans relire des logs EAS/Gradle.
- **Modifications effectuees :**
    - Ajout de `pnpm run android:doctor` (check Java + Android SDK + commandes de fix).
    - Ajout de `pnpm run apk:local` et `pnpm run apk:cloud` pour choisir explicitement entre build local (rapide si tooling installé) et build cloud (peut être en queue Free Tier).
    - `pnpm run apk` affiche maintenant le diagnostic puis lance le build local.
- **Decisions Techniques :** Séparer cloud/local évite de spammer des builds cloud quand l’objectif est local. Le diagnostic reste lisible et actionnable (commandes directes).
- **Impacts & Dependances :** Fichier touché: `package.json`.
- **Prochaines étapes :** Ajouter une vérification optionnelle `adb` si on veut automatiser l’installation sur device après build.

### [2026-06-02T15:45:00Z] | Switch compte Expo/EAS (unlink projectId pour re-lier proprement)
- **Contexte :** Erreur EAS “Entity not authorized” lors d’un build: le compte connecté n’a pas accès au projet EAS lié via `extra.eas.projectId`.
- **Modifications effectuees :**
    - Suppression de `extra.eas.projectId` dans `app.json` pour permettre un re-link propre via `eas project:init` après connexion sur le bon compte.
- **Decisions Techniques :** Le `projectId` est un lien d’autorisation côté Expo. Tant que l’ID pointe vers un projet non accessible, toute lecture/build échoue. Le retirer permet de recréer/relier le projet sous le compte correct sans ambigüité.
- **Impacts & Dependances :** Fichier touché: `app.json`.
- **Prochaines étapes :** Se connecter avec `eas login`, exécuter `eas project:init`, puis relancer `pnpm run apk:cloud` ou `pnpm run apk:local`.

### [2026-06-02T16:05:00Z] | Déploiement Vercel (Expo web export + rewrite SPA)
- **Contexte :** Déployer la version web sur Vercel. Sans rewrite, les deep links (ex: `/sites`, `/incidents/123`) peuvent retourner 404 après refresh.
- **Modifications effectuees :**
    - Ajout de `vercel.json` avec un fallback de routing SPA (serve d’abord les fichiers statiques, puis renvoie vers `/`).
- **Decisions Techniques :** `handle: filesystem` garantit que les assets exportés (`/_expo/*`, `*.js`, `*.css`, etc.) restent servis correctement avant le fallback.
- **Impacts & Dependances :** Fichier touché: `vercel.json`.
- **Prochaines étapes :** Configurer sur Vercel: Build command `pnpm run vercel-build` et Output directory `dist` (si non détecté).

### [2026-06-02T13:30:00Z] | Preuves checklist (photo+video) + filigrane + PDF complet
- **Contexte :** Besoin de preuves directement au niveau des criteres de checklist (photo et video) et d'un marquage visible (date + "Puissance 5") sur les captures. Les rapports PDF n'incluaient pas encore les photos.
- **Modifications effectuees :**
    - Extension du modele Inspection avec `attachments` pour stocker les preuves par critere (photo/video) + signature locale.
    - Ajout du mode video dans la modale camera (15s max, 480p, mute) et branchement sur la checklist.
    - Ajout d'un rendu avec filigrane (date + "Puissance 5") sur les miniatures dans l'app.
    - Export PDF: ajout des preuves photo (avant/apres + checklist) dans le PDF avec filigrane visible.
    - Amelioration creation checklist: edition du libelle dans la sheet + prevention des doublons.
- **Decisions Techniques :** Video en mode mute pour eviter permissions micro et rester compatible Expo Go. Filigrane rendu dans l'app + dans le PDF (preuve partageable) sans modifier le fichier image brut (signature inchangée). Limites (6 images) pour eviter surconsommation memoire lors du base64/PDF.
- **Impacts & Dependances :** Fichiers touches: `lib/models.ts`, `lib/state.ts`, `lib/store.tsx`, `components/ui/CameraCaptureModal.tsx`, `components/ui/WatermarkedThumbnail.tsx`, `components/ui/Icon.tsx`, `app/(tabs)/controls/[id].tsx`, `app/(tabs)/incidents/[id].tsx`, `app/(tabs)/reports/index.tsx`, `app/templates/new.tsx`.
- **Prochaines étapes :** Ajouter une lecture/preview video in-app (si necessaire) via un composant video, et/ou une conversion "photo filigranee" lors du partage hors PDF si besoin.

### [2026-06-02T13:40:00Z] | Workflow incident: clôture uniquement avec preuve + transitions de statut sûres
- **Contexte :** Un incident ne doit pas pouvoir être clôturé sans preuve, et les transitions de statut doivent rester logiques (éviter des sauts incohérents).
- **Modifications effectuees :**
    - Blocage côté store des transitions non autorisées + interdiction de `clos` sans photo.
    - UI: actions contextuelles selon le statut (ouvert/en cours/clos) et CTA “Clôturer” désactivé sans preuve.
    - Edition: validation avant sauvegarde pour empêcher “clos” sans preuve et transitions invalides.
- **Decisions Techniques :** Défense en profondeur: règles côté reducer (source of truth) + UX explicite côté écrans. Les transitions sont explicites et stables même si un deep link tente une action invalide.
- **Impacts & Dependances :** Fichiers touches: `lib/store.tsx`, `app/(tabs)/incidents/[id].tsx`, `app/(tabs)/incidents/edit/[id].tsx`.
- **Prochaines étapes :** Ajouter éventuellement une règle métier “en cours” obligatoire avant clôture (déjà appliquée via transitions) et un badge “preuve manquante” sur les listes.

### [2026-06-02T14:00:00Z] | Build Android preview en APK (distribution interne)
- **Contexte :** Besoin d’un moyen très rapide de récupérer un APK installable (sans passer par Play Store).
- **Modifications effectuees :** Ajout explicite de `android.buildType=apk` sur le profil `preview` dans `eas.json`.
- **Decisions Techniques :** Forcer le format APK sur le profil “preview” évite les ambiguïtés (AAB vs APK) et facilite l’installation directe sur device/emulator.
- **Impacts & Dependances :** Fichier touché: `eas.json`.
- **Prochaines étapes :** Ajouter un profil `preview-local` si on veut standardiser les builds locaux (pré-requis Android SDK).

### [2026-05-31T00:15:00Z] | Optimisation UI/UX formulaires (mobile, pas de debordement)
- **Contexte :** Sur mobile, certains formulaires pouvaient donner une impression de debordement ou de CTA caches (clavier + tab bar), et certains elements (chips/pickers) pouvaient s'etendre au-dela de l'ecran avec de longs libelles.
- **Modifications effectuees :**
    - Amelioration globale de `Screen` avec `KeyboardAvoidingView`, gestion du clavier (dismiss + taps) et padding bas plus genereux pour eviter que les boutons de fin de formulaire soient masques par la tab bar.
    - Durcissement des composants de formulaire (`TextField`, `SearchField`, `ChoiceCard`, `PickerField`) pour eviter les debordements horizontaux (min-w-0 + ellipsis sur pickers).
    - Securisation de `Chip` pour ne jamais depasser la largeur de l'ecran (maxWidth + ellipsis).
- **Decisions Techniques :** J'ai applique les correctifs au niveau des primitives UI plutot que de corriger ecran par ecran, afin d'ameliorer tous les formulaires de creation/edition avec une seule evolution et une maintenance minimale.
- **Impacts & Dependances :** Fichiers touches: `components/ui/Screen.tsx`, `components/ui/FormControls.tsx`, `components/ui/Chip.tsx`.
- **Prochaines étapes :** Revoir sur un petit device (iPhone SE / Android compact) l'affichage des listes longues (selection site) pour eventuellement introduire une recherche + liste virtualisee si la volumetrie augmente.

### [2026-05-31T00:20:00Z] | Iconographie des formulaires de creation (moins de texte, plus de repères visuels)
- **Contexte :** Les formulaires de creation etaient lisibles mais encore tres textuels. Sur mobile, ajouter des icones aide a scanner rapidement (site, date, assignation, etc.) et reduit la charge cognitive.
- **Modifications effectuees :**
    - Extension de `FormField`, `TextField` et `PickerField` pour supporter des icones (label + icone a gauche / input icon).
    - Application d'icones sur les ecrans de creation: controle, incident, site, modele.
- **Decisions Techniques :** J'ai prefere enrichir les primitives de formulaire plutot que de dupliquer de la mise en page avec icones dans chaque ecran, afin de garder une UI consistante et evolutive.
- **Impacts & Dependances :** Fichiers touches: `components/ui/FormControls.tsx`, `app/(tabs)/controls/new.tsx`, `app/(tabs)/incidents/new.tsx`, `app/sites/new.tsx`, `app/templates/new.tsx`.
- **Prochaines étapes :** Etendre la meme iconographie aux ecrans d'edition (edit) et aux formulaires web si besoin.

### [2026-05-31T00:25:00Z] | Prevention proactive des crashes (layout + Node/Metro)
- **Contexte :** Sur petits ecrans, des choix en grille (ex: severite en 3 colonnes) pouvaient provoquer un rendu degrade (mots coupes verticalement). Cote tooling, l'utilisation de Node 24 provoquait un crash Metro.
- **Modifications effectuees :**
    - Durcissement de `ChoiceCard` (ellipsis) et passage de la severite en liste verticale pour eviter tout debordement sur mobile.
    - Ajout d'un guard Node avant le demarrage (`scripts/check-node.js`) et execution via `prestart`/scripts `ios|android|web` pour bloquer la configuration non supportee avant Metro.
- **Decisions Techniques :** J'ai prefere une prevention en amont (fail fast) plutot qu'un troubleshooting a posteriori. Pour l'UI, le layout vertical privilegie la lisibilite et la tappability sur petits ecrans.
- **Impacts & Dependances :** Fichiers touches: `components/ui/FormControls.tsx`, `app/(tabs)/incidents/new.tsx`, `scripts/check-node.js`, `package.json`.
- **Prochaines étapes :** Ajouter un check similaire cote CI (si present) et documenter le workflow "dev build" pour les features non supportees par Expo Go.

### [2026-05-31T00:35:00Z] | Simplification ergonomique des formulaires de creation
- **Contexte :** Les formulaires de creation etaient riches mais trop longs et "bruyants" sur mobile (liste de sites inline, apercus redondants, actions trop denses sur les criteres).
- **Modifications effectuees :**
    - Remplacement des listes de sites inline par un picker + modal de selection reutilisable (`SitePickerModal`) sur creation controle/incident.
    - Suppression des sections d'aperçu redondantes sur creation controle/incident et simplification du flux (champs essentiels en premier).
    - Simplification de creation site avec options avancees pliables (tags, geofence) pour reduire la longueur par defaut.
    - Simplification de creation modele: liste de criteres tappables + actions dans une bottom sheet (monter/descendre, critique, suppression).
- **Decisions Techniques :** J'ai applique une approche "progressive disclosure" et des interactions mobiles standard (picker/modal, sheet d'actions) pour reduire la charge cognitive et augmenter la vitesse de saisie.
- **Impacts & Dependances :** Fichiers touches: `components/ui/SitePickerModal.tsx`, `app/(tabs)/controls/new.tsx`, `app/(tabs)/incidents/new.tsx`, `app/sites/new.tsx`, `app/templates/new.tsx`.
- **Prochaines étapes :** Appliquer la meme simplification aux ecrans d'edition (edit) et homogeniser les modales de pickers (date/heure) si besoin.

### [2026-06-01T12:45:00Z] | Harmonisation des pickers (date/heure) + ergonomie edition
- **Contexte :** Les pickers date/heure etaient dupliques ecran par ecran (create/edit) et la selection de site dans l'edition du controle etait encore "inline" (liste longue).
- **Modifications effectuees :**
    - Ajout d'un composant reutilisable de picker en bottom sheet (`DateTimePickerSheet`) et remplacement des implementations dupliquees (create/edit controls/incidents).
    - Simplification de l'edition controle: selection de site via modal (meme pattern que creation), suppression d'un apercu redondant, CTA dans le footer.
    - Durcissement UX de l'edition incident: severite/statut en liste verticale et ajout d'iconographie sur les champs.
- **Decisions Techniques :** Centraliser les interactions "date/time" limite les regressions UI et garantit une experience consistente sur iOS/Android. Le passage en listes verticales privilegie la lisibilite et des tap targets fiables sur petit ecran.
- **Impacts & Dependances :** Fichiers touches: `components/ui/DateTimePickerSheet.tsx`, `app/(tabs)/controls/new.tsx`, `app/(tabs)/incidents/new.tsx`, `app/(tabs)/controls/edit/[id].tsx`, `app/(tabs)/incidents/edit/[id].tsx`.
- **Prochaines étapes :** Reutiliser `DateTimePickerSheet` sur d'autres ecrans si des pickers apparaissent (filtres, planning avance).

### [2026-06-01T13:00:00Z] | Segmented controls + sections pliables (create/edit) + engine strict
- **Contexte :** Sur mobile, les choix (type/statut/severite) prenaient trop de place et pouvaient se casser sur petits ecrans. Certains champs optionnels (echeance) encombraient le flux principal. Cote dev, Node non supporte pouvait generer des erreurs Metro difficiles a diagnostiquer.
- **Modifications effectuees :**
    - Ajout de `SegmentedControl` et remplacement des blocs de cartes (type/statut/severite) par des controles compacts et robustes (create/edit).
    - Ajout de `DisclosureSection` et passage des champs optionnels (echeance) en sections pliables (progressive disclosure).
    - Maintien d'un guard Node "fail-fast" avant demarrage (via `prestart`) pour eviter les crashes Metro, sans bloquer les workflows de lint/typecheck.
- **Decisions Techniques :** Les segmented controls reduisent la longueur des formulaires tout en gardant des tap targets fiables. Les sections pliables diminuent la charge cognitive en gardant le "happy path" court. Le fail-fast sur Node evite des crashes Metro tardifs.
- **Impacts & Dependances :** Fichiers touches: `components/ui/SegmentedControl.tsx`, `components/ui/DisclosureSection.tsx`, `app/(tabs)/controls/new.tsx`, `app/(tabs)/incidents/new.tsx`, `app/templates/new.tsx`, `app/(tabs)/controls/edit/[id].tsx`, `app/(tabs)/incidents/edit/[id].tsx`.
- **Prochaines étapes :** Uniformiser l'usage des segmented controls sur les ecrans restants (si de nouveaux workflows ajoutent des choix similaires).

### [2026-06-01T13:10:00Z] | Demarrage plus robuste (pin Node multi-outils)
- **Contexte :** `pnpm start` etait bloque correctement sur Node non supporte, mais le message n'etait pas assez actionnable. Objectif: eviter du temps perdu et faciliter le bon setup.
- **Modifications effectuees :**
    - Amelioration du guard Node: detection de la version pinnee (`.nvmrc`/`.node-version`) et instructions nvm/fnm/volta.
    - Ajout d'un pin optionnel Volta (`package.json`) + `.tool-versions` (asdf) pour un auto-switch plus fluide selon l'outillage du dev.
- **Decisions Techniques :** On garde le fail-fast (evite les crashes Metro tardifs) tout en rendant la remediation immediate. Volta/asdf n'introduisent pas de dependance runtime: ce sont des hints de setup.
- **Impacts & Dependances :** Fichiers touches: `scripts/check-node.js`, `package.json`, `.tool-versions`.
- **Prochaines étapes :** Envisager une doc courte "setup dev" si l'equipe change souvent de machine (sinon les pins suffisent).

### [2026-06-01T13:15:00Z] | `pnpm start` auto-switch (fnm) et scripts coherents
- **Contexte :** `pnpm start` etait robuste mais exigeait une action manuelle (switch Node) avant de lancer Expo. Objectif: rendre le workflow "just works" des qu'un gestionnaire (fnm) est installe.
- **Modifications effectuees :**
    - Ajout de `scripts/with-node.sh` qui tente un auto-switch vers la version pinnee via `fnm` (si present), puis execute la commande demandee.
    - Branchement de `start/ios/android/web/test` sur `scripts/with-node.sh` pour eviter les differences de runtime Node entre commandes.
- **Decisions Techniques :** On garde le fail-fast (pas d'execution Metro sur Node non supporte), mais on reduit la friction en automatisant le switch lorsque c'est possible.
- **Impacts & Dependances :** Fichiers touches: `scripts/with-node.sh`, `package.json`.
- **Prochaines étapes :** Optionnel: ajouter une note courte "setup dev" dans un README si l'equipe n'utilise pas tous `fnm/volta/asdf`.

### [2026-05-31T00:05:00Z] | Popup d onboarding role a la connexion
- **Contexte :** La separation par role etait en place, mais l'utilisateur n'avait pas d'explication claire au moment de la connexion sur ce que son role lui permet de faire et quelles sections sont disponibles.
- **Modifications effectuees :**
    - Ajout d'une popup modale apres `sign-in` qui explique le role, ses responsabilites et les limitations principales.
    - Boutons pour fermer ou acceder directement a la route par defaut du role.
- **Decisions Techniques :** J'ai declenche l'onboarding au niveau root sur changement de token de session (1 fois par connexion) afin qu'il fonctionne quel que soit l'ecran de demarrage (ex: Client -> Rapports) et sans persister d'etat supplementaire dans le store.
- **Impacts & Dependances :** Fichier touche: `app/_layout.tsx`. Aucun impact sur les regles d'acces, uniquement une couche UX.
- **Prochaines étapes :** Ajouter une preference "ne plus afficher" par utilisateur/role si on souhaite reduire la friction sur les connexions frequentes.

### [2026-05-31T00:10:00Z] | Robustesse camera + notifications (features utilisables)
- **Contexte :** Certaines fonctionnalites pouvaient paraitre "cassees" selon le contexte (permissions camera bloquees, ou notifications desactivees dans Expo Go).
- **Modifications effectuees :**
    - Amelioration de l'ecran permission camera: gestion de l'etat "permissions en chargement" et du cas "refus definitif" avec redirection vers les reglages.
    - Masquage du CTA "Voir les rapports" dans le detail controle si le role n'a pas acces aux rapports (evite une navigation qui redirige).
    - Activation des notifications locales egalement dans Expo Go (fallback reste desactive sur Web).
- **Decisions Techniques :** J'ai privilegie une UX defensive (guidage vers reglages) et la coherance RBAC (ne pas afficher d'actions inaccessibles) pour garantir que les fonctionnalites presentes fonctionnent ou degradent proprement.
- **Impacts & Dependances :** Fichiers touches: `components/ui/CameraCaptureModal.tsx`, `app/(tabs)/controls/[id].tsx`, `lib/notifications.ts`.
- **Prochaines étapes :** Tester sur device physique iOS/Android (camera + QR + notifications) car les emulateurs et le Web ne representent pas ces capteurs.

### [2026-05-31T00:00:00Z] | Separation claire des interfaces par role (RBAC navigation)
- **Contexte :** La navigation ne separait pas assez clairement les interfaces par role: le role Client pouvait encore atteindre l'accueil, et l'acces aux ecrans `Sites` n'etait pas aligne avec les capacites (risque d'ecrans visibles sans droits effectifs).
- **Modifications effectuees :**
    - Migration de l'ecran `Rapports` dans le groupe `(tabs)` afin d'en faire une destination native de l'interface (et plus un modal root).
    - Ajout de l'onglet `Rapports` dans la tab bar, avec filtrage automatique selon `canAccessPathname`.
    - Durcissement de `canAccessPathname` : blocage explicite de `home` pour le role `client` et alignement de `sites` sur `manage_sites` (ops uniquement).
    - Correction de l'entree "Administration" du profil pour pointer vers `Sites` (ops) ou `Listes de controle` (controller) selon les droits.
- **Decisions Techniques :** J'ai choisi de rendre les limites de navigation coherentes avec les capacites (`canPerform`) et de structurer `Rapports` comme un ecran de premier niveau, afin que chaque role voie une interface restreinte et logique sans dependance a un "modal" generique.
- **Impacts & Dependances :** Fichiers touches: `lib/models.ts`, `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/reports/index.tsx`, `app/(tabs)/profile.tsx`, `components/navigation/WhatsAppTabBar.tsx`. Effet de bord volontaire: le role `client` ne peut plus naviguer vers `/` (Accueil) et est oriente vers `/reports`.
- **Prochaines étapes :** Si besoin, decliner des ecrans d'accueil differencies par role (ex: "Espace client") et supprimer les actions redondantes (ex: raccourci `Rapports` dans le menu +) quand l'onglet est deja visible.

### [2026-05-30T22:57:13Z] | Stabilisation EAS Android Play Store
- **Contexte :** Le build Android EAS pour publication Play Store echouait tres tot pendant `Install dependencies`, ce qui bloquait toute generation de binaire `.aab` malgre un projet qui passait localement.
- **Modifications effectuees :**
    - Identification de la cause exacte via les logs EAS: `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` sur la configuration `overrides`.
    - Ajout de `packageManager: pnpm@10.28.2` dans `package.json` pour aligner le projet avec la version `pnpm` de l'image EAS SDK 55.
    - Durcissement de `eas.json` avec `node: 20.19.4` et `android.image: sdk-55` sur le profil `production` pour obtenir un environnement de build deterministe.
- **Decisions Techniques :** J'ai prefere figer explicitement l'environnement Node/pnpm plutot que de contourner `--frozen-lockfile`. Cette approche conserve les garanties d'integrite du lockfile, evite les derives entre local et cloud et reduit le risque de regressions non reproductibles.
- **Impacts & Dependances :** Fichiers touches: `package.json`, `eas.json`. Le lockfile doit etre regenere avec la configuration actuelle avant de relancer EAS Build. Aucun secret n'est ajoute au depot et la chaine de signature Android reste geree par Expo.
- **Prochaines étapes :** Resynchroniser `pnpm-lock.yaml`, verifier localement `pnpm install --frozen-lockfile`, puis relancer un build EAS Android `production` jusqu'a obtention d'un `.aab` publiable.

### [2026-05-26T16:18:46Z] | Generation de mocks jusqu a fin juin
- **Contexte :** Les mocks de planning etaient limites a trois controles autour de la date courante, ce qui faisait vite paraitre l'application vide et obsolete. Tu as demande une base de mocks qui reste alimentee jusqu'en juin.
- **Modifications effectuees :**
    - Remplacement des mocks statiques dans `lib/mocks.ts` par une generation dynamique de controles du jour courant jusqu'au 30 juin.
    - Ajout d'une logique de fin de periode qui cible juin de l'annee courante, ou juin de l'annee suivante si l'on est deja apres juin.
    - Generation d'incidents de demonstration repartis sur la meme periode avec severites, statuts et echeances variees.
- **Decisions Techniques :** J'ai choisi une generation algorithmique plutot qu'une longue liste manuelle. Cela garde l'application alimentee sans entretien fichier par fichier, reduit la dette et permet de conserver des donnees credibles sur plusieurs semaines.
- **Impacts & Dependances :** Fichier touche: `lib/mocks.ts`. Les ecrans `Accueil`, `Controles`, `Planning` et `Incidents` affichent maintenant une volumetrie plus realiste jusqu'a fin juin.
- **Prochaines étapes :** Si tu veux aller plus loin, on peut aussi generer quelques inspections terminees et rapports deja clotures pour enrichir davantage la demo produit.

### [2026-05-26T08:08:31Z] | Rendre les preuves photo visibles et exploitables
- **Contexte :** Le projet affichait une promesse produit autour des photos et de la camera, mais le parcours etait incomplet: la capture etait peu visible dans les controles, et les incidents n'avaient aucun flux photo exploitable alors qu'un bloc de placeholder etait encore present.
- **Modifications effectuees :**
    - Ajout d'une checklist produit de controle dans `PRODUCT_CONTROL_CHECKLIST.md`.
    - Ajout d'un composant mutualise `components/ui/CameraCaptureModal.tsx` pour la capture photo et le scan QR.
    - Ajout des helpers de preuves `lib/evidence.ts` pour signer les captures et relire le contexte terrain.
    - Rendre le detail de controle beaucoup plus explicite sur l'obligation photo et offrir un demarrage direct vers la camera.
    - Ajout des preuves photo sur les incidents avec stockage, affichage, suppression et indication de signature.
    - Extension du modele et du store pour prendre en charge `incident.photos`.
- **Decisions Techniques :** J'ai mutualise la capture et la signature plutot que de dupliquer un second flux camera. Cela reduit la dette technique, unifie les comportements de permission et prepare la future extension vers d'autres preuves terrain.
- **Impacts & Dependances :** Fichiers touches: `app/(tabs)/controls/[id].tsx`, `app/(tabs)/controls/index.tsx`, `app/(tabs)/incidents/[id].tsx`, `app/(tabs)/incidents/index.tsx`, `components/ui/CameraCaptureModal.tsx`, `components/ui/Icon.tsx`, `lib/evidence.ts`, `lib/models.ts`, `lib/state.ts`, `lib/store.tsx`, `lib/mocks.ts`, `PRODUCT_CONTROL_CHECKLIST.md`. Le schema des incidents stocke maintenant aussi des photos.
- **Prochaines étapes :** Brancher de vrais apercus plein ecran, gerer des lots de photos, relier les preuves incident aux actions correctives, puis ajouter des tests E2E mobiles pour les permissions et la capture.

### [2026-05-26T07:47:55Z] | Fond blanc explicite pour l authentification
- **Contexte :** L'ecran d'authentification utilisait encore le fond clair par defaut de `Screen` (`slate-50`), ce qui donnait une teinte grisee au lieu d'un fond blanc net attendu.
- **Modifications effectuees :**
    - Forcage du fond clair a `bg-white` dans `app/sign-in.tsx` tout en conservant `dark:bg-slate-950` en mode sombre.
- **Decisions Techniques :** J'ai choisi un override local sur l'ecran d'auth plutot qu'un changement global de `Screen` pour ne pas modifier involontairement le rendu des autres ecrans qui utilisent encore le fond standard de l'application.
- **Impacts & Dependances :** Fichier touche: `app/sign-in.tsx`. Aucun impact logique, uniquement une correction visuelle du fond de page.
- **Prochaines étapes :** Si tu veux une base blanche sur davantage d'ecrans, il faudra definir une convention explicite par famille d'ecrans plutot que d'appliquer un changement global.

### [2026-05-26T06:42:39Z] | Normalisation des formulaires creation et gestion
- **Contexte :** Les ecrans de creation et d'edition utilisaient des champs heterogenes: `TextInput` bruts, choix presentes comme cartes ou chips selon l'ecran, sections desequilibrees et semantics de champs peu claires entre saisie libre, selection unique et pickers.
- **Modifications effectuees :**
    - Creation de `components/ui/FormControls.tsx` avec des briques communes: `FormField`, `TextField`, `SearchField`, `PickerField`, `ChoiceCard`, `ChoiceBadge`.
    - Refonte des formulaires `controls/new`, `controls/edit/[id]`, `incidents/new`, `incidents/edit/[id]`, `sites/new`, `templates/new`, `templates/[id]` pour utiliser une structure plus symetrique.
    - Clarification des types d'entree: recherche de site comme recherche + liste de selection, dates/heures comme pickers ou champs contraints, severites/statuts/types comme choix uniques explicites, champs texte libres reserves aux vrais contenus textuels.
- **Decisions Techniques :** J'ai centralise les primitives de formulaire plutot que de corriger chaque ecran independamment. Cela reduit les divergences futures, stabilise les etats selectionnes et rend plus simple l'introduction ulterieure de vrais selecteurs ou combobox si necessaire.
- **Impacts & Dependances :** Fichiers touches: `components/ui/FormControls.tsx`, `app/(tabs)/controls/new.tsx`, `app/(tabs)/controls/edit/[id].tsx`, `app/(tabs)/incidents/new.tsx`, `app/(tabs)/incidents/edit/[id].tsx`, `app/sites/new.tsx`, `app/templates/new.tsx`, `app/templates/[id].tsx`. Les donnees et workflows restent identiques, la presentation et la semantique des champs sont harmonisees.
- **Prochaines étapes :** Etendre la meme logique aux filtres de listes (`planning`, `controls`, `incidents`) et aux ecrans de detail/edition restants pour obtenir un systeme de formulaires integralement coherent.

### [2026-05-26T06:22:14Z] | Rationalisation finale de la popup du menu bas
- **Contexte :** La popup du menu bas restait encore un peu verbeuse avec un en-tete et des controles redondants alors que l'interaction attendue est un acces direct a des raccourcis.
- **Modifications effectuees :**
    - Suppression du titre et du bouton de fermeture dedies dans `components/navigation/WhatsAppTabBar.tsx`.
    - Recomposition de la popup sous forme de grille de raccourcis plus compacte et plus lisible.
    - Simplification des cartes d'action avec un centrage propre, un contraste stable et moins de decoration.
- **Decisions Techniques :** J'ai garde uniquement les elements utiles a l'action. La fermeture reste naturellement assuree par le clic hors popup et par la selection d'un raccourci, ce qui reduit le bruit visuel sans perdre en utilisabilite.
- **Impacts & Dependances :** Fichier touche: `components/navigation/WhatsAppTabBar.tsx`. Aucun impact sur la navigation ou les droits, uniquement sur la presentation de la popup.
- **Prochaines étapes :** Verifier sur petits ecrans si la grille de raccourcis merite une seconde ligne mieux equilibree selon le nombre d'actions visibles par role.

### [2026-05-26T06:14:50Z] | Uniformisation des modales et de l'ecran de connexion
- **Contexte :** Apres la simplification du header et de la navigation basse, la modal d'actions, la modal d'aide et l'ecran de connexion conservaient encore une presentation trop particuliere par rapport au reste de l'application.
- **Modifications effectuees :**
    - Harmonisation de `app/sign-in.tsx` avec le fond standard de `Screen` et une carte de connexion centrale plus sobre.
    - Simplification de la modal du bouton `Plus` dans `components/navigation/WhatsAppTabBar.tsx` avec une poignee, un titre plus direct et des lignes d'action plus legeres.
    - Allégement de la modal d'aide dans `components/ui/AppBar.tsx` en supprimant les blocs secondaires non essentiels et en resserrant la presentation.
- **Decisions Techniques :** J'ai choisi de rapprocher la connexion et les modales des composants de base deja utilises dans l'application pour reduire les ecarts visuels et limiter le cout de maintenance UI.
- **Impacts & Dependances :** Fichiers touches: `app/sign-in.tsx`, `components/navigation/WhatsAppTabBar.tsx`, `components/ui/AppBar.tsx`. Les parcours restent identiques, seule la presentation evolue.
- **Prochaines étapes :** Faire une passe visuelle sur mobile et web pour ajuster au besoin les espacements verticaux selon la hauteur d'ecran et verifier le confort d'usage clavier.

### [2026-05-26T06:12:49Z] | Simplification AppBar, recentrage tab bar et correction des etats selectionnes
- **Contexte :** L'entete etait trop charge visuellement, la barre de navigation basse manquait d'equilibre, et plusieurs cartes selectionnees perdaient leur lisibilite en theme clair car le style par defaut pouvait reprendre la main sur le fond selectionne.
- **Modifications effectuees :**
    - Simplification de `components/ui/AppBar.tsx` pour ne garder qu'une structure claire: action gauche, titre, sous-titre et actions a droite.
    - Recentrage de `components/navigation/WhatsAppTabBar.tsx` en supprimant le bouton central decale et en harmonisant l'alignement de tous les items.
    - Correction de `components/ui/Card.tsx` pour desactiver les fonds et bordures par defaut lorsqu'un composant appelant fournit deja ses propres classes `bg-*` ou `border-*`.
- **Decisions Techniques :** J'ai corrige le probleme de lisibilite a la source dans `Card` plutot que de multiplier des correctifs ecran par ecran. Cette approche stabilise tous les etats selectionnes existants et futurs sans alourdir les ecrans.
- **Impacts & Dependances :** Fichiers touches: `components/ui/AppBar.tsx`, `components/navigation/WhatsAppTabBar.tsx`, `components/ui/Card.tsx`. Les interactions restent identiques, mais la presentation est plus simple et les cartes actives deviennent lisibles en clair comme en sombre.
- **Prochaines étapes :** Verifier visuellement sur mobile les espacements de la tab bar et faire une passe UX sur les autres composants selectionnables si de nouveaux cas de contraste apparaissent.

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
