import Image from "next/image";

import { MissionCarouselLive } from "@/components/MissionCarouselLive";
import { MISSION_SLIDES } from "@/lib/mission-content";

/**
 * Mission/brand section (spec 0011) — first block of the home, before the
 * catalog. The 5 core messages of @renovarte_by_juli's founding Instagram
 * post as a carousel (`ux.md`): a focusable scroll-snap container plus 5
 * dots (real anchors) are server-rendered and work with no JS at all
 * (AC-7). `MissionCarouselLive` only adds the prev/next arrows,
 * `aria-current` and a live region after hydration — see that component and
 * `ux.md`'s 2026-09-14 amendment for why arrows are never duplicated per
 * slide.
 *
 * Slides are rendered as `div`s (not `li`s) even though a carousel reads
 * naturally as a list: this repo's e2e suite already uses the untyped
 * selector `main ul > li` to count product cards on the home page (see
 * `tests/e2e/catalog.spec.ts`), and a second `<ul>` ahead of the catalog
 * would silently inflate that count and break the AC-4 no-regression
 * guarantee. `role="group"`/`aria-roledescription="slide"` already give
 * assistive tech the same semantics a `<li>` would, so nothing is lost.
 */
export function MissionSection() {
  return (
    <section
      aria-labelledby="mision-heading"
      className="rounded-lg bg-sage-50 px-4 py-10 sm:px-8 sm:py-14"
    >
      <div className="relative">
        <div
          role="region"
          aria-roledescription="carousel"
          aria-label="Mensajes de misión, usa las flechas del teclado para recorrer"
          tabIndex={0}
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth motion-reduce:scroll-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
        >
          {MISSION_SLIDES.map((slide) => (
            <div
              key={slide.n}
              id={`mensaje-${slide.n}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${slide.n} de 5`}
              className="w-full shrink-0 snap-center px-2 py-4 text-center sm:px-12"
            >
              {slide.n === 1 ? (
                <h1
                  id="mision-heading"
                  className="mx-auto max-w-[22ch] font-display text-3xl font-semibold text-sage-800 sm:text-4xl"
                >
                  {slide.text}
                </h1>
              ) : (
                <p className="mx-auto max-w-[28ch] font-display text-2xl text-sage-800 sm:text-3xl">
                  {slide.text}
                </p>
              )}

              {slide.n === 5 && (
                <div className="mx-auto mt-6 inline-flex rounded-lg bg-beige-100 p-4">
                  <Image
                    src="/brand/logo.svg"
                    alt="RenovArte"
                    width={160}
                    height={160}
                    unoptimized
                    className="h-28 w-28 sm:h-32 sm:w-32"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <MissionCarouselLive />
      </div>

      <a
        href="#catalogo"
        className="mx-auto mt-8 flex w-fit items-center gap-2 rounded-lg bg-sage-500 px-6 py-3 font-medium text-beige-50 transition-colors hover:bg-sage-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
      >
        Ver catálogo <span aria-hidden="true">→</span>
      </a>
    </section>
  );
}
