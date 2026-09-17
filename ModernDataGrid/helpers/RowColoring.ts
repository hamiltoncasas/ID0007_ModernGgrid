/**
 * Coloreado del registro completo según el valor de una columna.
 *
 * Formato de la propiedad `RowColorRules`:
 *
 *   columna=valor:colorFondo[:colorTexto]|valor:colorFondo, otraColumna=...
 *
 * - La coma separa columnas y la barra vertical separa reglas de la misma columna.
 * - El valor admite el prefijo `~` para "contiene" y `*` para cualquier valor.
 * - Los colores aceptan #RGB, #RRGGBB, rgb()/rgba()/hsl()/hsla() o un nombre CSS.
 * - La columna se puede indicar por nombre, alias o nombre para mostrar.
 */

export interface RowColorColumn {
    name: string;
    alias?: string;
    displayName: string;
}

export type RowColorMatchMode = 'equals' | 'contains' | 'any';

export interface RowColorRule {
    matchMode: RowColorMatchMode;
    value: string;
    background: string;
    color?: string;
}

export interface CompiledRowColors {
    /** Clase CSS de la fila o cadena vacía cuando ninguna regla coincide. */
    classNameFor(record: Record<string, any>): string;
    /** Hoja de estilos con los estados normal, hover y seleccionado. */
    css: string;
    /** Número de reglas válidas compiladas. */
    ruleCount: number;
}

