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

> **Enmienda (2026-09-17):** se agrega **RF-13** — navegación/filtro de
> categorías en dos niveles (agrupación de alto nivel — Cuidado facial,
> Cuidado corporal, Cosmética, y un grupo genérico de fallback — y dentro
> de cada una las categorías específicas ya existentes), en reemplazo de la
> lista plana única de hoy. Origen: LACA/Serlaca distingue estos grupos en
> su propia API (`productCategoryIds`), pero esa distinción no llega hoy a
> `products.json` — depende de que `renovarte-pipeline` publique el campo
> `codCategoria` (enmienda de schema del lado de ese repo, decisión de
> negocio ya cerrada por el CTO/CEO el 2026-09-17; ver
> [`specs/0015-agrupacion-categorias/spec.md`](../../specs/0015-agrupacion-categorias/spec.md)
> acá y el spec espejo `0001` en `renovarte-pipeline`). No reemplaza RF-02
> (seguir filtrando por categoría específica sigue siendo requisito).

> **Enmienda (2026-09-21):** se agregan **RF-14**, **RNF-06** y **RNF-07** —
> un chat conversacional embebido ("Colibrí", nombre elegido por el
> CTO/CEO) donde el visitante indica tipo de piel y presupuesto, y recibe 3
> opciones de combo de cremas (más barato / medio / premium) armadas
> **siempre** a partir de productos reales del catálogo publicado, nunca
> inventados. Motivación explícita del CTO/CEO, además del valor para el
> visitante: practicar RAG/embeddings y comunicación con LLMs vía API
> (cuenta de Anthropic/Claude ya existente) — un objetivo de aprendizaje
> legítimo, análogo al de `renovarte-events` (POC de arquitectura
> event-driven). El CTO/CEO ya se imagina esto construido como 2 proyectos
> nuevos (uno para el websocket del chat, otro para la conexión con el/los
> LLM) además de la UI acá — **esa arquitectura no se decide en este PRD**,
> queda como contexto para la fase de RFC/diseño (ver
> [`specs/0016-chat-recomendador-cremas/spec.md`](../../../specs/0016-chat-recomendador-cremas/spec.md),
> sección "Preguntas abiertas", incluido un posible conflicto con
> `constitution.md §II.4` — "no database, no runtime backend" — que no se
> resuelve acá).
>
> **Nota de ubicación (2026-09-22):** esta feature toca 3 repos (este,
> `renovarte-chat-gateway` y `renovarte-colibri-rag`, los últimos 2 nuevos y
> todavía no creados) — el spec completo, `ux.md`, `plan.md`/`tasks.md` y los
> RFC técnicos viven centralizados en
> [`renovarte-parent/specs/0016-chat-recomendador-cremas/`](../../../specs/0016-chat-recomendador-cremas/spec.md),
> no en este repo. Acá solo queda el registro de requisitos (`RF-14`,
> `RNF-06..09`) y su historial de decisión — este repo se limita a lo que le
> toca mostrar.

> **Precisión (2026-09-21):** el CTO/CEO resolvió 5 de las 6 preguntas
> abiertas que dejaba la enmienda anterior. Se agrega **RNF-08** y se
> precisa **RF-14** (sin cambiar su numeración): (a) el runtime del chat
> (transporte en vivo, conexión al LLM, RAG) vive enteramente en 2
> proyectos nuevos fuera de este repo — `renovarte-catalogo` nunca aloja
> backend propio, solo lo consume como cliente desde el navegador, lo que
> **resuelve sin enmienda** la tensión con `constitution.md §II.4`: la
> invariante nunca se viola porque el runtime nunca vive acá; (b) cada
> combo es un paquete de 2 o más productos reales, nunca un único producto
> por nivel; (c) las opciones "más barato" y "medio" respetan el
> presupuesto declarado como techo, y "premium" puede superarlo pero nunca
> más de un 20%; (d) `renovarte-pipeline` y el schema de `products.json`
> no cambian para esta feature — el tipo de piel se infiere sobre campos
> de texto libre ya públicos (`nombre`, `descripcion`, `tags`), sin campo
> estructurado nuevo; (e) la topología queda confirmada en 2 proyectos
> nuevos (transporte del chat / conexión-RAG con el LLM), sin definir
> todavía nombres, repos ni stack — eso sigue siendo del RFC de diseño.
> Sigue **sin resolver** el techo de costo de uso de la API de Claude
> (tensiona con RNF-01) — se define recién en la fase de RFC/diseño, con
> aprobación del CTO/CEO ahí. Detalle en
> [`specs/0016-chat-recomendador-cremas/spec.md`](../../../specs/0016-chat-recomendador-cremas/spec.md)
> (en `renovarte-parent`).

