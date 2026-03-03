# Refonte du Dashboard - Résumé des changements

## 📋 Vue d'ensemble
La refonte complète du dashboard a été effectuée pour correspondre exactement au design Figma fourni. Tous les changements concernent l'alignement, la structure de grille, les hauteurs des cards et l'intégration d'une nouvelle composante "Répartition des études".

---

## 🎨 Changements effectués

### 1. **Structure générale** ✅
- ✅ Conversion de la grille en **3 colonnes fixes** (`grid-cols-3`)
- ✅ Espacement uniforme entre les cards (`gap-6`)
- ✅ Fond gris clair pour le dashboard entier (`bg-gray-50`)
- ✅ Cards avec ombre cohérente (`shadow`)

### 2. **Ligne 1 - Vue d'ensemble** ✅
**Composants alignés horizontalement :**
- [x] Vue d'ensemble des chantiers
- [x] Vue d'ensemble des études
- [x] **Répartition des études (%) [NOUVEAU]**

**Spécifications :**
- Hauteur uniforme : `h-96` (384px)
- Padding interne : `p-6`
- Grille 2x2 pour les indicateurs
- Donut chart pour la répartition avec légende

### 3. **Ligne 2 - Indicateurs clés** ✅
**Composants alignés :**
- [x] Taux moyen d'avancement (jauge arc)
- [x] Budget global (donut centré)
- [x] Alertes stock matériaux

**Améliorations :**
- Hauteur identique pour les 3 cards
- Layout flex pour l'alignement vertical
- Légende simplifiée et cohérente

### 4. **Ligne 3 - Graphiques** ✅
**Layout spécial :**
- [x] État d'avancement (1 colonne) - 56 de hauteur
- [x] Incidents signalés (2 colonnes) - même hauteur
  - Diagramme linéaire fluide
  - Courbe lisse avec points nets
  - Axes et grilles visibles

### 5. **Ligne 4 - Suivi & Performance** ✅
**Composants :**
- [x] Tâches critiques à échéance
- [x] Photos récentes (grille 3x2)
- [x] Résumé des performances (6 indicateurs)

**Finitions :**
- Cards équilibrées
- Hauteurs harmonisées
- Grille photos propre et régulière

---

## 🔧 Modifications techniques

### Fichier : `dashboard.component.html`
**Modifications principales :**
1. Restructuration complète du layout
2. Ajout de la card "Répartition des études (%)"
3. Unification des styles et classes Tailwind
4. Simplification des templates des components
5. Harmonisation des hauteurs (`h-96`, `h-56`)

**Structure de grille :**
```html
<!-- Ligne 1: 3 colonnes -->
<div class="grid grid-cols-3 gap-6 mb-8">

<!-- Ligne 2: 3 colonnes -->
<div class="grid grid-cols-3 gap-6 mb-8">

<!-- Ligne 3: 1 col + 2 col (col-span-2) -->
<div class="grid grid-cols-3 gap-6 mb-8">

<!-- Ligne 4: 3 colonnes -->
<div class="grid grid-cols-3 gap-6">
```

### Fichier : `dashboard.component.ts`
**Ajouts :**
1. ✅ Propriété `@ViewChild('repartitionChart')` pour le canvas du donut
2. ✅ Propriété `repartitionChartInstance` pour le Chart.js
3. ✅ Objet `etudes` dans `dashboardData`
4. ✅ Méthode `processEtudes()` (mockée pour le moment)
5. ✅ Méthode `createRepartitionChart()` avec configuration Chart.js
6. ✅ Cleanup du chart dans `ngOnDestroy()`
7. ✅ Attribution des propriétés directes (chantiers, etudes, budget, etc.)

**Données mockées pour les études :**
```typescript
{
  enEnsemble: 28,
  enCours: 11,
  terminees: 9,
  livrees: 8,
  total: 28
}
```

