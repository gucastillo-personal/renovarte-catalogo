# API de serlaca — referencia (para spec 0009)

Fuente de datos de costo para la ingesta directa por API. Documenta el endpoint
tal como lo usa `www.serlaca.com`, observado el 2026-09-10.

> **Uso previsto:** solo desde `scripts/ingest.ts`, corriendo localmente (o en un
> GitHub Action). Nunca desde el navegador ni desde el runtime de Vercel
> (constitution §II). Credenciales en `.env.local`, sin `NEXT_PUBLIC_`.

---

## Endpoint

```
POST https://api.serlaca.com/Products/ReadProducts
```

### Headers

| Header | Valor | Nota |
|---|---|---|
| `content-type` | `application/json` | requerido |
| `accept` | `application/json` | |
| `apikey` | `<SERLACA_API_KEY>` | **secreto** — `.env.local` |
| `username` | `<SERLACA_LACA_ID>` (ej. `34797703`) | nº de socia LACA de RenovArte |
| `origin` | `https://www.serlaca.com` | el server valida origen; enviarlo siempre |
| `referer` | `https://www.serlaca.com/` | idem |

> El `user-agent` de navegador y los `sec-ch-ua*` del curl de ejemplo no parecen
> necesarios; se prueba sin ellos y se agregan solo si la API responde 403.

### Body (JSON)

```json
{
  "currentPage": 1,
  "productLineCodes": [],
  "productCompositionIds": [],
  "productNecessityIds": [],
  "productCategoryIds": [],
  "productUseInIds": [],
  "searchText": "",
  "lacaId": "<SERLACA_LACA_ID>"
}
```

| Campo | Para la ingesta |
|---|---|
| `currentPage` | 1..`totalPages` — se itera (ver Paginación) |
| `productCategoryIds` | `[]` = todo el catálogo. El ejemplo usó `[1]` (una categoría). **A confirmar** que `[]` trae todo; si no, enumerar ids. |
| `productLineCodes`, `productCompositionIds`, `productNecessityIds`, `productUseInIds` | `[]` (sin filtro) |
| `searchText` | `""` |
| `lacaId` | mismo valor que el header `username` |

---

## Paginación

Respuesta envuelta en `payload`:

```jsonc
{
  "payload": {
    "currentPage": 7,
    "totalPages": 13,
    "pageSize": 12,      // 12 ítems por página
    "totalItems": 152,
    "hasPrevious": true,
    "hasNext": true,
    "dataObjects": [ /* productos */ ],
    "urlFile": null
  },
  "error": null
}
```

Estrategia: pedir `currentPage: 1`, leer `totalPages`, pedir 2..N (o mientras
`payload.hasNext`). Acumular `dataObjects`. Si `error !== null` → abortar.
Reintentos acotados para 429/5xx (spec 0009 AC-4).

---

## Objeto producto (`payload.dataObjects[i]`)

### Campos que usamos

| Campo API | Tipo | → modelo | Transformación |
|---|---|---|---|
| `productCode` | string | `id` / `codigo` | tal cual (`"510500003"`) |
| `name` | string | `nombre` | colapsar espacios; título si viene TODO EN MAYÚSCULAS |
| `productLine.name` | string | `categoria` | tal cual (`"Antiage"`, `"Pieles Grasas"`, `"Teens"`) |
| `productSize.size` + `productSize.measurementCode` | number + string | `presentacion` | `` `${size} ${code.toLowerCase()}` `` → `"250 g"`, `"70 ml"`, `"3.5 g"` |
| `detail` | string (HTML) | `descripcion` | decodificar entidades + quitar tags + colapsar `\r\n`/espacios |
| `price` | number | **`precio_costo`** | es el **costo** de RenovArte (cuenta de distribuidora, con IVA). Ej. `22600` |
| `imageURL` | string | `imagen` | ruta relativa; URL absoluta = `<SERLACA_IMAGE_BASE><imageURL>` |
| `professionalExclusive` | bool | filtro | `true` → se excluye del catálogo |

### Precio

La cuenta de serlaca de RenovArte es de **distribuidora**, así que el `price` que
devuelve la API **ya es el costo** de RenovArte (con IVA). No hay descuento.

```
precio_costo = price
precio_venta = round(price × (1 + MARGIN_PERCENT / 100))
```

