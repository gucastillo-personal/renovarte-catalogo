# RFC-0001 — Arquitectura del catálogo web RenovArte

| | |
|---|---|
| **Estado** | Aceptado |
| **Fecha** | 2026-09-10 |
| **PRD relacionado** | [PRD — Catálogo RenovArte](../PRD-catalogo-renovarte.md) |
| **Reemplaza** | — |
| **Enmiendas** | 2026-09-10 — §2.2: la API de serlaca (`Products/ReadProducts`) es fuente de ingesta soportada, no solo el export CSV manual (ver [spec 0009](../../specs/0009-api-ingest/spec.md)). 2026-09-11 — §2.4: campos opcionales `precio_regular` / `descuento_pct` para precio de oferta (ver [spec 0007](../../specs/0007-offer-pricing/spec.md)) |

## 1. Contexto

Según el PRD, necesitamos un catálogo web público (sin carrito) para revender productos de LACA con precio propio (costo + margen), manteniendo el costo y el margen fuera de la vista pública, con actualización manual de datos y costo de infraestructura $0.

Tenemos dos fuentes de datos:
1. **Costo real**: export CSV desde la API interna de serlaca (`api.serlaca.com/Products/ReadProducts`), autenticado con API key propia.
2. **Precio público de LACA**: catálogo PDF oficial (precio de lista/oferta al consumidor), usado como referencia de mercado, no como precio propio.

## 2. Decisión

### 2.1 Stack
- **Next.js** (App Router) como framework React — permite SEO real vía SSG/SSR, a diferencia de una SPA pura.
- **Tailwind CSS** para estilos, con paleta extraída del logo (verde salvia / beige).
- **Sin base de datos**: los datos viven en un archivo `products.json` estático, generado por un script de ingesta.
- **Vercel** como hosting (free tier, deploy automático por `git push`, apto para Next.js sin configuración adicional).

### 2.2 Flujo de datos

```
CSV serlaca (costo) ──┐
                       ├──> scripts/ingest.ts ──> public/data/products.json   (público)
JSON precios LACA ─────┘         │
   (referencia,                  └──> data/private/margin-report.csv          (privado, gitignored)
    del PDF)
```

El script de ingesta corre **localmente**, nunca en el servidor de producción. Genera dos salidas con propósitos y niveles de acceso distintos:

- `public/data/products.json`: consumido por la web. Contiene únicamente campos seguros para exponer (nombre, categoría, descripción, imagen, `precio_venta` ya calculado).
- `data/private/margin-report.csv`: uso interno exclusivo del dueño del negocio. Contiene costo, margen aplicado y comparación contra el precio público de LACA. **No se commitea al repositorio** (incluido en `.gitignore`).

> **Enmienda 2026-09-10 (spec 0009).** La fuente de costo de `scripts/ingest.ts`
> puede ser **(a)** un export CSV local (`data/raw/serlaca_export.csv`,
> implementado en [spec 0002](../../specs/0002-ingest-script/spec.md)) **o
> (b)** la API de serlaca `Products/ReadProducts` directamente, autenticada con
> `SERLACA_API_KEY` (en `.env.local`, sin prefijo `NEXT_PUBLIC_`, nunca en
> Vercel). Ambas rutas producen las mismas filas de costo y comparten la misma
> pipeline de transformación/validación y las mismas salidas. La API es la ruta
> por defecto; el CSV queda como fallback offline. El script sigue corriendo
> **localmente** (o en un GitHub Action programado — fuera de este RFC); **no**
> se introduce fetch en runtime ni en Vercel (mantiene "sin backend en runtime",
> §3).

Diagrama actualizado:

```
API serlaca (costo)  ──┐   [SERLACA_API_KEY]
  ó CSV local (costo) ──┤
                        ├──> scripts/ingest.ts ──> public/data/products.json   (público)
JSON precios LACA  ─────┘         │
   (referencia, del PDF)          └──> data/private/margin-report.csv          (privado, gitignored)
```

