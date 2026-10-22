"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";

import { AlertIcon } from "@/components/orders/AlertIcon";
import { FormErrorSummary } from "@/components/orders/FormErrorSummary";
import {
  browserSessionStorage,
  readDraft,
  writeDraft,
  type ContactDraft,
  type DraftStorage,
} from "@/lib/orders/contact-draft";
import {
  mensajeError,
  normalizeNombre,
  normalizeTelefono,
  validateContact,
  validateNombre,
  validateTelefono,
  type CampoContacto,
  type ErrorContacto,
} from "@/lib/orders/validate-contact";

export const BAJADA_FORMULARIO =
  "Solo necesitamos tu nombre y tu teléfono. Te llamamos o te escribimos para coordinar el pago y el envío.";
export const HINT_NOMBRE = "Para saber a quién llamar. Ej.: Ana Pérez";
export const HINT_TELEFONO = "Con código de área. Ej.: 11 5555 5555";

export interface OrderFormSubmit {
  /** Normalizado (NFC, recorte, espacios colapsados): el valor que se envía. */
  nombre: string;
  /** Recortado. */
  telefono: string;
  /** Valor del honeypot `sitio_web`; vacío para una persona. */
  honeypot: string;
}

export interface OrderFormProps {
  /** Se llama solo con datos que pasaron la validación. El envío real llega en F13. */
  onValidSubmit?(data: OrderFormSubmit): void;
  /**
   * Errores de un `invalida` del servidor ya mapeados a campos
   * (`mapServerErrors`). Cada vez que llega un arreglo nuevo con ítems, se
   * muestran como los de la validación local y el foco va al resumen.
   */
  serverErrors?: readonly ErrorContacto[];
  /**
   * Error general (`invalida` sin campo mapeable, Q-F2a): va en el lugar del
   * resumen y no coexiste con él. Lo arma quien envía (F13).
   */
  generalError?: ReactNode;
  /** `sessionStorage` por defecto; inyectable en tests. */
  storage?: DraftStorage | null;
}

const INPUT_BASE =
  "w-full rounded-lg bg-beige-50 text-base text-sage-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500";
const INPUT_OK = "border border-beige-300 px-3 py-2.5";
// 2 px de borde sin mover el layout: se resta 1 px de padding.
const INPUT_INVALID = "border-2 border-sage-800 px-[11px] py-[9px]";

const ORDEN: readonly CampoContacto[] = ["nombre", "telefono"];

function sortErrores(errores: ErrorContacto[]): ErrorContacto[] {
  return [...errores].sort((a, b) => ORDEN.indexOf(a.campo) - ORDEN.indexOf(b.campo));
}

interface CampoProps {
  id: string;
  label: string;
  hint: string;
  hintId: string;
  errorId: string;
  error: ErrorContacto | undefined;
  children: (props: {
    id: string;
    className: string;
    "aria-describedby": string;
    "aria-invalid": true | undefined;
  }) => ReactNode;
}

function Campo({ id, label, hint, hintId, errorId, error, children }: CampoProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-sage-800">
        {label}
      </label>
      {children({
        id,
        className: `${INPUT_BASE} ${error ? INPUT_INVALID : INPUT_OK}`,
        "aria-describedby": error ? `${hintId} ${errorId}` : hintId,
        "aria-invalid": error ? true : undefined,
      })}
      <p id={hintId} className="text-sm text-sage-600">
        {hint}
      </p>
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm font-semibold text-sage-800">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{mensajeError(error.campo, error.codigo)}</span>
        </p>
      )}
    </div>
  );
}

/**
 * "Tus datos" (ux.md "Formulario", ADR-0020): dos campos obligatorios —
 * "Nombre y apellido" y "Teléfono", en ese orden—, sin placeholder, sin
 * `fieldset`/`legend`, sin aviso de privacidad y con `novalidate` (los mensajes
 * son los nuestros).
 *
 * Validación: al enviar; después del primer intento fallido, también al salir
 * de cada campo (blur), y el error de un campo desaparece apenas lo que
 * escribió pasa la regla. Si falla, el foco va al resumen de errores.
 *
 * Borrador (AC-28): `{ nombre, telefono }` en `sessionStorage` al salir de cada
 * campo y al enviar, nunca por tecla. Se lee al montar (este componente solo se
 * monta en el cliente, después de hidratar).
 */
