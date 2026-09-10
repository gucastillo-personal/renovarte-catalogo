# 0006 — Branding · Tasks

⛔ = necesita el archivo de logo real (lo pasa el usuario).

## Sin dependencia del logo

- [x] T1 — `src/app/globals.css`: ajustar escalas `sage`/`beige` a los hex del
  logo; sacar el comentario de "placeholder". **Check:** `pnpm build`.
- [x] T2 — Tipografía: cargar display serif + body sans con `next/font` en
  `layout.tsx`; `--font-serif` en `@theme`; aplicar serif a `h1`. **Check:**
  `pnpm build`, sin fetch externo de fuentes.
- [x] T3 — `src/app/layout.tsx`: `metadata` (`metadataBase`, `openGraph`,
  `twitter`, `applicationName`) + `export const viewport` (`themeColor`,
  `colorScheme`). **Check:** `<head>` trae og/twitter tags.
- [x] T4 — `src/app/manifest.ts`: name, short_name, `theme_color`,
  `background_color`, `display: "standalone"`, icons (placeholder hasta ⛔).
  **Check:** `/manifest.webmanifest` responde.
- [x] T5 — `docs/brand.md`: paleta (hex + uso), tipografía, uso del logo,
  radios/espaciado. **Check:** existe y linkeado desde el README (AC-5).
- [x] T6 — `tests/unit/no-stray-hex.test.ts`: 0 `#hex` en `src/components/**` /
  `src/app/**` salvo `globals.css` (AC-2). Arreglar los que aparezcan.
  **Check:** `pnpm test`.
- [x] T7 — `tests/e2e/catalog.spec.ts`: og/twitter/icon meta en `/`; sin
  h-scroll a 390/768/1280 en home + categoría + ficha (AC-3, AC-4). **Check:**
  `pnpm test:e2e`.

## Con el logo (⛔)

- [x] T8 — `public/brand/logo.svg` (+ `logo-mark.svg` si hace falta). Header:
  wordmark de texto → `<Image>`/SVG del logo, link a `/`, `alt="RenovArte"`.
  **Check:** logo en el header en todas las rutas (AC-1).
- [x] T9 — `src/app/icon.svg` (o `icon.png` 512²) + `src/app/apple-icon.png`
  180². **Check:** favicon en la pestaña; `<link rel="apple-touch-icon">`.
- [x] T10 — `src/app/opengraph-image.tsx` con `ImageResponse` (marca + tagline +
  fondo beige). **Check:** `/opengraph-image` devuelve una PNG 1200×630.
- [x] T11 — `tests/e2e/catalog.spec.ts`: logo en el header en `/`,
  `/categoria/<slug>`, `/producto/<id>`, `/ofertas`. **Check:** `pnpm test:e2e`.

## Cierre

- [x] T12 — `pnpm gate` verde; QA responsive manual 390/768/1280.
- [x] T13 — `specs/README.md`: 0006 → Built; matriz RNF-04/05 → afinado.
