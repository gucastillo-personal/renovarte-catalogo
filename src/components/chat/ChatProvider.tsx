"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useReducer } from "react";

import { ChatFab } from "@/components/chat/ChatFab";
import { ChatPanel } from "@/components/chat/ChatPanel";
import {
  chatReducer,
  initialChatState,
  type ChatState,
} from "@/lib/chat/reducer";
import { ChatTransport, type WebSocketFactory, type WebSocketLike } from "@/lib/chat/transport";
import { generateTurnId, makeUserMessageEnvelope } from "@/lib/chat/types";

/** ~400ms threshold before the "connecting" indicator appears (`ux.md` "Streaming / carga" > "Conexión inicial del panel"). */
const CONNECTING_SLOW_THRESHOLD_MS = 400;

/**
 * Adapts the real browser `WebSocket` (whose `onopen`/`onclose`/`onerror`/
 * `onmessage` setters expect DOM `Event`/`CloseEvent`/`MessageEvent`
 * arguments) to the minimal `WebSocketLike` shape `transport.ts` uses —
 * done via delegation rather than a direct structural cast, since a
 * 1-argument DOM event handler isn't structurally assignable to our
 * 0-or-simplified-argument handler types (arity/variance, not worth
 * fighting — this adapter is the correct fix either way, it's also where a
 * production build would want to translate `MessageEvent.data` down to
 * `string` regardless).
 */
function defaultWebSocketFactory(url: string): WebSocketLike {
  const socket = new WebSocket(url);
  const wrapper: WebSocketLike = {
    onopen: null,
    onclose: null,
    onerror: null,
    onmessage: null,
    send: (data) => socket.send(data),
    close: (code, reason) => socket.close(code, reason),
  };
  socket.onopen = () => wrapper.onopen?.();
  socket.onclose = (event) => wrapper.onclose?.({ code: event.code, reason: event.reason });
  socket.onerror = (event) => wrapper.onerror?.(event);
  socket.onmessage = (event) => wrapper.onmessage?.({ data: String(event.data) });
  return wrapper;
}

export interface ChatWidgetContextValue {
  state: ChatState;
  /** `trigger` is the exact element that was clicked (FAB or the home invite card's button) — focus returns there on close (`ux.md` "Accesibilidad"). */
  openChat(trigger: HTMLElement): void;
  closeChat(): void;
  sendMessage(text: string): void;
  requestChangeProfile(): void;
  /** The composer registers its textarea here so `requestChangeProfile` can move focus to it (`ux.md`: "Cambiar" enfoca el input). */
  registerComposerElement(el: HTMLTextAreaElement | null): void;
  /** The text currently typed but not yet sent — shared so `ChatExampleChips` can fill the composer without lifting it into the reducer (not conversation state). */
  draftText: string;
  setDraftText(text: string): void;
}

const ChatWidgetContext = createContext<ChatWidgetContextValue | null>(null);

export function useChatWidget(): ChatWidgetContextValue {
  const ctx = useContext(ChatWidgetContext);
  if (!ctx) {
    throw new Error("useChatWidget must be used within <ChatProvider>");
  }
  return ctx;
}

export function ChatProvider({
  children,
  webSocketFactory = defaultWebSocketFactory,
}: {
  children: React.ReactNode;
  /** Injection point for tests — production always uses the real `WebSocket` constructor. */
  webSocketFactory?: WebSocketFactory;
}) {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const [draftText, setDraftText] = useState("");
  const triggerRef = useRef<HTMLElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const transportRef = useRef<ChatTransport | null>(null);
  if (transportRef.current === null) {
    const url = process.env.NEXT_PUBLIC_CHAT_WS_URL;
    transportRef.current = new ChatTransport(url, webSocketFactory, {
      onOpen: () => dispatch({ type: "CONNECT_READY" }),
      onEnvelope: (envelope) => dispatch({ type: "SERVER_ENVELOPE", envelope }),
      onReconnecting: () => {
        // Retried silently in the background — the panel keeps showing
        // whatever it already had (greeting or thread so far). Only a fully
        // exhausted retry surfaces as `unavailable` (`onLocalUnavailable`
        // below), matching `ux.md`'s two documented "no disponible"
        // triggers (at open, or mid-conversation) with nothing in between.
      },
      onLocalUnavailable: (reason) => dispatch({ type: "LOCAL_UNAVAILABLE", reason }),
    });
  }

  useEffect(() => {
    return () => {
      transportRef.current?.close();
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, []);

  const openChat = useCallback((trigger: HTMLElement) => {
    triggerRef.current = trigger;
    dispatch({ type: "CONNECT_START" });
    transportRef.current?.connect();
    dispatch({ type: "OPEN" });

    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    slowTimerRef.current = setTimeout(() => {
      dispatch({ type: "CONNECT_SLOW" });
    }, CONNECTING_SLOW_THRESHOLD_MS);
  }, []);

  const closeChat = useCallback(() => {
    dispatch({ type: "CLOSE" });
    triggerRef.current?.focus();
    triggerRef.current = null;
  }, []);

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    const turnId = generateTurnId();
    dispatch({ type: "USER_MESSAGE_SENT", text: trimmed, turnId });
    transportRef.current?.send(makeUserMessageEnvelope(turnId, trimmed));
    setDraftText("");
  }, []);

  const requestChangeProfile = useCallback(() => {
    dispatch({ type: "REQUEST_CHANGE_PROFILE" });
    composerRef.current?.focus();
  }, []);

  const registerComposerElement = useCallback((el: HTMLTextAreaElement | null) => {
    composerRef.current = el;
  }, []);

  const value = useMemo<ChatWidgetContextValue>(
    () => ({
      state,
      openChat,
      closeChat,
      sendMessage,
      requestChangeProfile,
      registerComposerElement,
      draftText,
      setDraftText,
    }),
    [state, openChat, closeChat, sendMessage, requestChangeProfile, registerComposerElement, draftText],
  );

  return (
    <ChatWidgetContext.Provider value={value}>
      {children}
      <ChatFab />
      <ChatPanel />
    </ChatWidgetContext.Provider>
  );
}
