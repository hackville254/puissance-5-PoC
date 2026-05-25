# Application Contrôle Qualité (PoC)

## Contexte
Application mobile interne pour une société de nettoyage : pilotage de la qualité terrain, preuves avant/après, suivi des non-conformités, et génération de rapports partageables aux parties prenantes (client + exploitation + qualité).

## Objectif
Digitaliser le cycle terrain :
- Planification des contrôles
- Vérification sur site
- Prise de preuves certifiées
- Évaluation qualité
- Gestion des non-conformités
- Rapports automatiques
- Suivi client en temps réel
- Historique des états des lieux

## Utilisateurs
- Agents de nettoyage : réalisation, checklists, photos avant/après, validation tâches, anomalies
- Contrôleurs qualité : audits, notes, contrôles inopinés, rapports, validation conformité
- Responsables d’exploitation : planning équipes, KPI, suivi sites, incidents, pilotage temps réel
- Clients : consultation rapports, historique, validation prestations, signalement problèmes

## Modules principaux
### A. Contrôle Qualité Terrain
- Contrôle par checklist, notation par zone, évaluation nominative, contrôle géolocalisé/horodaté, signature, photos
- Résultat : score global, taux conformité, historique par site/agent

### B. Géolocalisation & Certification de présence
- GPS obligatoire, distance site, géofencing, horodatage, détection fraude GPS
- Validation réseau/mobile, scan QR Code sur site, NFC/BLE optionnel
- Sécurité photo : capture en direct, pas d’import galerie, signature cryptographique, GPS+heure

### C. États des lieux Avant / Après
- Photos initiales/finales, checklist état, défauts existants, signature client
- Rapport PDF, comparaison avant/après, IA plus tard

### D. Rapport automatique
- PDF : score, photos, commentaires, anomalies, actions correctives, signature, géoloc
- Envoi : client + responsables
- Historique cloud (plus tard)

### E. Fiches d’évaluation nominatives
- Qualité moyenne, ponctualité, incidents, non-conformités, satisfaction client
- Dashboard RH/exploitation

### F. Gestion des non-conformités
- Workflow : création → attribution → notification → correction → validation → clôture
- Priorités : critique / majeure / mineure

### G. Notifications instantanées
- Push : contrôle échoué, anomalie critique, retard, absent, etc.

### H. Planning de contrôle
- Récurrents, surprise, audits mensuels, tournées inspecteurs
- Smart scheduling plus tard (optim trajets, prédiction)

### I. Checklists dynamiques
- Par type de site : bureau / école / immeuble / milieu sensible

### J. Tableau de bord exploitation
- KPI temps réel, cartographie, incidents géolocalisés

## MVP mobile (V1)
- Auth mock + rôles (agent / contrôleur / exploitation / client) avec vues adaptées
- Planning : création de contrôles (date + heure via pickers), assignation, type, statut
- Contrôle : checklist dynamique, notation, commentaire, certification “présence” (mock)
- Incidents : création + attribution + workflow (ouvert → en cours → clos) + priorité
- Rapports : génération mock, export/partage (UI), suppression locale
- Profil : performance, préférences (thème), déconnexion

## Données minimales (mobile)
- Site : nom, adresse, ville, tags, géofence (lat/lng/rayon)
- Contrôle planifié : site, date, heure début/fin, type, assigné, statut
- Inspection : checklist (par item), score, notes, certifications (GPS/QR/heure/réseau)
- Incident : site, date création, sévérité, statut, titre, description, assignation
- État des lieux : set photos avant/après, checklist état, défauts, signature client (V2)

## Structure écrans (mobile)
- Accueil : sites du jour, tâches, alertes
- Contrôles : démarrer contrôle, checklist, notation
- Photos : avant/après, annotation, preuve GPS
- Rapports : historique, export PDF
- Planning : calendrier, tournées
- Incidents : anomalies, suivi actions
- Profil : performance agent, statistiques

## Architecture PoC (implémentée)
- React Native + Expo + Expo Router
- UI : NativeWind (Tailwind)
- Données : mocks + cache local
  - Web : localStorage
  - Mobile : AsyncStorage
- Pas de base de données dans ce PoC

## Sécurité (règles PoC)
- Aucun secret dans le code ou le stockage local
- Données “preuves certifiées” non implémentées (caméra, signature crypto, anti-import galerie) : uniquement UI/flows
- Pour les futures itérations :
  - Capture caméra uniquement + désactivation import galerie
  - Signature cryptographique des médias + binding GPS/heure
  - Détection anti-fraude GPS + contrôle distance + géofencing
  - RBAC (agent/contrôleur/ops/client), journaux d’audit, anti-replay

## Design system (direction)
- Visuel “dashboard premium” : surfaces blanches, ombres légères, coins arrondis, accent bleu “brand”
- Hiérarchie : titre fort, sous-titres discrets, métadonnées en gris
- Interactions : cartes tappables, chips d’état, CTA primaires clairs

## Optimisation mobile (prioritaire)
- Favoriser des listes virtualisées (FlatList) dès que la volumétrie augmente
- Limiter les re-renders (selectors, useMemo, composants atomiques stables)
- Éviter les effets coûteux partout (ombres lourdes, blur systématique)
- Dégrader proprement offline (mocks + cache local) et supporter les pertes réseau
- Garder des tap targets ≥ 44px et une navigation en 3–5 onglets

## Inspirations (recherche design)
- Dribbble :
  - https://dribbble.com/search/checklist%20app%20design
  - https://dribbble.com/search/inspection%20app
  - https://dribbble.com/search/field%20service%20app
- Pinterest :
  - https://www.pinterest.com/search/pins/?q=inspection%20app%20ui
  - https://www.pinterest.com/search/pins/?q=checklist%20mobile%20app%20ui
  - https://www.pinterest.com/search/pins/?q=dashboard%20mobile%20app%20ui

## Run
```bash
pnpm install
pnpm start -- --clear
```
