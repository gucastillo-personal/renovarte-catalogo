# 0008 — LACA public reference data

**Status:** Backlog
**PRD:** §10; RFC §1, §2.5, roadmap step 3

## Why

The margin report (0007) needs LACA's public list/offer price per product as the
market benchmark. That data lives only in the official LACA PDF catalogue
(Aniversario 2026/2027). It is public information and is committed to the repo.

## User value

- The owner (and the report) can compare against a maintained, versioned file of
  LACA public prices instead of re-reading the PDF each time.

## Scope

In:
- `data/reference/laca_precios_publicos.json` — an object keyed by product
  `codigo`:
  ```json
  {
    "545300004": { "precio_publico_laca": 39200, "fuente": "LACA Aniversario 2026/2027" }
  }
  ```
- A documented, repeatable process for updating it when LACA publishes a new
  catalogue (README section or `data/reference/README.md`).
- A validation step (in ingest or a standalone `pnpm validate:reference`):
  well-formed JSON, positive integer prices, keys look like product codes.
- This file **is committed** (unlike `data/raw/` and `data/private/`).

Out: automating extraction from the PDF; scraping LACA; storing anything other
than the public price + provenance.

## Acceptance criteria

1. **AC-1:** `data/reference/laca_precios_publicos.json` exists, is valid JSON,
   and every entry has a positive integer `precio_publico_laca` and a `fuente`.
   *Verified by:* `pnpm validate:reference` / Vitest.
2. **AC-2:** The file is tracked by git (not ignored). *Verified by:* `git
   check-ignore` returns non-zero for the path.
3. **AC-3:** At least a representative subset (matching the seed / sample
   products) is populated so 0007 produces a non-empty report. *Verified by:*
   0007's report test.
4. **AC-4:** The update process is written down and takes a known, bounded effort.
   *Verified by:* doc exists and was followed once.
