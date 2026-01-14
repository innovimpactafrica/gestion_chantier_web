# 🚀 Guide de test - Dashboard refonte

## ✅ Tests de compilation

### 1. Vérifier que le projet compile sans erreur
```bash
ng build
```
**Résultat attendu :** Aucune erreur, uniquement des warnings mineurs

---

## 🧪 Tests visuels

### 2. Lancer l'application en local
```bash
npm start
# ou
ng serve
```
**URL :** http://localhost:4200

### 3. Naviguer vers le dashboard
1. Se connecter à l'application
2. Accéder au menu "Tableau de bord" / "Dashboard"
3. Attendre le chargement des données

---

## 📊 Points de contrôle visuel

### ✓ Ligne 1 - Vue d'ensemble
**[✓] Vue d'ensemble des chantiers**
- [ ] Card affiche 4 valeurs : En cours, En retard, En attente, Terminées
- [ ] Toutes les valeurs sont visibles
- [ ] Hauteur identique aux autres cards de la ligne
- [ ] Icône ⚙️ présente en haut-droit

**[✓] Vue d'ensemble des études**
- [ ] Card affiche 4 valeurs : En ensemble, En cours, Terminées, Livrées
- [ ] Même hauteur que la card précédente
- [ ] Icône 📚 présente en haut-droit

**[✓] Répartition des études (%) [NOUVEAU]**
- [ ] Card affiche un donut chart
- [ ] Légende avec 4 items colorés : Complétées, En cours, Initiées, Non initiées
- [ ] Les pourcentages s'affichent : 40%, 35%, 15%, 10%
- [ ] Légende bien lisible en bas de la card

### ✓ Ligne 2 - Indicateurs clés
**[✓] Taux moyen d'avancement**
- [ ] Affiche une jauge arc orange
- [ ] Pourcentage centré (ex: "60%")
- [ ] Label "Taux moyen" sous le pourcentage
- [ ] Hauteur : `h-96` identique aux autres

**[✓] Budget global**
- [ ] Donut chart orange/gris visible
- [ ] Pourcentage au centre (ex: "70%")
- [ ] Légende avec 2 items : Consommé, Restant
- [ ] Montants affichés au format FCFA

**[✓] Alertes stock matériaux**
- [ ] Liste scrollable affichant les matériaux
- [ ] Chaque alerte affiche : nom, quantité/seuil, barre de progression
- [ ] Couleurs correctes : Orange (Faible), Vert (Normal), Rouge (Critique)
- [ ] Scroll interne lisse sans débordement

### ✓ Ligne 3 - Graphiques
**[✓] État d'avancement**
- [ ] Affiche un bar chart coloré
- [ ] Labels des phases lisibles en bas
- [ ] Toutes les barres visibles (ne pas scroller)
- [ ] Hauteur : `h-56`

**[✓] Incidents signalés (7 jours)**
- [ ] Affiche un line chart orange fluide
- [ ] Points nets visibles sur la courbe
- [ ] Pas de "plis" ou déformations dans la courbe
- [ ] Axes et grille visibles
- [ ] Légèrement plus large que la card État d'avancement

### ✓ Ligne 4 - Suivi & Performance
**[✓] Tâches critiques à échéance**
- [ ] Liste scrollable affichant les tâches
- [ ] Chaque tâche affiche : nom, date d'échéance, statut en badge
- [ ] Couleurs des statuts correctes : Orange (Urgent), Rouge (En retard), Vert (À jour)
- [ ] Affichage compact sans débordement

**[✓] Photos récentes**
- [ ] Grille 3x2 propre
- [ ] Chaque photo affiche un badge en bas-gauche : [Nom chantier] [Date]
- [ ] Hover zoom smooth sur les photos
- [ ] Icône loupe au hover
- [ ] Modal s'ouvre au clic sur une photo
  - [ ] Image agrandie
  - [ ] Bouton fermer en haut-droit
  - [ ] Navigation flèches si plusieurs images
  - [ ] Bouton Escape ferme le modal

**[✓] Résumé des performances**
- [ ] Grille 2x3 (6 métriques)
- [ ] Chaque métrique affiche : label petit + valeur grande
- [ ] Tous les 6 éléments visibles sans scroll
- [ ] Couleurs des background : gris clair

---

## 🎯 Tests d'alignement & spacing

**[✓] Alignement horizontal**
- [ ] Ligne 1 : 3 cards parfaitement alignées
- [ ] Ligne 2 : 3 cards parfaitement alignées
- [ ] Ligne 3 : État (1 col) + Incidents (2 cols) correctement proportionnées
- [ ] Ligne 4 : 3 cards parfaitement alignées