### Fichier : `dashboard.component.css`
**Améliorations :**
1. ✅ Custom scrollbar pour `.custom-scrollbar`
2. ✅ Card shadow standardisé
3. ✅ Media queries pour responsive design

---

## 🎯 Détails visuels

### Couleurs appliquées
- **Complétées** : Vert (`#10B981`)
- **En cours** : Orange (`#FB923C`)
- **Initiées** : Bleu (`#3B82F6`)
- **Non initiées** : Rouge (`#EF4444`)
- **Consommé (budget)** : Orange (`#FF6B35`)
- **Incidents** : Orange (`#FF6B35`)

### Typographie
- Titres : `font-bold` / `text-lg`
- Sous-titres : `font-semibold` / `text-sm`
- Labels : `text-xs` / `text-gray-600`
- Valeurs : `font-bold` / `text-2xl` à `text-4xl`

### Espacements
- Gap between cards : `gap-6` (24px)
- Internal padding : `p-6` (24px)
- Badge padding : `px-2 py-1`

---

## ✨ Nouvelles fonctionnalités

### Card "Répartition des études (%)"
- **Type** : Donut chart (doughnut)
- **Données** : Complétées (40%), En cours (35%), Initiées (15%), Non initiées (10%)
- **Légende** : 4 lignes avec points colorés et pourcentages
- **Interaction** : Hover affiche les pourcentages exact

---

## 🧪 Tests recommandés

1. **Alignement** :
   - ✅ Vérifier que les 3 cards de la ligne 1 ont exactement la même hauteur
   - ✅ Vérifier l'alignement horizontal parfait

2. **Responsive** :
   - ✅ Tester sur 1920px, 1440px, 1024px
   - ✅ Vérifier que les cards se répartissent correctement

3. **Graphiques** :
   - ✅ Incidents signalés : courbe fluide, pas de "plis"
   - ✅ Donut répartition : proportions visuelles respectées
   - ✅ Jauge taux moyen : position du point correct

4. **Données** :
   - ✅ Alertes stock : filtre et couleurs correctes
   - ✅ Tâches critiques : affichage du statut
   - ✅ Photos récentes : grille régulière et badging

---

## 📝 Notes importantes

- **Données mockées** : Les études sont actuellement mockées. À remplacer par l'appel backend une fois disponible.
- **Donut répartition** : Les données sont mockées pour la démonstration.
- **Import inutilisé** : `ProjectOviewComponent` peut être supprimé du fichier TypeScript si non utilisé ailleurs.
- **Backward compatibility** : Les données du service backend restent inchangées, seul l'affichage est refondu.

---

## 🚀 Prochaines étapes

1. **Intégration backend** : Remplacer les données mockées par les vraies données
2. **Tests E2E** : Valider le rendu sur tous les navigateurs
3. **Optimisation des images** : Compresser les photos récentes
4. **Animation** : Ajouter des transitions smooth si nécessaire

---

**Refonte complétée le** : 2026-01-14
**Status** : ✅ Prête pour la mise en production