### 2.3 Cálculo de precio

```
precio_venta = round(costo × (1 + margen% / 100))
```

El margen se define por variable de entorno **sin prefijo `NEXT_PUBLIC_`**:

```bash
MARGIN_PERCENT_DEFAULT=20
MARGIN_PERCENT_ANTIAGE=30        # opcional, override por categoría
```

Motivo de no usar `NEXT_PUBLIC_`: cualquier variable con ese prefijo en Next.js se incluye en el bundle de JavaScript que se descarga en el navegador del cliente. Como estas variables solo las necesita el script de ingesta (que corre en Node, en la máquina del desarrollador, nunca en el cliente), no hay razón para exponerlas, y hacerlo sería un riesgo de seguridad de negocio (permitiría inferir costo y margen).

### 2.4 Modelo de datos

**Producto público** (`products.json`):
```json
{
  "id": "545300004",
  "proveedor": "LACA",
  "categoria": "Antiage",
  "nombre": "Complejo Antiage con Omega Plus",
  "presentacion": "50g",
  "descripcion": "Textura sedosa, otorga una segunda piel luminosa.",
  "precio_venta": 35280,
  "imagen": "/img/laca/545300004.jpg",
  "en_oferta": false,
  "tags": ["día", "antiage"]
}
```

**Reporte interno** (`margin-report.csv`, no público):
```csv
codigo,nombre,costo,margen_%,precio_venta,precio_publico_laca,diferencia_$,diferencia_%
545300004,Complejo Antiage Omega Plus,28000,26,35280,39200,3920,10.0%
```

El campo `proveedor` está presente desde el día uno del modelo, aunque hoy solo haya un proveedor cargado (LACA), para no requerir un cambio de esquema cuando se sume el segundo proveedor (ver PRD, fase 4).

> **Enmienda 2026-09-11 (spec 0007 — precio de oferta).** Dos campos
> **opcionales**, presentes solo cuando el producto está en oferta con
> descuento (`data/offers.json`, `descuento_pct > 0` — spec 0005):
>
> ```json
> {
>   "...": "...",
>   "precio_venta": 24408,
>   "precio_regular": 27120,
>   "descuento_pct": 10,
>   "en_oferta": true
> }
> ```
>
> `precio_venta` sigue siendo el precio final (el que se cobra); `precio_regular`
> es el precio sin la promo, para mostrar "antes / ahora" en la UI. Ninguno de
> los dos es costo ni margen — siguen sin aparecer en ningún artefacto público
> (constitution §I). Las specs ex-0007 (reporte de márgenes) y ex-0008
> (referencia de precios públicos de LACA) se eliminaron; el `margin-report.csv`
> descripto abajo queda como diseño original, sin spec activa.

### 2.5 Estructura de carpetas

```
renovarte-catalogo/
├── .env.local                          # MARGIN_PERCENT_* (gitignored)
├── .gitignore                          # .env.local, data/raw, data/private
├── data/
│   ├── raw/serlaca_export.csv          # gitignored
│   ├── reference/laca_precios_publicos.json   # SÍ se commitea (dato público de mercado)
│   └── private/margin-report.csv       # gitignored
├── scripts/
│   └── ingest.ts
├── public/
│   ├── data/products.json              # generado, consumido por la app
│   └── img/laca/*.jpg
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── categoria/[slug]/page.tsx
│   │   └── producto/[id]/page.tsx
│   ├── components/{ProductCard,FilterBar,CategoryNav}.tsx
│   └── lib/{products.ts,types.ts}
└── README.md
```

### 2.6 Script de ingesta (referencia de implementación)

