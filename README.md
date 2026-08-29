# GeoForMyKids

GeoForMyKids est un jeu éducatif de géographie pensé pour les enfants. La carte constitue le cœur du jeu : l’enfant apprend progressivement à reconnaître les continents, les océans, les mers, les pays et la géographie française.

L’application est une PWA React entièrement statique. Elle peut être installée sur un ordinateur, une tablette ou un téléphone et continuer à fonctionner hors connexion après une première ouverture réussie.

## Fonctionnalités

- Parcours progressif : continents, océans, pays, mers, fleuves, régions et départements français.
- Pays répartis dans des niveaux de difficulté fixes.
- Indices accompagnés d’un zoom sur la zone concernée.
- Carte déplaçable et zoomable à la souris, au tactile et au clavier.
- Révisions automatiques des pays difficiles à retrouver.
- Statut « Bien connu » pour les pays trouvés du premier coup.
- Passeport « Ma planète » classé par niveau et par continent.
- Profils locaux illimités avec une progression séparée.
- Installation PWA et utilisation hors connexion.

## Technologies

- React et TypeScript
- Vite
- D3 Geo et TopoJSON
- Vitest et Testing Library
- Service worker sans dépendance externe

## Installation locale

Node.js 22 est recommandé.

```bash
git clone <adresse-du-depot>
cd GeoForMyKids
npm ci
npm run dev
```

Le serveur de développement est disponible par défaut sur `http://127.0.0.1:5173`.

## Commandes utiles

```bash
npm run dev              # lancer le serveur de développement
npm test                 # exécuter les tests
npm run build            # compiler l’application dans dist/
npm run preview          # prévisualiser la version compilée
npm run data:countries   # régénérer le catalogue des pays
npm run data:populations # actualiser les populations via la Banque mondiale
npm audit                # vérifier les vulnérabilités connues
```

`npm run data:populations` contacte l’API de la Banque mondiale et nécessite donc une connexion Internet.

## Données et progression

Le catalogue géographique se trouve dans `src/data/`. La répartition fixe des pays par difficulté est définie dans `src/data/countries.ts`.

Les profils et les progressions restent uniquement dans le `localStorage` du navigateur. Ils ne sont envoyés à aucun serveur et ne sont pas synchronisés entre les appareils. Un profil est une séparation pratique de progression, pas un compte protégé par mot de passe.

Effacer les données du site dans le navigateur efface également tous les profils et toutes les progressions.

## PWA et mode hors connexion

Lors de la première visite, le service worker met en cache uniquement la coquille de l’application et ses ressources statiques versionnées. Une fois ce chargement terminé, le jeu peut être relancé sans connexion.

Le service worker ne met volontairement pas en cache toutes les requêtes du domaine. Cette restriction évite qu’une future API ou que des données privées soient enregistrées par erreur.

## Déploiement sur le VPS

La version de production est constituée uniquement des fichiers du dossier `dist/`.

```bash
npm ci
npm test
npm run build
```

Copier ou synchroniser ensuite `dist/` vers le dossier exposé dans le conteneur Caddy, actuellement `/srv/geoformykids` du point de vue du conteneur.

Le fichier [`deploy/Caddyfile.geoformykids`](deploy/Caddyfile.geoformykids) contient un bloc Caddy recommandé. Le domaine et le chemin racine peuvent être adaptés au serveur utilisé. Si Caddy héberge déjà d’autres sites, leurs blocs doivent être conservés.

Après la modification sur le VPS :

```bash
export CADDY_CONTAINER=nom_du_conteneur_caddy
sudo docker exec "$CADDY_CONTAINER" caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo docker exec "$CADDY_CONTAINER" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```

Puis vérifier le site :

```bash
curl -I https://geoformykids.duckdns.org/
curl -I https://geoformykids.duckdns.org/sw.js
```

La réponse principale doit notamment contenir `Strict-Transport-Security` et `Content-Security-Policy`. Le service worker doit contenir `Cache-Control: no-cache`.

## Sécurité

- Ne jamais commiter de fichier `.env`, de jeton DuckDNS, de jeton GitHub ou de clé SSH.
- Utiliser `npm ci` afin de respecter exactement `package-lock.json`.
- Examiner les propositions hebdomadaires de Dependabot avant de les fusionner.
- Les vérifications GitHub Actions lancent l’audit, les tests et la compilation sur chaque modification.
- GeoForMyKids ne contient actuellement ni API, ni base de données, ni authentification.

## Mise à jour

Après une modification :

```bash
npm test
npm run build
git add -A
git commit -m "Description de la modification"
git push
```

Il faut ensuite mettre à jour les fichiers de `dist/` servis par le VPS. Le navigateur récupérera la nouvelle page et remplacera progressivement son ancien cache PWA.

## Licence

GeoForMyKids est distribué sous [licence MIT](LICENSE). Le code peut être utilisé, modifié et redistribué à condition de conserver la notice de copyright et le texte de la licence.
