/**
 * Vistas (informes) del usuario final.
 *
 * La propiedad `Views` recibe un objeto (o arreglo) JSON con la definición de cada
 * vista. Al elegirla en el combo de la barra, el control aplica sus columnas,
 * títulos, filtros y orden, y la vista se convierte en la base del Excel exportado:
 *
 * ```json
 * {
 *   "activos": {
 *     "nombre": "Registros activos",
 *     "descripcion": "Solo lo que está vigente",
 *     "columnas": "Id;Cliente;Estado;Fecha",
 *     "titulos": { "Cliente": "Cliente", "Fecha": "Fecha de alta" },
 *     "filtros": "Estado = Activo; Tipo %NACIONAL%",
 *     "ordenarPor": "Fecha",
 *     "ordenDescendente": true,
 *     "archivo": "activos_{fecha}.xlsx",
 *     "hoja": "Activos"
 *   }
 * }
 * ```
 *
 * Operadores de `filtros` (varias reglas separadas por `;` o salto de línea):
 * `=`, `!=`, `%valor%` (contiene), `valor%` (empieza por), `%valor` (termina con),
 * `>`, `>=`, `<`, `<=` e `in (A,B)` (cualquiera de los valores). Las reglas se combinan con **Y**.
 */
import { normalizeText } from './Utils';

/** Clave de la opción «sin vista». */
export const NO_VIEW_KEY = '';

/** Operadores admitidos por los filtros de una vista. */
export type ViewFilterOperator =
    | 'equals'
    | 'notEquals'
    | 'contains'
    | 'notContains'
    | 'startsWith'
    | 'endsWith'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in';

/** Regla de filtro escrita en `filtros`. */
export interface ViewFilter {
    /** Texto original de la regla (diagnóstico). */
    token: string;
    /** Identificador de la columna tal como se escribió en la vista. */
    column: string;
    operator: ViewFilterOperator;
    /** Valor ya limpio de comodines. */
    value: string;
}

/** Una vista tal como viene del JSON (los identificadores se resuelven al compilarla). */
export interface GridView {
    key: string;
    nombre: string;
    descripcion: string;
    columnas: string[];
    titulos: { [identifier: string]: string };
    filters: ViewFilter[];
    ordenarPor: string;
    ordenDescendente: boolean;
    archivo: string;
    hoja: string;
    predeterminada: boolean;
}

/** Columna del dataset contra la que se resuelven los identificadores de la vista. */
export interface ViewColumn {
    name: string;
    alias?: string;
    displayName: string;
    /** Etiqueta visible (`ColumnLabels`). */
    label?: string;
}

/** Regla de una vista con la columna ya resuelta al nombre lógico del dataset. */
export interface CompiledViewFilter {
    name: string;
    operator: ViewFilterOperator;
    value: string;
}

/** Vista lista para aplicar: identificadores traducidos a nombres lógicos. */
export interface CompiledView {
    key: string;
    nombre: string;
    descripcion: string;
    /** Nombres lógicos de las columnas visibles (vacío = todas). */
    columns: string[];
    /** Títulos de columna por nombre lógico. */
    titles: { [name: string]: string };
    filters: CompiledViewFilter[];
    sortField: string;
    /** 1 ascendente, -1 descendente. */
    sortOrder: 1 | -1;
    /** Plantilla del nombre del Excel (admite `{fecha}`, `{hora}` y `{fechaHora}`). */
    fileTemplate: string;
    sheetName: string;
}

/** Texto de un valor del JSON (cadena vacía si no aplica). */
function toText(value: any, fallback = ''): string {
    return value === null || value === undefined ? fallback : String(value);
}

/** Lista a partir de un arreglo o de un texto separado por `;` o `,`. */
function toList(value: any): string[] {
    if (!value) {
        return [];
    }

    const items = Array.isArray(value) ? value : String(value).split(/[;,]/);

    return items
        .map((item) => toText(item).trim())
        .filter(Boolean);
}