**[✓] Alignment vertical**
- [ ] Titres de toutes les cards sur la même ligne
- [ ] Icons de toutes les cards sur la même ligne
- [ ] Espacement haut/bas égal dans chaque card

**[✓] Spacing**
- [ ] Gap entre cards : 24px identique partout
- [ ] Padding interne des cards : 24px identique
- [ ] Padding du container : 24px égal

---

## 🌈 Tests de couleurs

| Élément | Couleur attendue | Couleur Code |
|---------|------------------|--------------|
| Donut Complétées | Vert | #10B981 |
| Donut En cours | Orange | #FB923C |
| Donut Initiées | Bleu | #3B82F6 |
| Donut Non initiées | Rouge | #EF4444 |
| Jauge avancement | Orange | #FF6B35 |
| Line chart incidents | Orange | #FF6B35 |
| Badge Urgent | Orange | bg-orange-100, text-orange-700 |
| Badge Critique | Rouge | bg-red-100, text-red-700 |
| Badge Normal | Vert | bg-green-100, text-green-700 |
| Background container | Gris clair | bg-gray-50 |
| Cards | Blanc | bg-white |

---

## 📱 Tests responsifs

**[✓] Desktop (1920px)**
- [ ] Tout s'affiche correctement
- [ ] Aucun débordement horizontal
- [ ] Spacing optimal

**[✓] Laptop (1440px)**
- [ ] Grille 3 colonnes respectée
- [ ] Cards lisibles
- [ ] Pas de texte tronqué

**[✓] Tablet (1024px)**
- [ ] Adapt gracefully (si media queries implémentées)
- [ ] Photos visibles
- [ ] Légendes lisibles

**[✓] Mobile (375px)**
- [ ] Bascule à 1 colonne (si media queries)
- [ ] Scroll vertical fluide
- [ ] Buttons cliquables

---

## 🔄 Tests d'interaction

**[✓] Modal photos**
- [ ] Clic sur une photo ouvre le modal
- [ ] Photographie agrandie et lisible
- [ ] Bouton X ferme le modal
- [ ] Clic en dehors du modal le ferme
- [ ] Touche Escape ferme le modal
- [ ] Flèches navigation fonctionnent si plusieurs images

**[✓] Scrolls**
- [ ] Alertes stock : scroll interne sans débordement
- [ ] Tâches critiques : scroll interne sans débordement
- [ ] Page principale : scroll vertical global
- [ ] Scrollbars : custom stylisées (gris clair)

**[✓] Charts**
- [ ] Tous les charts se chargent
- [ ] Hover sur line chart affiche tooltip
- [ ] Hover sur donut affiche pourcentage
- [ ] Animations fluides au chargement

---

## 🐛 Tests de débogage

### Vérifier la console browser
```javascript
// Dans la console, vérifier :
console.log(dashboardData)  // Vérifier les données
console.log(performances)   // Vérifier les performancesèces
```

### Tests des données
- [ ] Chantiers : valeurs correctes et non vides
- [ ] Études : valeurs mockées (28 total)
- [ ] Budget : pourcentage consommé = 70%
- [ ] Alertes : au moins 1 alerte visible
- [ ] Tâches : au moins 1 tâche visible
- [ ] Photos : au moins 6 photos visibles
- [ ] Incidents : courbe affichée

---

## 📋 Checklist finale

- [ ] Compilation sans erreur
- [ ] Dashboard s'affiche sans erreur
- [ ] Toutes les 4 lignes visibles
- [ ] Tous les cards de hauteur uniforme par ligne
- [ ] Alignement parfait
- [ ] Couleurs conformes Figma
- [ ] Spacing uniforme
- [ ] Charts chargés correctement
- [ ] Interactions fonctionnelles
- [ ] Modal photos fonctionne
- [ ] Responsive OK (desktop)
- [ ] Aucun texte tronqué
- [ ] Scrollbars custom visibles

---

## ✅ Signature de validation

**Testeur :** ________________  
**Date :** ________________  
**Résultat :** ✅ VALIDÉ / ❌ À CORRIGER  
**Remarques :** ________________________________

---

## 📞 En cas de problème

1. **Chart ne s'affiche pas** → Vérifier que Canvas est présent dans le DOM
2. **Données manquantes** → Vérifier que le backend retourne les données
3. **Alignement incorrect** → Vérifier les classes Tailwind (grid-cols-3, h-96, etc.)
4. **Scrollbar non visible** → Vérifier le CSS custom scrollbar
5. **Erreur compilation** → Relancer `ng serve`

---

**Refonte validée le :** ✅ 2026-01-14
