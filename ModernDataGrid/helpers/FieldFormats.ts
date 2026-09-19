/**
 * Formatos de valores por columna.
 *
 * Una propiedad dedicada por tipo de formato, de modo que cada valor se configure
 * por separado en el panel de propiedades de la app:
 *
 *   CurrencyFormats → Importe=EUR, Precio=USD|locale:en-US
 *   DateFormats     → Fecha=dd/MM/yyyy              (columnas de solo fecha)
 *   DateTimeFormats → Creado=dd/MM/yyyy HH:mm       (columnas de fecha y hora)
 *   TimeFormats     → HoraInicio=HH:mm              (columnas de solo hora)
 *   NumberFormats   → Cantidad=3|grouping:false|locale:en-US  (o Cantidad=decimals:3)
 *   DecimalFormats  → Cantidad=3                    (atajo de solo decimales)
 *   BooleanLabels   → Activo=Sí|No
 *
 * Cada propiedad se aplica **solo** a las columnas de su tipo de dato: la columna que
 * aparezca en la propiedad de otro tipo se ignora (con un aviso en la consola) en lugar
 * de recibir un formato que no corresponde. Cuando no hay formato, se usa el valor por
 * defecto del tipo de dato.
 *
 * Propiedades heredadas retiradas: `FieldConfigurations` (`1.0.0.37`) y el combo global
 * `DateFormat` (`1.0.0.37`).
 */
import { resolveDatePattern } from './DateFormat';
import { normalizeText } from './Utils';

/** Opciones adicionales de una asignación, escritas como `clave:valor`. */
export interface FormatAssignmentOptions {
    [key: string]: string;
}

/** Una entrada `columna=valor` (con opciones opcionales) de una propiedad de formato. */
export interface FormatAssignment {
    /** Valor principal: código de moneda, patrón de fecha, número de decimales, etc. */
    value: string;
    /** Opciones adicionales separadas por `|`: `locale`, `decimals`, `grouping`, etc. */
    options: FormatAssignmentOptions;
}

export type FormatAssignmentMap = { [identifier: string]: FormatAssignment };

/** Columna del dataset tal como la identifican las propiedades de formato. */
export interface FormatColumn {
    name: string;
    alias?: string;
    displayName?: string;
    /** Etiqueta visible (propiedad `ColumnLabels`), válida también como identificador. */
    label?: string;
}

/** Etiquetas de verdadero/falso por columna (`BooleanLabels`). */
export interface BooleanLabelEntry {
    trueLabel: string;
    falseLabel: string;
}

/** Texto sin analizar de las propiedades de formato. */
export interface FormatPropertyValues {
    currencyFormats?: string | null;
    dateFormats?: string | null;
    dateTimeFormats?: string | null;
    timeFormats?: string | null;
    numberFormats?: string | null;
    decimalFormats?: string | null;
    booleanLabels?: string | null;
}

/** Propiedades ya analizadas: se conservan hasta que cambie alguno de sus textos. */
export interface ParsedFormatProperties {
    currency: FormatAssignmentMap;
    date: FormatAssignmentMap;
    dateTime: FormatAssignmentMap;
    time: FormatAssignmentMap;
    number: FormatAssignmentMap;
    decimal: FormatAssignmentMap;
    boolean: { [identifier: string]: BooleanLabelEntry };
}

/** Formato efectivo de una columna. */
export interface ColumnFormat {
    currency: string;
    currencyLocale?: string;
    currencyDecimals?: number;
    datePattern?: string;
    decimalPlaces?: number;
    numberLocale?: string;
    numberGrouping?: boolean;
    trueLabel?: string;
    falseLabel?: string;
}

/** Separadores reservados de las propiedades de formato. */
const ENTRY_SEPARATOR = ',';
const OPTION_SEPARATOR = '|';
const KEY_SEPARATOR = ':';
const LABEL_SEPARATOR = '|';

/**
 * Claves que se interpretan como opciones dentro de una asignación
 * (`columna=valor|clave:valor`). Las que no están en la lista forman parte del
 * valor, de modo que un patrón de hora (`HH:mm`) se conserva tal cual.
 */
const KNOWN_OPTION_KEYS = ['decimals', 'grouping', 'locale'];

/** Número a partir del texto de una opción (`undefined` si no es un número válido). */
export function toNumber(value?: string | null): number | undefined {
    if (value === null || value === undefined || value === '') {
        return undefined;
    }

    const parsed = Number(String(value).trim());

    return Number.isFinite(parsed) ? parsed : undefined;
}

/** Verdadero/falso a partir del texto de una opción (`undefined` si no se reconoce). */
export function toBoolean(value?: string | null): boolean | undefined {
    if (value === null || value === undefined || value === '') {
        return undefined;
    }

    const text = normalizeText(String(value));

    if (text === 'true' || text === '1' || text === 'yes' || text === 'si' || text === 'sí') {
        return true;
    }

    if (text === 'false' || text === '0' || text === 'no') {
        return false;
    }

    return undefined;
}

