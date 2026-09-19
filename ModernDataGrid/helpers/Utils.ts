import { format } from "date-fns";
import { IInputs } from "../generated/ManifestTypes";

export function formatDate(
    value: string | Date,
    formatString: string,
    context: ComponentFramework.Context<IInputs>
  ): string | null {
    if (!value) return null;
  
    try {
      const dateValue = typeof value === "string" ? new Date(value) : value;
  
      // Check for invalid date
      if (isNaN(dateValue.getTime())) {
        console.warn(
          `Invalid date value detected for formatting: ${value}`,
          context.userSettings.dateFormattingInfo.shortDatePattern
        );
        return null;
      }
  
      // Format the date using the provided format string
      return format(dateValue, formatString);
    } catch (error) {
      console.error(
        `Error formatting date with format "${formatString}":`,
        error
      );
      return value instanceof Date ? value.toISOString() : value;
    }
  }

export function getAvailableDatePatterns(context: ComponentFramework.Context<IInputs>) {
    const userSettings = context.userSettings.dateFormattingInfo;
  
    return [
      userSettings.shortDatePattern,
      userSettings.longDatePattern,
      userSettings.fullDateTimePattern,
      userSettings.sortableDateTimePattern,
      userSettings.universalSortableDateTimePattern,
      userSettings.yearMonthPattern,
    ];
  }

/** Normaliza texto para comparar sin distinguir mayúsculas, acentos ni espacios extremos. */
export function normalizeText(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

/**
 * Milisegundos de un valor de fecha del dataset (Date o texto ISO). Devuelve
 * `undefined` cuando el valor no es una fecha válida. Se usa para poder filtrar
 * por rango de fechas aunque la celda muestre el valor ya formateado.
 */
export function toEpochMs(value: any): number | undefined {
    if (value === null || value === undefined || value === '') {
        return undefined;
    }

    const time = value instanceof Date ? value.getTime() : new Date(value).getTime();

    return isNaN(time) ? undefined : time;
}
  