> **Enmienda (2026-09-21b):** el CTO/CEO resolvió la última pregunta
> abierta de RF-14: se agrega **RNF-09** — techo de gasto mensual de la
> API del LLM de **USD 20/mes**; al alcanzarlo, el chat se deshabilita
> automáticamente (deja de generar gasto) mientras el resto del catálogo
> sigue funcionando con normalidad (misma garantía de RNF-07). Esto es una
> **excepción explícita y acotada al chat**, aprobada por el CTO/CEO, al
> invariante "$0 infraestructura" (RNF-01 / `constitution.md §II.5`), que
> sigue aplicando sin cambios al resto del catálogo (grilla, filtro,
> búsqueda, ficha de producto, hosting). El CTO/CEO también encuadró el
> chat explícitamente como ejercicio de aprendizaje (practicar RAG/
> embeddings/integración con LLMs) y **no** como una feature de
> optimización de ventas — ver `specs/0016-chat-recomendador-cremas/spec.md`
> (en `renovarte-parent`) §Alcance/Out para el detalle de qué queda fuera (analytics de
> conversión, A/B testing, etc.). No quedan preguntas abiertas para esta
> feature; pasa a fase de diseño/RFC.

> **Enmienda (2026-09-30):** se agregan **RF-15..RF-18** y **RNF-10..RNF-13**
> — carrito de compras y generación de **orden de compra**, desde el
> catálogo y desde los combos que propone Colibrí (RF-14), con la orden
> llegando por mail a una casilla propia de RenovArte. Necesidad textual
> del CTO/CEO: *"queremos sumar un carrito de compre que genere una orden
> de compra , tanto desde el menu de catalgo de productos como desde las
> opciones. porpuesta por nuestro bot. [...] el envio y la forma de pago
> se maneja despues por el momento no aceptamos medios de pagos dentro de
> la app [...] lo importeat ahora es que se pueda generar la orden. el
> pedido o la orden debe llegar a una casilla de mail propia de
> renovarte"*. Esto **mueve parcialmente** "Carrito de compras" de §4.2
> (fuera de alcance) a §4.1: entra carrito + orden; **siguen fuera**
> checkout con pago, pasarela de pago y definición de envío (se coordinan
> después, fuera del sitio). Implicancia de arquitectura, no resuelta acá:
> enviar el mail requiere un componente server-side que, por
> `constitution.md §II.4` y RNF-08, no puede vivir en este repo — RNF-10
> lo fija como requisito y el diseño concreto queda para la fase de RFC.
> Hay preguntas abiertas que bloquean diseño (datos de contacto, copia al
> visitante, casilla de destino, $0 infra). Spec completo — toca este repo
> y al menos un componente externo — centralizado en
> [`renovarte-parent/specs/0017-carrito-orden-compra/spec.md`](../../../specs/0017-carrito-orden-compra/spec.md);
> acá solo queda el registro de requisitos.

