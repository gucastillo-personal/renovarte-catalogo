import { describe, expect, it } from "vitest";

import { cleanName, decodeEntities, formatSize, htmlToText } from "../../scripts/lib/html";

describe("decodeEntities", () => {
  it("decodes the named entities that appear in serlaca copy", () => {
    expect(decodeEntities("Caracter&iacute;sticas &amp; m&aacute;s")).toBe(
      "Características & más",
    );
    expect(decodeEntities("Cytobiol&trade; Iris&nbsp;A")).toBe("Cytobiol™ Iris A");
  });

  it("decodes numeric (decimal and hex) references", () => {
    expect(decodeEntities("&#233;xito &#xe9;")).toBe("éxito é");
  });

  it("leaves unknown entities untouched", () => {
    expect(decodeEntities("a &weird; b")).toBe("a &weird; b");
  });
});

describe("htmlToText", () => {
  it("strips tags, decodes entities and normalises whitespace", () => {
    const html =
      "<p><strong>Caracter&iacute;sticas:</strong> M&aacute;scara antiage.</p>\r\n\r\n<p><strong>Presentaci&oacute;n:</strong> Pote</p>\r\n";
    expect(htmlToText(html)).toBe(
      "Características: Máscara antiage.\n\nPresentación: Pote",
    );
  });

  it("turns <br> into a newline", () => {
    expect(htmlToText("uno<br />dos")).toBe("uno\ndos");
  });

  it("returns '' for null / undefined / empty", () => {
    expect(htmlToText(null)).toBe("");
    expect(htmlToText(undefined)).toBe("");
    expect(htmlToText("   ")).toBe("");
  });
});

describe("cleanName", () => {
  it("Title-cases an all-caps name and collapses spaces", () => {
    expect(cleanName("LAPIZ SECATIVO  X 3.5 G")).toBe("Lapiz Secativo X 3.5 G");
    expect(cleanName("MASCARA SHOCK ANTIAGE X 250 G")).toBe(
      "Mascara Shock Antiage X 250 G",
    );
  });

  it("leaves an already mixed-case name alone (just trims)", () => {
    expect(cleanName("  Perfect Pore con Ácido Salicílico x100ml  ")).toBe(
      "Perfect Pore con Ácido Salicílico x100ml",
    );
  });

  it("handles accented all-caps", () => {
    expect(cleanName("EMULSIÓN AQUA PORE")).toBe("Emulsión Aqua Pore");
  });
});

describe("formatSize", () => {
  it.each([
    [{ size: 250, measurementCode: "g" }, "250 g"],
    [{ size: 70, measurementCode: "mL" }, "70 ml"],
    [{ size: 3.5, measurementCode: "g" }, "3.5 g"],
  ])("%o -> %j", (input, expected) => {
    expect(formatSize(input)).toBe(expected);
  });

  it("returns '' for null / malformed", () => {
    expect(formatSize(null)).toBe("");
    expect(formatSize(undefined)).toBe("");
    expect(formatSize({ size: Number.NaN, measurementCode: "g" })).toBe("");
  });
});