const CLASS_PREFIX = 'mdg-row-color-';
const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const FUNCTION_COLOR = /^(rgb|rgba|hsl|hsla)\(/i;

/** Nombres de color válidos en CSS (evita aceptar erratas como "notacolor"). */
const CSS_COLOR_NAMES = new Set(
    (
        'aliceblue,antiquewhite,aqua,aquamarine,azure,beige,bisque,black,blanchedalmond,blue,blueviolet,brown,burlywood,' +
        'cadetblue,chartreuse,chocolate,coral,cornflowerblue,cornsilk,crimson,cyan,darkblue,darkcyan,darkgoldenrod,darkgray,' +
        'darkgreen,darkgrey,darkkhaki,darkmagenta,darkolivegreen,darkorange,darkorchid,darkred,darksalmon,darkseagreen,' +
        'darkslateblue,darkslategray,darkslategrey,darkturquoise,darkviolet,deeppink,deepskyblue,dimgray,dimgrey,dodgerblue,' +
        'firebrick,floralwhite,forestgreen,fuchsia,gainsboro,ghostwhite,gold,goldenrod,gray,green,greenyellow,grey,honeydew,' +
        'hotpink,indianred,indigo,ivory,khaki,lavender,lavenderblush,lawngreen,lemonchiffon,lightblue,lightcoral,lightcyan,' +
        'lightgoldenrodyellow,lightgray,lightgreen,lightgrey,lightpink,lightsalmon,lightseagreen,lightskyblue,lightslategray,' +
        'lightslategrey,lightsteelblue,lightyellow,lime,limegreen,linen,magenta,maroon,mediumaquamarine,mediumblue,' +
        'mediumorchid,mediumpurple,mediumseagreen,mediumslateblue,mediumspringgreen,mediumturquoise,mediumvioletred,' +
        'midnightblue,mintcream,mistyrose,moccasin,navajowhite,navy,oldlace,olive,olivedrab,orange,orangered,orchid,' +
        'palegoldenrod,palegreen,paleturquoise,palevioletred,papayawhip,peachpuff,peru,pink,plum,powderblue,purple,' +
        'rebeccapurple,red,rosybrown,royalblue,saddlebrown,salmon,sandybrown,seagreen,seashell,sienna,silver,skyblue,' +
        'slateblue,slategray,slategrey,snow,springgreen,steelblue,tan,teal,thistle,tomato,turquoise,violet,wheat,white,' +
        'whitesmoke,yellow,yellowgreen,transparent,currentcolor,inherit'
    ).split(',')
);

function isColor(value: string): boolean {
    return HEX_COLOR.test(value) || FUNCTION_COLOR.test(value) || CSS_COLOR_NAMES.has(value.toLowerCase());
}

/** Normaliza para comparar sin distinguir mayúsculas ni acentos. */
function normalize(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

/** Aclara (ratio > 0) u oscurece (ratio < 0) un color hexadecimal. */
function shadeColor(color: string, ratio: number): string {
    if (!HEX_COLOR.test(color)) {
        return color;
    }

    let hex = color.slice(1);

    if (hex.length === 3) {
        hex = hex
            .split('')
            .map((character) => character + character)
            .join('');
    }

    const channels = [0, 2, 4].map((index) => {
        const channel = parseInt(hex.substring(index, index + 2), 16);
        const target = ratio < 0 ? 0 : 255;
        const shaded = Math.round(channel + (target - channel) * Math.abs(ratio));

        return Math.min(255, Math.max(0, shaded)).toString(16).padStart(2, '0');
    });

    return `#${channels.join('')}`;
}

function findColumnName(token: string, columns: RowColorColumn[]): string | null {
    const wanted = normalize(token);
    const column = columns.find((candidate) =>
        [candidate.name, candidate.alias, candidate.displayName]
            .filter(Boolean)
            .some((identifier) => normalize(identifier as string) === wanted)
    );

    return column ? column.name : null;
}

function parseRuleText(text: string): RowColorRule | null {
    const parts = text
        .split(':')
        .map((part) => part.trim())
        .filter(Boolean);

    if (parts.length < 2) {
        return null;
    }

    let value = parts[0];
    let matchMode: RowColorMatchMode = 'equals';

    if (value === '*') {
        matchMode = 'any';
        value = '';
    } else if (value.startsWith('~')) {
        matchMode = 'contains';
        value = value.substring(1).trim();

        if (!value) {
            return null;
        }
    }

    const background = parts[1];
    const color = parts[2];

    if (!isColor(background) || (color && !isColor(color))) {
        return null;
    }

    return { matchMode, value, background, color };
}

export function compileRowColors(raw: string, columns: RowColorColumn[]): CompiledRowColors {
    const rules = new Map<string, Array<{ rule: RowColorRule; className: string }>>();
    let ruleCount = 0;

    if (raw) {
        raw.split(',').forEach((columnEntry) => {
            const separatorIndex = columnEntry.indexOf('=');

            if (separatorIndex === -1) {
                return;
            }

            const columnToken = columnEntry.substring(0, separatorIndex).trim();
            const columnName = findColumnName(columnToken, columns);

            if (!columnName) {
                console.warn(`RowColorRules: la columna "${columnToken}" no existe en el dataset.`);

                return;
            }

            columnEntry
                .substring(separatorIndex + 1)
                .split('|')
                .forEach((ruleText) => {
                    const rule = parseRuleText(ruleText);

                    if (!rule) {
                        if (ruleText.trim()) {
                            console.warn(`RowColorRules: regla no válida "${ruleText.trim()}".`);
                        }

                        return;
                    }

                    const className = `${CLASS_PREFIX}${ruleCount}`;
                    const columnRules = rules.get(columnName) || [];

                    columnRules.push({ rule, className });
                    rules.set(columnName, columnRules);
                    ruleCount++;
                });
        });
    }

    const css: string[] = [];

    rules.forEach((columnRules) => {
        columnRules.forEach(({ rule, className }) => {
            const foreground = rule.color ? ` color: ${rule.color};` : '';

            css.push(
                `.p-datatable .p-datatable-tbody > tr.${className} { background-color: ${rule.background};${foreground} }`
            );
            css.push(
                `.p-datatable .p-datatable-tbody > tr.${className}:not(.p-highlight):hover { background-color: ${shadeColor(
                    rule.background,
                    -0.06
                )}; }`
            );
            css.push(
                `.p-datatable .p-datatable-tbody > tr.${className}.p-highlight { background-color: ${rule.background}; box-shadow: inset 0 0 0 0.15rem #2196f3; }`
            );
        });
    });

    const classNameFor = (record: Record<string, any>): string => {
        let matched = '';

        rules.forEach((columnRules, columnName) => {
            if (matched) {
                return;
            }

            const rawValue = record ? record[columnName] : undefined;

            if (rawValue === undefined || rawValue === null) {
                return;
            }

            const value = normalize(String(rawValue));
            const found = columnRules.find(({ rule }) => {
                if (rule.matchMode === 'any') {
                    return true;
                }

                const wanted = normalize(rule.value);

                return rule.matchMode === 'contains' ? value.indexOf(wanted) !== -1 : value === wanted;
            });

            if (found) {
                matched = found.className;
            }
        });

        return matched;
    };

    return { classNameFor, css: css.join(''), ruleCount };
}