/** Aviso de una entrada con formato incorrecto. */
function warnInvalid(entry: string, expected: string): void {
    console.warn(`Formatos: entrada no válida "${entry.trim()}" (se espera ${expected}).`);
}

/**
 * Analiza una propiedad `columna=valor[|clave:valor]…, otraColumna=valor`.
 * Devuelve el mapa `{ identificador -> { value, options } }`.
 */
export function parseFormatAssignments(raw?: string | null): FormatAssignmentMap {
    const assignments: FormatAssignmentMap = {};

    if (!raw) {
        return assignments;
    }

    raw.split(ENTRY_SEPARATOR).forEach((entry) => {
        const separatorIndex = entry.indexOf('=');

        if (separatorIndex === -1) {
            if (entry.trim()) {
                warnInvalid(entry, 'columna=valor');
            }

            return;
        }

        const identifier = entry.substring(0, separatorIndex).trim();
        const parts = entry.substring(separatorIndex + 1).split(OPTION_SEPARATOR);
        const options: FormatAssignmentOptions = {};
        let value = '';

        parts.forEach((part) => {
            const colonIndex = part.indexOf(KEY_SEPARATOR);
            const key = colonIndex > 0 ? part.substring(0, colonIndex).trim().toLowerCase() : '';

            // Solo se toman como opciones las claves conocidas: así un patrón con `:`
            // (`HH:mm`) se conserva como valor.
            if (key && KNOWN_OPTION_KEYS.indexOf(key) !== -1) {
                options[key] = part.substring(colonIndex + 1).trim();

                return;
            }

            if (!value) {
                value = part.trim();
            }
        });

        if (identifier) {
            assignments[identifier] = { value, options };
        }
    });

    return assignments;
}

/** Analiza `BooleanLabels`: `columna=Etiqueta verdadera|Etiqueta falsa, otra=…`. */
export function parseBooleanLabels(raw?: string | null): { [identifier: string]: BooleanLabelEntry } {
    const labels: { [identifier: string]: BooleanLabelEntry } = {};

    if (!raw) {
        return labels;
    }

    raw.split(ENTRY_SEPARATOR).forEach((entry) => {
        const separatorIndex = entry.indexOf('=');

        if (separatorIndex === -1) {
            if (entry.trim()) {
                warnInvalid(entry, 'columna=Verdadero|Falso');
            }

            return;
        }

        const identifier = entry.substring(0, separatorIndex).trim();
        const parts = entry.substring(separatorIndex + 1).split(LABEL_SEPARATOR);
        const trueLabel = (parts[0] || '').trim();
        const falseLabel = (parts.length > 1 ? parts[1] : '').trim();

        if (identifier && (trueLabel || falseLabel)) {
            labels[identifier] = { trueLabel, falseLabel };
        }
    });

    return labels;
}

/** Analiza de una sola vez todas las propiedades de formato. */
export function parseFormatProperties(values: FormatPropertyValues): ParsedFormatProperties {
    return {
        currency: parseFormatAssignments(values.currencyFormats),
        date: parseFormatAssignments(values.dateFormats),
        dateTime: parseFormatAssignments(values.dateTimeFormats),
        time: parseFormatAssignments(values.timeFormats),
        number: parseFormatAssignments(values.numberFormats),
        decimal: parseFormatAssignments(values.decimalFormats),
        boolean: parseBooleanLabels(values.booleanLabels)
    };
}

/** Firma de los textos de formato: cambia solo cuando hay que reformatear las filas. */
export function formatPropertySignature(values: FormatPropertyValues): string {
    return [
        values.currencyFormats || '',
        values.dateFormats || '',
        values.dateTimeFormats || '',
        values.timeFormats || '',
        values.numberFormats || '',
        values.decimalFormats || '',
        values.booleanLabels || ''
    ].join('\u0001');
}

/**
 * Entrada de un mapa que corresponde a una columna, buscándola por nombre, alias,
 * nombre para mostrar o etiqueta (sin distinguir mayúsculas ni acentos).
 */
export function findFormatEntry<T>(map: { [identifier: string]: T }, column: FormatColumn): T | undefined {
    const keys = Object.keys(map || {});

    if (!keys.length) {
        return undefined;
    }

    const identifiers = [column.name, column.alias, column.displayName, column.label]
        .filter(Boolean)
        .map((identifier) => normalizeText(String(identifier)));
    const key = keys.find((candidate) => identifiers.indexOf(normalizeText(candidate)) !== -1);

    return key ? map[key] : undefined;
}

/** true para las columnas de fecha, fecha y hora o hora del dataset. */
export function isDateDataType(dataType?: string): boolean {
    return !!dataType && dataType.indexOf('DateAndTime') === 0;
}

