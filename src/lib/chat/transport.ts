import { type ChatEnvelope, isValidServerEnvelope } from "@/lib/chat/types";

/**
 * Minimal shape this module needs from a WebSocket — matches the browser
 * `WebSocket` API exactly (so the real `WebSocket` constructor satisfies
 * `WebSocketFactory` with no adapter), but is also trivially fakeable in
 * Vitest (`environment: "node"`, no `ws`/jsdom dependency, per `plan.md`
 * "Testing del transporte sin gateway real ni dependencias nuevas").
 */
export interface WebSocketLike {
  onopen: (() => void) | null;
  onclose: ((event: { code: number; reason: string }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

export type WebSocketFactory = (url: string) => WebSocketLike;

export interface ChatTransportEvents {
  onOpen(): void;
  onEnvelope(envelope: ChatEnvelope): void;
  /** A reconnect attempt is about to be scheduled after an unexpected close. */
  onReconnecting(attempt: number, delayMs: number): void;
  /**
   * A failure this transport can't recover from on its own: no
   * `NEXT_PUBLIC_CHAT_WS_URL` configured, a malformed frame, the socket
   * factory throwing synchronously, or reconnect attempts exhausted.
   * Always mapped to a local `reason` string, same shape as the server's own
   * `UnavailablePayload.reason` (`budget-copy.ts` treats them identically).
   */
  onLocalUnavailable(reason: string): void;
}

/** Fixed backoff schedule (ms) — capped, not exponential-forever, so a dead gateway doesn't retry indefinitely. */
export const RECONNECT_BACKOFF_MS: readonly number[] = [500, 1000, 2000, 4000, 8000];

type TimeoutHandle = ReturnType<typeof setTimeout>;

/**
 * Injectable WebSocket wrapper (T4): lazy connection (only on the first
 * `connect()` call, from `ChatProvider`'s `openChat()`), capped backoff
 * reconnection, and frame validation against `types.ts` before anything
 * reaches the reducer — a malformed frame never throws, it degrades to
 * `onLocalUnavailable("internal_error")`.
 */
export class ChatTransport {
  private socket: WebSocketLike | null = null;
  private attempt = 0;
  private closedByClient = false;
  private open = false;
  private reconnectTimer: TimeoutHandle | null = null;

  constructor(
    private readonly url: string | undefined,
    private readonly factory: WebSocketFactory,
    private readonly events: ChatTransportEvents,
    private readonly scheduleTimeout: (fn: () => void, ms: number) => TimeoutHandle = setTimeout,
    private readonly clearScheduledTimeout: (handle: TimeoutHandle) => void = clearTimeout,
  ) {}

  /** No-op if a socket already exists (or is being retried) — connection is lazy and singleton per transport instance. */
  connect(): void {
    if (this.socket || this.reconnectTimer) return;
    if (!this.url) {
      this.events.onLocalUnavailable("connection_error");
      return;
    }
    this.openSocket(this.url);
  }

  private openSocket(url: string): void {
    let socket: WebSocketLike;
    try {
      socket = this.factory(url);
    } catch {
      this.events.onLocalUnavailable("connection_error");
      return;
    }

    this.socket = socket;
    socket.onopen = () => {
      this.attempt = 0;
      this.open = true;
      this.events.onOpen();
    };
    socket.onmessage = (event) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(event.data);
      } catch {
        this.events.onLocalUnavailable("internal_error");
        return;
      }
      if (!isValidServerEnvelope(parsed)) {
        this.events.onLocalUnavailable("internal_error");
        return;
      }
      this.events.onEnvelope(parsed);
    };
    // onclose always fires after onerror for a genuine connection failure —
    // reconnection is decided there so a failure is never handled twice.
    socket.onerror = () => {};
    socket.onclose = () => {
      this.socket = null;
      this.open = false;
      if (this.closedByClient) return;

      if (this.attempt >= RECONNECT_BACKOFF_MS.length) {
        this.events.onLocalUnavailable("connection_error");
        return;
      }
      const delay = RECONNECT_BACKOFF_MS[this.attempt]!;
      this.attempt += 1;
      this.events.onReconnecting(this.attempt, delay);
      this.reconnectTimer = this.scheduleTimeout(() => {
        this.reconnectTimer = null;
        this.openSocket(url);
      }, delay);
    };
  }

  /** Silently drops the frame if the socket isn't open — callers gate on the reducer's `isComposerDisabled` first. */
  send(envelope: ChatEnvelope): void {
    if (!this.socket || !this.open) return;
    this.socket.send(JSON.stringify(envelope));
  }

  /** Tears down the socket and cancels any scheduled reconnect — marks this transport as intentionally closed. */
  close(): void {
    this.closedByClient = true;
    if (this.reconnectTimer) {
      this.clearScheduledTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
    this.open = false;
  }
}
