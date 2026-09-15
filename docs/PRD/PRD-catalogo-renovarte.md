# PRD — Catálogo Web RenovArte

| | |
|---|---|
| **Estado** | Draft |
| **Autor** | RenovArte |
| **Fecha** | 2026-09-10 |
| **RFC relacionado** | [RFC-0001 — Arquitectura del catálogo](../rfc/0001-arquitectura-catalogo.md) |

---

> **Enmienda (2026-09-14):** se agregan **RF-11** y **RF-12** — una sección
> de misión/marca ("nosotros") en la home, promovida a bloque principal
> (lo primero que ve el visitante), con el catálogo de productos pasando a
> secundario (visible, pero después). Detalle y criterios de aceptación en
> [`specs/0011-mision-home/spec.md`](../../specs/0011-mision-home/spec.md).
> No reemplaza ni reduce el catálogo (RF-01 a RF-04 siguen intactos) — es
> un cambio de jerarquía/orden en la home, no de alcance funcional del
> catálogo.

---

## 1. Problema

RenovArte revende productos de LACA (y a futuro otros proveedores) de forma informal, sin un catálogo propio online. Esto genera:
- Falta de un canal digital propio para mostrar el catálogo completo de forma ordenada.
- Dependencia de listas de precios manuales (WhatsApp, PDF) para comunicar productos y precios a clientes.
- Sin forma de aplicar y sostener una política de precios propia (margen sobre costo) de manera consistente y actualizable.

## 2. Objetivo

Lanzar un catálogo web público donde los clientes de RenovArte puedan **ver y explorar** el catálogo de productos disponibles, con precios propios (costo + margen), sin funcionalidad de compra en esta primera versión.

### 2.1 Objetivos de negocio
- Tener presencia digital propia, con marca (logo RenovArte) y diseño cuidado.
- Poder comunicar precios de forma consistente y fácil de actualizar cuando LACA cambia su lista.
- Sostener un margen competitivo, siempre por debajo del precio público de LACA, de forma auditable.
- Dejar la base técnica lista para sumar más proveedores y, más adelante, venta online.

### 2.2 Objetivo secundario (no funcional para el negocio, pero real)
- Servir como pieza de portfolio del desarrollador (código prolijo, desplegado, documentado).

## 3. Usuarios / audiencia

| Usuario | Necesidad |
|---|---|
| Cliente final (comprador de productos de skincare/cosmética) | Ver el catálogo completo, buscar por categoría o producto, ver precio y foto, sin fricción de login/carrito |
| Admin (dueño de RenovArte) | Actualizar precios y productos cuando cambia la lista de LACA, sin depender de un developer para cada cambio de precio |

No hay, en esta fase, un rol de "cliente logueado" ni checkout.

## 4. Alcance

### 4.1 Dentro de alcance (Fase 1)
- Home con grilla de productos.
- Filtro por categoría (Antiage, Protección solar, Corporales, Cuidados básicos, etc. — según el catálogo LACA).
- Buscador simple por nombre de producto.
- Ficha de producto individual (imagen, descripción, presentación, precio, categoría).
- Indicador visual de "oferta" cuando corresponda.
- Diseño responsive (mobile-first, la mayoría de los clientes van a entrar desde el celular).
- Branding con el logo e identidad visual de RenovArte.
- Carga/actualización de catálogo vía script manual (no requiere panel de administración en esta fase).
- Carga de precios de referencia desde el PDF público de LACA (precio ABC y precio de lista), con revisión y decisión manual por producto (spec 0008).
- **(Enmienda)** Sección de misión/marca ("nosotros") en la home, ubicada como bloque principal, antes del catálogo de productos, con el copy de la identidad de marca de RenovArte.

### 4.2 Fuera de alcance (Fase 1)
- Carrito de compras y checkout.
- Pasarela de pago (Mercado Pago u otra).
- Registro/login de usuarios.
- Panel de administración con UI (la actualización de datos es vía script + CSV).
- Multi-proveedor activo (la arquitectura lo soporta, pero solo se carga LACA en esta fase).
- Stock en tiempo real / disponibilidad.
- **(Enmienda)** Presencia personal de Juli (fundadora, "cara de la marca"): foto, bio, firma. Se define en un feature futuro separado; esta fase usa solo el copy de marca, sin depender de esa pieza.

### 4.3 Explícitamente fuera de la vista pública
- Costo real de compra a LACA.
- Margen de ganancia aplicado.
- Cualquier dato que permita a un cliente inferir el costo o margen de RenovArte.

## 5. Requisitos funcionales

