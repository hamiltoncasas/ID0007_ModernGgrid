/**
 * Nombre corto y traducido del tipo de dato de una columna del dataset.
 *
 * Se usa en el selector de columnas (`Mostrar u ocultar columnas`) para que el
 * usuario final sepa qué columna está marcando o desmarcando, y en los
 * diagnósticos por consola.
 */
import { Language } from './Localization';

interface TypeLabels {
    es: string;
    en: string;
}

/** Etiquetas por tipo exacto del dataset (DataSetApi.Column.dataType). */
const TYPE_LABELS: { [dataType: string]: TypeLabels } = {
    'SingleLine.Text': { es: 'Texto', en: 'Text' },
    'SingleLine.TextArea': { es: 'Texto largo', en: 'Long text' },
    'SingleLine.Email': { es: 'Correo', en: 'Email' },
    'SingleLine.Phone': { es: 'Teléfono', en: 'Phone' },
    'SingleLine.URL': { es: 'Dirección web', en: 'URL' },
    'SingleLine.Ticker': { es: 'Texto', en: 'Text' },
    'DateAndTime.DateAndTime': { es: 'Fecha y hora', en: 'Date and time' },
    'DateAndTime.DateOnly': { es: 'Fecha', en: 'Date' },
    'DateAndTime.TimeOnly': { es: 'Hora', en: 'Time' },
    WholeNumber: { es: 'Número', en: 'Whole number' },
    Decimal: { es: 'Decimal', en: 'Decimal' },
    Currency: { es: 'Moneda', en: 'Currency' },
    Multiple: { es: 'Moneda', en: 'Currency' },
    TwoOptions: { es: 'Sí/No', en: 'Yes/No' },
    OptionSet: { es: 'Opción', en: 'Choice' },
    MultiSelectOptionSet: { es: 'Opciones', en: 'Choices' },
    Lookup: { es: 'Búsqueda', en: 'Lookup' },
    Customer: { es: 'Cliente', en: 'Customer' },
    Owner: { es: 'Propietario', en: 'Owner' },
    Entity: { es: 'Registro', en: 'Record' },
    Object: { es: 'Objeto', en: 'Object' },
    File: { es: 'Archivo', en: 'File' },
    Image: { es: 'Imagen', en: 'Image' }
};

/** Claves ordenadas de más específica a más general (para el tipo desconocido). */
const PREFIX_KEYS = Object.keys(TYPE_LABELS).sort((left, right) => right.length - left.length);

/**
 * Texto del tipo de dato de una columna (`SingleLine.Email` → `Correo`).
 * Si el tipo no está en el catálogo se devuelve tal cual lo informa el dataset.
 */
export function describeColumnType(dataType: string, language: Language = 'en'): string {
    const text = (dataType || '').trim();

    if (!text) {
        return '';
    }

    const exact = TYPE_LABELS[text];

    if (exact) {
        return language === 'es' ? exact.es : exact.en;
    }

    const prefixKey = PREFIX_KEYS.find((key) => text.indexOf(key) === 0);

    if (prefixKey) {
        const labels = TYPE_LABELS[prefixKey];

        return language === 'es' ? labels.es : labels.en;
    }

    return text;
}