> **Precisión (2026-09-30b):** el CTO/CEO respondió las 5 preguntas
> bloqueantes de la enmienda anterior. Textual: *"1 si pidamos direccion y
> localidad 2 solo le damos un nuemro de orden , si tiene consulta scon la
> orden no puede mandar un email o contastacnos por md directo de
> instagram 3 los mail deven salir deven llegar aca
> renovartebyjuli@gmail.com de donde salir a defirnir lo que salga mas
> barato si aprovamos un tope, todo local, nuevo repo que se encagar de
> manejar la creacion de las ordenes, asi a futuro podemos expandir
> funcionalidad"*. Se precisan **RF-17**, **RF-18**, **RNF-10** y
> **RNF-12** (sin cambiar numeración) y se agrega **RNF-14**: (a) dirección
> y localidad son datos obligatorios de la orden; (b) sin copia al
> visitante por mail — solo número de orden en pantalla y canales de
> consulta (email / MD de Instagram de RenovArte); (c) destino
> **renovartebyjuli@gmail.com**, remitente a definir en diseño (el más
> barato); (d) se aprueba un **tope de costo** para el envío de órdenes —
> excepción explícita y acotada a esta feature a RNF-01/`constitution.md
> §II.5`, **monto todavía no definido** (bloquea la fase de RFC, no la de
> UX); (e) la creación/envío de órdenes vive en un **repo nuevo propio**
> dedicado a órdenes (no servicio de terceros), pensado para sumar
> funcionalidad a futuro — forma técnica en RFC. RNF-12 se reformula: como
> el email de RenovArte puede mostrarse al visitante para consultas, la
> protección no es ocultar la dirección sino que el destinatario se fija
> del lado del servidor y no puede elegirse desde el navegador. Detalle en
> [`renovarte-parent/specs/0017-carrito-orden-compra/spec.md`](../../../specs/0017-carrito-orden-compra/spec.md).

> **Precisión (2026-09-30c):** el CTO/CEO cerró lo que quedaba pendiente.
> Textual: *"Monto del tope mensual 20 usd , Qué quisiste decir con "todo
> local el manejo de las ordenes local, para el envio de mail si es costo
> bajo usar terceros.  exactamente nuestro instagran es
> renovarte_by_juli"*. Se precisan **RF-17**, **RNF-10** y **RNF-14** (sin
> cambiar numeración): (a) tope de costo del sistema de órdenes **USD
> 20/mes**, con el comportamiento al alcanzarlo ya propuesto (sin
> objeciones); (b) el manejo de las órdenes (creación, validación,
> anti-abuso, registro) es propio, en el repo nuevo; el **envío del mail**
> puede usar un proveedor de terceros de bajo costo, invocado desde ese
> repo y dentro del tope; (c) Instagram de RenovArte para consultas:
> **@renovarte_by_juli**. No quedan preguntas que bloqueen la fase de RFC.

> **Precisión (2026-09-30d):** en la gate de la fase de diseño, el CTO/CEO
> sumó un canal secundario de entrega de la orden. Textual: *"spec 17 si
> llegaramos a tener problemas con email speam stc el mecanismo secudnario
> es recivir la orden por el mismo canal de discort para no perder la
> orden si teneso problemas ocn el mail"*; y ante la pregunta de cuándo,
> con qué datos y a qué canal: *"siempre a los dos, canal privado nuevo, de
> acuerdo con las propuestas"*. Se agrega **RF-19** y se precisan **RF-18**
> y **RNF-12** (sin cambiar numeración): (a) cada orden llega **siempre**
> por mail **y** a un **canal privado nuevo de Discord** dedicado a
> órdenes (no el canal técnico de la POC de eventos de la spec 0001) —
> "solo si falla el mail" no alcanza, porque si el mail cae en spam el
> servidor no se entera; (b) el mensaje lleva la orden completa, con datos
> de contacto; (c) mismo número de orden en los dos canales, y un
> reintento nunca duplica ni el mail ni el mensaje; (d) sin costo ni
> margen en ningún canal; el webhook es secreto (nunca en el navegador ni
> en un repo); (e) aprobadas por el CTO/CEO: registro seudonimizado de
> órdenes por 90 días sin datos personales, y el email/teléfono del
> visitante solo en la sesión de la pestaña mientras está en /carrito.
> **Ley 25.326:** Discord pasa a ser otro lugar (además de Gmail) donde
> quedan datos personales, sin plazo de borrado salvo borrado manual —
> ver §8 y la pregunta abierta #12 de la spec. Detalle en
> [`renovarte-parent/specs/0017-carrito-orden-compra/spec.md`](../../../specs/0017-carrito-orden-compra/spec.md).