| ID | Requisito |
|---|---|
| RF-01 | El sistema debe mostrar una grilla de productos con imagen, nombre, presentación y precio. |
| RF-02 | El usuario debe poder filtrar productos por categoría. |
| RF-03 | El usuario debe poder buscar productos por texto (nombre). |
| RF-04 | El usuario debe poder acceder a una ficha de detalle por producto. |
| RF-05 | El sistema debe marcar visualmente los productos en oferta. |
| RF-06 | El precio mostrado debe calcularse a partir del costo real más un margen configurable, nunca mostrar el costo. |
| RF-07 | El catálogo debe poder actualizarse corriendo un script local que regenera el archivo de datos consumido por la web. |
| RF-08 | El margen aplicado debe ser configurable por variable de entorno, sin tocar código. |
| RF-09 | Debe existir un reporte interno (no público) que compare precio de venta propio vs. precio público de LACA, para decisiones de pricing. |
| RF-10 | El sistema debe poder incorporar precios de referencia desde el PDF público de LACA (por producto: Precio Profesional, Precio ABC y Precio Catálogo) y permitir al admin elegir, producto por producto, cuál de los precios sugeridos (ABC o Catálogo) usar como precio de venta publicado — por defecto el precio ABC. El Precio Profesional (lo que paga el revendedor) es información sensible tipo costo: solo se usa como referencia local para ver el margen implícito, nunca se commitea ni se puede publicar como precio de venta. |
| RF-11 *(enmienda 2026-09-14)* | La home debe presentar, como bloque principal — lo primero y más prominente que ve el visitante, antes que cualquier producto — una sección de misión/marca de RenovArte con el mensaje de identidad de marca definido por el negocio (basado en la primera publicación de Instagram de @renovarte_by_juli). |
| RF-12 *(enmienda 2026-09-14)* | El catálogo de productos (grilla, filtro por categoría, buscador — RF-01 a RF-04) debe seguir mostrándose en la home, como contenido secundario, después de la sección de misión, sin perder ninguna funcionalidad existente. |

## 6. Requisitos no funcionales

| ID | Requisito |
|---|---|
| RNF-01 | Costo de hosting/infraestructura $0 en esta fase (free tier). |
| RNF-02 | Tiempo de carga inicial rápido (catálogo estático, sin backend/DB en runtime). |
| RNF-03 | El costo, margen y precio de lista de LACA no deben estar presentes en ningún archivo público ni en el bundle de JavaScript enviado al navegador. |
| RNF-04 | El sitio debe ser responsive y usable en mobile. |
| RNF-05 | El código debe quedar en un repositorio propio, documentado, apto para mostrarse como portfolio. |

## 7. Métricas de éxito (Fase 1)

Al no haber compra, el éxito de esta fase es cualitativo/operativo:
- El catálogo completo de LACA (o un subconjunto representativo) está cargado y navegable.
- El flujo de actualización de precios (bajar CSV → correr script → deploy) toma menos de 15 minutos.
- El sitio está desplegado en una URL pública y accesible desde mobile.

## 8. Riesgos

| Riesgo | Mitigación |
|---|---|
| Exponer costo/margen por error en el bundle público | Separación estricta de salidas (pública vs. privada) definida en el RFC; nunca usar `NEXT_PUBLIC_` para datos sensibles |
| Dependencia del formato del CSV de serlaca (puede cambiar) | Script de ingesta aislado y con validación de columnas esperadas |
| Catálogo desactualizado si no se corre el script a tiempo | Documentar el proceso en el README; evaluar automatización en fase futura |
| Elegir precio ABC o Catálogo del PDF sin aplicar margen propio puede vender sin margen sobre el costo real | La revisión (spec 0008) muestra el precio actual (costo + margen) y el margen implícito de cada opción (contra Precio Profesional) antes de decidir; la elección es explícita y por producto, nunca automática para todo el catálogo |
| El PDF trae Precio Profesional (costo del revendedor) mezclado con los precios públicos — tratarlo igual que ABC/Catálogo terminaría commiteando un dato de costo | Precio Profesional se extrae a un archivo gitignorado (mismo tratamiento que `data/raw/`); solo ABC y Catálogo llegan a `data/reference/` (committed) |

## 9. Fases futuras (fuera de este PRD, mencionadas para contexto)
- Fase 2: carrito + checkout con Mercado Pago.
- Fase 3: panel de administración con UI para cargar/editar productos sin CSV manual.
- Fase 4: multi-proveedor activo con más de una marca en simultáneo.

## 10. Referencias
- RFC-0001 — Arquitectura técnica del catálogo (detalle de implementación de este PRD).
- Catálogo LACA Aniversario 2026/2027 (fuente de referencia de precios públicos).
- PDF de precios LACA (precio ABC + precio de lista) — fuente de datos de la spec 0008.
