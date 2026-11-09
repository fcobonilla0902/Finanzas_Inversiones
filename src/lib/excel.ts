// Minimal OOXML workbook, stored ZIP entries; no runtime spreadsheet dependency.
export type ExcelCell = string | number;
export type ExcelSheet = {
  name: string;
  rows: ExcelCell[][];
  columnWidths?: number[];
  currencyColumns?: number[];
  currencyRows?: number[];
  totalRows?: number[];
  autoFilter?: boolean;
  landscape?: boolean;
};
const styles = `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0.00;[Red](&quot;$&quot;#,##0.00)"/></numFmts>
<fonts count="3"><font><sz val="11"/><color rgb="FF172D43"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF006D77"/><name val="Calibri"/></font></fonts>
<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF006D77"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF2F5F8"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE0F1F2"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border/><border><bottom style="thin"><color rgb="FFD7E1EA"/></bottom></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="10">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
${[0, 3].map((fill) => `<xf numFmtId="0" fontId="0" fillId="${fill}" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>`).join("")}
${[0, 3].map((fill) => `<xf numFmtId="164" fontId="0" fillId="${fill}" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1"/></xf>`).join("")}
${[0, 3].map((fill) => `<xf numFmtId="0" fontId="0" fillId="${fill}" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1"/></xf>`).join("")}
<xf numFmtId="0" fontId="2" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="164" fontId="2" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1"/></xf>
</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
function columnName(index: number) {
  let result = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26))
    result = String.fromCharCode(65 + ((n - 1) % 26)) + result;
  return result;
}
function textWidth(value: ExcelCell) {
  return Math.max(
    ...String(value)
      .split("\n")
      .map((line) =>
        [...line].reduce(
          (sum, c) =>
            sum +
            (/[MWÁÉÓÚA-Z]/.test(c) ? 1.25 : /[il .,:]/.test(c) ? 0.55 : 1),
          0,
        ),
      ),
  );
}
const encoder = new TextEncoder();
const xml = (text: string) =>
  text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function concat(parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}
function zip(entries: [string, string][]) {
  const local: Uint8Array[] = [],
    central: Uint8Array[] = [];
  let offset = 0;
  for (const [name, text] of entries) {
    const filename = encoder.encode(name),
      data = encoder.encode(text),
      crc = crc32(data);
    const header = new Uint8Array(30),
      h = new DataView(header.buffer);
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(4, 20, true);
    h.setUint16(6, 0x800, true);
    h.setUint16(12, 0x21, true);
    h.setUint32(14, crc, true);
    h.setUint32(18, data.length, true);
    h.setUint32(22, data.length, true);
    h.setUint16(26, filename.length, true);
    local.push(header, filename, data);
    const directory = new Uint8Array(46),
      d = new DataView(directory.buffer);
    d.setUint32(0, 0x02014b50, true);
    d.setUint16(4, 20, true);
    d.setUint16(6, 20, true);
    d.setUint16(8, 0x800, true);
    d.setUint16(14, 0x21, true);
    d.setUint32(16, crc, true);
    d.setUint32(20, data.length, true);
    d.setUint32(24, data.length, true);
    d.setUint16(28, filename.length, true);
    d.setUint32(42, offset, true);
    central.push(directory, filename);
    offset += header.length + filename.length + data.length;
  }
  const directory = concat(central),
    end = new Uint8Array(22),
    e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(8, entries.length, true);
  e.setUint16(10, entries.length, true);
  e.setUint32(12, directory.length, true);
  e.setUint32(16, offset, true);
  return concat([...local, directory, end]);
}
export function excelWorkbook(sheets: ExcelSheet[]) {
  const ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  const entries: [string, string][] = [
    [
      "[Content_Types].xml",
      `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`,
    ],
    [
      "_rels/.rels",
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    ],
    [
      "xl/workbook.xml",
      `<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${sheets.map((s, i) => `<sheet name="${xml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets><definedNames>${sheets.map((s, i) => `<definedName name="_xlnm.Print_Titles" localSheetId="${i}">'${xml(s.name.replace(/'/g, "''"))}'!$1:$1</definedName>`).join("")}</definedNames></workbook>`,
    ],
    [
      "xl/_rels/workbook.xml.rels",
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="styles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}</Relationships>`,
    ],
    ["xl/styles.xml", styles],
  ];
  sheets.forEach((sheet, i) => {
    const count = Math.max(1, ...sheet.rows.map((row) => row.length));
    const widths = Array.from(
      { length: count },
      (_, c) =>
        sheet.columnWidths?.[c] ??
        Math.min(
          56,
          Math.max(16, ...sheet.rows.map((row) => textWidth(row[c] ?? "") + 4)),
        ),
    );
    const last = columnName(count - 1);
    entries.push([
      `xl/worksheets/sheet${i + 1}.xml`,
      `<worksheet xmlns="${ns}"><dimension ref="A1:${last}${Math.max(1, sheet.rows.length)}"/><sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="30"/><cols>${widths.map((width, c) => `<col min="${c + 1}" max="${c + 1}" width="${width}" customWidth="1"/>`).join("")}</cols><sheetData>${sheet.rows
        .map((row, r) => {
          const height =
            r === 0
              ? 60
              : Math.min(
                  409,
                  Math.max(
                    32,
                    ...row.map(
                      (value, c) =>
                        Math.ceil(
                          (textWidth(value) + 4) / Math.max(1, widths[c] - 3),
                        ) *
                          16 +
                        14,
                    ),
                  ),
                );
          return `<row r="${r + 1}" ht="${height}" customHeight="1">${row
            .map((value, c) => {
              const numeric =
                typeof value === "number" && Number.isFinite(value);
              const currency =
                numeric &&
                (sheet.currencyColumns?.includes(c) ||
                  sheet.currencyRows?.includes(r));
              const style =
                r === 0
                  ? 1
                  : sheet.totalRows?.includes(r)
                    ? currency
                      ? 9
                      : 8
                    : currency
                      ? 4 + (r % 2 === 0 ? 1 : 0)
                      : numeric
                        ? 6 + (r % 2 === 0 ? 1 : 0)
                        : 2 + (r % 2 === 0 ? 1 : 0);
              const attributes = `r="${columnName(c)}${r + 1}" s="${style}"`;
              return numeric
                ? `<c ${attributes} t="n"><v>${value}</v></c>`
                : `<c ${attributes} t="inlineStr"><is><t xml:space="preserve">${xml(String(value))}</t></is></c>`;
            })
            .join("")}</row>`;
        })
        .join(
          "",
        )}</sheetData>${sheet.autoFilter && sheet.rows.length ? `<autoFilter ref="A1:${last}${sheet.rows.length}"/>` : ""}<printOptions horizontalCentered="1"/><pageMargins left="0.25" right="0.25" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="${sheet.landscape ? "landscape" : "portrait"}" fitToWidth="1" fitToHeight="0"/><headerFooter><oddFooter>&amp;C&amp;P / &amp;N</oddFooter></headerFooter></worksheet>`,
    ]);
  });
  return zip(entries);
}
export function downloadExcel(sheets: ExcelSheet[], filename: string) {
  const bytes = excelWorkbook(sheets);
  const url = URL.createObjectURL(
    new Blob([bytes.buffer as ArrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Give Safari time to consume the object URL before releasing it.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
