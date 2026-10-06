import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChatTransport, RECONNECT_BACKOFF_MS, type WebSocketLike } from "@/lib/chat/transport";
import type { ChatEnvelope } from "@/lib/chat/types";

/** A fake `WebSocketLike` the test fully controls — no `ws`/jsdom dependency. */
class FakeSocket implements WebSocketLike {
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  sent: string[] = [];
  closed = false;

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.closed = true;
  }

  /** Test helper — simulate the server accepting the connection. */
  simulateOpen(): void {
    this.onopen?.();
  }

  simulateMessage(data: string): void {
    this.onmessage?.({ data });
  }

  simulateClose(): void {
    this.onclose?.({ code: 1006, reason: "" });
  }
}

function envelope<T>(type: ChatEnvelope["type"], payload: T): ChatEnvelope<T> {
  return { v: 1, type, turn_id: "t1", ts: "2026-09-28T00:00:00.000Z", payload };
}

describe("ChatTransport", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not open a socket until connect() is called (lazy connection)", () => {
    const factory = vi.fn<(url: string) => WebSocketLike>();
    new ChatTransport("wss://example.com", factory, {
      onOpen: vi.fn(),
      onEnvelope: vi.fn(),
      onReconnecting: vi.fn(),
      onLocalUnavailable: vi.fn(),
    });
    expect(factory).not.toHaveBeenCalled();
  });

  it("no NEXT_PUBLIC_CHAT_WS_URL configured -> straight to onLocalUnavailable('connection_error'), no socket attempt", () => {
    const factory = vi.fn<(url: string) => WebSocketLike>();
    const onLocalUnavailable = vi.fn();
    const transport = new ChatTransport(undefined, factory, {
      onOpen: vi.fn(),
      onEnvelope: vi.fn(),
      onReconnecting: vi.fn(),
      onLocalUnavailable,
    });
    transport.connect();
    expect(factory).not.toHaveBeenCalled();
    expect(onLocalUnavailable).toHaveBeenCalledWith("connection_error");
  });

  it("connect() ok -> onOpen fires once the socket opens", () => {
    const socket = new FakeSocket();
    const onOpen = vi.fn();
    const transport = new ChatTransport("wss://example.com", () => socket, {
      onOpen,
      onEnvelope: vi.fn(),
      onReconnecting: vi.fn(),
      onLocalUnavailable: vi.fn(),
    });
    transport.connect();
    expect(onOpen).not.toHaveBeenCalled();
    socket.simulateOpen();
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("a second connect() call while already connecting/open is a no-op (singleton connection)", () => {
    const factory = vi.fn(() => new FakeSocket());
    const transport = new ChatTransport("wss://example.com", factory, {
      onOpen: vi.fn(),
      onEnvelope: vi.fn(),
      onReconnecting: vi.fn(),
      onLocalUnavailable: vi.fn(),
    });
    transport.connect();
    transport.connect();
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("a well-formed frame reaches onEnvelope", () => {
    const socket = new FakeSocket();
    const onEnvelope = vi.fn();
    const transport = new ChatTransport("wss://example.com", () => socket, {
      onOpen: vi.fn(),
      onEnvelope,
      onReconnecting: vi.fn(),
      onLocalUnavailable: vi.fn(),
    });
    transport.connect();
    socket.simulateOpen();
    const env = envelope("text_done", { text: "hola" });
    socket.simulateMessage(JSON.stringify(env));
    expect(onEnvelope).toHaveBeenCalledWith(env);
  });

  it("a malformed frame (bad JSON or failing the guard) degrades to onLocalUnavailable('internal_error'), never throws", () => {
    const socket = new FakeSocket();
    const onLocalUnavailable = vi.fn();
    const onEnvelope = vi.fn();
    const transport = new ChatTransport("wss://example.com", () => socket, {
      onOpen: vi.fn(),
      onEnvelope,
      onReconnecting: vi.fn(),
      onLocalUnavailable,
    });
    transport.connect();
    socket.simulateOpen();

    expect(() => socket.simulateMessage("not json")).not.toThrow();
    expect(onLocalUnavailable).toHaveBeenCalledWith("internal_error");

    onLocalUnavailable.mockClear();
    expect(() => socket.simulateMessage(JSON.stringify({ v: 1, type: "text_done" }))).not.toThrow();
    expect(onLocalUnavailable).toHaveBeenCalledWith("internal_error");
    expect(onEnvelope).not.toHaveBeenCalled();
  });

  it("send() only writes to the socket once it's open, silently drops before/after", () => {
    const socket = new FakeSocket();
    const transport = new ChatTransport("wss://example.com", () => socket, {
      onOpen: vi.fn(),
      onEnvelope: vi.fn(),
      onReconnecting: vi.fn(),
      onLocalUnavailable: vi.fn(),
    });
    transport.connect();
    const env = envelope("user_message", { text: "hola" });
    transport.send(env); // not open yet
    expect(socket.sent).toHaveLength(0);

    socket.simulateOpen();
    transport.send(env);
    expect(socket.sent).toEqual([JSON.stringify(env)]);
  });

  it("an unexpected close schedules a reconnect on the fixed backoff schedule", () => {
    const sockets: FakeSocket[] = [];
    const factory = () => {
      const s = new FakeSocket();
      sockets.push(s);
      return s;
    };
    const onReconnecting = vi.fn();
    const transport = new ChatTransport("wss://example.com", factory, {
      onOpen: vi.fn(),
      onEnvelope: vi.fn(),
      onReconnecting,
      onLocalUnavailable: vi.fn(),
    });
    transport.connect();
    sockets[0]!.simulateOpen();
    sockets[0]!.simulateClose();

    expect(onReconnecting).toHaveBeenCalledWith(1, RECONNECT_BACKOFF_MS[0]);
    expect(sockets).toHaveLength(1); // not reconnected yet, timer pending

    vi.advanceTimersByTime(RECONNECT_BACKOFF_MS[0]!);
    expect(sockets).toHaveLength(2); // second socket opened by the retry
  });

  it("reconnect attempts exhausted -> onLocalUnavailable('connection_error'), stops retrying", () => {
    const sockets: FakeSocket[] = [];
    const factory = () => {
      const s = new FakeSocket();
      sockets.push(s);
      return s;
    };
    const onLocalUnavailable = vi.fn();
    const transport = new ChatTransport("wss://example.com", factory, {
      onOpen: vi.fn(),
      onEnvelope: vi.fn(),
      onReconnecting: vi.fn(),
      onLocalUnavailable,
    });
    transport.connect();

    for (const delay of RECONNECT_BACKOFF_MS) {
      sockets.at(-1)!.simulateClose();
      vi.advanceTimersByTime(delay);
    }
    // One more failure after the schedule is exhausted.
    sockets.at(-1)!.simulateClose();

    expect(onLocalUnavailable).toHaveBeenCalledWith("connection_error");
    const socketCountAfterGivingUp = sockets.length;
    vi.advanceTimersByTime(60_000);
    expect(sockets.length).toBe(socketCountAfterGivingUp); // no further retries scheduled
  });

  it("close() marks the transport as intentionally closed — no reconnect scheduled, cancels a pending retry", () => {
    const sockets: FakeSocket[] = [];
    const factory = () => {
      const s = new FakeSocket();
      sockets.push(s);
      return s;
    };
    const onReconnecting = vi.fn();
    const transport = new ChatTransport("wss://example.com", factory, {
      onOpen: vi.fn(),
      onEnvelope: vi.fn(),
      onReconnecting,
      onLocalUnavailable: vi.fn(),
    });
    transport.connect();
    sockets[0]!.simulateOpen();
    transport.close();
    expect(sockets[0]!.closed).toBe(true);

    sockets[0]!.simulateClose(); // the real socket's close event still fires
    expect(onReconnecting).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000);
    expect(sockets).toHaveLength(1);
  });
});

describe("ChatTransport default timers", () => {
  const realSetTimeout = globalThis.setTimeout;
  const realClearTimeout = globalThis.clearTimeout;
  afterEach(() => {
    globalThis.setTimeout = realSetTimeout;
    globalThis.clearTimeout = realClearTimeout;
  });

  it("calls setTimeout/clearTimeout unbound, like the browser requires (no 'Illegal invocation' on reconnect)", () => {
    // Browser-like globals: throw when invoked with a `this` other than the
    // global object, which Node's own timers never enforce.
    const scheduled: Array<() => void> = [];
    globalThis.setTimeout = function (this: unknown, fn: () => void) {
      if (this !== undefined && this !== globalThis) throw new TypeError("Illegal invocation");
      scheduled.push(fn);
      return 1 as unknown as ReturnType<typeof setTimeout>;
    } as typeof setTimeout;
    globalThis.clearTimeout = function (this: unknown) {
      if (this !== undefined && this !== globalThis) throw new TypeError("Illegal invocation");
    } as typeof clearTimeout;

    const sockets: FakeSocket[] = [];
    const onReconnecting = vi.fn();
    const transport = new ChatTransport(
      "wss://example.com",
      () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      },
      { onOpen: vi.fn(), onEnvelope: vi.fn(), onReconnecting, onLocalUnavailable: vi.fn() },
    );

    transport.connect();
    sockets[0]!.simulateClose();
    expect(onReconnecting).toHaveBeenCalledWith(1, RECONNECT_BACKOFF_MS[0]);
    scheduled[0]!();
    expect(sockets).toHaveLength(2);

    sockets[1]!.simulateClose();
    expect(() => transport.close()).not.toThrow();
  });
});
