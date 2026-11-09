import { it, expect } from "vitest";
import { excelWorkbook } from "./excel";
it("escribe texto como cadenas OOXML y conserva números sin fórmulas ejecutables", () => {
  const bytes = excelWorkbook([
    { name: "Compras", rows: [['=HYPERLINK("x")', "<&> á", 12.34]] },
    { name: "Resumen", rows: [["Total", 12.34]] },
  ]);
  const text = new TextDecoder().decode(bytes);
  expect([...bytes.slice(0, 4)]).toEqual([0x50, 0x4b, 3, 4]);
  expect(text).toContain("&lt;&amp;&gt; á");
  expect(text).toContain("=HYPERLINK(&quot;x&quot;)");
  expect(text).toContain('t="n"><v>12.34</v></c>');
  expect(text).not.toContain("<f>");
});
