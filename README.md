# MOTORA — For the love of the drive

A responsive car showcase with **100 reference editions across ten brands**, original artist-model galleries, model-specific films, and a real WebGL 3D garage.

## Run

Requires Node.js 20 or newer. No dependency installation or build step is needed.

```sh
npm start
```

Open `http://localhost:3000`. Or serve `dist/` with any static HTTP server. Opening `index.html` directly as a file will not work because the app loads JSON and JavaScript modules.

```sh
npm run check
```

## What is included

- Porsche, Ferrari, Lamborghini, BMW, Mercedes-Benz, Audi, Ford, Chevrolet, Nissan, and Toyota, with exactly ten entries each.
- Search, brand/body/powertrain/era filters, sorting, and progressive loading.
- Three gallery angles per car, edition-specific reference details, and YouTube films.
- A lazily loaded Three.js garage with orbit, zoom, four camera views, auto rotation, reset, optional paint previews, and full screen where supported.
- A browser-local favourites garage, accessible dialogs, keyboard controls, responsive layouts, and reduced-motion support.
- Persistent favourites work in the same browser; there is no account or backend.

## Content and assets

`dist/cars.json` is the canonical catalogue. Each car includes its edition, specifications, reference link, video, pinned model path, and artist attribution. Add or edit cars there, provide the three corresponding WebP files in `dist/assets/`, and update `dist/credits.html`. The data tests enforce ten cars per brand.

Specifications describe historical reference editions and vary by market and options. They are not current inventory or sales specifications. PS and hp retain their original units. No figure is shown when it is not listed. Artist models may have custom bodywork, liveries, proportions, or trim differences. Inspect the original reference before using figures for buying or technical decisions.

The 3D assets are loaded on demand from a pinned commit of [pedrosoandre/carros](https://github.com/pedrosoandre/carros). This avoids downloading roughly 350 MB of models up front. The gallery images and runtime libraries are served locally. Raw GitHub must be reachable for 3D loading; the viewer includes timeout, retry, and original-model fallback links. For production at larger traffic volumes, copy the credited GLBs to your own asset host and update the loader base in `dist/studio.js`.

Films use YouTube's privacy-enhanced embed domain and connect only when a visitor presses play. Creator restrictions can prevent embedded playback; a direct YouTube link is always available.

All model credits are visible on detail pages, in the 3D viewer, and in `dist/credits.html`. The Three.js, font, and carros metadata licences are in `dist/vendor/`. Gallery images are derivative renders of the credited models, under their respective Creative Commons licences. Manufacturers' names and marks identify the vehicles; this site is independent.

## Hosting

### GitHub Pages from the main branch

The root `index.html` opens the showroom in `dist/`. The `.nojekyll` file makes GitHub serve the existing static files directly.

Enable hosting once in [Settings → Pages](https://github.com/yis4u/Car/settings/pages):

1. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
2. Select **main** and **/ (root)**, then click **Save**.
3. Wait for the Pages deployment to finish, then open **https://yis4u.github.io/Car/**.

Future pushes to `main` publish automatically after Pages is enabled. The repository's Code tab displays the source files; GitHub Pages displays the running website.

### Other static hosts

Deploy the contents of `dist/` to a static host. `.openai/hosting.json` holds the identity and output-directory settings for the accompanying private Sites deployment. All application asset links are relative, so subdirectory hosting is supported. No environment variables or secrets are required.
