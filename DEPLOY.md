# Déploiement — GitHub Pages

Site statique Astro, buildé par GitHub Actions, servi par GitHub Pages.
Domaine : **dev.jeremiebalais.com**.

## Une fois le repo créé (côté GitHub)

1. **Settings > Pages** : Source = **GitHub Actions**.
2. **Settings > Secrets and variables > Actions > Secrets** :
   - `STORYBLOK_TOKEN` = token Preview Storyblok
   - `PUBLIC_WEB3FORMS_KEY` = clé Web3Forms (formulaire de contact)
3. **Settings > Secrets and variables > Actions > Variables** (optionnel) :
   - `STORYBLOK_VERSION` = `draft` (dev) ou `published` (prod). Défaut : `draft`.
4. **Custom domain** : déjà géré par le fichier `public/CNAME` (dev.jeremiebalais.com).
   Côté DNS, créer un enregistrement :
   ```
   CNAME  dev.jeremiebalais.com  ->  <olivier>.github.io
   ```
   GitHub provisionne le HTTPS automatiquement (Let's Encrypt).

## Déploiement

- Chaque push sur `main` déclenche le workflow (`.github/workflows/deploy.yml`).
- Build + déploiement automatiques.

## Republier quand Jérémie publie dans Storyblok

Le contenu est figé au build, donc une publication Storyblok ne se voit pas
tant qu'on n'a pas rebuildé. Pour automatiser :

1. Créer un **Personal Access Token GitHub** (scope `repo`).
2. Dans Storyblok : Settings > Webhooks > ajouter un webhook "Story published" qui
   POST sur :
   ```
   https://api.github.com/repos/<olivier>/jeremiebalais.com/dispatches
   ```
   avec header `Authorization: token <PAT>`, `Accept: application/vnd.github+json`
   et body `{"event_type":"storyblok-publish"}`.

Le workflow écoute `repository_dispatch: [storyblok-publish]` et rebuild.

## Local (Docker)

```bash
docker compose up        # http://localhost:4321
```
