# Tomaz Amorim — academic website

The public website is built with [Astro](https://astro.build/) and deployed to [GitHub Pages](https://pages.github.com/). The research section preserves the “Várzea” editorial design. This repository contains only the public site source, published data, approved PDF downloads, and the approved CV PDF.

## Public site

- Live URL: https://tomazamorim.github.io/
- PDFs: `public/downloads/publications/` (12 versioned files plus 3 approved publisher/repository PDFs fetched during public builds)
- CV PDF: `public/cv/tomaz-amorim-izabel-cv.pdf` (approved static artifact; see note below)
- Academic data: `src/data/publications.json`, `src/data/talks.json`, `src/data/recorded-talks.json`, `src/data/podcast.json`
- Research concepts: `src/data/keywords.json`

## Editing without code

The repository is configured for [Pages CMS](https://app.pagescms.org/) through `.pages.yml`. Sign in with GitHub, authorize Pages CMS for this repository, and edit **Research → Keywords and authors** or **Academic content → Publications**. Saving a change commits it to the repository; the GitHub Actions workflow rebuilds and republishes the site.

PDFs can be uploaded from a publication's **Hosted PDF** field. The files are stored in `public/downloads/publications/`. Keep the separate publisher/DOI link in the same publication record: the hosted PDF is an additional access route, not a replacement. The Arquipélago entry is an excerpt of the afterword, and its button is labelled **PDF excerpt**.

When adding a keyword, keep IDs and slugs stable after publication, preserve exact quotations, include publication IDs and page numbers, and relate it to existing published publications/talks. Add only text you wrote or quotations from published sources, with source and page.

When adding a publication, complete the reference, year, category and permanent publisher/repository link. Do not add unpublished or pending items to this public data file. The public repository is visible to anyone.

## Build and validate locally

Requires Node.js 22 and npm. The page-weight step uses Playwright/Chromium.

```sh
npm ci
npm install --no-save playwright
npx playwright install chromium
SITE_MODE=public SITE_URL=https://tomazamorim.github.io npm run build:public
npm run check:public
```

The public build fetches three approved PDFs from their journal/repository download endpoints and places them in `public/downloads/publications/` before Astro builds the site; the persistent publication links remain on the relevant records. The production output is `dist/public/`. GitHub Actions builds and checks pull requests without publishing them. After an approved pull request is merged into `main`, the same workflow deploys the public site. Configure **Settings → Pages → Build and deployment → Source: GitHub Actions** before the first merge to `main`.

## CV PDF

The public CV PDF is versioned as a static, approved file under `public/cv/`. This is intentional: the CV PDF contains an approved **In press** section; those entries must not be exposed as editable source data in this public repository. Routine edits to publications and keywords do not regenerate or overwrite the CV PDF. If the CV itself changes, create and review a new approved PDF separately, then replace this file.

## Hosting PDFs and copyright

Only upload PDFs for which redistribution on this personal site is authorized. Existing publisher and persistent links should remain in the reference even when the same work is offered as a local PDF download.

## Architecture

- `src/pages/` — Astro routes
- `src/components/` — shared visual components
- `src/styles/` — site and Várzea design system
- `src/data/` — clean public JSON content
- `public/` — downloadable, self-hosted static assets
- `.pages.yml` — Pages CMS forms
- `.github/workflows/deploy.yml` — automated public build and GitHub Pages deployment