/** Texto de filtros a partir de un texto o de un arreglo de reglas. */
function toFilterText(value: any): string {
    if (!value) {
        return '';
    }

    return Array.isArray(value) ? value.map((item) => toText(item)).join(';') : String(value);
}

/**
 * Convierte en JSON válido el texto escrito como objeto de JavaScript:
 * `;` como separador de propiedades y nombres de propiedad sin comillas.
 * Respeta las comillas, así que los `;` dentro de los valores (por ejemplo una
 * lista de columnas) no se tocan.
 */
function normalizeLooseJson(text: string): string {
    let result = '';
    let inString = false;
    let escaped = false;
    let expectKey = false;

    for (let index = 0; index < text.length; index++) {
        const character = text[index];

        if (inString) {
            result += character;

            if (escaped) {
                escaped = false;
            } else if (character === '\\') {
                escaped = true;
            } else if (character === '"') {
                inString = false;
            }

            continue;
        }

        if (character === '"') {
            inString = true;
            expectKey = false;
            result += character;

            continue;
        }

        if (character === ';') {
            result += ',';
            expectKey = true;

            continue;
        }

        if (character === '{' || character === ',') {
            result += character;
            expectKey = true;

            continue;
        }

        if (expectKey) {
            if (character === ' ' || character === '\t' || character === '\r' || character === '\n') {
                result += character;

                continue;
            }

            const match = /^([A-Za-z_$][A-Za-z0-9_$]*)\s*:/.exec(text.substring(index));

            if (match) {
                result += `"${match[1]}":`;
                index += match[0].length - 1;
                expectKey = false;

                continue;
            }

            expectKey = false;
        }

        result += character;
    }

    return result;
}

/** JSON de la propiedad `Views`: primero estricto y, si falla, con separadores `;`. */
function parseViewsJson(raw: string): any {
    const text = (raw || '').trim();

    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch {
        // Se intenta el formato tolerante antes de descartar el texto.
    }

    try {
        return JSON.parse(normalizeLooseJson(text));
    } catch (error) {
        console.error('[ModernDataGrid] Views: el texto no es un JSON válido.', error);

        return null;
    }
}

/** Convierte una entrada del JSON en una vista. */
function toGridView(key: string, value: any): GridView | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        console.warn(`Views: la vista "${key}" no es un objeto y se ignora.`);

        return null;
    }

    const titlesSource = value.titulos || value.titles;
    const titulos: { [identifier: string]: string } = {};

    if (titlesSource && typeof titlesSource === 'object' && !Array.isArray(titlesSource)) {
        Object.keys(titlesSource).forEach((identifier) => {
            const label = toText(titlesSource[identifier]).trim();

            if (label) {
                titulos[identifier] = label;
            }
        });
    }

    const filterText = toFilterText(value.filtros || value.filters);

    return {
        key: String(key),
        nombre: toText(value.nombre || value.name, String(key)).trim() || String(key),
        descripcion: toText(value.descripcion || value.description).trim(),
        columnas: toList(value.columnas || value.columns),
        titulos,
        filters: parseViewFilters(filterText),
        ordenarPor: toText(value.ordenarPor || value.sortBy).trim(),
        ordenDescendente: value.ordenDescendente === true || value.sortDescending === true,
        archivo: toText(value.archivo || value.file).trim(),
        hoja: toText(value.hoja || value.sheet).trim(),
        predeterminada: value.predeterminada === true || value.default === true
    };
}

/**
 * Vistas de la propiedad `Views`. Acepta un objeto `{ clave: vista }` o un arreglo
 * de vistas (la clave se toma de `clave`/`key`/`nombre`).
 */
