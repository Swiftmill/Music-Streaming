# Aurora Wave – Plateforme de streaming audio locale

Aurora Wave est une application de streaming audio auto-hébergée inspirée des expériences modernes de Spotify/Deezer. Elle combine un serveur Node.js stockant toutes les données sur disque (JSON + fichiers audio) et une interface React sombre et animée (Tailwind CSS + Framer Motion).

## Fonctionnalités clés

- Authentification basée sur des fichiers utilisateurs (bcrypt), rôles `user` et `admin`.
- Téléversement sécurisé de pistes audio (200 Mo max, validation MIME, sanitisation des noms, quotas).
- Workflow de modération : les titres restent en attente jusqu'à validation par l'administrateur.
- Attribution de badges « Vérifié » et gestion des quotas utilisateurs via le panneau admin.
- Sauvegarde rapide de l'instance (backup .zip) et journal d'activité.
- Interface React moderne : lecteur fixe, file d'attente, thème sombre, transitions fluides (Framer Motion).
- Recherche locale sur les titres/artistes/albums et pages catalogue/exploration/bibliothèque.
- Docker Compose prêt à l'emploi pour lancer le serveur et le front dans des conteneurs séparés.

## Structure des fichiers

```
/data
  /music              # Morceaux approuvés
  /pending            # Téléversements en attente
  /meta               # Métadonnées JSON + sauvegardes
/public/uploads       # Avatars et visuels
/users                # Comptes utilisateurs (bcrypt)
/frontend             # Application React + Tailwind
server.js             # API Express locale
```

Trois utilisateurs d'exemple sont fournis (`users/`):

| Utilisateur | Rôle  | Mot de passe | Statut |
|-------------|-------|--------------|--------|
| `admin`     | admin | `password123`| Vérifié, badge founder |
| `alex`      | user  | `password123`| Vérifié, badge verified |
| `lyra`      | user  | `password123`| Non vérifiée |

> ⚠️ Les mots de passe sont hashés en bcrypt directement dans les fichiers JSON.

## API (Express)

Les principales routes exposées sur `http://localhost:4000` :

- `POST /api/auth/login` : obtention du JWT.
- `GET /api/auth/profile` : profil complet de l'utilisateur connecté.
- `POST /api/tracks/upload` : téléversement d'une piste (stockée dans `/data/pending/<username>`).
- `GET /api/tracks` : catalogue des pistes approuvées.
- `GET /api/tracks/:id/stream` : streaming chunké (support Range) de la piste.
- `GET /api/tracks/pending` : (admin) liste des pistes à valider.
- `POST /api/admin/tracks/:id/approve|reject` : workflow de modération.
- `PATCH /api/admin/users/:username` : mise à jour des quotas, badges, vérification.
- `POST /api/admin/backup` : génération d'un zip de sauvegarde.
- `GET /api/search?q=` : recherche locale sur le catalogue.

Le serveur applique : Helmet, CORS, compression, rate limiting, validations `express-validator`, logs Winston, sanitisation des noms et contrôle des quotas.

## Frontend (Vite + React 18 + Tailwind)

- Layout responsive en thème sombre, glassmorphism, palette néon.
- Composants clés : barre latérale, cartes albums, lecteur fixe, modale de téléversement, panneau admin.
- Hooks custom `useAuth` (gestion du JWT) et `usePlayer` (file d'attente, shuffle, repeat, volume).
- Animations Framer Motion pour les transitions de pages, modales et cartes.

### Variables utiles

- Jeton JWT stocké dans `localStorage` (`aurora-token`).
- API consommée via un client Axios (`src/utils/api.js`) avec interception automatique du token.

## Lancement du projet

### Mode développement (sans Docker)

```bash
# Backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

- API disponible sur `http://localhost:4000`
- Frontend (Vite) sur `http://localhost:5173` (proxy `/api`, `/public`, `/media` vers le backend)

### Avec Docker Compose

Un fichier `docker-compose.yml` est fourni :

```bash
docker compose up --build
```

Cela lance :
- `api` (Node.js) sur le port 4000, volume `./data:/app/data`
- `frontend` (Vite en mode preview) sur le port 5173

## Tests rapides

1. Ouvrez `http://localhost:5173`, connectez-vous avec `alex / password123`.
2. Téléversez un fichier audio (ex : MP3) via « Publier un titre » → la piste apparaît dans le panneau admin.
3. Connectez-vous en admin (`admin / password123`), validez la piste → elle est déplacée dans `/data/music/<user>/` et devient disponible dans le catalogue.
4. Utilisez le lecteur (lecture, pause, shuffle, repeat, volume) et la recherche locale.

## Sécurité et bonnes pratiques

- Validation stricte des extensions/MIME, limite de 200 Mo par fichier.
- Sanitisation des entrées utilisateurs, rate limiting sur les endpoints sensibles.
- Sauvegarde `.zip` des répertoires `/data` et `/users` via l'API.
- Aucun binaire versionné (les dossiers audio/avatars sont ignorés par Git).

## Roadmap suggérée

- Génération de waveforms côté backend pour alimenter une vraie visualisation.
- Notifications temps réel (WebSocket) pour la modération.
- Gestion de playlists persistantes côté utilisateur (`/data/meta/playlists/*.json`).
- Tests automatisés (Jest/React Testing Library + supertest pour l'API).

---

Aurora Wave est pensée pour fonctionner entièrement en local/offline : vos utilisateurs gardent le contrôle de leurs données et des contenus diffusés.
