import { addLocale, locale as setPrimeReactLocale } from 'primereact/api';

export type Language = 'en' | 'es';

export const DEFAULT_LANGUAGE: Language = 'en';

/** Textos propios del control. */
export interface GridStrings {
    /** Placeholder del buscador global. */
    keywordSearch: string;
    /** Etiqueta del botón de refrescar (aria-label y tooltip). */
    refresh: string;
    /** Etiqueta del botón de limpiar filtros. */
    clearFilters: string;
    /** Etiqueta del botón de exportar a Excel. */
    exportToExcel: string;
    /** Etiqueta del selector de columnas. */
    columnsSelector: string;
    /** Placeholder del selector de columnas. */
    columnsPlaceholder: string;
    /** Texto de "seleccionar todas" del selector de columnas. */
    selectAllColumns: string;
    /** Texto del botón que quita todas las columnas seleccionadas. */
    clearAllColumns: string;
    /** Mensaje sin registros (solo si EmptyMessage no está configurado). */
    emptyMessage: string;
    /** Plantilla del reporte de paginación; admite {first}, {last} y {filtered}. */
    pageReport: string;
    /** Plantilla del placeholder de cada filtro de columna; admite {column}. */
    searchByColumn: string;
    /** Etiqueta del combo de vistas/informes (aria-label y tooltip). */
    viewsSelector: string;
    /** Texto del combo cuando no hay una vista elegida. */
    viewsPlaceholder: string;
    /** Opción del combo que quita el filtro de vista. */
    noView: string;
    /** Etiqueta del selector de rango de fechas de una columna de fecha. */
    dateRangeFilter: string;
    /** Ayuda del panel de filtro de fecha (se eligen los dos extremos del rango). */
    dateRangeHint: string;
    /** Resumen del rango elegido; admite `{range}`. */
    dateRangeSelected: string;
    /** Patrón con el que se escriben los días del resumen. */
    dateRangeFormat: string;
    /** Formato con el que se pintan los días del rango (formato de PrimeReact). */
    datePickerFormat: string;
    /** Nombre de la hoja del libro exportado. */
    exportSheetName: string;
}

const ENGLISH_STRINGS: GridStrings = {
    keywordSearch: 'Keyword search',
    refresh: 'Refresh',
    clearFilters: 'Clear filters',
    exportToExcel: 'Export to Excel (filtered data)',
    columnsSelector: 'Show or hide columns',
    columnsPlaceholder: 'Columns',
    selectAllColumns: 'Select all',
    clearAllColumns: 'Clear all',
    emptyMessage: 'No records found.',
    pageReport: 'Showing {first} to {last} entries · Filtered: {filtered}',
    searchByColumn: 'Search by {column}',
    viewsSelector: 'Filter by view (report)',
    viewsPlaceholder: 'View',
    noView: 'All records',
    dateRangeFilter: 'Filter by date range',
    dateRangeHint: 'Pick the first and the last day of the range and press Apply',
    dateRangeSelected: 'Selected range: {range}',
    dateRangeFormat: 'MM/dd/yyyy',
    datePickerFormat: 'mm/dd/yy',
    exportSheetName: 'Data'
};

const SPANISH_STRINGS: GridStrings = {
    keywordSearch: 'Buscar palabra clave',
    refresh: 'Actualizar',
    clearFilters: 'Limpiar filtros',
    exportToExcel: 'Exportar a Excel (datos filtrados)',
    columnsSelector: 'Mostrar u ocultar columnas',
    columnsPlaceholder: 'Columnas',
    selectAllColumns: 'Todas',
    clearAllColumns: 'Quitar todas',
    emptyMessage: 'No se encontraron registros.',
    pageReport: 'Mostrando {first} a {last} registros · Filtrados: {filtered}',
    searchByColumn: 'Buscar en {column}',
    viewsSelector: 'Filtrar por vista (informe)',
    viewsPlaceholder: 'Vista',
    noView: 'Todos los registros',
    dateRangeFilter: 'Filtrar por rango de fechas',
    dateRangeHint: 'Elige el primer y el último día del rango y pulsa Aplicar',
    dateRangeSelected: 'Rango seleccionado: {range}',
    dateRangeFormat: 'dd/MM/yyyy',
    datePickerFormat: 'dd/mm/yy',
    exportSheetName: 'Datos'
};

