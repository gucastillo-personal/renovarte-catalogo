/**
 * Validación de los dos datos de contacto del formulario (spec 0017, AC-9,
 * ADR-0020, ux.md "Formulario" y "Validación"). Pura y sin dependencias.
 *
 * Paridad con el servidor: es la misma regla que `validarNombre` y
 * `validarTelefono` de `renovarte-ordenes/src/lib/validate-order.ts` (RFC
 * §3.2.1). El cliente solo ayuda; el servidor vuelve a validar. Los vectores
 * compartidos (`tests/unit/fixtures/nombre-vectores.ts`) fijan que den el
 * mismo veredicto.
 */

export type CampoContacto = "nombre" | "telefono";

/** Códigos del servidor (`CodigoError`) que el formulario sabe mostrar. */
export type CodigoContacto = "requerido" | "formato" | "largo";

export interface ErrorContacto {
  campo: CampoContacto;
  codigo: CodigoContacto;
}

export const NOMBRE_MIN = 2;
export const NOMBRE_MAX = 80;
export const TELEFONO_DIGITOS_MIN = 8;
export const TELEFONO_DIGITOS_MAX = 15;

/** Copy textual de ux.md "Validación" (qué pasó y cómo se arregla). */
export const MENSAJE_NOMBRE_VACIO = "Dejanos tu nombre y apellido para saber a quién llamar.";
export const MENSAJE_NOMBRE_INVALIDO =
  "Revisá el nombre: escribilo con letras y hasta 80 caracteres (ej.: Ana Pérez).";
export const MENSAJE_TELEFONO_VACIO = "Dejanos un teléfono para contactarte.";
export const MENSAJE_TELEFONO_INVALIDO =
  "Revisá el teléfono: escribilo con código de área, solo números (ej.: 11 5555 5555).";

// Cc (CR, LF y tab incluidos), U+2028/9, controles bidi y sustitutos sueltos.
// Mismo conjunto que el servidor; en modo `u`, `\p{Cs}` solo matchea los no apareados.
const PROHIBIDOS = /[\p{Cc}\u2028\u2029\u202a-\u202e\u2066-\u2069\p{Cs}]/u;
const TIENE_LETRA = /\p{L}/u;
const SEPARADORES_TELEFONO = /[\p{Zs}\-()+]/gu;
const SOLO_DIGITOS = new RegExp(`^[0-9]{${TELEFONO_DIGITOS_MIN},${TELEFONO_DIGITOS_MAX}}$`);

const puntosDeCodigo = (s: string): number => [...s].length;

/**
 * Nombre como lo ve el servidor: NFC, recorte (Unicode `White_Space`, NBSP
 * incluido) y espacios internos colapsados. Es el valor que se manda, el que
 * entra en la huella de `checkout` y el que se muestra en la confirmación.
 *
 * Se recorta ANTES de mirar CR/LF/tab: uno en los bordes no invalida el nombre
 * (igual que el servidor).
 */
export function normalizeNombre(raw: string): string {
  return raw.normalize("NFC").trim().replace(/\s+/gu, " ");
}

/**
 * Teléfono como lo ve el servidor: solo recortado, con sus separadores tal
 * cual los escribió el visitante (el servidor valida los dígitos pero guarda y
 * firma este valor). Cualquier diferencia con esto cambiaría la huella de
 * idempotencia del lado del servidor.
 */
export function normalizeTelefono(raw: string): string {
  return raw.trim();
}

export type ResultadoNombre =
  | { ok: true; nombre: string }
  | { ok: false; codigo: CodigoContacto };

/** Mismo orden de pasos que `validarNombre` del servidor (RFC §3.2.1). */
export function validateNombre(valor: unknown): ResultadoNombre {
  if (valor === undefined) return { ok: false, codigo: "requerido" };
  if (typeof valor !== "string") return { ok: false, codigo: "formato" };
  const recortado = valor.normalize("NFC").trim();
  if (recortado === "") return { ok: false, codigo: "requerido" };
  if (PROHIBIDOS.test(recortado)) return { ok: false, codigo: "formato" };
  const nombre = recortado.replace(/\s+/gu, " ");
  const largo = puntosDeCodigo(nombre);
  if (largo > NOMBRE_MAX) return { ok: false, codigo: "largo" };
  if (largo < NOMBRE_MIN) return { ok: false, codigo: "formato" };
  if (!TIENE_LETRA.test(nombre)) return { ok: false, codigo: "formato" };
  return { ok: true, nombre };
}

export type ResultadoTelefono =
  | { ok: true; telefono: string }
  | { ok: false; codigo: "requerido" | "formato" };

/** Obligatorio, 8 a 15 dígitos tras quitar espacios, `-`, `(`, `)` y `+`. */
export function validateTelefono(valor: unknown): ResultadoTelefono {
  if (valor === undefined) return { ok: false, codigo: "requerido" };
  if (typeof valor !== "string") return { ok: false, codigo: "formato" };
  const telefono = normalizeTelefono(valor);
  if (telefono === "") return { ok: false, codigo: "requerido" };
  if (PROHIBIDOS.test(telefono)) return { ok: false, codigo: "formato" };
  if (!SOLO_DIGITOS.test(telefono.replace(SEPARADORES_TELEFONO, ""))) {
    return { ok: false, codigo: "formato" };
  }
  return { ok: true, telefono };
}

export interface Contacto {
  nombre: string;
  telefono: string;
}

/** Errores en el orden del formulario (nombre, teléfono): un ítem por campo. */
export function validateContact(contacto: Contacto): ErrorContacto[] {
  const errores: ErrorContacto[] = [];
  const n = validateNombre(contacto.nombre);
  if (!n.ok) errores.push({ campo: "nombre", codigo: n.codigo });
  const t = validateTelefono(contacto.telefono);
  if (!t.ok) errores.push({ campo: "telefono", codigo: t.codigo });
  return errores;
}

/** Copy del error de un campo. `requerido` → vacío; `formato` y `largo` → "Revisá…". */
export function mensajeError(campo: CampoContacto, codigo: CodigoContacto): string {
  if (campo === "nombre") {
    return codigo === "requerido" ? MENSAJE_NOMBRE_VACIO : MENSAJE_NOMBRE_INVALIDO;
  }
  return codigo === "requerido" ? MENSAJE_TELEFONO_VACIO : MENSAJE_TELEFONO_INVALIDO;
}

/**
 * Errores de un `invalida` del servidor que el formulario puede atribuir a un
 * campo (RFC §3.2, mapeo a ux.md), en el orden del formulario y sin repetir
 * campo. Lo que queda afuera (`lineas`, `total_visto`, `null`, `[]`, token) es
 * el "error general": si el resultado es `[]`, el llamador muestra ese.
 */
export function mapServerErrors(
  errores: ReadonlyArray<{ campo: string | null; codigo: string }>,
): ErrorContacto[] {
  const porCampo = new Map<CampoContacto, CodigoContacto>();
  for (const e of errores) {
    const campo =
      e.campo === "contacto.nombre" ? "nombre" : e.campo === "contacto.telefono" ? "telefono" : null;
    if (!campo || porCampo.has(campo)) continue;
    // Cualquier código que no sea `requerido` se muestra como "revisá".
    porCampo.set(campo, e.codigo === "requerido" ? "requerido" : "formato");
  }
  const orden: CampoContacto[] = ["nombre", "telefono"];
  return orden.flatMap((campo) => {
    const codigo = porCampo.get(campo);
    return codigo ? [{ campo, codigo }] : [];
  });
}
