# Gibbons Studio

Portfolio site for **Jérémie Balais / Gibbons Studio**. A static Astro site whose
content is fully driven by the Storyblok headless CMS, deployed to GitHub Pages.

- **Astro 6** — static site generator, zero JS by default, image optimization.
- **Storyblok** — headless CMS, the single source of truth for all content.
- **GitHub Pages** — hosting, built and deployed by GitHub Actions.
- Live: **https://dev.jeremiebalais.com**

## About Jérémie Balais

Jérémie trained in drawing and animation filmmaking for four years at the École
Émile Cohl (2008 - 2012), then specialised in directing for two years at La
Poudrière (2012 - 2014).

He has since directed and co-directed around thirty short formats, a large part
of them at Gibbons Studio (co-founded with Jeffig Le Bars):

- **Music videos**: Caravan Palace, Deluxe, Karpatt...
- **Short films**: New Moon, written and produced by Colman Domingo, awarded at
  many festivals and shortlisted for the 2023 Academy Awards; two poem
  adaptations for TED-Ed (Shakespeare, Safia Elhillo); Ça rend Fataliste, a
  short film for France TV.
- **Commercials**: Hermès, Chanel, Agnès b, La Monnaie de Paris...
- **Educational and institutional films**: TED-Ed, La Cité des sciences, Crédit
  Agricole, Mobilité Douce.

Alongside his work at Gibbons Studio, Jérémie has also contributed to several
films as a storyboarder, animator or in compositing:

- **Storyboarder**: Les Hirondelles de Kaboul, by Eléa Gobbé-Mévellec and Zabou
  Breitman; Navozande by Reza Riahi...
- **Animator**: Plus douce est la nuit by Fabienne Wagenaar; Les Filles de l'eau
  by Sandra Desmazière...

Today, Jérémie is developing several short and medium-length films for a young
audience (ages 6 - 12).

Driven by motion, image and staging, he offers his craft to any studio or person
who needs to tell a story through animation. He adapts his narrative and artistic
style to each project, which lets him present films that look very different from
one another. That diversity pushes him to keep reinventing himself, to never stop
growing, and to stay passionate.

## Local development (Docker only)

Everything runs in Docker. Dependencies never touch the host (`node_modules`
lives in a named volume).

```bash
docker compose up                              # dev server on http://localhost:4321
docker compose run --rm web npm run build      # static build into dist/
docker compose run --rm web npm run preview    # preview the build
```

Create a `.env` at the root (see `.env.example`):

```
STORYBLOK_TOKEN=...           # Storyblok Preview token (required to build)
PUBLIC_WEB3FORMS_KEY=...      # contact form (Web3Forms)
SB_PAT=...                    # Storyblok management token (CMS admin scripts only)
```

Locally the build reads **draft** content (preview work in progress). Production
reads **published** content only.

## Content: Storyblok is the single source of truth

The site has **no local content and no fallback**: if the token is missing or the
API fails, the build stops with an explicit error rather than shipping an empty
site. The data layer (`src/lib/works.ts`, `src/lib/site.ts`) fetches the Storyblok
CDN directly (no `@storyblok/astro` SDK) and renders rich text itself.

Content types (space region: EU):

- **`work`** — portfolio entries (in a `works/` folder). Fields are grouped into
  tabs: *Infos* (title, category, year, client), *Média* (thumbnail, `video_url`,
  `hover`, hover image, mp4 preview, gallery), *Texte* (excerpt, description,
  credits). Categories drive the 3 grid filters: **Réalisation / Animation /
  Making of**. `video_url` is a single Vimeo/YouTube URL (parsed in code) used
  for the detail-page player and the hover preview. The `hover` field
  (Auto / Image / Vidéo / Aucun) controls what shows on card hover.
- **`settings`** — site config: name, tagline, meta description, email, location,
  Instagram / LinkedIn (tagline + meta description are translatable FR/EN).
- **`about`** — the About page: rich-text body (FR/EN) + portrait image.

Translations use Storyblok field-level i18n (`?language=en`).

## Deployment

GitHub Pages, built by `.github/workflows/deploy.yml`. The build runs on:

- every push to `main`,
- a schedule (`*/15` cron) so published Storyblok changes go live automatically,
- `repository_dispatch: [storyblok-publish]` and manual `workflow_dispatch`.

Required GitHub **secrets**: `STORYBLOK_TOKEN`, `PUBLIC_WEB3FORMS_KEY`. Repository
**variable**: `STORYBLOK_VERSION=published` (production serves published content
only).

**To publish content:** edit in Storyblok and hit *Publish*. The next scheduled
rebuild (≤ 15 min) picks it up. For instant deploys, a small proxy (e.g. a
Cloudflare Worker) would be needed to translate the Storyblok webhook into a
GitHub `repository_dispatch` call.

## Structure

```
src/
  components/   Header, Footer, WorkCard, VideoEmbed, Gallery
  layouts/      BaseLayout
  lib/          works.ts (works + about), site.ts (settings + nav)
  pages/        index, works/[slug], about, demoreel, contact, en/
  styles/       global.css (design system)
```
