/**
 * Catálogo de patrones de fecha que admiten las propiedades `DateFormats`,
 * `DateTimeFormats` y `TimeFormats`.
 *
 * `token` es un nombre corto y seguro (solo letras, dígitos, guiones bajos, guiones y
 * puntos) que se puede escribir en esas propiedades y `pattern` es el patrón real que
 * se aplica con date-fns. Las propiedades también aceptan **cualquier patrón de fecha
 * escrito directamente**, así que este catálogo es una ayuda, no una lista cerrada.
 */

export type DateFormatGroup = 'date' | 'dateTime' | 'time';

export interface DateFormatOption {
    token: string;
    pattern: string;
    group: DateFormatGroup;
}

export const DATE_FORMAT_OPTIONS: DateFormatOption[] = [
    /* ------------------------------ Fecha ------------------------------ */
    { token: 'dd-MM-yyyy', pattern: 'dd-MM-yyyy', group: 'date' },
    { token: 'dd_MM_yyyy', pattern: 'dd/MM/yyyy', group: 'date' },
    { token: 'd_M_yyyy', pattern: 'd/M/yyyy', group: 'date' },
    { token: 'dd_MM_yy', pattern: 'dd/MM/yy', group: 'date' },
    { token: 'yyyy-MM-dd', pattern: 'yyyy-MM-dd', group: 'date' },
    { token: 'yyyy_MM_dd', pattern: 'yyyy/MM/dd', group: 'date' },
    { token: 'dd.MM.yyyy', pattern: 'dd.MM.yyyy', group: 'date' },
    { token: 'dd_MMM_yyyy', pattern: 'dd/MMM/yyyy', group: 'date' },
    { token: 'dd_MMM_yy', pattern: 'dd/MMM/yy', group: 'date' },
    { token: 'dd_MMMM_yyyy', pattern: 'dd/MMMM/yyyy', group: 'date' },
    { token: 'd_de_MMMM_de_yyyy', pattern: "d 'de' MMMM 'de' yyyy", group: 'date' },
    { token: 'MMMM_d_yyyy', pattern: 'MMMM d, yyyy', group: 'date' },
    { token: 'MMM_yyyy', pattern: 'MMM yyyy', group: 'date' },
    { token: 'yyyy', pattern: 'yyyy', group: 'date' },
    { token: 'EEE_dd_MM_yyyy', pattern: 'EEE dd/MM/yyyy', group: 'date' },
    { token: 'EEEE_d_de_MMMM_de_yyyy', pattern: "EEEE d 'de' MMMM 'de' yyyy", group: 'date' },

    /* -------------------------- Fecha y hora --------------------------- */
    { token: 'dd_MM_yyyy_HH_mm', pattern: 'dd/MM/yyyy HH:mm', group: 'dateTime' },
    { token: 'dd_MM_yyyy_HH_mm_ss', pattern: 'dd/MM/yyyy HH:mm:ss', group: 'dateTime' },
    { token: 'dd_MM_yyyy_hh_mm_a', pattern: 'dd/MM/yyyy hh:mm a', group: 'dateTime' },
    { token: 'dd_MM_yyyy_hh_mm_ss_a', pattern: 'dd/MM/yyyy hh:mm:ss a', group: 'dateTime' },
    { token: 'd_M_yyyy_HH_mm', pattern: 'd/M/yyyy HH:mm', group: 'dateTime' },
    { token: 'yyyy-MM-dd_HH_mm', pattern: 'yyyy-MM-dd HH:mm', group: 'dateTime' },
    { token: 'yyyy-MM-dd_HH_mm_ss', pattern: 'yyyy-MM-dd HH:mm:ss', group: 'dateTime' },
    { token: 'yyyy-MM-ddTHH_mm_ss', pattern: "yyyy-MM-dd'T'HH:mm:ss", group: 'dateTime' },
    { token: 'dd.MM.yyyy_HH_mm', pattern: 'dd.MM.yyyy HH:mm', group: 'dateTime' },
    { token: 'dd.MM.yyyy_HH_mm_ss', pattern: 'dd.MM.yyyy HH:mm:ss', group: 'dateTime' },
    { token: 'dd-MM-yyyy_HH_mm', pattern: 'dd-MM-yyyy HH:mm', group: 'dateTime' },
    { token: 'dd_MMM_yyyy_HH_mm', pattern: 'dd/MMM/yyyy HH:mm', group: 'dateTime' },
    { token: 'd_de_MMMM_de_yyyy_HH_mm', pattern: "d 'de' MMMM 'de' yyyy HH:mm", group: 'dateTime' },
    { token: 'EEE_dd_MM_yyyy_HH_mm', pattern: 'EEE dd/MM/yyyy HH:mm', group: 'dateTime' },

    /* ------------------------------- Hora ------------------------------ */
    { token: 'HH_mm', pattern: 'HH:mm', group: 'time' },
    { token: 'HH_mm_ss', pattern: 'HH:mm:ss', group: 'time' },
    { token: 'hh_mm_a', pattern: 'hh:mm a', group: 'time' },
    { token: 'hh_mm_ss_a', pattern: 'hh:mm:ss a', group: 'time' },
    { token: 'HH_mm_ss_SSS', pattern: 'HH:mm:ss.SSS', group: 'time' }
];

/** Patrón date-fns que corresponde al token configurado (undefined si no hay o no existe). */
export function resolveDateFormat(token?: string | null): string | undefined {
    if (!token) {
        return undefined;
    }

    const option = DATE_FORMAT_OPTIONS.find((candidate) => candidate.token === token);

    return option ? option.pattern : undefined;
}

/** Tokens válidos; los usa la prueba que compara el manifest con este catálogo. */
export function getDateFormatTokens(): string[] {
    return DATE_FORMAT_OPTIONS.map((option) => option.token);
}

/**
 * Patrón date-fns a partir del texto configurado en la app: acepta un token del
 * catálogo (`dd_MM_yyyy_HH_mm`) o directamente un patrón (`dd/MM/yyyy HH:mm`,
 * `d 'de' MMMM 'de' yyyy`). Devuelve `undefined` si no hay texto.
 */
export function resolveDatePattern(value?: string | null): string | undefined {
    if (!value) {
        return undefined;
    }

    return resolveDateFormat(value) || value.trim() || undefined;
}