> **Precisión (2026-09-30e):** el CTO/CEO decidió sobre la retención y el
> acceso de los datos en Discord. Textual: *"Borrado automatico de lso
> mensajes a los 60 dias, el canal solo lo vamos a ver los
> propietarios"*. Se precisan **RF-19** y **RNF-12** (sin cambiar
> numeración): (a) los mensajes de órdenes del canal privado de Discord se
> **borran automáticamente a los 60 días**; (b) el canal es visible **solo
> para los propietarios** de RenovArte (configuración manual en Discord,
> 2FA recomendado). Además queda resuelto, sin objeción, que ante falla
> parcial la orden se confirma si al menos uno de los dos canales la
> aceptó. Siguen como pasos antes de producción: aviso de privacidad que
> mencione el canal, consulta profesional sobre AAIP/transferencia
> internacional y retención en la casilla de Gmail (spec 0017, pregunta
> #12).

> **Precisión (2026-09-30f):** el CTO/CEO decidió la retención en Gmail.
> Textual: *"sí, borrar los mails de Gmail a los 60 días"*. Se precisa
> **RNF-12** (sin cambiar numeración): los mails de órdenes en
> renovartebyjuli@gmail.com se borran a los 60 días, igual que los
> mensajes de Discord — política de retención y paso operativo de
> RenovArte (a mano, o automatizable con un filtro/Apps Script de Google
> fuera de los repos), no código. Antes de producción quedan solo el
> texto del aviso de privacidad y la consulta profesional opcional sobre
> AAIP/transferencia internacional.

> **Precisión (2026-10-05):** el CTO/CEO habló con la CEO de RenovArte, que
> pidió reducir lo que se le pide al visitante. Se precisan **RF-17**,
> **RF-18**, **RF-19** y **RNF-12** (sin cambiar numeración): (a) el
> formulario pide **solo el teléfono** y RenovArte comparte el suyo
> (1130579528, a confirmar si sirve para llamada y WhatsApp) para coordinar
> pago y envío; ya no se piden email, dirección ni localidad (reemplaza la
> decisión 2026-09-30b); (b) **se retiran** el borrado automático de los
> mensajes de Discord a los 60 días, la política de borrado de Gmail a los
> 60 días (2026-09-30e/f) y el aviso de privacidad del formulario; (c) se
> mantienen el canal de Discord solo para propietarios, el webhook como
> secreto, el registro seudonimizado de 90 días y que el navegador guarde
> los datos solo en la sesión de la pestaña. En este MVP no se prioriza la
> protección de datos personales, así que se acordó **pedir menos datos**.
> La protección de datos queda como deuda explícita (aviso de privacidad,
> transferencia internacional, AAIP). Decisión registrada en el
> [ADR-0020](../../../docs/decisions/ADR-0020-datos-personales-ordenes-mvp-nombre-y-telefono.md), que supersede al ADR-0017.

> **Precisión (2026-10-05b):** al revisar el recorte, el CTO/CEO precisó que
> además del teléfono hay que pedir **nombre y apellido**, para saber a
> quién se dirige RenovArte. Textual: *"además del número hay que pedir
> nombre y apellido para saber a quién nos estamos dirigiendo"*, en **un
> solo campo** *"para mayor rapidez"*. Se precisan **RF-17**, **RF-18** y
> **RNF-12** (sin cambiar numeración): el formulario tiene **dos campos
> obligatorios** ("Nombre y apellido" y teléfono), y nombre y teléfono son
> los únicos datos personales que viajan y que quedan en la sesión de la
> pestaña. Detalle en
> [`renovarte-parent/specs/0017-carrito-orden-compra/spec.md`](../../../specs/0017-carrito-orden-compra/spec.md)
> y en el [ADR-0020](../../../docs/decisions/ADR-0020-datos-personales-ordenes-mvp-nombre-y-telefono.md).

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
- **(Enmienda 2026-09-21)** Chat conversacional embebido ("Colibrí") que, a partir de tipo de piel y presupuesto declarados por el visitante, recomienda 3 combos de cremas (más barato / medio / premium) usando exclusivamente productos reales del catálogo publicado.
- **(Enmienda 2026-09-30)** Carrito de compras (sin login) al que se agregan productos desde el catálogo y combos completos propuestos por Colibrí, y generación de una orden de compra con datos de contacto del visitante, que llega por mail a una casilla propia de RenovArte. Pago y envío se coordinan después, fuera del sitio. *(Precisión 2026-09-30d)* La orden llega siempre, además, a un canal privado de Discord de RenovArte dedicado a órdenes (RF-19).

### 4.2 Fuera de alcance (Fase 1)
- ~~Carrito de compras y checkout.~~ **(Enmienda 2026-09-30)** El carrito y la orden de compra pasan a §4.1 (RF-15..RF-19). Siguen fuera: checkout con pago, cualquier medio de pago dentro del sitio, definición/cálculo de envío, stock/reserva, cuentas e historial de órdenes, panel de administración de órdenes. Ver `specs/0017-carrito-orden-compra/spec.md` (en `renovarte-parent`) §Alcance/Out.
- Pasarela de pago (Mercado Pago u otra).
- Registro/login de usuarios.
- Panel de administración con UI (la actualización de datos es vía script + CSV).
- Multi-proveedor activo (la arquitectura lo soporta, pero solo se carga LACA en esta fase).
- Stock en tiempo real / disponibilidad.
- **(Enmienda)** Presencia personal de Juli (fundadora, "cara de la marca"): foto, bio, firma. Se define en un feature futuro separado; esta fase usa solo el copy de marca, sin depender de esa pieza.
- **(Enmienda 2026-09-21)** Compra/checkout desde el chat, historial de conversación persistido o cuentas de usuario, derivación a un humano (WhatsApp/teléfono) desde el chat, panel de administración de prompts/embeddings, entrada/salida por voz, y cualquier tema de conversación fuera de recomendación de cremas del catálogo de RenovArte. Ver detalle completo en `specs/0016-chat-recomendador-cremas/spec.md` (en `renovarte-parent`).
- **(Enmienda 2026-09-21b)** Optimización de conversión/ventas, analytics de negocio y A/B testing de combos sobre el chat. El CTO/CEO encuadró explícitamente esta feature como ejercicio de aprendizaje (practicar RAG/embeddings/integración con LLMs), no como una herramienta para optimizar ventas — ese encuadre se mantiene mientras el techo de gasto (RNF-09) siga en USD 20/mes.

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
| RF-13 *(enmienda 2026-09-17)* | El usuario debe poder navegar/filtrar el catálogo en dos niveles: primero una agrupación de alto nivel de categorías (Cuidado facial, Cuidado corporal, Cosmética, y un grupo genérico de fallback para lo que no matchea ninguno de los tres, fuente: `codCategoria` en `products.json`), y dentro de cada grupo, las categorías específicas ya existentes (RF-02) — en vez de una única lista plana que mezcla todas las categorías. |
| RF-14 *(enmienda 2026-09-21, precisión 2026-09-21)* | El sitio debe ofrecer un chat conversacional embebido ("Colibrí") donde el visitante indica tipo de piel y presupuesto, y recibe 3 opciones de combo de cremas (más barato / medio / premium) — cada combo un paquete de 2 o más productos reales agrupados, nunca un único producto por nivel —, construidas exclusivamente con productos reales y vigentes del catálogo publicado — nunca un producto, precio o disponibilidad inventados. Las opciones "más barato" y "medio" no superan el presupuesto declarado por el visitante; "premium" puede superarlo, pero nunca en más de un 20%. |
| RF-15 *(enmienda 2026-09-30)* | El visitante, sin login ni cuenta, debe poder agregar productos del catálogo a un carrito accesible desde cualquier página del sitio, ver su contenido (nombre, presentación, precio unitario, cantidad, subtotal, total), cambiar cantidades, quitar productos y vaciarlo; el carrito se conserva al navegar y al recargar, en el mismo navegador. |
| RF-16 *(enmienda 2026-09-30)* | El visitante debe poder agregar al carrito, con una sola acción, cualquiera de los combos propuestos por Colibrí (RF-14) — todos sus productos, con el mismo nombre y precio mostrados en el combo —, sin perder la conversación en curso. |
| RF-17 *(enmienda 2026-09-30, precisiones 2026-09-30b/c, 2026-10-05, 2026-10-05b)* | El visitante debe poder generar una orden de compra a partir del carrito, dejando sus datos de contacto — obligatorios: nombre y apellido (un solo campo) y teléfono —, y recibir en pantalla una confirmación con el número de orden, que aclara que pago y envío se coordinan después con RenovArte e indica los canales para consultas (teléfono de RenovArte, email y MD de Instagram a @renovarte_by_juli). El visitante no recibe copia de la orden por mail. El flujo no pide ni procesa medios de pago ni define/calcula envío. |
| RF-18 *(enmienda 2026-09-30, precisiones 2026-09-30b/d, 2026-10-05b)* | Cada orden generada debe llegar por mail a la casilla de RenovArte **renovartebyjuli@gmail.com**, con número de orden, fecha/hora, datos de contacto del visitante (nombre y apellido y teléfono), detalle de productos (nombre, presentación, cantidad, precio unitario, subtotal) y total. El remitente se define en diseño (el más barato). Un reintento de la misma orden nunca genera un segundo mail ni un número de orden nuevo. |
| RF-19 *(nuevo, precisiones 2026-09-30d/e, 2026-10-05)* | Además del mail (RF-18), cada orden generada debe llegar **siempre** — no solo si el mail falla — a un **canal privado de Discord de RenovArte dedicado solo a órdenes** (distinto del canal técnico de la POC de eventos), visible solo para los propietarios de RenovArte, con el mismo número de orden y el mismo contenido que el mail, datos de contacto incluidos; un reintento nunca duplica el mensaje; los mensajes no se borran automáticamente en el MVP (ADR-0020). Objetivo: no perder la orden si el mail cae en spam. Si solo uno de los dos canales acepta la orden, la orden igual se confirma al visitante y la falla del otro queda registrada (spec 0017, AC-25). |

## 6. Requisitos no funcionales

| ID | Requisito |
|---|---|
| RNF-01 | Costo de hosting/infraestructura $0 en esta fase (free tier). |
| RNF-02 | Tiempo de carga inicial rápido (catálogo estático, sin backend/DB en runtime). |
| RNF-03 | El costo, margen y precio de lista de LACA no deben estar presentes en ningún archivo público ni en el bundle de JavaScript enviado al navegador. |
| RNF-04 | El sitio debe ser responsive y usable en mobile. |
| RNF-05 | El código debe quedar en un repositorio propio, documentado, apto para mostrarse como portfolio. |
| RNF-06 *(enmienda 2026-09-21)* | El chat no debe exponer, en ninguna respuesta ni en el tráfico de red inspeccionable desde el navegador, credenciales/API keys de terceros (LLM), ni costo/margen real de RenovArte — mismo invariante de RNF-03, extendido al chat. |
| RNF-07 *(enmienda 2026-09-21)* | Si el chat no está disponible, el resto del catálogo (grilla, filtro, búsqueda, ficha de producto — RF-01 a RF-04) debe seguir funcionando con normalidad. |
| RNF-08 *(nuevo, precisión 2026-09-21)* | El runtime del chat (transporte en vivo, conexión al LLM, RAG) debe vivir exclusivamente en servicios externos a `renovarte-catalogo`; este repo se mantiene 100% estático (sin backend/DB propio en runtime) y solo actúa como cliente que consume esos servicios desde el navegador — mismo invariante de `constitution.md §II.4`, extendido explícitamente al chat. |
| RNF-09 *(nuevo, enmienda 2026-09-21b)* | El gasto mensual de la API del LLM usado por el chat tiene un techo de **USD 20/mes**. Al alcanzar ese techo, el chat debe deshabilitarse automáticamente (sin seguir generando gasto), mientras el resto del catálogo (RF-01 a RF-04) sigue funcionando con normalidad, sin degradación — misma garantía de RNF-07. Esta es una excepción explícita y acotada al chat al invariante "$0 infraestructura" (RNF-01), aprobada por el CTO/CEO. |
| RNF-10 *(nuevo, enmienda 2026-09-30, precisiones 2026-09-30b/c)* | El manejo de las órdenes (creación, validación contra el catálogo, anti-abuso, registro) y la orquestación del envío del mail deben vivir en un **repo nuevo propio dedicado a órdenes** (decisión CTO/CEO: manejo propio, no un servicio de terceros que lo reemplace; pensado para expandir funcionalidad a futuro), fuera de `renovarte-catalogo`. El envío del mail en sí puede delegarse a un proveedor de terceros de bajo costo, invocado desde ese repo (nunca desde el navegador) y dentro del tope de RNF-14; este repo se mantiene 100% estático y solo actúa como cliente desde el navegador — mismo invariante de `constitution.md §II.4` / RNF-08, extendido a las órdenes. El carrito en sí es estado del navegador, no backend. Nombre, stack y hosting del repo nuevo se definen en RFC. |
| RNF-11 *(nuevo, enmienda 2026-09-30, precisión 2026-09-30d)* | Los productos y precios de una orden que llega a RenovArte deben corresponder al catálogo publicado vigente (`precio_venta`), aun si el navegador fue manipulado; y ni el mail ni el mensaje de Discord de la orden deben contener costo, margen ni precio de lista de LACA (mismo invariante que RNF-03). |
| RNF-12 *(nuevo, enmienda 2026-09-30, reformulado 2026-09-30b, precisiones 2026-09-30d/e/f, 2026-10-05, 2026-10-05b)* | Los datos de contacto del visitante no deben quedar expuestos públicamente ni commiteados en ningún repo, y solo viajan al repo de órdenes, a la casilla de RenovArte (sin borrado automático de los mails en el MVP) y al canal privado de Discord de órdenes, que solo ven los propietarios de RenovArte y sin borrado automático de los mensajes en el MVP; el registro de órdenes del repo nuevo es seudonimizado (sin datos personales) y conserva cada orden hasta 90 días; en el navegador del visitante solo pueden quedar su nombre y apellido y su teléfono, en la sesión de la pestaña y mientras esté en /carrito (para que la confirmación sobreviva a una recarga). El destinatario del mail y el canal/webhook de Discord se fijan del lado del servidor y **no pueden indicarse ni alterarse desde el navegador** (no se exige ocultar la dirección de RenovArte, que puede mostrarse como contacto para consultas); el webhook de Discord es un secreto (nunca en el navegador ni commiteado). El mecanismo de envío debe tener protección anti-abuso (límite de volumen por origen, rechazo de envíos automatizados triviales), que cubre los dos canales. |
| RNF-13 *(nuevo, enmienda 2026-09-30)* | Si el envío de órdenes falla o no está disponible, el visitante lo ve explícitamente, no pierde su carrito y puede reintentar — nunca se confirma una orden no recibida —; el resto del catálogo (RF-01..RF-04) y el chat (RF-14) siguen funcionando con normalidad (misma garantía que RNF-07). |
| RNF-14 *(nuevo, precisiones 2026-09-30b/c)* | El costo mensual del sistema de órdenes (repo nuevo + proveedor de envío de mail) tiene un techo de **USD 20/mes**, aprobado por el CTO/CEO — excepción acotada a esta feature al invariante "$0 infraestructura" (RNF-01 / `constitution.md §II.5`), independiente del techo de RNF-09 (no lo comparte). Al alcanzarlo: no se genera gasto adicional, el visitante ve que la orden no se envió sin perder el carrito, con canales de contacto alternativos, y el resto del sitio sigue funcionando. |

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
| *(2026-09-21, resuelto)* Un chat con LLM en vivo requiere algún backend/servicio con estado | Resuelto sin enmendar `constitution.md §II.4`: el runtime (transporte, LLM, RAG) vive en 2 proyectos nuevos fuera de este repo; `renovarte-catalogo` nunca aloja backend propio, solo lo consume como cliente desde el navegador (RNF-08) |
| *(2026-09-21)* El chat podría inventar/alucinar un producto, precio o combinación que no existe en el catálogo real | AC explícito de que toda recomendación debe verificarse contra `products.json` vigente antes de mostrarse; el mecanismo concreto (RAG u otro) se define en RFC |
| *(2026-09-21, resuelto 2026-09-21b)* Llamadas a la API de Claude no son gratis por volumen, lo que tensiona con RNF-01 ("$0 infra") | Resuelto por el CTO/CEO: techo de gasto mensual de USD 20/mes (RNF-09), con auto-deshabilitación del chat al alcanzarlo — excepción explícita y acotada al chat al invariante "$0 infra", el resto del catálogo no se ve afectado. El mecanismo concreto de medición/corte de gasto queda para la fase de RFC/diseño. |
| *(2026-09-30)* Enviar la orden por mail requiere un componente server-side, que choca con `constitution.md §II.4` ("no runtime backend") si viviera en este repo | RNF-10: el envío vive fuera de `renovarte-catalogo` (resolución por defecto de `renovarte-parent/specs/constitution.md §I.3`); *(2026-09-30b)* resuelto por el CTO/CEO: repo nuevo propio dedicado a órdenes, forma técnica en RFC |
| *(2026-09-30)* Un formulario público que dispara mails puede usarse para spam/abuso, y el costo del envío de mails puede romper "$0 infra" | RNF-12 (anti-abuso, destinatario fijo server-side) y RNF-14 (tope de costo de USD 20/mes aprobado por el CTO/CEO) |
| *(2026-09-30)* Un visitante (o un script) manipula precios/productos del carrito en el navegador y la orden llega con datos falsos | RNF-11: la orden se contrasta contra el catálogo publicado vigente antes de llegar a la casilla de RenovArte |
| *(2026-09-30)* Primera vez que el sitio recibe datos personales del visitante | RNF-12: no se publican ni commitean; *(2026-10-05)* se pide solo nombre y teléfono y se retira el aviso de privacidad (ADR-0020) |
| *(2026-09-30d)* El mail de la orden cae en spam y RenovArte no se entera | RF-19: entrega **siempre** duplicada a un canal privado de Discord dedicado a órdenes, mismo número de orden, sin duplicados por reintento |
| *(2026-09-30d)* Ley 25.326: con Discord, los datos personales del visitante quedan en un segundo servicio de terceros (además de Gmail), fuera de Argentina | Canal visible solo para los propietarios (2FA recomendado); registro propio seudonimizado a 90 días (RNF-12). *(2026-10-05, ADR-0020)* Se retiraron el borrado automático a 60 días de Discord y Gmail y el aviso de privacidad; se pide solo nombre y teléfono. **Deuda del MVP, antes de cualquier uso con volumen:** aviso de privacidad que mencione los canales y consulta profesional opcional sobre AAIP/transferencia internacional |
| *(2026-09-30d)* Filtración del webhook de Discord (permitiría publicar mensajes falsos en el canal de órdenes) | RNF-12: webhook como secreto server-side, nunca en el navegador ni commiteado; se regenera si se filtra |

## 9. Fases futuras (fuera de este PRD, mencionadas para contexto)
- Fase 2: carrito + checkout con Mercado Pago. *(2026-09-30: el carrito y la orden de compra sin pago se adelantan como RF-15..RF-19; el checkout con Mercado Pago sigue siendo futuro.)*
- Fase 3: panel de administración con UI para cargar/editar productos sin CSV manual.
- Fase 4: multi-proveedor activo con más de una marca en simultáneo.

## 10. Referencias
- RFC-0001 — Arquitectura técnica del catálogo (detalle de implementación de este PRD).
- Catálogo LACA Aniversario 2026/2027 (fuente de referencia de precios públicos).
- PDF de precios LACA (precio ABC + precio de lista) — fuente de datos de la spec 0008.
