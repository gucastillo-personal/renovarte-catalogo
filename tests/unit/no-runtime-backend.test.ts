import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// AC-14 (spec 0017): el catálogo no tiene backend propio; las órdenes viven
// en `renovarte-ordenes`. Ningún handler, middleware/proxy ni server action
// puede aparecer bajo `src/`.
const SRC = join(process.cwd(), "src");
const FORBIDDEN_FILE = /^(route|middleware|proxy)\.[cm]?[jt]sx?$/;
const USE_SERVER = /^\s*(["'])use server\1/m;

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

describe("sin backend en runtime (AC-14)", () => {
  const files = walk(SRC);
  const rel = (f: string) => relative(SRC, f);

  it("no hay route/middleware/proxy bajo src/", () => {
    const names = files.filter((f) => FORBIDDEN_FILE.test(f.split("/").pop()!));
    expect(names.map(rel)).toEqual([]);
  });

  it('no hay "use server" bajo src/', () => {
    const hits = files
      .filter((f) => /\.[cm]?[jt]sx?$/.test(f))
      .filter((f) => USE_SERVER.test(readFileSync(f, "utf8")));
    expect(hits.map(rel)).toEqual([]);
  });
});