`MARGIN_PERCENT_*` va por env (`.env` / `.env.local`), sin `NEXT_PUBLIC_`.
`priceSImp` (ese `price` sin IVA 21%, ≈ `price / 1.21`) **no se usa**.

### Campos que ignoramos

`subtitle`, `description` (siempre `null` en la muestra — usar `detail`),
`composition`, `productCompositions`, `productProtocols`, `rating*`,
`latestRatings`, `points`, `basePoints`, `pointsType`, `productByPdfs`,
`productCategory` (null), `productUsabilities`, `productNecessitiesOrFunctions`
(vacíos en la muestra), `productColor`, `productBaseCode`, `relatedProducts`,
`imageUrls` (vacío), `videoURL`, `infoUrl`, `bestSeller`, `forCabinet`,
`forHome`, `visible`.

### Datos útiles no usados aún

- `productLine.productLineId` (`"0104"`) y `productLine.color` (`"#F0587F"`) —
  código y color por categoría; podría alimentar el `CategoryNav` de spec 0003.
- `infoUrl` — link al catálogo público de LACA por producto.

---

## Gotchas observados

1. **`visible: false` en TODOS los productos de la muestra.** Si se filtrara por
   `visible`, el catálogo quedaría vacío → por ahora se ignora el campo.
2. **`detail` es HTML con entidades** (`&iacute;`, `&oacute;`, `&ntilde;`,
   `&trade;`, `&nbsp;`, `<p>`, `<strong>`, `<br />`, `\r\n`). Hay que
   decodificar + limpiar.
3. **`name` inconsistente**: algunos TODO MAYÚSCULAS
   (`"MASCARA SHOCK ANTIAGE X 250 G"`), otros mixto
   (`"Perfect Pore con Ácido Salicílico x100ml"`).
4. **No hay campo de oferta/promoción.** `en_oferta` se resolverá aparte
   (default `false` + override manual).
5. **`imageURL` es relativo** al file server de serlaca; se referencia como URL
   remota absoluta (`SERLACA_IMAGE_BASE + imageURL`).
7. **Duplicados por presentación**: `506120004` (100 ml) y `506120003` (235 ml)
   son el mismo producto en distinto tamaño, con `productCode` distinto. Se
   tratan como productos separados (cada uno tiene su código).

---

## Decisiones (2026-09-10)

1. **Costo:** `precio_costo = price` (cuenta de distribuidora, con IVA). **Sin
   descuento.** `precio_venta = round(price × (1 + MARGIN_PERCENT/100))`.
2. **`professionalExclusive: true` → se EXCLUYEN** de la ingesta. No entran a
   `products.json`.
3. **Imágenes: URL remota.** `imagen = SERLACA_IMAGE_BASE + imageURL` (absoluta,
   sin descargar). `SERLACA_IMAGE_BASE` por env; hay que habilitar el host en
   `next.config.ts` (`images.remotePatterns`). Si `imageURL` es `null` →
   `/img/placeholder.svg`.
4. **`en_oferta`: default `false`.** Override manual se resuelve más adelante
   (no en 0009).

## Confirmado en la corrida real (2026-09-10)

- `productCategoryIds: []` trae **todo el catálogo**: 434 productos crudos en 37
  páginas → 384 tras filtrar 50 `professionalExclusive`.
- Las imágenes **NO** están en `api.serlaca.com` (404). Se sirven desde
  `https://www.laboratoriolaca.com` + `imageURL` (mismo path `/files/Products/…`).
  `SERLACA_IMAGE_BASE=https://www.laboratoriolaca.com`; `next.config.ts`
  `remotePatterns` incluye `www.laboratoriolaca.com` y `laboratoriolaca.com`.

## Impacto en specs existentes

- **0008 (digitalizar precios públicos LACA del PDF):** sigue **deprecada**. Con
  este modelo `price` es el **costo** de RenovArte, no el precio público. La
  regla del PRD "precio propio por debajo del público de LACA" queda **en
  pausa** (no tenemos ese precio en los datos); se reabre 0008 sólo si el
  negocio quiere esa comparación.
- **0007 (reporte de márgenes):** su columna vs. precio público de LACA queda
  pendiente de una fuente para ese precio.