export function parseViews(raw?: string | null): GridView[] {
    const parsed = parseViewsJson(raw || '');

    if (!parsed) {
        return [];
    }

    const entries: Array<{ key: string; value: any }> = Array.isArray(parsed)
        ? parsed.map((item: any, index: number) => ({
              key: toText(item?.clave || item?.key || item?.nombre, String(index + 1)),
              value: item
          }))
        : Object.keys(parsed).map((key) => ({ key, value: parsed[key] }));
    const views: GridView[] = [];

    entries.forEach((entry) => {
        const view = toGridView(String(entry.key), entry.value);

        if (view) {
            views.push(view);
        }
    });

    return views;
}

/** Operadores de dos caracteres (se buscan antes que los de uno). */
const TWO_CHAR_OPERATORS: Array<[string, ViewFilterOperator]> = [
    ['!=', 'notEquals'],
    ['<>', 'notEquals'],
    ['>=', 'gte'],
    ['<=', 'lte']
];

/** Operadores de un carácter. */
const ONE_CHAR_OPERATORS: Array<[string, ViewFilterOperator]> = [
    ['=', 'equals'],
    ['>', 'gt'],
    ['<', 'lt']
];

/** Quita los comodines `%` del principio y del final y dice cuáles tenía. */
function splitWildcards(value: string): { value: string; starts: boolean; ends: boolean } {
    const starts = value.indexOf('%') === 0;
    const ends = value.length > 1 && value.lastIndexOf('%') === value.length - 1;

    return { value: value.replace(/%/g, '').trim(), starts, ends };
}

/** Operador que corresponde a los comodines `%` de un valor. */
function wildcardOperator(starts: boolean, ends: boolean): ViewFilterOperator {
    if (starts && ends) {
        return 'contains';
    }

    if (ends) {
        return 'startsWith';
    }

    if (starts) {
        return 'endsWith';
    }

    // Comodín en medio (`A%B`): se compara como contiene.
    return 'contains';
}

/** Crea la regla a partir de la posición del operador encontrado. */
function buildViewFilter(
    token: string,
    operatorToken: string,
    operator: ViewFilterOperator,
    separatorIndex: number
): ViewFilter | null {
    const column = token.substring(0, separatorIndex).trim();
    const rawValue = token.substring(separatorIndex + operatorToken.length).trim();

    if (!column || !rawValue) {
        console.warn(`Views: regla incompleta "${token}" (se espera columna operador valor).`);

        return null;
    }

    const wildcards = splitWildcards(rawValue);

    if (wildcards.value === rawValue) {
        return { token, column, operator, value: rawValue };
    }

    // `= %valor%` se interpreta como contiene; `!= %valor%` como no contiene.
    const resolvedOperator =
        operator === 'equals' ? wildcardOperator(wildcards.starts, wildcards.ends)
        : operator === 'notEquals' ? 'notContains'
        : operator;

    return { token, column, operator: resolvedOperator, value: wildcards.value };
}

/** Analiza una regla de filtro de una vista. */
export function parseViewFilter(token: string): ViewFilter | null {
    const text = token.trim();

    if (!text) {
        return null;
    }

    for (const [operatorToken, operator] of TWO_CHAR_OPERATORS) {
        const index = text.indexOf(operatorToken);

        if (index > 0) {
            return buildViewFilter(text, operatorToken, operator, index);
        }
    }

    for (const [operatorToken, operator] of ONE_CHAR_OPERATORS) {
        const index = text.indexOf(operatorToken);

        if (index > 0) {
            return buildViewFilter(text, operatorToken, operator, index);
        }
    }

    // `Columna in (valor, valor)`: se cumple con cualquiera de los valores.
    const inMatch = /^([^%]+?)\s+in\s*\(?\s*([^%()]+?)\s*\)?$/i.exec(text);

    if (inMatch) {
        const column = inMatch[1].trim();
        const values = inMatch[2]
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);

        if (column && values.length) {
            return { token, column, operator: 'in', value: values.join(',') };
        }
    }

    // Sin operador explícito: `Columna %valor%` (contiene), `valor%` (empieza por)…
    const match = /^(.*?)\s+(\S*%\S*)$/.exec(text);

    if (match) {
        const column = match[1].trim();
        const wildcards = splitWildcards(match[2].trim());

        if (column && wildcards.value) {
            return {
                token,
                column,
                operator: wildcardOperator(wildcards.starts, wildcards.ends),
                value: wildcards.value
            };
        }
    }

    console.warn(`Views: regla sin operador válido "${token}" (usa =, !=, in (a,b), %, >, >=, <, <=).`);

    return null;
}