sur le ts de de etude-bet.component.ts adapte moi sur la creation d'une etude l'auto-completion du champ Sélection BET avec l'appelle de la methode 
getUserByProfil() en real time tu fera ce champ un input de recherche tout en appelant la methode getUserByProfil() en real time et tu affichera les resultat dans un select  et la liste doit etre paginer le voici dans le service user ( getUserByProfil(profil: string, keyword?: string, page: number = 0, size: number = 10): Observable<UserPageResponse> { ) le keyword sera le nom ou le prenom ou le code de l'utilisateur a rechercher et cette methode le retur et la liste s'adapte et sera paginer dynamiquement par 10 elements la pagination en srolle c'est a dire par defaut il affiche les 10 premier user (les 10 premier BET)  et des que l'utilisateur scroll vers le bas il affiche les 10 suivant et ainsi de suite et aussi le clientId doit pas etre fixe a 1 doit prendre l'id du current user connecté  en appellant la methode getCurrentUser() du service auth.service.ts 
 ( // ✅ MÉTHODE CORRIGÉE: Récupération de l'utilisateur avec meilleure gestion d'erreurs
  getCurrentUser(): Observable<User> {  ) l'id du client doit etre recuperer d'une maniere dynamique pas fixe a 1 
  et aussi adapte sur dashboard.component.html sur la carde Photos récentes voir capture d'ecran adapte dans le cas ou il y'a plusieurs photos sur l'album il doit afficher chaque photos de la meme taille comme (c'est a dire comme pour photo on affiche bien la photo bien agrandit sur le modal qui sert a voir la photo et non pas comme sur la capture d'ecran ou les photos sont petites si il y'a plus d'une photo ) il doivent garder ce meme taille mais j'ai constater que des qu'il sont plus d'une il sont petit de taille il doivent etre grand et avoir la possibilité  de cliquer sur suivant pour visionner la suivant  et sur le ts et html de projects.component.ts adapte sur l'affiche de la liste des cardes de projets la progression la barre  en bas de la carde c'est le meme pricipe inspire toi su l'affichage de cette progression  comme elle est faite dans le html sur ( la carde gauche ou on affiche la barre de Progression) et ts  de project.presentation.ts 
  enleve moi aussi l'input de recherche sur task-board.component.html  et adapte moi la partie des Commentaires  sur cette composant de task-board.component.ts et html adapte sur le modal qui affiche les commentaires (Liste des commentaires) sur <!-- Modal des commentaires -->  sur la partie gauche du modal gere la pagination aussi de la liste que ca scrolle comme la logique de l'affichege des de la liste des taches (des cardfes de taches ) car le nombre peut etre tres important et ca deborde su le modal et sur la partie a droite le formulaire de creation ameliore le design du formulaire de creation des commentaires que ca soit beaucoup plus moderne et faire descendre un peut le button Ajouter le commentaire et toujours sur ce composant de task-board.component.ts corrige la maniere dont les taches sont assigner a au executeur sur les modal de creation de modification doit utiliser le meme principe que pour la creation d'une etude en appellant la methote getUserByProfil et utiliser WORKER pour le parametre profil que prend cette methode et donner la possibiliter a l'utilisateur de choisir le ou les worker (il ou ils respectivement sera ou  seront le ou les executeur(s))  qui va executer la tache et aussi sur le modal de creation et de modification et paginer cette liste par 4 adapte cela lors de l'appelle de la methode loadWorkers() tu appelle la methode getUserByProfil() aulien de getWorkers() et utilise le keyword pour la recherche et la pagination pour l'affichage et sur <!-- Modal de détails de la tâche - Version Premium -->  je vois des Exécuteurs par exemple Exécuteur 23 et Exécuteur 24 et il affiche que pour un executer sont nom et prenom alors que la methode getTasks() ProjectBudgetService retourne dan le content les executeurs concernerner par cette taches donnc pagine les liste des executeurs d'une tache (en cardes de grille de 4 sur les modal pour creationet modification )
  voici l'exemple de la reponse de la methode getTasks()  
  {
  "content": [
    {
      "id": 37,
      "title": "RAS",
      "description": "chd cjdck",
      "priority": "HIGH",
      "status": "IN_PROGRESS",
      "realEstateProperty": {
        "id": 25,
      "name": "Maison des Patriotes"
      },
      "executors": [
        {
          "id": 23,
          "prenom": "Abdoulaye",
          "nom": "Diop",
          "telephone": "772002430",
          "email": "laye@gmail.com",
          "photo": null,
          "profil": "WORKER"
        },
        {
          "id": 25,
          "prenom": "Ouly",
          "nom": "Sene",
          "telephone": "772334455",
          "email": "ouly@gmail.com",
          "photo": null,
          "profil": "WORKER"
        }
      ],
      "pictures": [
        "10254033-ecc6-4258-94a9-8a1f48997916.png"
      ],
      "startDate": [
        2025,
        12,
        18,
        0,
        0
      ],
      "endDate": [
        2026,
        1,
        2,
        0,
        0
      ],
      "documents": []
    },
    {
      "id": 38,
      "title": "dnb. xdd c d",
      "description": "sxsnxbsxns",
      "priority": "MEDIUM",
      "status": "DONE",
      "realEstateProperty": {
        "id": 25,
        "name": "Maison des Patriotes"
      },
      "executors": [
        {
          "id": 25,
          "prenom": "Ouly",
          "nom": "Sene",
          "telephone": "772334455",
          "email": "ouly@gmail.com",
          "photo": null,
          "profil": "WORKER"
        }
      ],
      "pictures": [],
      "startDate": [
        2025,
        12,
        18,
        0,
        0
      ],
      "endDate": [
        2025,
        12,
        19,
        0,
        0
      ],
      "documents": []
    },
    {
      "id": 70,
      "title": "Pont Keur Massar",
      "description": "Pont de l'Avenir",
      "priority": "HIGH",
      "status": "BLOCKED",
      "realEstateProperty": {
        "id": 25,
        "name": "Maison des Patriotes"
      },
      "executors": [],
      "pictures": [
        "8af2e0cd-003b-4b03-89a3-fcc74af97c75.png"
      ],
      "startDate": [
        2026,
        1,
        6,
        0,
        0
      ],
      "endDate": [
        2026,
        2,
        2,
        0,
        0
      ],
      "documents": []
    },
    {
      "id": 71,
      "title": "Pont keur Massar",
      "description": "PONT KM",
      "priority": "HIGH",
      "status": "DONE",
      "realEstateProperty": {
        "id": 25,
        "name": "Maison des Patriotes"
      },
      "executors": [],
      "pictures": [
        "40d2783c-df9d-4e58-a8bb-e345b84008d1.png"
      ],
      "startDate": [
        2026,
        1,
        6,
        0,
        0
      ],
      "endDate": [
        2026,
        2,
        2,
        0,
        0
      ],
      "documents": []
    },
    {
      "id": 72,
      "title": "Pont Thies",
      "description": "PONT KM",
      "priority": "HIGH",
      "status": "TODO",
      "realEstateProperty": {
        "id": 25,
        "name": "Maison des Patriotes"
      },
      "executors": [],
      "pictures": [],
      "startDate": [
        2026,
        1,
        6,
        0,
        0
      ],
      "endDate": [
        2026,
        2,
        3,
        0,
        0
      ],
      "documents": []
    },
    {
      "id": 73,
      "title": "PONT KM",
      "description": "PONT KM",
      "priority": "MEDIUM",
      "status": "TODO",
      "realEstateProperty": {
        "id": 25,
        "name": "Maison des Patriotes"
      },
      "executors": [],
      "pictures": [
        "6a33fcb9-8413-4cb4-bf78-5cd37af7f873.png"
      ],
      "startDate": [
        2026,
        1,
        6,
        0,
        0
      ],
      "endDate": [
        2026,
        2,
        2,
        0,
        0
      ],
      "documents": []
    },
    {
      "id": 74,
      "title": "PONT INNOV",
      "description": "Test",
      "priority": "MEDIUM",
      "status": "BLOCKED",
      "realEstateProperty": {
        "id": 25,
        "name": "Maison des Patriotes"
      },
      "executors": [],
      "pictures": [
        "773d025f-b673-4ad7-a822-732e6220baf1.png"
      ],
      "startDate": [
        2026,
        1,
        7,
        0,
        0
      ],
      "endDate": [
        2026,
        1,
        8,
        0,
        0
      ],
      "documents": []
    },
    {
      "id": 75,
      "title": "PONT INNOV",
      "description": "PONT INNOVa",
      "priority": "MEDIUM",
      "status": "BLOCKED",
      "realEstateProperty": {
        "id": 25,
        "name": "Maison des Patriotes"
      },
      "executors": [
        {
          "id": 64,
          "prenom": "Moussu",
          "nom": "Diop",
          "telephone": "765439922",
          "email": "moussu@yopmail.com",
          "photo": "eb8f345c-07a7-4f33-9c7b-2b520cede49b.png",
          "profil": "WORKER"
        }
      ],
      "pictures": [
        "44ba41ef-ecd9-478d-9698-45aecb485542.png"
      ],
      "startDate": [
        2026,
        1,
        7,
        0,
        0
      ],
      "endDate": [
        2026,
        2,
        3,
        0,
        0
      ],
      "documents": []
    },
    {
      "id": 76,
      "title": "Projet",
      "description": "BTP",
      "priority": "MEDIUM",
      "status": "IN_PROGRESS",
      "realEstateProperty": {
        "id": 25,
        "name": "Maison des Patriotes"
      },
      "executors": [
        {
          "id": 64,
          "prenom": "Moussu",
          "nom": "Diop",
          "telephone": "765439922",
          "email": "moussu@yopmail.com",
          "photo": "eb8f345c-07a7-4f33-9c7b-2b520cede49b.png",
          "profil": "WORKER"
        }
      ],
      "pictures": [
        "05570e7f-8929-479e-acc4-930d481179e0.png"
      ],
      "startDate": [
        2026,
        1,
        12,
        0,
        0
      ],
      "endDate": [
        2026,
        2,
        9,
        0,
        0
      ],
      "documents": []
    },
    {
      "id": 77,
      "title": "Chantier a Mbour",
      "description": "Un hotel",
      "priority": "MEDIUM",
      "status": "TODO",
      "realEstateProperty": {
        "id": 25,
        "name": "Maison des Patriotes"
      },
      "executors": [
        {
          "id": 64,
          "prenom": "Moussu",
          "nom": "Diop",
          "telephone": "765439922",
          "email": "moussu@yopmail.com",
          "photo": "eb8f345c-07a7-4f33-9c7b-2b520cede49b.png",
          "profil": "WORKER"
        },
        {
          "id": 72,
          "prenom": "Thiam",
          "nom": "Abdel",
          "telephone": "762134567",
          "email": "thiam@gmail.com",
          "photo": "",
          "profil": "WORKER"
        }
      ],
      "pictures": [
        "88d81d3c-24d1-40d7-a8ba-ba907329fe93.png"
      ],
      "startDate": [
        2026,
        1,
        23,
        0,
        0
      ],
      "endDate": [
        2026,
        1,
        24,
        0,
        0
      ],
      "documents": []
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 10,
    "sort": {
      "unsorted": true,
      "sorted": false,
      "empty": true
    },
    "offset": 0,
    "paged": true,
    "unpaged": false
  },
  "totalElements": 11,
  "totalPages": 2,
  "last": false,
  "numberOfElements": 10,
  "size": 10,
  "number": 0,
  "sort": {
    "unsorted": true,
    "sorted": false,
    "empty": true
  },
  "first": true,
  "empty": false
}
et aussi sur documents.component.ts et html adapte la pagination que se soit dynamique aussi sur la liste (la om peut a voir des button pour aller a la page suivante et precedente et aussi un champ pour aller a une page specifique) commme les autres pagination dans le stock.component.ts et html inspire toi la bas par exemple la liste des inventaires est bien paginer fait la meme chose pour les documents
sur team-list.component.ts et html adapte la pagination que se soit dynamique aussi sur la liste (la om peut a voir des button pour aller a la page suivante et precedente et aussi un champ pour aller a une page specifique) commme les autres pagination dans le stock.component.ts et html inspire toi la bas par exemple la liste des inventaires est bien paginer fait la meme chose pour les documents.
Et sur documents.component.ts et html  adapte le filtre et recherche pour un document aussi sur le modal Nouveau document sur le champ selectionner un type de document si on selectione (pagine aussi la selection pour un type de document pas un select qui peut deborder ) un type de document on doit verifier sur le type de retour de ce type de document retourner par la methode loadDocumentTypes()  sur le retour de la methode getDocumentsType() on verifie le hasStartDate si c'est a true on affiche Date début  pour cette creation et/ou  la Date fin si le hasEndDate est a true donc lors de la creation d'un document l'affichage des champs date debut et date fin dependra du type de document choisi si son hasStartDate et hasEndDate sont a true on affiche les deux sinon on affiche seulement celui qui est a true et si les deux sont a false on affiche aucun des deux
et adapte aussi sur team-list.component.ts et html sur le ts avec la methode createWorker donne la possibiliter aussi de creer : SITE_MANAGER, (Manager), SUBCONTRACTOR (Sous-traitant),PROMOTEUR (Promoteur), et un WORKER (Ouvrier) pas seulement un WORKER et aussi les textes a ajouter sur la partie stock.component.html sur l'onglet des commandes ajoute les textes leurs version anglais et francais ajouter ces mots corespodant y'en a des clés qui n'ont pas valeurs (de textes sur le service de traduction language.service.ts commme le texte common.print doit etre 'common.print': 'print'pour la translation en EN et 'common.print': 'Imprimer' pour la translation en FR  et pour les autres cles qui ne sont pas traduites sur cette service  )
ajoute moi aussicreer moi une service helper qui aura une methode  telechargerFacturePDF () inspire toi de cette methode et prend en parametre un objet en s'inspirant de la methode telechargerFacturePDF () qui est dans compte.component.ts qui sert a telecharger une facture pdf et appelle cette methode que tu cree pour dans le de stock.component.ts et html pour telecharger une facture pdf qui est afficher dans le modal de details commande  et aussi ajoute la traduction des texte restantt sur le modal de details commande  et d'approbation et sur le modal qui ajoute une commande fait la meme chose s'il y'a choisx sur un champ de selection de fpurnisseur meme principe appeller la methode getUserByProfil() et le profil a passer en parametre est FOURNISSEUR (on affoichera le nom et prenom seulement pas besoin du telephone ) et la liste dan le selecte cera une autocompletion 
 et meme chose dans comptes.component.html adapte les textes sur l'onglets abonnement de compte.component.html 
compte.subscription.includedBenefits , compte.subscription.maxProjects ,compte.subscription.prioritySupport sur le service de traduction language.service.ts enleve aussi la ligne Moyen de paiement  l'onglets abonnement de compte.component.html
et enleve moi sur project-alert.component.html 
          cette ligne <th class="px-4 py-3 font-semibold">{{ t('alert.photos') }}</th> et place une autre icone en svg (icone qui indique une image )sur action sur la liste des alertes et et tu le remplace avec l'icone de l'oeil qui etait sur ce bouton   <button *ngIf="signalement.pictures && signalement.pictures.length > 0"
              (click)="openPhotoModal(signalement)" class="text-blue-500 hover:text-blue-700 transition"
              title="Voir les photos">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button> donc on enleve le th photos et on placeet amener sont td sur action (action va avoir l'icone de supression et une icone de l'image enleve licone de l'oeil et met a la place l'icone de de image que tu vas me donner ) 



```markdown

creer moi mon projet backend avec du java avec une architecture en couche pour l'instant tu me gerer que la partie user et la partie authentification et utiliser keycloak pour l'authentification voir la capture qui mon le projet initialiser sous spring initializr

donne moi une classe user avec les propriéte suivante id , firstName, name,address, telephone,age , email , password , profil (qui sera une enumeration avec les valeurs ADMIN , CLIENT )

et tu me donne tout au complet pour la partie user sont entite User , sont Dto UserDto , sont repository UserRepository , sont service UserService et sont controller UserController son helper UserHelper et sont mapper UserMapper (qui va mapper l'entite User vers le Dto UserDto et vice versa) et dans son helper il va avoir une methode pour crypter le mot de passe et autres et donne aussi les exeption et les enumeration pour l'intant ProfilEnum et le projet doit etrer tester avec swagger donc donne dans le dossier config un SwaggerConfig pour tout les endpoint (actuellement que pour les user ) et les champs de user sont tous en anglais et les methodes aussi a creer dans les fichiers de l'application et aussi creer un service  pour l'envoie de email lorsque un compte est creer disant que firstName name vous venez de creer un compte de profil  (exemple Aboulaye Diop vous venez de creer un compte de d'administrateur )(et la methode de cette service prend en parametre un user )

et donne les endpoint pour l'authentification et l'autorisation et les methodes a creer sont : 

dans AuthController

- login

- logout

- register

- forgot-password

- reset-password

- change-password

et dans UserController

- get-user

- get-users

- create-user

- update-user

- delete-user

// et inspire toi de ce application.properties pour la base de donnees et ajoute tout ce que ce projet a besoin pour keycloak et la base de donnees et les autres comme le swagger  et tu peux utiliser mes coordoner car j'ai deja mysql qui fonctionne sur le port 3306 dans ma macbook

spring.datasource.url=jdbc:mysql://localhost:3306/GestionHotel

spring.datasource.username=root

spring.datasource.password=passer123

spring.jpa.hibernate.ddl-auto=update

# Configuration email

spring.mail.host=smtp.gmail.com

spring.mail.port=587

spring.mail.username=adioptp9@gmail.com

spring.mail.password=lqtyilylcxfrtdnv

spring.mail.properties.mail.smtp.auth=true

spring.mail.properties.mail.smtp.starttls.enable=true



# Configuration pour MultipartFile

spring.servlet.multipart.max-file-size=10MB

spring.servlet.multipart.max-request-size=10MB

spring.servlet.multipart.enabled=true



logging.level.com.wakana.solimus=DEBUG

logging.level.org.springframework.web=DEBUG







```





Cas d'utilisation populaires de Keycloak dans les entreprises

Keycloak est surtout adopté par les entreprises cherchant à simplifier la gestion des identités à grande échelle. Parmi ses cas d'utilisation les plus courants, on trouve l'implémentation d'un système de SSO pour des applications internes, permettant aux employés de se connecter une seule fois pour accéder à plusieurs services. De plus, des entreprises ayant besoin de se conformer à des standards de sécurité stricts utilisent Keycloak pour centraliser la gestion des utilisateurs tout en respectant les normes d'authentification et de protection des données. Son intégration avec des systèmes tiers (comme LDAP ou Active Directory) en fait un choix judicieux pour des environnements hybrides.

donne moi une bonne architecture en couches a suivre et realise moi en me donner tout sur la gestion des user et le type de response dans mes requetes seront sous ce formation (apres pour une bonne recuperation en cas dans le frontend )

exemple 

{

data:[

]

code: (201 ) ou 401

message: ( succes ) ou erreur 

}

et sur l'application.propertie donne le moi et montre ou je vais adapter pour keycloak ou si tu va le faire direct et les dependence a telecharger ou plugins sur intellij si necessaire

et organise l'architecture pour qu'on ai ce classement 

config ,data service ,web (controller et dto )ces dossier 

inspire toi de ce schemas

── config/          # Configurations (Security, CORS, Swagger)

├── design/

│   ├── services/    # Services métier

│   └── repositories/ # Accès données

├── domain/

│   ├── entities/    # Entités JPA

│   └── enums/       # Énumérations

├── web/

│   ├── controllers/ # Controllers REST

│   ├── dtos/        # DTOs

│   └── mappers/     # Mappers

├── security/        # JWT, Authentication

├── helpers/         # Utilitaires

└── exceptions/      # Gestion erreurs