```ts
// scripts/ingest.ts
import fs from "fs";
import { parse } from "csv-parse/sync";
import "dotenv/config";

const MARGIN_DEFAULT = Number(process.env.MARGIN_PERCENT_DEFAULT ?? 20);

const costos = parse(fs.readFileSync("data/raw/serlaca_export.csv", "utf-8"), { columns: true });
const referenciaLaca = JSON.parse(fs.readFileSync("data/reference/laca_precios_publicos.json", "utf-8"));

function getMargin(categoria: string): number {
  const key = `MARGIN_PERCENT_${categoria.toUpperCase().replace(/\s/g, "_")}`;
  return Number(process.env[key] ?? MARGIN_DEFAULT);
}

const productosPublicos: any[] = [];
const reporteInterno: any[] = [];

for (const item of costos) {
  const margen = getMargin(item.categoria ?? "default");
  const costo = Number(item.precio_costo);
  const precioVenta = Math.round(costo * (1 + margen / 100));
  const ref = referenciaLaca[item.codigo];

  productosPublicos.push({
    id: item.codigo,
    proveedor: "LACA",
    categoria: item.categoria,
    nombre: item.nombre,
    presentacion: item.presentacion,
    precio_venta: precioVenta,
    imagen: `/img/laca/${item.codigo}.jpg`,
  });

  if (ref) {
    const diffAbs = ref.precio_publico_laca - precioVenta;
    reporteInterno.push({
      codigo: item.codigo,
      nombre: item.nombre,
      costo,
      margen_pct: margen,
      precio_venta: precioVenta,
      precio_publico_laca: ref.precio_publico_laca,
      diferencia_$: diffAbs,
      diferencia_%: ((diffAbs / ref.precio_publico_laca) * 100).toFixed(1),
    });
  }
}

fs.writeFileSync("public/data/products.json", JSON.stringify(productosPublicos, null, 2));
// escribir reporteInterno como CSV en data/private/margin-report.csv
```

## 3. Consecuencias

**Positivas:**
- Costo de infraestructura $0 (sin DB, sin backend en runtime, hosting free tier).
- Superficie de ataque mínima para filtración de costo/margen: al no existir esos datos en ningún artefacto público, no hay forma de que se filtren por un error de UI.
- Arquitectura lista para multi-proveedor sin refactor de esquema.
- El reporte de márgenes (`margin-report.csv`) le da al negocio una herramienta objetiva para fijar precios, no solo al catálogo web.

**Negativas / trade-offs aceptados:**
- La actualización de catálogo es manual (correr script + `git push`), no hay panel de administración. Aceptado como parte del alcance de Fase 1 (ver PRD, sección 4.2).
- Sin base de datos, cualquier feature futura que necesite estado dinámico (carrito, stock en tiempo real) va a requerir agregar backend — evaluado y aceptado como parte de fases futuras, no de esta.

## 4. Alternativas consideradas

| Alternativa | Por qué no se eligió |
|---|---|
| CRA / Vite (SPA pura) en vez de Next.js | Sin SSG/SSR no hay buen SEO para las fichas de producto, y Next.js sigue siendo React |
| Base de datos (Postgres/Supabase) desde el día 1 | Complejidad y (eventual) costo innecesarios para un catálogo de solo lectura actualizado manualmente |
| Exponer margen vía `NEXT_PUBLIC_MARGIN_PERCENT` | Filtra información de negocio sensible al bundle del cliente; ver sección 2.3 |
| Mostrar precio_lista_laca en el JSON público desde el inicio | Válido como estrategia de marketing ("antes/ahora"), pero se deja como decisión de negocio explícita a tomar después, no default (ver PRD RNF-03) |

## 5. Roadmap de implementación

1. Setup Next.js + Tailwind + estructura de carpetas (sección 2.5).
2. Script de ingesta con dataset de prueba chico (10-20 productos).
3. Digitalizar `laca_precios_publicos.json` desde el catálogo PDF.
4. Componentes UI: grilla, tarjeta, filtros, buscador, ficha de producto.
5. Deploy en Vercel, validar flujo completo end-to-end.
6. (Fuera de este RFC) Carrito + pagos, panel admin, multi-proveedor activo — requieren RFCs propios.