/** Reglas de una vista, separadas por `;` o salto de línea (las inválidas se ignoran). */
export function parseViewFilters(raw: string): ViewFilter[] {
    return (raw || '')
        .split(/[;\n]+/)
        .map((token) => token.trim())
        .filter(Boolean)
        .map(parseViewFilter)
        .filter((filter): filter is ViewFilter => filter !== null);
}

/** Rango de un día en milisegundos. */
export interface FilterDayRange {
    start: number;
    end: number;
}

/** Valor de una fila contra el que se evalúa una regla de la vista. */
export interface ViewFilterTarget {
    /** Valor ya formateado que muestra la grilla. */
    displayValue: any;
    /** Fecha de la fila en milisegundos (columnas de fecha). */
    dateValue?: number;
    /** true cuando la columna es de fecha, fecha y hora u hora. */
    dateColumn?: boolean;
}

/** Operadores que se resuelven sobre la fecha real de la fila. */
const DATE_OPERATORS: { [operator: string]: boolean } = {
    equals: true,
    notEquals: true,
    gt: true,
    gte: true,
    lt: true,
    lte: true
};

/** Texto comparable de un valor (los nulos cuentan como cadena vacía). */
function displayText(value: any): string {
    return value === null || value === undefined ? '' : String(value);
}

/** Número comparable de un valor (solo si es un número o un texto numérico). */
function toComparableNumber(value: any): number | undefined {
    if (value === null || value === undefined || value === '') {
        return undefined;
    }

    const parsed = Number(String(value).replace(/\s/g, '').replace(',', '.'));

    return Number.isFinite(parsed) ? parsed : undefined;
}

/** Milisegundos de un valor interpretado como fecha. */
function toComparableDate(value: any): number | undefined {
    if (value === null || value === undefined || value === '') {
        return undefined;
    }

    const range = parseFilterDateRange(String(value));

    return range ? range.start : undefined;
}

/** Rango del día (o instante exacto) al que apunta el valor de una regla. */
export function parseFilterDateRange(value: string): FilterDayRange | null {
    const text = (value || '').trim();

    if (!text) {
        return null;
    }

    const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);

    if (isoMatch) {
        return dayRange(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
    }

    const localMatch = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);

    if (localMatch) {
        let day = Number(localMatch[1]);
        let month = Number(localMatch[2]);

        // `16/09/2026` (día primero) o `09/16/2026` (mes primero).
        if (month > 12 && day <= 12) {
            const swap = day;
            day = month;
            month = swap;
        }

        return dayRange(Number(localMatch[3]), month, day);
    }

    const parsed = new Date(text);

    if (isNaN(parsed.getTime())) {
        return null;
    }

    // Con hora escrita se compara el instante exacto; si no, el día completo.
    if (/\d{1,2}:\d{2}/.test(text)) {
        return { start: parsed.getTime(), end: parsed.getTime() };
    }

    return dayRange(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
}

/** Rango de un día completo. */
function dayRange(year: number, month: number, day: number): FilterDayRange | null {
    if (month < 1 || month > 12 || day < 1 || day > 31) {
        return null;
    }

    const start = new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
    const end = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();

    if (isNaN(start) || isNaN(end)) {
        return null;
    }

    return { start, end };
}

/** Comparación de un valor con el rango de una regla de fecha. */
function matchDateRange(value: number, operator: ViewFilterOperator, range: FilterDayRange): boolean {
    switch (operator) {
        case 'equals':
            return value >= range.start && value <= range.end;
        case 'notEquals':
            return value < range.start || value > range.end;
        case 'gt':
            return value > range.end;
        case 'gte':
            return value >= range.start;
        case 'lt':
            return value < range.start;
        case 'lte':
            return value <= range.end;
        default:
            return true;
    }
}