/** true para las columnas de solo fecha. */
export function isDateOnlyDataType(dataType?: string): boolean {
    return dataType === 'DateAndTime.DateOnly';
}

/** true para las columnas de solo hora. */
export function isTimeOnlyDataType(dataType?: string): boolean {
    return dataType === 'DateAndTime.TimeOnly';
}

/** true para las columnas de fecha y hora (no solo fecha ni solo hora). */
export function isDateTimeDataType(dataType?: string): boolean {
    return isDateDataType(dataType) && !isDateOnlyDataType(dataType) && !isTimeOnlyDataType(dataType);
}

/** Avisos ya emitidos: una columna en la propiedad de otro tipo se avisa una sola vez. */
const wrongTypeWarnings = new Set<string>();

/**
 * Avisa (una sola vez por columna y propiedad) cuando una columna aparece en una
 * propiedad de formato que no corresponde a su tipo de dato, porque ese formato se
 * ignora. Es la red de seguridad para una columna mal escrita.
 */
function warnWrongType(
    propertyName: string,
    map: FormatAssignmentMap,
    column: FormatColumn,
    dataType: string
): void {
    if (!findFormatEntry(map, column)) {
        return;
    }

    const key = `${propertyName}|${column.name}`;

    if (wrongTypeWarnings.has(key)) {
        return;
    }

    wrongTypeWarnings.add(key);
    console.warn(
        `Formatos: la columna "${column.name}" está en ${propertyName} pero su tipo de dato es "${dataType}"; ese formato no se aplica.`
    );
}

/**
 * Entrada de fecha que corresponde a la columna **por su tipo de dato**:
 * `DateFormats` para solo fecha, `DateTimeFormats` para fecha y hora y
 * `TimeFormats` para solo hora. La columna que esté en la propiedad de otro tipo
 * se ignora (con un aviso en la consola) en lugar de aplicarle un formato que no
 * corresponde.
 */
function findDateAssignment(
    dataType: string,
    column: FormatColumn,
    properties: ParsedFormatProperties
): FormatAssignment | undefined {
    if (isDateOnlyDataType(dataType)) {
        warnWrongType('DateTimeFormats', properties.dateTime, column, dataType);
        warnWrongType('TimeFormats', properties.time, column, dataType);

        return findFormatEntry(properties.date, column);
    }

    if (isTimeOnlyDataType(dataType)) {
        warnWrongType('DateFormats', properties.date, column, dataType);
        warnWrongType('DateTimeFormats', properties.dateTime, column, dataType);

        return findFormatEntry(properties.time, column);
    }

    if (isDateTimeDataType(dataType)) {
        warnWrongType('DateFormats', properties.date, column, dataType);
        warnWrongType('TimeFormats', properties.time, column, dataType);

        return findFormatEntry(properties.dateTime, column);
    }

    // No es una columna de fecha: se revisan las tres propiedades solo para avisar.
    warnWrongType('DateFormats', properties.date, column, dataType);
    warnWrongType('DateTimeFormats', properties.dateTime, column, dataType);
    warnWrongType('TimeFormats', properties.time, column, dataType);

    return undefined;
}

/**
 * Formato efectivo de una columna a partir de las propiedades dedicadas.
 *
 * El formato de fecha se toma **solo** de la propiedad que corresponde al tipo de
 * dato de la columna (`DateFormats` / `DateTimeFormats` / `TimeFormats`); cuando no
 * hay formato, se usa el valor por defecto del tipo (`yyyy-MM-dd`,
 * `yyyy-MM-dd HH:mm:ss` o `HH:mm:ss`) y las demás propiedades no lo sobrescriben.
 */
export function buildColumnFormat(
    dataType: string,
    column: FormatColumn,
    properties: ParsedFormatProperties
): ColumnFormat {
    const currency = findFormatEntry(properties.currency, column);
    const number = findFormatEntry(properties.number, column);
    const decimal = findFormatEntry(properties.decimal, column);
    const boolean = findFormatEntry(properties.boolean, column);
    const dateAssignment = findDateAssignment(dataType, column, properties);

    return {
        currency: (currency && currency.value) || '',
        currencyLocale: currency?.options.locale,
        currencyDecimals: toNumber(currency?.options.decimals),
        datePattern: resolveDatePattern(dateAssignment && dateAssignment.value),
        decimalPlaces:
            toNumber(decimal?.value) ??
            toNumber(decimal?.options.decimals) ??
            toNumber(number?.value) ??
            toNumber(number?.options.decimals),
        numberLocale: number?.options.locale,
        numberGrouping: toBoolean(number?.options.grouping),
        trueLabel: boolean && boolean.trueLabel,
        falseLabel: boolean && boolean.falseLabel
    };
}
