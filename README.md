# Le Master Quiz — site complet avec collecte des réponses

## Ce que contient ce projet
- `public/index.html` — le questionnaire que les étudiants remplissent.
- `public/admin.html` — votre tableau de bord (à l'adresse `/admin` de votre site), pour consulter les réponses, noter les questions ouvertes et exporter en CSV.
- `server.js` — le petit serveur qui reçoit et stocke les réponses.
- `data/submissions.json` — où les réponses sont stockées (se remplit automatiquement).

## Avant de déployer
Ouvrez `server.js` et changez si besoin le code correcteur (ligne `ADMIN_CODE`, par défaut `prof2026`). C'est le code que vous entrerez sur la page `/admin` pour accéder aux réponses.

## Déploiement recommandé : GitHub (glisser-déposer, sans ligne de commande) + Render.com (gratuit)

Glitch a fermé son service d'hébergement en 2025, donc on passe par un chemin un peu différent mais tout aussi simple, et plus durable :

### Étape 1 — Mettre le code sur GitHub (juste un dépôt de fichiers, pas de code à écrire)
1. Allez sur **github.com** et créez un compte gratuit.
2. Cliquez **New repository**. Donnez-lui un nom (ex. `master-quiz`), laissez-le **Public**, ne cochez rien d'autre, cliquez **Create repository**.
3. Sur la page du dépôt vide, cliquez le lien **"uploading an existing file"**.
4. Glissez-déposez TOUT le contenu du dossier `masterquiz-site` fourni (le dossier `public/` entier avec ses 2 fichiers, le dossier `data/` avec `submissions.json`, ainsi que `server.js` et `package.json`) — GitHub accepte de glisser des dossiers directement dans la zone de dépôt.
5. Cliquez **Commit changes** en bas de page.

### Étape 2 — Héberger sur Render.com (gratuit, sans carte bancaire)
1. Allez sur **render.com**, créez un compte gratuit (vous pouvez vous connecter directement avec votre compte GitHub, c'est le plus rapide).
2. Cliquez **New +** → **Web Service**.
3. Connectez votre dépôt GitHub `master-quiz` créé à l'étape précédente.
4. Render détecte automatiquement Node.js. Vérifiez : **Build Command** = `npm install`, **Start Command** = `npm start`.
5. Choisissez le plan **Free**.
6. (Optionnel mais recommandé) Dans "Environment Variables", ajoutez `ADMIN_CODE` avec votre propre code secret, plutôt que de modifier `server.js`.
7. Cliquez **Create Web Service**. Après 1-2 minutes, votre site est en ligne à une adresse du type **`https://master-quiz-xxxx.onrender.com`**.

### ⚠️ Points importants avec le plan gratuit Render
- Le service **s'endort après 15 minutes d'inactivité** : le premier accès après une pause met 30 à 60 secondes à répondre (rien d'anormal, il suffit d'attendre). Pensez à ouvrir le lien vous-même quelques minutes avant le début du cours pour le "réveiller".
- Comme pour tout hébergement gratuit, **exportez le CSV depuis `/admin` dès que tous les étudiants ont répondu**, pour garder une copie de sauvegarde sur votre ordinateur.

### Si vous voulez éviter GitHub complètement
Il existe une alternative plus récente, pensée comme remplaçante directe de Glitch, avec un éditeur dans le navigateur où l'on colle le code sans dépôt Git : **bonto.dev**. Elle est plus simple à ce niveau, mais c'est un service plus jeune et moins éprouvé que Render — je peux vous détailler cette voie si vous préférez l'essayer.

## Utilisation en classe
1. Partagez le lien principal (`https://votre-projet.glitch.me`) aux étudiants.
2. Chaque étudiant remplit le quiz sur son propre appareil et clique "Envoyer mes réponses" à la fin — la réponse part directement vers votre serveur, rien à télécharger ni à joindre.
3. Vous consultez `/admin`, notez les questions ouvertes (marquées "À corriger"), et exportez en CSV quand tout est corrigé.