/** Igualdad: numérica si ambos valores son números, si no textual (sin mayúsculas ni acentos). */
function valuesAreEqual(displayValue: any, filterValue: string): boolean {
    const leftNumber = toComparableNumber(displayValue);
    const rightNumber = toComparableNumber(filterValue);

    if (leftNumber !== undefined && rightNumber !== undefined) {
        return leftNumber === rightNumber;
    }

    return normalizeText(displayText(displayValue)) === normalizeText(filterValue);
}

/** Comparación ordenada (mayor/menor) de un valor con el de la regla. */
function compareOrdered(
    displayValue: any,
    filterValue: string,
    compare: (left: any, right: any) => boolean
): boolean {
    const leftNumber = toComparableNumber(displayValue);
    const rightNumber = toComparableNumber(filterValue);

    if (leftNumber !== undefined && rightNumber !== undefined) {
        return compare(leftNumber, rightNumber);
    }

    const leftDate = toComparableDate(displayValue);
    const rightDate = toComparableDate(filterValue);

    if (leftDate !== undefined && rightDate !== undefined) {
        return compare(leftDate, rightDate);
    }

    return compare(normalizeText(displayText(displayValue)), normalizeText(filterValue));
}

/**
 * Evalúa una regla de una vista contra una fila. Las columnas de fecha se comparan
 * con la fecha real del registro (no con el texto formateado) cuando la regla usa
 * `=`, `!=`, `>`, `>=`, `<` o `<=` y el valor es una fecha reconocible.
 */
export function matchesViewFilter(
    target: ViewFilterTarget,
    operator: ViewFilterOperator,
    filterValue: string
): boolean {
    if (target.dateColumn && typeof target.dateValue === 'number' && isFinite(target.dateValue)) {
        const range = parseFilterDateRange(filterValue);

        if (range && DATE_OPERATORS[operator]) {
            return matchDateRange(target.dateValue, operator, range);
        }
    }

    const display = displayText(target.displayValue);
    const text = normalizeText(display);
    const needle = normalizeText(filterValue);

    switch (operator) {
        case 'contains':
            return text.indexOf(needle) !== -1;
        case 'notContains':
            return text.indexOf(needle) === -1;
        case 'startsWith':
            return needle.length > 0 && text.indexOf(needle) === 0;
        case 'endsWith':
            return (
                needle.length > 0 &&
                text.length >= needle.length &&
                text.substring(text.length - needle.length) === needle
            );
        case 'equals':
            return valuesAreEqual(display, filterValue);
        case 'notEquals':
            return !valuesAreEqual(display, filterValue);
        case 'gt':
            return compareOrdered(display, filterValue, (left, right) => left > right);
        case 'gte':
            return compareOrdered(display, filterValue, (left, right) => left >= right);
        case 'lt':
            return compareOrdered(display, filterValue, (left, right) => left < right);
        case 'lte':
            return compareOrdered(display, filterValue, (left, right) => left <= right);
        case 'in':
            return filterValue
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean)
                .some((value) => valuesAreEqual(display, value));
        default:
            return true;
    }
}

/** Columna del dataset a la que corresponde un identificador de la vista. */
export function findViewColumn(token: string, columns: ViewColumn[]): ViewColumn | null {
    const wanted = normalizeText(token);

    if (!wanted) {
        return null;
    }

    const column = columns.find((candidate) =>
        [candidate.name, candidate.alias, candidate.displayName, candidate.label]
            .filter(Boolean)
            .some((identifier) => normalizeText(String(identifier)) === wanted)
    );

    return column || null;
}

