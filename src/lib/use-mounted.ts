"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * `true` only once the component has hydrated on the client, `false` during
 * SSR/SSG and on the very first client render (so the two match and there is
 * no hydration mismatch). Implemented with `useSyncExternalStore` instead of
 * a `useState` + `useEffect(() => setMounted(true), [])` pair — the more
 * common version of this pattern — because that pair trips this repo's
 * `react-hooks/set-state-in-effect` lint rule (setState synchronously inside
 * an effect); this is the React-documented alternative for "detect that
 * hydration has completed" that doesn't call `setState` from an effect body.
 *
 * Extracted out of `MissionCarouselLive.tsx` (spec 0011) so the Colibrí chat
 * entry points (`ChatFab`, `ChatHomeInviteCard` — spec 0016) can reuse the
 * exact same hydration pattern without duplicating it (`plan.md` "##
 * Frontend" > "Archivos existentes que se tocan"). No behavior change to the
 * original.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
