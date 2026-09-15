"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { MISSION_SLIDES } from "@/lib/mission-content";

const ARROW_BASE =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl text-sage-700 transition-colors hover:bg-sage-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500 sm:absolute sm:top-1/2 sm:-translate-y-1/2 sm:bg-sage-500/30 sm:text-sage-800 sm:hover:bg-sage-500/50";

const DOT_BASE =
  "flex h-11 w-11 shrink-0 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500";

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
 */
function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/**
 * Progressive-enhancement layer of the mission carousel (spec 0011, `ux.md`
 * amendment 2026-09-14). Renders the *only* set of prev/next arrows in the
 * DOM (2 buttons, never duplicated per slide) plus the 5 dots (real anchors,
 * present in the HTML base regardless of JS).
 *
 * The arrows exist in the markup from the first render, but stay
 * `invisible`/`tabIndex={-1}`/without `aria-label` until `mounted` flips to
 * `true` in an effect — the node is never inserted or removed, so there is
 * no reflow/CLS when they appear, and the worst case (JS disabled
 * permanently) is 0 operable arrows, matching the accessibility-tree
 * assertion the e2e suite makes with `javaScriptEnabled: false`.
 */
export function MissionCarouselLive() {
  const mounted = useMounted();
  const [activeIndex, setActiveIndex] = useState(1);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = rootRef.current?.closest("section");
    const scrollRegion = section?.querySelector<HTMLElement>('[role="region"]');
    if (!section || !scrollRegion) return;

    const slides = Array.from(
      scrollRegion.querySelectorAll<HTMLElement>("[id^='mensaje-']"),
    );

    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!mostVisible) return;
        const n = Number(mostVisible.target.id.replace("mensaje-", ""));
        if (n >= 1 && n <= 5) setActiveIndex(n);
      },
      { root: scrollRegion, threshold: 0.6 },
    );
    slides.forEach((slide) => observer.observe(slide));

    const scrollToIndex = (n: number) => {
      const target = scrollRegion.querySelector<HTMLElement>(`#mensaje-${n}`);
      target?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      setActiveIndex((current) => {
        const next =
          event.key === "ArrowRight" ? Math.min(current + 1, 5) : Math.max(current - 1, 1);
        scrollToIndex(next);
        return next;
      });
    };
    section.addEventListener("keydown", handleKeyDown);

    return () => {
      observer.disconnect();
      section.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const goTo = (n: number) => {
    const section = rootRef.current?.closest("section");
    const scrollRegion = section?.querySelector<HTMLElement>('[role="region"]');
    const target = scrollRegion?.querySelector<HTMLElement>(`#mensaje-${n}`);
    target?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    setActiveIndex(n);
  };

  return (
    <div ref={rootRef} className="mt-3 flex items-center justify-center gap-3 sm:justify-center">
      <button
        type="button"
        onClick={() => goTo(Math.max(activeIndex - 1, 1))}
        aria-label={mounted ? "Mensaje anterior" : undefined}
        tabIndex={mounted ? 0 : -1}
        className={`${ARROW_BASE} ${mounted ? "visible" : "invisible"} sm:left-2`}
      >
        <span aria-hidden="true">←</span>
      </button>

      <span className="flex items-center gap-1">
        {MISSION_SLIDES.map((slide) => (
          <a
            key={slide.n}
            href={`#mensaje-${slide.n}`}
            aria-label={`Ir al mensaje ${slide.n} de 5`}
            aria-current={mounted && activeIndex === slide.n ? "true" : undefined}
            className={DOT_BASE}
          >
            <span
              aria-hidden="true"
              className={`block h-2.5 w-2.5 rounded-full ${
                mounted && activeIndex === slide.n ? "bg-sage-600" : "bg-sage-300"
              }`}
            />
          </a>
        ))}
      </span>

      <button
        type="button"
        onClick={() => goTo(Math.min(activeIndex + 1, 5))}
        aria-label={mounted ? "Mensaje siguiente" : undefined}
        tabIndex={mounted ? 0 : -1}
        className={`${ARROW_BASE} ${mounted ? "visible" : "invisible"} sm:right-2`}
      >
        <span aria-hidden="true">→</span>
      </button>

      <span aria-live="polite" className="sr-only">
        {mounted ? `Mensaje ${activeIndex} de 5` : ""}
      </span>
    </div>
  );
}
