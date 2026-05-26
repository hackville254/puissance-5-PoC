# Checklist De Contrôle Produit

## 1. Authentification Et Accès
- Vérifier que la connexion ouvre la bonne vue selon le rôle.
- Vérifier que les routes privées redirigent vers `sign-in` si aucune session n'est active.
- Vérifier que les rôles `agent`, `controller`, `ops` et `client` ne voient que les actions autorisées.

## 2. Planning Et Contrôles
- Vérifier la création, modification et suppression d'un contrôle.
- Vérifier la cohérence date, heure début, heure fin et durée.
- Vérifier que le type `Qualité` et le type `Avant/Après` affichent les bonnes exigences.
- Vérifier qu'un contrôle passe correctement de `Planifié` à `En cours`, puis `Terminé`.

## 3. Exécution Terrain
- Vérifier que le démarrage d'un contrôle crée bien une inspection.
- Vérifier la checklist complète, y compris les points critiques.
- Vérifier la notation et le commentaire.
- Vérifier l'évaluation nominative.

## 4. Photos Et Caméra
- Vérifier qu'une entrée photo visible existe là où une preuve est attendue.
- Vérifier la demande de permission caméra.
- Vérifier la prise de photo native sur mobile.
- Vérifier le message de fallback sur Web.
- Vérifier la suppression d'une photo.
- Vérifier les compteurs de photos avant, après et incident.
- Vérifier la persistance locale des photos et métadonnées.

## 5. Preuves Et Certifications
- Vérifier la vérification GPS.
- Vérifier la vérification réseau.
- Vérifier le scan QR ou la saisie QR.
- Vérifier la signature locale des preuves photo.
- Vérifier qu'un contrôle ne peut pas être clôturé sans prérequis complets.

## 6. Incidents
- Vérifier la création, édition, changement de statut et suppression.
- Vérifier la prise de photos de preuve dans le détail d'incident.
- Vérifier la lisibilité du statut, de la sévérité, de l'échéance et de l'assignation.

## 7. Sites Et Modèles
- Vérifier les formulaires de site et géofence.
- Vérifier les modèles de checklist et la criticité des critères.
- Vérifier qu'aucun formulaire n'utilise un mauvais type de champ.

## 8. Rapports
- Vérifier qu'un contrôle clôturé apparaît dans les rapports.
- Vérifier la présence des photos et certifications dans le rapport.
- Vérifier export, partage et suppression locale.

## 9. Robustesse
- Vérifier le comportement sans permission caméra.
- Vérifier le comportement sans GPS.
- Vérifier le comportement sans réseau.
- Vérifier le comportement avec stockage local vide ou corrompu.

## 10. Finition UI
- Vérifier la symétrie des sections.
- Vérifier le contraste clair / sombre.
- Vérifier les états vides.
- Vérifier les CTA principaux.
- Vérifier que les fonctionnalités critiques sont visibles sans exploration excessive.