export function getStrings(language: Language): GridStrings {
    return language === 'es' ? SPANISH_STRINGS : ENGLISH_STRINGS;
}

/** Reemplaza marcadores simples de una plantilla ({total}, {column}, ...). */
export function formatTemplate(template: string, values: Record<string, string>): string {
    return Object.keys(values).reduce(
        (result, key) => result.split(`{${key}}`).join(values[key]),
        template
    );
}

/**
 * Textos internos de PrimeReact en español (filtros de columna, paginador y
 * selector de columnas). Valores tomados del locale oficial `es` de PrimeReact;
 * los que no se indican mantienen el valor en inglés de la librería.
 */
const SPANISH_PRIME_LOCALE: Record<string, any> = {
    accept: 'Sí',
    addRule: 'Agregar regla',
    apply: 'Aplicar',
    cancel: 'Cancelar',
    choose: 'Escoger',
    clear: 'Limpiar',
    contains: 'Contenga',
    custom: 'Personalizar',
    dateAfter: 'Fecha después de',
    dateBefore: 'Fecha antes de',
    dateFormat: 'dd/mm/yy',
    dateIs: 'Fecha igual a',
    dateIsNot: 'Fecha diferente a',
    emptyFilterMessage: 'Sin opciones disponibles',
    emptyMessage: 'No se han encontrado resultados',
    emptySearchMessage: 'Sin opciones disponibles',
    emptySelectionMessage: 'Ningún artículo seleccionado',
    endsWith: 'Termine con',
    equals: 'Igual a',
    filter: 'Filtrar',
    gt: 'Mayor que',
    gte: 'Mayor o igual a',
    lt: 'Menor que',
    lte: 'Menor o igual a',
    matchAll: 'Coincidir todo',
    matchAny: 'Coincidir con cualquiera',
    noFilter: 'Sin filtro',
    notContains: 'No contenga',
    notEquals: 'Diferente a',
    reject: 'No',
    removeRule: 'Eliminar regla',
    searchMessage: '{0} resultados están disponibles',
    selectionMessage: '{0} elementos seleccionados',
    startsWith: 'Comience con',
    today: 'Hoy',
    aria: {
        cancelEdit: 'Cancelar editado',
        close: 'Cerrar',
        collapseRow: 'Reducir fila',
        editRow: 'Editar fila',
        expandRow: 'Expandir fila',
        falseLabel: 'Falso',
        filterConstraint: 'Restricción de filtro',
        filterOperator: 'Operador de filtro',
        firstPageLabel: 'Primera página',
        gridView: 'Vista de cuadrícula',
        hideFilterMenu: 'Ocultar menú del filtro',
        jumpToPageDropdownLabel: 'Ir al menú desplegable de página',
        jumpToPageInputLabel: 'Ir a la entrada de página',
        lastPageLabel: 'Última página',
        listView: 'Vista de lista',
        next: 'Siguiente',
        nextPageLabel: 'Siguiente página',
        pageLabel: 'Página {page}',
        previous: 'Anterior',
        prevPageLabel: 'Página anterior',
        removeLabel: 'Eliminar',
        rowsPerPageLabel: 'Filas por página',
        saveEdit: 'Guardar editado',
        selectAll: 'Seleccionar todos',
        selectLabel: 'Seleccionar',
        selectRow: 'Seleccionar fila',
        showFilterMenu: 'Mostrar menú del filtro',
        trueLabel: 'Verdadero',
        unselectAll: 'Deseleccionar todos',
        unselectLabel: 'Deseleccionar',
        unselectRow: 'Desmarcar fila'
    }
};

/**
 * Registra y activa el idioma de los textos internos de PrimeReact. Los
 * componentes leen la locale global al renderizar, por lo que debe ejecutarse
 * antes de renderizar la tabla.
 */
export function applyPrimeReactLanguage(language: Language): void {
    if (language === 'es') {
        addLocale('es', SPANISH_PRIME_LOCALE as any);
        setPrimeReactLocale('es');

        return;
    }

    setPrimeReactLocale('en');
}

