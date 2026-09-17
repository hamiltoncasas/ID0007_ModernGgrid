/**
 * Generador de archivos .xlsx (Office Open XML) sin dependencias externas.
 *
 * El paquete OPC se construye a mano como un contenedor ZIP: cada entrada se
 * comprime con "deflate-raw" usando el CompressionStream nativo del navegador
 * y, si no está disponible, se almacena sin compresión, que también es válido
 * dentro de un paquete OPC.
 */

export interface ExcelColumn {
    /** Texto que se escribe en la primera fila (encabezado de la columna). */
    header: string;
    /** Propiedad de cada fila de la que se toma el valor. */
    field: string;
}

export interface ExcelExportOptions {
    /** Nombre del archivo, sin extensión. */
    fileName: string;
    /** Nombre de la hoja de cálculo (Excel admite 31 caracteres). */
    sheetName: string;
    columns: ExcelColumn[];
    rows: Array<Record<string, any>>;
}

interface PackageFile {
    path: string;
    content: Uint8Array;
}

interface ZipEntry {
    name: Uint8Array;
    data: Uint8Array;
    crc: number;
    uncompressedSize: number;
    method: number;
    offset: number;
    time: number;
    date: number;
}

const XLSX_MIME_TYPE =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const XML_VERSION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

const XML_ESCAPES: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;"
};

function escapeXml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => XML_ESCAPES[character]);
}

/** Elimina caracteres que XML 1.0 no admite (se conservan tab, LF y CR). */
function stripInvalidXmlCharacters(text: string): string {
    let result = "";

    for (let index = 0; index < text.length; index++) {
        const code = text.charCodeAt(index);
        const isValid =
            code === 0x09 || code === 0x0a || code === 0x0d || (code >= 0x20 && code !== 0xfffe && code !== 0xffff);

        if (isValid) {
            result += text[index];
        }
    }

    return result;
}

