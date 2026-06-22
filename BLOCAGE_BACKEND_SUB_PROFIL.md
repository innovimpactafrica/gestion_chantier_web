Objet : Blocage CORS/Auth sur la page publique de souscription `/sub/:id/:profil`

Bonjour,

On a une page front censée être **publique** (accessible sans connexion), utilisée pour partager un lien de souscription à un utilisateur : `https://<front>/sub/{id}/{profil}` (ex: `/sub/135/SITE_MANAGER`).

Cette page a besoin d'appeler deux endpoints pour fonctionner :
1. `GET /api/v1/user/{id}` — pour récupérer le profil de l'utilisateur et vérifier qu'il correspond au `{profil}` de l'URL
2. `GET /api/subscription-plans/name/{name}` — pour récupérer les plans disponibles pour ce profil

**Problème :** en testant sans token (cas normal pour cette page, puisqu'elle doit marcher pour un visiteur non connecté), le navigateur bloque la requête avec :

```
Access to fetch at 'https://api.btpcloud.sn/api/v1/user/135' from origin 'http://localhost:4200'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

J'ai vérifié côté front (suppression d'un header inutile qui forçait un preflight) — le problème persiste à l'identique avec un autre `id`. J'ai donc vérifié le swagger live (`https://api.btpcloud.sn/v3/api-docs`) : les deux endpoints ci-dessus sont déclarés avec **`bearerAuth` obligatoire**, sans exception `permitAll`. C'est donc cohérent : sans token, la requête est rejetée par Spring Security avant que les headers CORS ne soient ajoutés à la réponse — d'où l'erreur CORS au lieu d'un 401 propre.

**Ce qu'il faudrait côté backend** (au choix, le 2 est recommandé) :

1. **Autoriser l'accès anonyme** sur ces deux endpoints précis (`permitAll()` dans la config Spring Security) + s'assurer que la config CORS s'applique aussi aux requêtes non authentifiées (sinon on aura un 401 propre, mais toujours sans header CORS).
   - ⚠️ Inconvénient : `GET /api/v1/user/{id}` renvoie l'objet `User` complet (mot de passe haché, `funds`, `idCard`, `technicalSheet`...). Le rendre public exposerait des données sensibles à quiconque connaît un ID utilisateur.

2. **Créer deux endpoints publics dédiés**, qui ne renvoient que le strict nécessaire :
   - `GET /api/public/users/{id}/summary` → `{ id, nom, prenom, profil }` uniquement
   - `GET /api/public/subscription-plans/name/{name}` → liste des plans pour ce profil (déjà sans donnée sensible)

   Ces deux endpoints seraient en `permitAll()` avec CORS configuré pour le domaine front (et `localhost` en dev).

Je m'adapte côté front dès que l'un des deux est dispo. Dites-moi ce qui est faisable de votre côté.

Merci !
