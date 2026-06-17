fait moi (exemple enlever sur commandes.component.ts enleve
     console.log('Citation créée avec succès:', response); a la ligne 513 ainsi de suite pour tout le projet ) un cleaning du projet d'enlever les console.log() car l'appli par en production et les alert il faut le parcourrir et le nettoyer et enlever les alert() on doit presenter cette application donc que 
et aussi sur le popup de details commande il y'a un texte qui n'est pas encore sur language.service.ts ajoutes ces textes de translations 
Failed to load resource: the server responded with a status of 500 () sur l'endpoint de register
btp.innovimpactdev.cloud/api/v1/auth/signup:1  
 et aussi revoie bien sur le realestate.service.ts on a   averageProgress?: number; a la ligne 73 sur l'interace RealEstateProject cette attribut permettra d'afficher la progression d'un projet donc adapte le et utilise le sur le ts de projects.component.ts de dans le ts de project-presentation.component.ts pour afficher la progression (sur les cardes de la liste des projets sur lt hml de du composant projects et aussi sur project-presentation  )
sur la ligne 264 du html de projects.component
     <!-- Barre de progression -->
           <div class="mt-auto">
            <div class="flex justify-between items-center mb-2">
              <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {{ t('projects.progress') }}
              </span>

              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-gray-900">
                  {{ formatProgress(getProjectProgress(project)) }}
                </span>
                <span class="text-xs px-2 py-0.5 rounded-full font-medium" [ngClass]="{
                  'bg-green-100 text-green-700':  getProjectProgress(project) >= 70,
                  'bg-yellow-100 text-yellow-700': getProjectProgress(project) >= 30 && getProjectProgress(project) < 70,
                  'bg-orange-100 text-orange-700': getProjectProgress(project) < 30
                }">
                  {{ getProjectStatusLabel(project) }}
                </span>
              </div>
            </div>

            <div class="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div [style.width.%]="getProjectProgress(project)"
                [style.background]="getGradientBackground(getProjectProgress(project))"
                [style.min-width]="getProjectProgress(project) > 0 ? '4px' : '0'"
                class="h-full rounded-full transition-all duration-700 ease-out">
              </div>
            </div>
          </div> 
          on affiche directement cette valeur 
          exemple ici dans un retour de donnees d'un projet 
           "constructionStatus": "IN_PROGRESS",
    "averageProgress": 20,
    "qrcode": "AlQAX98YvviO1Acr95khb6FTf+aZ2ZWa+bSNHHGMFqg=",
    "blocked": false,
    "available": true
    et dans la barre on affiche   "averageProgress": 20, (20 % a afficher sur le composant html )
    et meme chose sur la ligne 36 pour project-prsentation.component.html
      <!-- Progression -->
        <div class="bg-[#E8F0FE] rounded-lg shadow p-[14px] mb-6 mx-4">
        adapte le bien 