/** Normaliza cualquier valor a texto válido dentro de un XML. */
function toCellText(value: any): string {
    if (value === null || value === undefined) {
        return "";
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    const text = typeof value === "object" ? JSON.stringify(value) : String(value);

    return stripInvalidXmlCharacters(text);
}

/** Índice base 0 a referencia de columna de Excel: 0 -> A, 25 -> Z, 26 -> AA. */
function columnReference(index: number): string {
    let reference = "";
    let current = index;

    while (current >= 0) {
        reference = String.fromCharCode((current % 26) + 65) + reference;
        current = Math.floor(current / 26) - 1;
    }

    return reference;
}

/** Resuelve rutas simples y anidadas ("precio", "cliente.nombre") sobre una fila. */
function resolveValue(row: Record<string, any>, field: string): any {
    if (!row) {
        return undefined;
    }

    if (field.indexOf(".") === -1) {
        return row[field];
    }

    return field.split(".").reduce<any>((current, part) => {
        return current === null || current === undefined ? undefined : current[part];
    }, row);
}

function sanitizeFileName(fileName: string): string {
    const cleaned = (fileName || "Export")
        .replace(/[\\/:*?"<>|]+/g, "_")
        .trim();

    return cleaned.length ? cleaned : "Export";
}

const STYLES_XML =
    `${XML_VERSION}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<fonts count="2">` +
    `<font><sz val="11"/><color rgb="FF000000"/><name val="Calibri"/><family val="2"/></font>` +
    `<font><b/><sz val="11"/><color rgb="FF000000"/><name val="Calibri"/><family val="2"/></font>` +
    `</fonts>` +
    `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
    `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="2">` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
    `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
    `</cellXfs>` +
    `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
    `</styleSheet>`;

function buildPackageFiles(options: ExcelExportOptions): PackageFile[] {
    const encoder = new TextEncoder();
    const sheetName = (options.sheetName || "Datos").substring(0, 31);
    const parts: Array<{ path: string; xml: string }> = [
        {
            path: "[Content_Types].xml",
            xml:
                `${XML_VERSION}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
                `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
                `<Default Extension="xml" ContentType="application/xml"/>` +
                `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
                `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
                `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
                `</Types>`
        },
        {
            path: "_rels/.rels",
            xml:
                `${XML_VERSION}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
                `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
                `</Relationships>`
        },
        {
            path: "xl/workbook.xml",
            xml:
                `${XML_VERSION}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
                `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
                `<sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets>` +
                `</workbook>`
        },
        {
            path: "xl/_rels/workbook.xml.rels",
            xml:
                `${XML_VERSION}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
                `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
                `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
                `</Relationships>`
        },
        { path: "xl/styles.xml", xml: STYLES_XML },
        { path: "xl/worksheets/sheet1.xml", xml: buildSheetXml(options.columns, options.rows) }
    ];

    return parts.map((part) => ({ path: part.path, content: encoder.encode(part.xml) }));
}

/* ------------------------------------------------------------------ */
/* Contenedor ZIP del paquete OPC                                      */
/* ------------------------------------------------------------------ */

const CRC_TABLE: number[] = (() => {
    const table: number[] = [];

    for (let index = 0; index < 256; index++) {
        let value = index;

        for (let bit = 0; bit < 8; bit++) {
            value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
        }

        table[index] = value >>> 0;
    }

    return table;
})();

function crc32(bytes: Uint8Array): number {
    let crc = 0xffffffff;

    for (let index = 0; index < bytes.length; index++) {
        crc = CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
    }

    return (crc ^ 0xffffffff) >>> 0;
}

/** Comprime con deflate-raw nativo; devuelve null si no está disponible. */
async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array | null> {
    const compressionStream = (globalThis as any).CompressionStream;

    if (typeof compressionStream !== "function") {
        return null;
    }

    try {
        const compressedStream = (new Blob([bytes]) as any)
            .stream()
            .pipeThrough(new compressionStream("deflate-raw"));
        const buffer: ArrayBuffer = await new Response(compressedStream).arrayBuffer();

        return new Uint8Array(buffer);
    } catch {
        return null;
    }
}

function dosDateTime(date: Date): { time: number; date: number } {
    const time =
        ((date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)) & 0xffff;
    const day =
        (((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xffff;

    return { time, date: day };
}

async function buildZip(files: PackageFile[]): Promise<Blob> {
    const stamp = dosDateTime(new Date());
    const localParts: Uint8Array[] = [];
    const centralParts: Uint8Array[] = [];
    const entries: ZipEntry[] = [];
    let offset = 0;

    for (const file of files) {
        const name = new TextEncoder().encode(file.path);
        const crc = crc32(file.content);
        const deflated = await deflateRaw(file.content);
        const useDeflate = deflated !== null && deflated.length < file.content.length;
        const data = useDeflate ? (deflated as Uint8Array) : file.content;
        const header = new Uint8Array(30 + name.length);
        const view = new DataView(header.buffer);

        view.setUint32(0, 0x04034b50, true);
        view.setUint16(4, 20, true);
        view.setUint16(6, 0x0800, true);
        view.setUint16(8, useDeflate ? 8 : 0, true);
        view.setUint16(10, stamp.time, true);
        view.setUint16(12, stamp.date, true);
        view.setUint32(14, crc, true);
        view.setUint32(18, data.length, true);
        view.setUint32(22, file.content.length, true);
        view.setUint16(26, name.length, true);
        view.setUint16(28, 0, true);
        header.set(name, 30);

        localParts.push(header, data);
        entries.push({
            name,
            data,
            crc,
            uncompressedSize: file.content.length,
            method: useDeflate ? 8 : 0,
            offset,
            time: stamp.time,
            date: stamp.date
        });
        offset += header.length + data.length;
    }

    let centralSize = 0;

    for (const entry of entries) {
        const header = new Uint8Array(46 + entry.name.length);
        const view = new DataView(header.buffer);

        view.setUint32(0, 0x02014b50, true);
        view.setUint16(4, 20, true);
        view.setUint16(6, 20, true);
        view.setUint16(8, 0x0800, true);
        view.setUint16(10, entry.method, true);
        view.setUint16(12, entry.time, true);
        view.setUint16(14, entry.date, true);
        view.setUint32(16, entry.crc, true);
        view.setUint32(20, entry.data.length, true);
        view.setUint32(24, entry.uncompressedSize, true);
        view.setUint16(28, entry.name.length, true);
        view.setUint16(30, 0, true);
        view.setUint16(32, 0, true);
        view.setUint16(34, 0, true);
        view.setUint16(36, 0, true);
        view.setUint32(38, 0, true);
        view.setUint32(42, entry.offset, true);
        header.set(entry.name, 46);

        centralParts.push(header);
        centralSize += header.length;
    }

    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);

    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(4, 0, true);
    endView.setUint16(6, 0, true);
    endView.setUint16(8, entries.length, true);
    endView.setUint16(10, entries.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, offset, true);
    endView.setUint16(20, 0, true);

    return new Blob([...localParts, ...centralParts, end], { type: XLSX_MIME_TYPE });
}

/**
 * Genera el archivo .xlsx en memoria. Se separa de la descarga para poder
 * validar la estructura del paquete fuera del navegador.
 */
export async function buildExcelBlob(options: ExcelExportOptions): Promise<Blob> {
    return buildZip(buildPackageFiles(options));
}

/** Genera y descarga un .xlsx con las columnas y filas indicadas. */
export async function exportRowsToExcel(options: ExcelExportOptions): Promise<void> {
    const blob = await buildExcelBlob(options);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${sanitizeFileName(options.fileName)}.xlsx`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function buildSheetXml(
    columns: ExcelColumn[],
    rows: Array<Record<string, any>>
): string {
    const columnSizes = columns
        .map((column, index) => {
            const longest = rows.reduce(
                (max, row) => Math.max(max, toCellText(resolveValue(row, column.field)).length),
                column.header.length
            );
            const width = Math.min(Math.max(longest + 2, 10), 60);

            return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
        })
        .join("");

    const headerRow = `<row r="1">${columns
        .map((column, index) => {
            const reference = `${columnReference(index)}1`;

            return `<c r="${reference}" s="1" t="inlineStr"><is><t xml:space="preserve">${escapeXml(
                toCellText(column.header)
            )}</t></is></c>`;
        })
        .join("")}</row>`;

    const bodyRows = rows
        .map((row, rowIndex) => {
            const cells = columns
                .map((column, columnIndex) => {
                    const reference = `${columnReference(columnIndex)}${rowIndex + 2}`;

                    return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(
                        toCellText(resolveValue(row, column.field))
                    )}</t></is></c>`;
                })
                .join("");

            return `<row r="${rowIndex + 2}">${cells}</row>`;
        })
        .join("");

    return (
        `${XML_VERSION}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
        `<sheetViews><sheetView workbookViewId="0"/></sheetViews>` +
        `<sheetFormatPr defaultRowHeight="15"/>` +
        `<cols>${columnSizes}</cols>` +
        `<sheetData>${headerRow}${bodyRows}</sheetData>` +
        `</worksheet>`
    );
}