/** Columnas de una vista traducidas a nombres lógicos (conserva el orden escrito). */
export function resolveViewColumnNames(tokens: string[], columns: ViewColumn[], viewKey = ''): string[] {
    const resolved: string[] = [];

    tokens.forEach((token) => {
        const column = findViewColumn(token, columns);

        if (!column) {
            console.warn(`Views: la columna "${token}" de la vista "${viewKey}" no existe en el dataset.`);

            return;
        }

        if (resolved.indexOf(column.name) === -1) {
            resolved.push(column.name);
        }
    });

    return resolved;
}

/** Títulos de columna de una vista, traducidos a nombres lógicos. */
export function resolveViewTitles(
    titles: { [identifier: string]: string },
    columns: ViewColumn[],
    viewKey = ''
): { [name: string]: string } {
    const resolved: { [name: string]: string } = {};

    Object.keys(titles || {}).forEach((token) => {
        const column = findViewColumn(token, columns);
        const label = String(titles[token] ?? '').trim();

        if (!column) {
            console.warn(`Views: el título de "${token}" de la vista "${viewKey}" no corresponde a ninguna columna.`);

            return;
        }

        if (label) {
            resolved[column.name] = label;
        }
    });

    return resolved;
}

/** Nombre de hoja válido para Excel (sin caracteres prohibidos y con el tope de 31). */
export function sanitizeSheetName(name: string): string {
    return (name || '')
        .replace(/[\\/:*?[\]]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 31);
}

/**
 * Nombre del archivo Excel de una vista. Resuelve `{fecha}`, `{hora}` y
 * `{fechaHora}` (`{date}`, `{time}` y `{datetime}` como alias) y, si la plantilla
 * no lleva tokens, agrega la marca de tiempo igual que el nombre estándar.
 */
export function buildViewFileName(
    template: string,
    tokens: { date: string; time: string; stamp: string }
): string {
    const base = (template || '').trim();

    if (!base) {
        return '';
    }

    const hasToken = /\{\s*(fechaHora|fecha|hora|datetime|date|time)\s*\}/i.test(base);
    const name = base
        .replace(/\{\s*fechaHora\s*\}/gi, tokens.stamp)
        .replace(/\{\s*datetime\s*\}/gi, tokens.stamp)
        .replace(/\{\s*fecha\s*\}/gi, tokens.date)
        .replace(/\{\s*date\s*\}/gi, tokens.date)
        .replace(/\{\s*hora\s*\}/gi, tokens.time)
        .replace(/\{\s*time\s*\}/gi, tokens.time)
        .replace(/\.xlsx$/i, '')
        .trim();

    return (hasToken ? name : `${name}_${tokens.stamp}`).replace(/\.xlsx$/i, '').trim();
}

/** Vista lista para aplicar: identificadores traducidos a nombres lógicos del dataset. */
export function compileView(view: GridView, columns: ViewColumn[]): CompiledView {
    const filters: CompiledViewFilter[] = [];

    view.filters.forEach((filter) => {
        const column = findViewColumn(filter.column, columns);

        if (!column) {
            console.warn(
                `Views: la columna "${filter.column}" de la regla "${filter.token}" (vista "${view.key}") no existe en el dataset.`
            );

            return;
        }

        filters.push({ name: column.name, operator: filter.operator, value: filter.value });
    });

    const sortColumn = view.ordenarPor ? findViewColumn(view.ordenarPor, columns) : null;

    if (view.ordenarPor && !sortColumn) {
        console.warn(`Views: la columna de orden "${view.ordenarPor}" de la vista "${view.key}" no existe en el dataset.`);
    }

    return {
        key: view.key,
        nombre: view.nombre,
        descripcion: view.descripcion,
        columns: resolveViewColumnNames(view.columnas, columns, view.key),
        titles: resolveViewTitles(view.titulos, columns, view.key),
        filters,
        sortField: sortColumn ? sortColumn.name : '',
        sortOrder: view.ordenDescendente ? -1 : 1,
        fileTemplate: view.archivo,
        sheetName: sanitizeSheetName(view.hoja)
    };
}