export function OrderForm({
  onValidSubmit,
  serverErrors,
  generalError,
  storage = browserSessionStorage(),
}: OrderFormProps) {
  const uid = useId();
  const ids = {
    titulo: `${uid}-titulo`,
    nombre: `${uid}-nombre`,
    telefono: `${uid}-telefono`,
    hintNombre: `${uid}-nombre-hint`,
    hintTelefono: `${uid}-telefono-hint`,
    errorNombre: `${uid}-nombre-error`,
    errorTelefono: `${uid}-telefono-error`,
  };

  const [values, setValues] = useState<ContactDraft>(
    () => readDraft(storage) ?? { nombre: "", telefono: "" },
  );
  const [errores, setErrores] = useState<ErrorContacto[]>(() => sortErrores([...(serverErrors ?? [])]));
  const [intentado, setIntentado] = useState(() => (serverErrors?.length ?? 0) > 0);
  // Cada pedido de foco al resumen es un número nuevo: aunque los errores sean los mismos.
  const [focoResumen, setFocoResumen] = useState(() => ((serverErrors?.length ?? 0) > 0 ? 1 : 0));
  const [prevServerErrors, setPrevServerErrors] = useState(serverErrors);

  // Errores nuevos del servidor (patrón de React para ajustar estado cuando cambia una prop).
  if (serverErrors !== prevServerErrors) {
    setPrevServerErrors(serverErrors);
    if (serverErrors && serverErrors.length > 0) {
      setErrores(sortErrores([...serverErrors]));
      setIntentado(true);
      setFocoResumen((n) => n + 1);
    }
  }

  const resumenRef = useRef<HTMLDivElement>(null);
  const nombreRef = useRef<HTMLInputElement>(null);
  const telefonoRef = useRef<HTMLInputElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focoResumen > 0) resumenRef.current?.focus();
  }, [focoResumen]);

  const errorDe = (campo: CampoContacto) => errores.find((e) => e.campo === campo);

  const validarCampo = (campo: CampoContacto, valor: string): ErrorContacto | undefined => {
    const r = campo === "nombre" ? validateNombre(valor) : validateTelefono(valor);
    return r.ok ? undefined : { campo, codigo: r.codigo };
  };

  const reemplazarError = (campo: CampoContacto, nuevo: ErrorContacto | undefined) =>
    setErrores((prev) => sortErrores([...prev.filter((e) => e.campo !== campo), ...(nuevo ? [nuevo] : [])]));

  const onChange = (campo: CampoContacto, valor: string) => {
    setValues((v) => ({ ...v, [campo]: valor }));
    // "Su error desaparece apenas se corrige": solo se quita; aparecer es cosa del blur y del envío.
    if (intentado && errorDe(campo) && !validarCampo(campo, valor)) reemplazarError(campo, undefined);
  };

  const onBlur = (campo: CampoContacto, valor: string) => {
    writeDraft(storage, { ...values, [campo]: valor });
    if (intentado) reemplazarError(campo, validarCampo(campo, valor));
  };

  const focusCampo = (campo: CampoContacto) =>
    (campo === "nombre" ? nombreRef : telefonoRef).current?.focus();

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    writeDraft(storage, values);
    const fallos = validateContact(values);
    setIntentado(true);
    setErrores(fallos);
    if (fallos.length > 0) {
      setFocoResumen((n) => n + 1);
      return;
    }
    onValidSubmit?.({
      nombre: normalizeNombre(values.nombre),
      telefono: normalizeTelefono(values.telefono),
      honeypot: honeypotRef.current?.value ?? "",
    });
  };

  // Enter en el nombre pasa al teléfono (no envía); Enter en el teléfono envía.
  const onNombreKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    e.preventDefault();
    telefonoRef.current?.focus();
  };

  return (
    <form noValidate onSubmit={onSubmit} aria-labelledby={ids.titulo} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id={ids.titulo} className="font-display text-2xl text-sage-900">
          Tus datos
        </h2>
        <p className="text-sm text-sage-700">{BAJADA_FORMULARIO}</p>
      </div>

      {errores.length > 0 ? (
        <FormErrorSummary ref={resumenRef} errores={errores} onFocusCampo={focusCampo} />
      ) : (
        generalError
      )}

      <Campo
        id={ids.nombre}
        label="Nombre y apellido"
        hint={HINT_NOMBRE}
        hintId={ids.hintNombre}
        errorId={ids.errorNombre}
        error={errorDe("nombre")}
      >
        {(a11y) => (
          <input
            {...a11y}
            ref={nombreRef}
            type="text"
            name="nombre"
            autoComplete="name"
            autoCapitalize="words"
            spellCheck={false}
            enterKeyHint="next"
            maxLength={80}
            value={values.nombre}
            onChange={(e) => onChange("nombre", e.target.value)}
            onBlur={(e) => onBlur("nombre", e.target.value)}
            onKeyDown={onNombreKeyDown}
          />
        )}
      </Campo>

      <Campo
        id={ids.telefono}
        label="Teléfono"
        hint={HINT_TELEFONO}
        hintId={ids.hintTelefono}
        errorId={ids.errorTelefono}
        error={errorDe("telefono")}
      >
        {(a11y) => (
          <input
            {...a11y}
            ref={telefonoRef}
            type="tel"
            name="telefono"
            autoComplete="tel"
            inputMode="tel"
            enterKeyHint="done"
            value={values.telefono}
            onChange={(e) => onChange("telefono", e.target.value)}
            onBlur={(e) => onBlur("telefono", e.target.value)}
          />
        )}
      </Campo>

      {/* Honeypot (AC-19): fuera de pantalla, inerte para personas y lectores. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Sitio web
          <input ref={honeypotRef} type="text" name="sitio_web" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-sage-500 px-5 py-3 font-medium text-beige-50 transition-colors hover:bg-sage-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
      >
        Enviar orden
      </button>
    </form>
  );
}
