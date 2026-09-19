import React, { Component } from 'react';
import { FilterMatchMode, FilterOperator, FilterService } from 'primereact/api';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { Button } from 'primereact/button';
import { MultiSelect } from 'primereact/multiselect';
import { RefreshIcon } from 'primereact/icons/refresh';
import { SearchIcon } from 'primereact/icons/search';
import { FilterSlashIcon } from 'primereact/icons/filterslash';
import { IInputs } from "../generated/ManifestTypes";
import { formatDate, getAvailableDatePatterns, normalizeText } from '../helpers/Utils';
import { exportRowsToExcel } from '../helpers/ExcelExport';
import { resolveDateFormat } from '../helpers/DateFormat';
import { resolveColumnLabels } from '../helpers/ColumnLabels';
import { applyPrimeReactLanguage, formatTemplate, getStrings, GridStrings, Language } from '../helpers/Localization';
import { CompiledRowColors, compileRowColors } from '../helpers/RowColoring';
import { ExcelIcon } from './ExcelIcon';
import 'primereact/resources/themes/saga-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';
import "./DataGrid.css";

/**
 * Opciones del virtual scroller. Es un objeto estable a nivel de módulo: si se creara en cada
 * render, PrimeReact recibiría una identidad nueva y volvería a procesar el cuerpo de la tabla.
 */
const VIRTUAL_SCROLLER_OPTIONS = { itemSize: 38 };
/** Estilo de la tabla (identidad estable: PrimeReact copia los estilos, nunca los modifica). */
const TABLE_STYLE: React.CSSProperties = { width: '100%', minWidth: '0' };
/** Ancho mínimo de una columna de datos. */
const COLUMN_STYLE: React.CSSProperties = { minWidth: '12rem' };
/** Ancho de la columna de selección. */
const SELECTION_COLUMN_HEADER_STYLE: React.CSSProperties = { width: '3rem' };
/** Tamaños de página que ofrece el pie, además del tamaño activo. */
const BASE_ROWS_PER_PAGE = [5, 15, 25];
/** Separador del texto buscable de una fila (no puede escribirse en el buscador de una línea). */
const SEARCH_TEXT_SEPARATOR = '\n';

interface SearchBoxProps {
    /** Valor aplicado por el control (permite reiniciar el texto al limpiar filtros o recargar). */
    value: string;
    placeholder: string;
    /** Se llama en cada tecla: el control programa la aplicación del valor con un retardo corto. */
    onChange: (value: string) => void;
    /** Se llama al pulsar Enter o al salir del campo: el control aplica el valor al instante. */
    onFlush: (value: string) => void;
    /** Cambia cuando el control pide vaciar el buscador (Limpiar filtros) aunque el texto no cambie. */
    resetToken: number;
}

/**
 * Buscador global con estado propio. Al mantener el texto dentro de este componente, escribir no
 * vuelve a pintar la cuadrícula completa (ni dispara el filtrado interno de PrimeReact) en cada
 * pulsación: el valor se comunica al control con el retardo del buscador y, si el usuario pulsa
 * Enter o sale del campo, se aplica de inmediato.
 */
class SearchBox extends Component<SearchBoxProps, { text: string }> {
    constructor(props: SearchBoxProps) {
        super(props);
        this.state = { text: props.value ?? '' };
    }

    componentDidUpdate(prevProps: SearchBoxProps): void {
        // Se sincroniza cuando el control cambia el valor aplicado (recarga) y también cuando pide
        // vaciar el buscador (Limpiar filtros): ese segundo caso es imprescindible porque el valor
        // aplicado puede ser ya vacío mientras el usuario tiene texto escrito sin aplicar.
        const valueChanged = prevProps.value !== this.props.value;
        const resetRequested = prevProps.resetToken !== this.props.resetToken;

        if ((valueChanged || resetRequested) && this.props.value !== this.state.text) {
            this.setState({ text: this.props.value ?? '' });
        }
    }

    onTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const text = e.target.value;
        this.setState({ text });
        this.props.onChange(text);
    };

    onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            this.props.onFlush(this.state.text);
        }
    };

    onBlur = () => {
        this.props.onFlush(this.state.text);
    };

    render(): React.ReactElement {
        return (
            <InputText
                value={this.state.text}
                onChange={this.onTextChange}
                onBlur={this.onBlur}
                onKeyDown={this.onKeyDown}
                placeholder={this.props.placeholder}
            />
        );
    }
}

interface DataGridProps {
    context: ComponentFramework.Context<IInputs>;
    notifyOutputChanged: () => void;
}

interface DataGridState {
    records: any[];
    selectedRecordIds: any[];
    selectedRecords: any[];
    filters: any;
    globalFilterValue: string;
    columns: ComponentFramework.PropertyHelper.DataSetApi.Column[];
    previousParameters: { [key in keyof IInputs]?: any };
    enabled: boolean;
    needsRefresh: boolean;
    /** Se incrementa para reiniciar la vista del grid (paginador a la página 1). */
    gridEpoch: number;
    /** Página visible del pie (1-based). */
    currentPage: number;
    /** Página que se pidió a la fuente y aún no se puede mostrar. */
    pendingPage: number | null;
    /** Filas por página elegidas por el usuario (null = las del dataset). */
    pageSizeOverride: number | null;
    totalPages: number;
    /** Columnas que el usuario final decidió ver; null = todas las disponibles. */
    selectedColumns: string[] | null;
    /** Texto que se está escribiendo en el buscador; el filtrado efectivo se aplica con retardo. */
    searchText: string;
    /** Se incrementa cuando el control pide vaciar el buscador (sincroniza el texto del SearchBox). */
    searchResetToken: number;
}

class DataGrid extends Component<DataGridProps, DataGridState> {
    private filterMap: Map<string, any> = new Map();
    private intervalId: NodeJS.Timeout | null = null;
    private appliedLanguage: Language | null = null;
    private columnLabelsCache: { key: string; labels: Record<string, string> } | null = null;
    private rowColorsCache: { key: string; compiled: CompiledRowColors } | null = null;
    private autoLoadFrom = -1;
    /** true cuando la fuente ya se consultó y no entregó más filas. */
    private extraPageDismissed = false;
    /** Tamaño de página que definió la app (Default Rows) para el paginado en pantalla. */
    private displayPageSize = 0;
    /** Intentos seguidos en los que la fuente no entregó filas nuevas. */
    private emptyLoadAttempts = 0;
    private pendingTimeout: NodeJS.Timeout | null = null;
    private loadWatchTimeout: NodeJS.Timeout | null = null;
    /** Firma de las filas ya procesadas: detecta páginas nuevas, recargas y fin de carga. */
    private processedRowSignature = '';
    /** true mientras se traen todas las filas disponibles en la fuente (al abrir y al refrescar). */
    private deepLoad = false;
    private rowColorStyleElement: HTMLStyleElement | null = null;
    private mappedRecordsCache: { key: string; records: any[] } | null = null;
    private filteredRecordsCache: { source: any[]; search: string; records: any[] } | null = null;
    private matchingRecordsCache: { source: any[]; key: string; records: any[] } | null = null;
    private numberFormatters = new Map<string, Intl.NumberFormat>();
    /** Fila ya formateada, ligada a la referencia del record del dataset que la originó. */
    private mappedRowCache = new Map<string, { record: any; mapped: Record<string, any> }>();
    /** Estructura (columnas + configuración + idioma) que obliga a reformatear todas las filas. */
    private mappedStructureKey = '';
    /** Firma de las filas que se formatearon por última vez (protege la revalidación forzada). */
    private mappedRowSignature = '';
    /** true cuando la app pide recargar la fuente: la siguiente pasada reformatea todas las filas. */
    private invalidateMappedRows = false;
    /** Texto buscable (minúsculas) por fila: se descarta solo cuando la fila se vuelve a mapear. */
    private searchTextCache = new WeakMap<object, string>();
    /** Selección que recibe el DataTable, memoizada por identidad de filas y de ids. */
    private selectionCache: { records: any[]; ids: any[]; selected: any[] } | null = null;
    /** Tamaños de página del pie memoizados por tamaño activo. */
    private rowsPerPageCache: { pageSize: number; options: number[] } | null = null;
    /** Campos de la búsqueda global del DataTable memoizados por columnas. */
    private globalFilterFieldsCache: { source: any[]; fields: string[] } | null = null;
    /** Propiedades del pie memoizadas (evita crear un objeto nuevo en cada render). */
    private paginationPropsCache: { key: string; props: any } | null = null;
    /** Plantilla del reporte de paginación memoizada por idioma y recuento filtrado. */
    private pageReportCache: { key: string; template: string } | null = null;
    /** Clase de color por fila (WeakMap por identidad de fila) y reglas con las que se calculó. */
    private rowClassByRow = new WeakMap<object, string>();
    private rowClassRulesKey: string | null = null;
    /** Renderizadores de celda estables por nombre de columna. */
    private columnBodyCache = new Map<string, (item: Record<string, any>) => any>();
    /** Estilos de columna estables por nombre de columna. */
    private columnStyleCache = new Map<string, React.CSSProperties>();
    /** Clave de columnas del dataset memoizada por identidad del arreglo de columnas. */
    private columnsSchemaCache: { source: any[]; key: string } | null = null;
    /** Columnas base y visibles memoizadas. */
    private baseColumnsCache: { source: any[]; raw: string; columns: any[] } | null = null;
    private visibleColumnsCache: { base: any[]; selected: string[] | null; columns: any[] } | null = null;
    /** Nombres de InitialColumns memoizados por su texto. */
    private initialColumnsCache: { raw: string; names: string[] } | null = null;
    /** Firma de los filtros memoizada por identidad del objeto (sustituye a JSON.stringify repetidos). */
    private filtersSignatureCache: { source: any; signature: string } | null = null;
    /** Clave de las reglas de color memoizada (texto + columnas del dataset). */
    private rowColorsKeyCache: { raw: string; source: any[]; key: string } | null = null;
    /** Retardo del buscador global: equilibra respuesta inmediata y trabajo por pulsación. */
    private static readonly searchDebounceMs = 200;
    private searchDebounceTimeout: NodeJS.Timeout | null = null;
    /** Temporizador de la revalidación del dataset: colapsa varias peticiones seguidas en una. */
    private forceRefreshTimeout: NodeJS.Timeout | null = null;
    /** Contadores del diagnóstico de rendimiento (window.__mdgPerf = true). */
    private perf = {
        updateViews: 0,
        renders: 0,
        renderMs: 0,
        maps: 0,
        mappedRows: 0,
        reusedRows: 0,
        mapMs: 0,
        filterPasses: 0,
        filterMs: 0,
        rowsPainted: 0
    };
    /** Filas que PrimeReact pintó en el render en curso (lo cuenta rowClassName). */
    private rowsPaintedThisRender = 0;
    /** Tope de la carga de fondo para poder paginar y filtrar en cliente. */
    private static readonly maxAutoLoadedRows = 2000;
    /** Tope de la carga completa (al abrir el control y al pulsar Refrescar). */
    private static readonly maxLoadedRows = 10000;
    /** Reintentos seguidos de carga antes de dar la fuente por agotada. */
    private static readonly maxLoadRetries = 3;
    static contextType = React.createContext<ComponentFramework.Context<IInputs> | undefined>(undefined);
    declare context: React.ContextType<typeof DataGrid.contextType>;
    constructor(props: DataGridProps) {
        super(props);
        this.state = {
            records: [],
            selectedColumns: null,
            totalPages: 1,
            selectedRecords: [],
            selectedRecordIds: [],
            filters: props.context.parameters.DataSource.columns.reduce((acc: any, col: any) => {
                acc[col.name] = {
                    operator: FilterOperator.AND,
                    constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }]
                };
                return acc;
            }, {}),
            globalFilterValue: '',
            searchText: '',
            searchResetToken: 0,
            columns: [],
            previousParameters: {},
            enabled: props.context.parameters.IsEnabled?.raw ?? true,
            needsRefresh: false,
            gridEpoch: 1,
            currentPage: 1,
            pendingPage: null,
            pageSizeOverride: null,
        };

        this.applyLanguage();
    }

    componentDidMount() {
        (window as any).context = this.props.context;
        // Diagnóstico opcional: con `window.__mdgPerf = true` se publican contadores y un resumen.
        (window as any).__mdgPerfReport = () => this.logPerfReport();
        // Al abrir el control se intenta traer todo lo que ofrezca la fuente ("Items").
        this.deepLoad = true;
        this.processedRowSignature = '';

        if (this.props.context.parameters.DataSource && !this.props.context.parameters.DataSource.loading) {
            this.mapRecordsToState();
        } else {
            console.log("Data source not ready at mount.");
        }
        this.saveCurrentParametersToState();
        this.checkAndStartInterval();
        this.syncRowColorStyles();
        // Primero se pide a la fuente una página lo bastante grande para traer todo de una vez.
        this.requestWholeSource();
        this.ensureMoreRowsLoaded();
        this.forceRefreshDataset();

    }

    componentWillUnmount() {
        this.clearRefreshInterval();
        this.clearRowColorStyles();
        this.clearPendingTimeout();
        this.clearLoadWatch();
        this.clearSearchDebounce();
        this.clearForceRefreshTimeout();

        if (typeof window !== 'undefined' && (window as any).__mdgPerfReport) {
            this.logPerfReport();
            delete (window as any).__mdgPerfReport;
        }
    }

    /** Libera el retardo del buscador global. */
    clearSearchDebounce(): void {
        if (this.searchDebounceTimeout) {
            clearTimeout(this.searchDebounceTimeout);
            this.searchDebounceTimeout = null;
        }
    }

    /** Libera la revalidación programada del dataset. */
    clearForceRefreshTimeout(): void {
        if (this.forceRefreshTimeout) {
            clearTimeout(this.forceRefreshTimeout);
            this.forceRefreshTimeout = null;
        }
    }

    /** true cuando el diagnóstico de rendimiento está activo (`window.__mdgPerf = true`). */
    isPerfEnabled(): boolean {
        return typeof window !== 'undefined' && (window as any).__mdgPerf === true;
    }

    /** Marca de tiempo para medir tramos (0 = diagnóstico desactivado, coste nulo). */
    perfNow(): number {
        return this.isPerfEnabled() && typeof performance !== 'undefined' ? performance.now() : 0;
    }

    /** Milisegundos transcurridos desde `started` (0 si el diagnóstico está desactivado). */
    perfSince(started: number): number {
        return started && typeof performance !== 'undefined' ? performance.now() - started : 0;
    }

    /**
     * Resumen acumulado del trabajo del control. Sirve para comparar antes/después en la app:
     * `window.__mdgPerf = true` y luego `window.__mdgPerfReport()`.
     */
    logPerfReport(): void {
        const report = {
            ...this.perf,
            mapaMedioMs: this.perf.maps ? +(this.perf.mapMs / this.perf.maps).toFixed(2) : 0,
            renderMedioMs: this.perf.renders ? +(this.perf.renderMs / this.perf.renders).toFixed(2) : 0,
            filasPorMapa: this.perf.maps ? Math.round(this.perf.mappedRows / this.perf.maps) : 0,
            filasReutilizadas: this.perf.reusedRows,
            filasCargadas: this.state.records.length
        };

        console.log('[ModernDataGrid][perf] resumen', report);

        if (console.table) {
            console.table([report]);
        }
    }

    /** Libera el temporizador de la página pendiente. */
    clearPendingTimeout(): void {
        if (this.pendingTimeout) {
            clearTimeout(this.pendingTimeout);
            this.pendingTimeout = null;
        }
    }

    /** Firma de las filas del dataset: cambia al llegar una página, al recargar y al terminar de cargar. */
    getRowSignature(dataSet?: ComponentFramework.PropertyTypes.DataSet): string {
        if (!dataSet) {
            return '';
        }

        const ids = dataSet.sortedRecordIds || [];
        const firstId = ids.length ? ids[0] : '';
        const lastId = ids.length ? ids[ids.length - 1] : '';

        return `${dataSet.loading ? 1 : 0}|${ids.length}|${firstId}|${lastId}`;
    }

    /**
     * Clave de la estructura que obliga a reformatear todas las filas: columnas del dataset,
     * configuración de campos, formato de fecha e idioma. Mientras no cambie, las filas ya
     * formateadas se reutilizan (mapeo incremental por record).
     */
    getMappingStructureKey(
        dataSet: ComponentFramework.PropertyTypes.DataSet,
        context: ComponentFramework.Context<IInputs>
    ): string {
        return [
            context.parameters.FieldConfigurations?.raw || "",
            context.parameters.DateFormat?.raw || "",
            context.parameters.Language?.raw || "",
            this.getColumnsSchemaKey(dataSet.columns)
        ].join(";");
    }

    /** Firma de las columnas que intervienen en el formateo (memoizada por identidad del arreglo). */
    getColumnsSchemaKey(columns: ComponentFramework.PropertyHelper.DataSetApi.Column[]): string {
        if (this.columnsSchemaCache && this.columnsSchemaCache.source === columns) {
            return this.columnsSchemaCache.key;
        }

        const key = (columns || []).map((column) => `${column.name}:${column.alias}:${column.dataType}`).join("|");
        this.columnsSchemaCache = { source: columns, key };

        return key;
    }

    /**
     * Compara dos listas de filas por referencia. Es la alternativa barata a `lodash.isEqual`:
     * las filas reutilizadas por el mapeo incremental son las mismas instancias, por lo que solo
     * hay cambio real cuando llegó una página nueva, se recargó la fuente o cambió el formato.
     */
    sameRowReferences(previous: any[], next: any[]): boolean {
        if (previous === next) {
            return true;
        }

        if (!previous || !next || previous.length !== next.length) {
            return false;
        }

        for (let index = 0; index < previous.length; index++) {
            if (previous[index] !== next[index]) {
                return false;
            }
        }

        return true;
    }

    /** Compara dos listas de cadenas (ids de registro, columnas seleccionadas) sin serializarlas. */
    sameStringList(previous: string[] | null | undefined, next: string[] | null | undefined): boolean {
        if (previous === next) {
            return true;
        }

        if (!previous || !next || previous.length !== next.length) {
            return false;
        }

        for (let index = 0; index < previous.length; index++) {
            if (previous[index] !== next[index]) {
                return false;
            }
        }

        return true;
    }

    /** Firma de los filtros memoizada por identidad del objeto (evita JSON.stringify repetidos). */
    filtersSignature(filters: any): string {
        if (this.filtersSignatureCache && this.filtersSignatureCache.source === filters) {
            return this.filtersSignatureCache.signature;
        }

        const signature = JSON.stringify(filters);
        this.filtersSignatureCache = { source: filters, signature };

        return signature;
    }

    /** Libera el vigilante de carga. */
    clearLoadWatch(): void {
        if (this.loadWatchTimeout) {
            clearTimeout(this.loadWatchTimeout);
            this.loadWatchTimeout = null;
        }
    }

    /**
     * Revisa en breve si llegaron más filas y continúa la carga. Es la red de seguridad para
     * cuando el host no vuelve a entrar en `componentDidUpdate` después de `loadNextPage()`.
     * Solo se re-mapea cuando la firma de filas cambió: así la red de seguridad no reformatea la
     * cuadrícula entera cuando la fuente no entregó nada nuevo.
     */
    scheduleLoadWatch(): void {
        this.clearLoadWatch();
        this.loadWatchTimeout = setTimeout(() => {
            this.loadWatchTimeout = null;
            const dataSet = this.props.context.parameters.DataSource;

            if (this.getRowSignature(dataSet) !== this.mappedRowSignature) {
                this.mapRecordsToState(true);
            }

            this.ensureMoreRowsLoaded();
            this.forceUpdate();
        }, 400);
    }

    checkAndStartInterval() {
        (window as any).context = this.props.context;
        const paging = this.context?.parameters.DataSource.paging;
        if (this.state.needsRefresh) {
            if (!this.intervalId) {
                //console.log('Starting refresh interval...');
                this.intervalId = setInterval(() => {
                    //console.log("Pinging for new records...");
                    this.mapRecordsToState();
                }, 5000);
            }
        } else {
            this.clearRefreshInterval();
        }
    }

    clearRefreshInterval() {
        if (this.intervalId) {
            //console.log('Clearing refresh interval...');
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    saveCurrentParametersToState() {
        const { context } = this.props;
        const parameterValues: { [key in keyof IInputs]?: any } = {};

        Object.keys(context.parameters).forEach((key) => {
            const param = context.parameters[key as keyof IInputs];
            if (this.hasRawProperty(param)) {
                parameterValues[key as keyof IInputs] = param.raw;
            }
        });

        this.setState({ previousParameters: parameterValues });
    }

    formatCurrency(value: any, currency: string): string {
        const key = `currency:${currency}`;
        let formatter = this.numberFormatters.get(key);
        if (!formatter) {
            formatter = new Intl.NumberFormat("en-US", { style: "currency", currency });
            this.numberFormatters.set(key, formatter);
        }

        return formatter.format(value);
    }

    formatDecimal(value: any, decimalPlaces: number): string {
        const key = `decimal:${decimalPlaces}`;
        let formatter = this.numberFormatters.get(key);
        if (!formatter) {
            formatter = new Intl.NumberFormat("en-US", {
                minimumFractionDigits: decimalPlaces,
                maximumFractionDigits: decimalPlaces,
            });
            this.numberFormatters.set(key, formatter);
        }

        return formatter.format(value);
    }

    parseConfigurations(configString: string): Record<string, any> {
        const configs: Record<string, any> = {};
      
        try {
          // Split by comma for each field
          const fields = configString.split(",");
          fields.forEach((field) => {
            const [fieldName, config] = field.split("=");
            if (fieldName && config) {
              // Split configurations by "|" and ":" for key-value pairs
              const configObject = config.split("|").reduce((acc, pair) => {
                const [key, value] = pair.split(":");
                if (key && value) acc[key.trim()] = value.trim();
                return acc;
              }, {} as Record<string, any>);
              configs[fieldName.trim()] = configObject;
            }
          });
        } catch (error) {
          console.error("Error parsing FieldConfigurations:", error);
        }
      
        return configs;
      }
      
     


    /**
     * Bloque de configuración que corresponde a una columna, buscándola por
     * nombre, alias o nombre para mostrar (sin distinguir mayúsculas ni acentos).
     */
    getColumnConfiguration(
        configurations: Record<string, any>,
        column: ComponentFramework.PropertyHelper.DataSetApi.Column
    ): any {
        const keys = Object.keys(configurations || {});
        if (!keys.length) {
            return undefined;
        }

        const labels = this.getColumnLabels();
        const identifiers = [column.name, column.alias, column.displayName, labels[column.name]]
            .filter(Boolean)
            .map((identifier) => normalizeText(String(identifier)));
        const key = keys.find((candidate) => identifiers.indexOf(normalizeText(candidate)) !== -1);

        return key ? configurations[key] : undefined;
    }

    /** Patrón de fecha global de la propiedad DateFormat (undefined = predeterminado por tipo). */
    getGlobalDateFormat(): string | undefined {
        return resolveDateFormat(this.props.context.parameters.DateFormat?.raw);
    }

      mapRecordsToState(force = false) {
        const { context } = this.props;
        const dataSet = context.parameters.DataSource as ComponentFramework.PropertyTypes.DataSet;
        // Parse field configurations
        let fieldConfig: Record<string, any> = {};
        try {
          const rawConfig = context.parameters.FieldConfigurations?.raw || "{}";
          fieldConfig = this.parseConfigurations(rawConfig);
        } catch (error) {
          console.error("Invalid JSON in FieldConfigurations:", context.parameters.FieldConfigurations?.raw, error);
        }

        const typeHandlers: Record<string, (value: any, config: any, context: ComponentFramework.Context<IInputs>) => any> = {
            "Currency": (value, config) => this.formatCurrency(value, config?.currency || "USD"),
            "DateAndTime.DateAndTime": (value, config, context) =>
              formatDate(
                new Date(value),
                config?.dateFormat || this.getGlobalDateFormat() || "yyyy-MM-dd HH:mm:ss",
                context
              ),
            "DateAndTime.DateOnly": (value, config, context) =>
              formatDate(
                new Date(value),
                config?.dateFormat || this.getGlobalDateFormat() || "yyyy-MM-dd",
                context
              ),
            "Decimal": (value, config) => this.formatDecimal(value, parseInt(config?.decimalPlaces) || 2),
            "TwoOptions": (value, config) => (value ? config?.trueLabel || "Yes" : config?.falseLabel || "No"),
            "SingleLine.Email": (value) => `mailto:${value}`,
            "SingleLine.Phone": (value) => `tel:${value}`,
            "SingleLine.URL": (value) => `<a href="${value}">${value}</a>`,
            "Object": (value) => JSON.stringify(value),
            // Add more as needed
          };

        //const dateFormat = context.parameters.DateFormat?.raw || availablePatterns[0] || "yyyy-MM-dd";
        //const fieldConfigs = JSON.parse(context.parameters.FieldConfigurations?.raw || "{}");
        //console.log('Starting mapRecordsToState...');
        if (!dataSet) {
            //console.log('DataSet is undefined.');
            return;
        }

        if (dataSet.paging.totalResultCount === -1) {
            console.log("unable to retrieve records, because paging.totalResultCount is -1")
        }

        if (dataSet.loading && !force) {
            //console.log('DataSet is still loading.');
            return;
        }

        if (!dataSet.sortedRecordIds.length) {
            //console.log('No sorted record IDs found.');
            // Trigger data fetch or reload
            if (dataSet.paging && dataSet.paging.loadNextPage) {
                //console.log('Attempting to load next page...');
                dataSet.paging.loadNextPage();
            }
            return;
        }

        const structureKey = this.getMappingStructureKey(dataSet, context);
        const rowSignature = this.getRowSignature(dataSet);
        const cacheKey = `${rowSignature};${structureKey}`;
        if (!force && this.mappedRecordsCache?.key === cacheKey) {
            return;
        }

        // Se reformatea todo cuando cambia la estructura, cuando la app pide recargar la fuente o
        // cuando el host revalida con `force` y la firma de filas no cambió (en ese caso no hay
        // forma barata de saber si algún valor cambió en el sitio: se mantiene el comportamiento
        // conservador anterior). Si solo llegaron páginas nuevas, las filas ya formateadas se
        // reutilizan y únicamente se formatea lo que llegó.
        const reformatAll =
            structureKey !== this.mappedStructureKey ||
            this.invalidateMappedRows ||
            (force && rowSignature === this.mappedRowSignature);

        if (reformatAll) {
            this.mappedRowCache.clear();
            this.searchTextCache = new WeakMap<object, string>();
        }

        this.mappedStructureKey = structureKey;
        this.mappedRowSignature = rowSignature;
        this.invalidateMappedRows = false;

        const columnDescriptors = dataSet.columns.map((col) => ({
            column: col,
            config: this.getColumnConfiguration(fieldConfig, col),
            handler: typeHandlers[col.dataType]
        }));

        const started = this.perfNow();
        const ids = dataSet.sortedRecordIds;
        const records: any[] = [];
        let reusedRows = 0;

        for (let index = 0; index < ids.length; index++) {
            const recordId = ids[index];
            const record = dataSet.records[recordId];
            if (!record) {
                //console.log(`Record ID ${recordId} not found in dataSet.records.`);
                continue;
            }

            // Mapeo incremental: si el record es el mismo objeto y la estructura no cambió, la fila
            // ya formateada se reutiliza tal cual (no se repiten Intl, date-fns ni los handlers).
            const cached = this.mappedRowCache.get(recordId);
            if (cached && cached.record === record) {
                reusedRows++;
                records.push(cached.mapped);
                continue;
            }

            const processedRecord: Record<string, any> = { id: recordId };

            for (let columnIndex = 0; columnIndex < columnDescriptors.length; columnIndex++) {
                const descriptor = columnDescriptors[columnIndex];
                const col = descriptor.column;
                const value = record.getValue(col.alias);
                const colType = col.dataType;
                //Decimal SingleLine.Text
                try {
                    // Use the typeHandlers map to process the column type
                    processedRecord[col.name] = descriptor.handler
                        ? descriptor.handler(value, descriptor.config, context)
                        : value; // Default case for unsupported data types
                } catch (error) {
                    console.error(`Error processing column "${col.name}" of type "${colType}":`, error);
                    processedRecord[col.name] = value; // Fallback to raw value
                }
            }

            this.mappedRowCache.set(recordId, { record, mapped: processedRecord });
            records.push(processedRecord);
        }

        // Filas que la fuente ya no entrega: se sueltan para que el caché no crezca sin control.
        if (this.mappedRowCache.size > ids.length) {
            const currentIds = new Set(ids);
            this.mappedRowCache.forEach((_entry, cachedId) => {
                if (!currentIds.has(cachedId)) {
                    this.mappedRowCache.delete(cachedId);
                }
            });
        }

        this.mappedRecordsCache = { key: cacheKey, records };
        this.perf.maps++;
        this.perf.mappedRows += records.length;
        this.perf.reusedRows += reusedRows;
        this.perf.mapMs += this.perfSince(started);

        this.mappedRecordsCache = { key: cacheKey, records };

        //console.log('Final mapped records:', records);
        //console.log('Columns:', dataSet.columns);

        this.setState(prevState => {
            // Comparación por referencias (equivalente a isEqual pero O(n) de punteros): el mapeo
            // incremental reutiliza las mismas instancias, así que no hay cambio real salvo que
            // haya llegado una página, se recargue la fuente o cambie el formato.
            const isRecordsChanged = !this.sameRowReferences(prevState.records, records);
            const isColumnsChanged =
                !this.areColumnsEqual(prevState.columns, dataSet.columns) ||
                this.getColumnsSchemaKey(prevState.columns) !== this.getColumnsSchemaKey(dataSet.columns);

            if (isRecordsChanged || isColumnsChanged) {
                //console.log('Updating state with new records and columns.');
                return {
                    records,
                    columns: dataSet.columns,
                    needsRefresh: false
                };
            }

            //console.log('No changes detected in records or columns. Skipping state update.');
            return null;
        });
    }


    updateFilters(columns: ComponentFramework.PropertyHelper.DataSetApi.Column[], previousFilters: any) {
        return columns.reduce((acc: any, col: any) => {
            acc[col.name] = previousFilters[col.name] || {
                operator: FilterOperator.AND,
                constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }]
            };
            return acc;
        }, {});
    }

    componentDidUpdate(prevProps: Readonly<DataGridProps>, prevState: Readonly<DataGridState>): void {
        this.syncRowColorStyles();

        const { context } = this.props;
        const dataSet = context.parameters.DataSource as ComponentFramework.PropertyTypes.DataSet;

        // Firma de filas: se registra siempre (también al empezar a cargar), de modo que la
        // transición "cargando -> cargado" cuente como cambio y la grilla se repinte.
        const rowSignature = this.getRowSignature(dataSet);
        const rowsChanged = rowSignature !== this.processedRowSignature;
        this.processedRowSignature = rowSignature;

        if (!dataSet || dataSet.loading) {
            //console.log('DataSet is invalid or still loading. Skipping update.');
            return;
        }

        // Trae de la fuente las páginas que falten para poder paginar/filtrar en cliente.
        this.ensureMoreRowsLoaded();

        // Si había una página pendiente y ya hay filas para mostrarla, se mueve la vista.
        this.applyPendingPage();

        const dataSourceChanged = prevProps.context.parameters.DataSource !== this.props.context.parameters.DataSource;
        // Comparación elemento a elemento (10.000 ids ≈ 0,1 ms) en vez de dos JSON.stringify.
        const sortedRecordIdsChanged = !this.sameStringList(
            prevProps.context.parameters.DataSource.sortedRecordIds,
            dataSet.sortedRecordIds
        );

        if (rowsChanged) {
            this.logPaginationInfo();
            // Llegaron filas nuevas: se vuelve a permitir ofrecer una página extra.
            this.extraPageDismissed = false;
        }

        const filtersChanged = this.filtersSignature(prevState.filters) !== this.filtersSignature(this.state.filters);
        const prevFieldConfigurations = prevProps.context.parameters.FieldConfigurations?.raw || "";
        const currentFieldConfigurations = this.props.context.parameters.FieldConfigurations?.raw || "";

        const fieldConfigurationsChanged = prevFieldConfigurations !== currentFieldConfigurations;

        const structuralChange =
            dataSourceChanged || sortedRecordIdsChanged || filtersChanged || fieldConfigurationsChanged;

        if (structuralChange || rowsChanged) {
            this.mapRecordsToState();

            if (structuralChange) {
                this.forceRefreshDataset();
            }
            // Nota: cuando solo llegan filas nuevas, el `setState` del mapeo ya repinta (las filas
            // nuevas son instancias nuevas y `shouldComponentUpdate` lo detecta); el `forceUpdate`
            // que había aquí provocaba un segundo render completo por cada página.
            //this.setState({ previousFieldConfigurations: currentFieldConfigurations });
        }

        if (!this.areColumnsEqual(prevState.columns, dataSet.columns)) {
            //console.log('Columns have changed. Updating filters.');
            const newFilters = this.updateFilters(dataSet.columns, prevState.filters);

            if (this.filtersSignature(prevState.filters) !== this.filtersSignature(newFilters)) {
                //console.log('Filters have changed. Updating state.');
                this.setState({ filters: newFilters, needsRefresh: true });
                this.forceRefreshDataset();
            }
        }

        if (prevState.needsRefresh !== this.state.needsRefresh) {
            if (this.state.needsRefresh) {
                // La revalidación se consume una sola vez. Antes vivía dentro de
                // `shouldComponentUpdate` (efecto secundario) y, cuando el mapeo no cambiaba nada,
                // la bandera seguía activa y se volvía a refrescar la fuente en cada render.
                this.setState({ needsRefresh: false });
                this.invalidateMappedRows = true;
                dataSet.refresh();
            }

            this.checkAndStartInterval();
            this.forceRefreshDataset();
        }

        if (!this.state.records.length && !dataSet.loading) {
            //console.log('No records found in state. Triggering mapRecordsToState again.');
            this.mapRecordsToState();
        }
    }


    hasRawProperty(param: any): param is { raw: any } {
        return param && typeof param === 'object' && 'raw' in param;
    }

    areColumnsEqual(
        currentColumns: ComponentFramework.PropertyHelper.DataSetApi.Column[],
        nextColumns: ComponentFramework.PropertyHelper.DataSetApi.Column[]
    ): boolean {
        if (currentColumns.length !== nextColumns.length) {
            return false;
        }

        for (let i = 0; i < currentColumns.length; i++) {
            if (
                currentColumns[i].name !== nextColumns[i].name ||
                currentColumns[i].displayName !== nextColumns[i].displayName
            ) {
                return false;
            }
        }

        return true;
    }
    // Triggers when new data set is loaded in
    shouldComponentUpdate(nextProps: Readonly<DataGridProps>, nextState: Readonly<DataGridState>): boolean {
        // El idioma se aplica antes de renderizar porque PrimeReact lee su locale al pintar.
        const nextLanguage: Language = nextProps.context.parameters.Language?.raw === 'es' ? 'es' : 'en';
        if (this.appliedLanguage !== nextLanguage) {
            applyPrimeReactLanguage(nextLanguage);
            this.appliedLanguage = nextLanguage;

            return true;
        }

        // Si el dataset trae otras filas (página nueva, recarga o fin de carga) hay que repintar.
        if (this.getRowSignature(nextProps.context.parameters.DataSource) !== this.processedRowSignature) {
            return true;
        }
        // Cambios de estado visibles: se repinta sin depender de `forceUpdate`, de modo que los
        // `setState` de selección, buscador y paginación no necesitan provocar un render extra.
        if (
            this.state.records !== nextState.records ||
            this.state.selectedRecordIds !== nextState.selectedRecordIds ||
            this.state.selectedRecords !== nextState.selectedRecords ||
            this.state.globalFilterValue !== nextState.globalFilterValue ||
            this.state.searchText !== nextState.searchText
        ) {
            return true;
        }

        const parameterKeys: (keyof IInputs)[] = Object.keys(nextProps.context.parameters) as (keyof IInputs)[];
        // Nota: la revalidación del dataset (`needsRefresh`) la consume `componentDidUpdate`.
        // Aquí ya no se llama a `DataSource.refresh()`: era un efecto secundario que, con la
        // bandera activa, refrescaba la fuente en cada intento de render.
        for (const key of parameterKeys) {
            const nextParam = nextProps.context.parameters[key];
            const previousParam = this.state.previousParameters[key];

            if (this.hasRawProperty(nextParam)) {
                const nextRaw = nextParam.raw;
                const hasRawCurrent = this.hasRawProperty(previousParam);

                // //console.log(`Checking parameter '${key}':`, {
                //     previousParam: hasRawCurrent ? previousParam?.raw : previousParam,
                //     nextParam: nextRaw,
                //     hasRaw: true,
                // });

                if (previousParam !== nextRaw) {
                    //console.log(`Parameter '${key}' has changed. Previous:`, previousParam, "Next:", nextRaw);
                    return true;
                }
            } else {
                //console.log(`Parameter '${key}' does not have a 'raw' property. Skipping check.`);
            }
        }

        const currentColumns = this.state.columns;
        const nextColumns = nextProps.context.parameters.DataSource.columns;

        if (!this.areColumnsEqual(currentColumns, nextColumns)) {
            //console.log("Columns have changed. Component should update.");
            return true;
        }

        if (this.filtersSignature(this.state.filters) !== this.filtersSignature(nextState.filters)) {
            //console.log("Filters have changed. Component should update.");
            return true;
        }

        if (!this.sameStringList(this.state.selectedColumns, nextState.selectedColumns)) {
            //console.log("Column selection has changed. Component should update.");
            return true;
        }

        if (
            this.state.currentPage !== nextState.currentPage ||
            this.state.pendingPage !== nextState.pendingPage ||
            this.state.pageSizeOverride !== nextState.pageSizeOverride
        ) {
            return true;
        }

        if (this.state.gridEpoch !== nextState.gridEpoch) {
            //console.log("Grid must be reset. Component should update.");
            return true;
        }

        //console.log("No changes detected, component should not update.");
        return false;
    }

    /**
     * El buscador avisa en cada tecla y el filtrado efectivo (que recorre todo el dataset y hace
     * que PrimeReact vuelva a filtrar) se aplica con un retardo corto: escribir una palabra ya no
     * dispara un filtrado completo por pulsación ni repinta la cuadrícula.
     */
    onSearchTextChange = (value: string) => {
        this.scheduleGlobalFilter(value);
    };

    /** Aplica el buscador al instante (al pulsar Enter o salir del campo), sin esperar el retardo. */
    onSearchSubmit = (value: string) => {
        this.applyGlobalFilter(value);
    };

    /** Programa la aplicación del buscador global (se reinicia mientras el usuario escribe). */
    scheduleGlobalFilter(value: string): void {
        this.clearSearchDebounce();
        this.searchDebounceTimeout = setTimeout(() => {
            this.searchDebounceTimeout = null;
            this.applyGlobalFilter(value);
        }, DataGrid.searchDebounceMs);
    }

    /** Aplica el valor del buscador global al modelo de filtros de la tabla. */
    applyGlobalFilter(value: string): void {
        this.clearSearchDebounce();

        if (this.state.globalFilterValue === value && this.state.filters?.global) {
            return;
        }

        this.setState({
            globalFilterValue: value,
            searchText: value,
            filters: {
                ...this.state.filters,
                global: { value, matchMode: FilterMatchMode.CONTAINS }
            }
        });
    }

    refreshData = () => {
        const dataSet = this.props.context.parameters.DataSource;

        // Volver a la primera página y limpiar la selección (local y en el dataset).
        if (typeof dataSet.clearSelectedRecordIds === 'function') {
            dataSet.clearSelectedRecordIds();
        }
        dataSet.paging.reset();
        this.autoLoadFrom = -1;
        this.extraPageDismissed = false;
        this.deepLoad = true;
        this.processedRowSignature = '';
        this.clearPendingTimeout();
        this.clearLoadWatch();
        this.setState({
            gridEpoch: this.state.gridEpoch + 1,
            currentPage: 1,
            pendingPage: null,
            selectedRecordIds: [],
            selectedRecords: []
        });

        // Pedir de nuevo los datos a la fuente de origen y repintar cuando responda.
        // Se fuerza el reformateo de las filas: la fuente puede devolver los mismos ids con valores
        // nuevos y el caché incremental no debe reutilizar lo anterior.
        this.invalidateMappedRows = true;
        dataSet.refresh();
        this.props.notifyOutputChanged();
        this.forceRefreshDataset();
        // Y traer toda la fuente (todas las páginas, incluida la última incompleta).
        this.requestWholeSource();
    };

    /** Nombres de InitialColumns normalizados (memoizados por el texto de la propiedad). */
    getInitialColumnNames(): string[] {
        const raw = this.props.context.parameters.InitialColumns?.raw || '';

        if (this.initialColumnsCache?.raw === raw) {
            return this.initialColumnsCache.names;
        }

        const names = raw
            .split(',')
            .map((column) => normalizeText(column))
            .filter(Boolean);
        this.initialColumnsCache = { raw, names };

        return names;
    }

    /** Etiquetas personalizadas de columnas (propiedad ColumnLabels), resueltas por columna. */
    getColumnLabels(): Record<string, string> {
        const raw = this.props.context.parameters.ColumnLabels?.raw || '';
        const columns = (this.props.context.parameters.DataSource.columns || []).map((column) => ({
            name: column.name,
            alias: column.alias,
            displayName: column.displayName
        }));
        const key = `${raw}|${columns.map((column) => column.name).join(',')}`;

        if (!this.columnLabelsCache || this.columnLabelsCache.key !== key) {
            this.columnLabelsCache = { key, labels: resolveColumnLabels(raw, columns) };
        }

        return this.columnLabelsCache.labels;
    }

    /** Nombre que se muestra para una columna: etiqueta personalizada o nombre del dataset. */
    getColumnHeader(column: { name: string; displayName?: string }): string {
        return this.getColumnLabels()[column.name] || column.displayName || column.name;
    }

    /** Columnas disponibles para el control (respeta InitialColumns cuando está definido). */
    getBaseColumns(): ComponentFramework.PropertyHelper.DataSetApi.Column[] {
        const columns = this.props.context.parameters.DataSource.columns;
        const raw = this.props.context.parameters.InitialColumns?.raw || '';

        if (this.baseColumnsCache && this.baseColumnsCache.source === columns && this.baseColumnsCache.raw === raw) {
            return this.baseColumnsCache.columns;
        }

        const requestedColumns = this.getInitialColumnNames();
        let baseColumns: ComponentFramework.PropertyHelper.DataSetApi.Column[] = columns;

        if (requestedColumns.length) {
            const labels = this.getColumnLabels();

            baseColumns = columns.filter((column) =>
                [column.name, column.alias, column.displayName, labels[column.name]]
                    .filter(Boolean)
                    .some((name) => requestedColumns.includes(normalizeText(String(name))))
            );
        }

        this.baseColumnsCache = { source: columns, raw, columns: baseColumns };

        return baseColumns;
    }

    /** Opciones que el usuario final puede marcar o desmarcar en el selector. */
    getColumnOptions(): Array<{ label: string; value: string }> {
        return this.getBaseColumns().map((column) => ({
            label: this.getColumnHeader(column),
            value: column.name
        }));
    }

    /** Selección efectiva: la elegida por el usuario o todas las columnas disponibles. */
    getSelectedColumnNames(): string[] {
        return this.state.selectedColumns ?? this.getBaseColumns().map((column) => column.name);
    }

    getVisibleColumns(): ComponentFramework.PropertyHelper.DataSetApi.Column[] {
        const baseColumns = this.getBaseColumns();
        const selectedColumns = this.state.selectedColumns;
        if (!selectedColumns) return baseColumns;

        if (
            this.visibleColumnsCache &&
            this.visibleColumnsCache.base === baseColumns &&
            this.visibleColumnsCache.selected === selectedColumns
        ) {
            return this.visibleColumnsCache.columns;
        }

        const columns = baseColumns.filter((column) => selectedColumns.includes(column.name));
        this.visibleColumnsCache = { base: baseColumns, selected: selectedColumns, columns };

        return columns;
    }

    /** Tamaños de página del pie (memoizado por tamaño activo: identidad estable en cada render). */
    getRowsPerPageOptions(): number[] {
        const pageSize = this.getPageSize();

        if (this.rowsPerPageCache?.pageSize === pageSize) {
            return this.rowsPerPageCache.options;
        }

        const options = Array.from(new Set([...BASE_ROWS_PER_PAGE, pageSize])).sort((a, b) => a - b);
        this.rowsPerPageCache = { pageSize, options };

        return options;
    }

    /** Campos que PrimeReact usa para la búsqueda global (memoizado por columnas). */
    getGlobalFilterFields(): string[] {
        const columns = this.state.columns || [];

        if (this.globalFilterFieldsCache?.source === columns) {
            return this.globalFilterFieldsCache.fields;
        }

        const fields = columns.map((col) => col.name);
        this.globalFilterFieldsCache = { source: columns, fields };

        return fields;
    }

    /** Renderizador estable de una columna: misma identidad en cada render (no invalida el memo). */
    getColumnBodyRenderer(columnName: string): (item: Record<string, any>) => any {
        let renderer = this.columnBodyCache.get(columnName);

        if (!renderer) {
            renderer = (item: Record<string, any>) => this.renderItemColumn(item, columnName);
            this.columnBodyCache.set(columnName, renderer);
        }

        return renderer;
    }

    /** Estilo estable de una columna (misma identidad por columna en todos los renders). */
    getColumnStyle(columnName: string): React.CSSProperties {
        let style = this.columnStyleCache.get(columnName);

        if (!style) {
            style = { ...COLUMN_STYLE };
            this.columnStyleCache.set(columnName, style);
        }

        return style;
    }

    /** Valor que se pinta en una celda (misma lógica que el render original de columna). */
    renderItemColumn(item: Record<string, any> | undefined, columnName: string): any {
        if (!item || !columnName) {
            return null;
        }

        const value = item[columnName];

        if (value && typeof value === 'object' && value.toString) {
            return value.toString();
        }

        return value ?? '';
    }

    /** Filas seleccionadas que recibe el DataTable, memoizadas por identidad de filas y de ids. */
    getSelectedRecordsForTable(records: any[]): any[] {
        const selectedRecordIds = this.state.selectedRecordIds;

        if (
            this.selectionCache &&
            this.selectionCache.records === records &&
            this.selectionCache.ids === selectedRecordIds
        ) {
            return this.selectionCache.selected;
        }

        // Set de ids: la selección pasa de O(filas x seleccionados) a O(filas + seleccionados).
        const selectedIds = new Set(selectedRecordIds);
        const selected = records.filter((record) => selectedIds.has(record.id));
        this.selectionCache = { records, ids: selectedRecordIds, selected };

        return selected;
    }

    /** Plantilla del reporte del pie (memoizada por idioma y recuento filtrado). */
    getPageReportTemplate(): string {
        const filteredCount = this.getFilteredRecordCount();
        const key = `${this.getLanguage()}|${filteredCount}`;

        if (this.pageReportCache?.key === key) {
            return this.pageReportCache.template;
        }

        const template = formatTemplate(this.getStrings().pageReport, { filtered: String(filteredCount) });
        this.pageReportCache = { key, template };

        return template;
    }

    getFilteredRecords(records: any[]): any[] {
        const searchTerm = this.state.globalFilterValue.trim().toLowerCase();
        if (!searchTerm) return records;
        if (this.filteredRecordsCache?.source === records && this.filteredRecordsCache.search === searchTerm) {
            return this.filteredRecordsCache.records;
        }

        const started = this.perfNow();
        // El texto buscable de cada fila se calcula una sola vez (WeakMap) y se reutiliza entre
        // pulsaciones: la búsqueda pasa de O(filas x columnas) a O(filas).
        const filteredRecords = records.filter((record) => this.getRecordSearchText(record).indexOf(searchTerm) !== -1);
        this.filteredRecordsCache = { source: records, search: searchTerm, records: filteredRecords };

        this.perf.filterPasses++;
        this.perf.filterMs += this.perfSince(started);

        return filteredRecords;
    }

    /** Texto buscable (minúsculas) de una fila: se conserva mientras la fila siga siendo la misma. */
    getRecordSearchText(record: Record<string, any>): string {
        const cached = this.searchTextCache.get(record);
        if (cached !== undefined) {
            return cached;
        }

        const columns = this.state.columns;
        let text = '';

        for (let index = 0; index < columns.length; index++) {
            const value = record[columns[index].name];

            if (value === null || value === undefined) {
                continue;
            }

            text += String(value).toLowerCase() + SEARCH_TEXT_SEPARATOR;
        }

        this.searchTextCache.set(record, text);

        return text;
    }

    onSelectionChange = (e: any) => {
        const gridIsEnabled = this.props.context.parameters.IsEnabled?.raw ?? false;
        if (!gridIsEnabled) {
            return;
        }
        const newSelectedRecordIds = e.value.map((record: any) => record.id);
        this.props.context.parameters.DataSource.setSelectedRecordIds(newSelectedRecordIds)
        this.setState({
            selectedRecordIds: newSelectedRecordIds,
            selectedRecords: e.value,
        });
    };

    onColumnSelectionChange = (event: any) => {
        const value = Array.isArray(event?.value) ? (event.value as string[]) : [];
        this.setState({ selectedColumns: value });
    };

    /** Filtros de columna de PrimeReact: callback estable (no invalida la memoización de la tabla). */
    onFilterChange = (event: any) => {
        this.setState({ filters: event.filters });
    };

    /** Estado de filtros completo: garantiza un modelo por cada columna del dataset. */
    getFiltersForTable(): any {
        const columns = this.props.context.parameters.DataSource.columns || [];
        const currentFilters = this.state.filters || {};

        if (!columns.some((column) => !currentFilters[column.name])) {
            return currentFilters;
        }

        return columns.reduce((acc: any, column) => {
            if (!acc[column.name]) {
                acc[column.name] = {
                    operator: FilterOperator.AND,
                    constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }]
                };
            }
            return acc;
        }, { ...currentFilters });
    }

    /** Filas visibles con los filtros activos (búsqueda global y filtros por columna). */
    getRecordsForExport(): any[] {
        const source = this.getFilteredRecords(this.state.records);
        const key = `${this.state.globalFilterValue}|${JSON.stringify(this.state.filters)}`;
        if (this.matchingRecordsCache?.source === source && this.matchingRecordsCache.key === key) {
            return this.matchingRecordsCache.records;
        }

        const records = source.filter((record) => this.matchesColumnFilters(record));
        this.matchingRecordsCache = { source, key, records };

        return records;
    }

    /** Cantidad de registros que cumplen los filtros activos (buscador global + columnas). */
    getFilteredRecordCount(): number {
        return this.getRecordsForExport().length;
    }

    matchesColumnFilters(record: any): boolean {
        const filters = this.state.filters || {};

        return Object.keys(filters)
            .filter((field) => field !== 'global')
            .every((field) => {
                const filterModel = filters[field];
                if (!filterModel) return true;

                const constraints = filterModel.constraints ? filterModel.constraints : [filterModel];
                const activeConstraints = constraints.filter(
                    (constraint: any) =>
                        constraint && constraint.value !== null && constraint.value !== undefined && constraint.value !== ''
                );
                if (!activeConstraints.length) return true;

                const results = activeConstraints.map((constraint: any) => this.evaluateConstraint(record, field, constraint));
                return filterModel.operator === FilterOperator.OR ? results.some(Boolean) : results.every(Boolean);
            });
    }

    evaluateConstraint(record: any, field: string, constraint: any): boolean {
        // Se usa el mismo motor de filtros que PrimeReact. Cuando el modelo no trae
        // matchMode se aplica el de la columna (CONTAINS en el DataTable), no otro:
        // si no, la exportación no coincidiría con las filas que se ven en la grilla.
        const matchMode = constraint.matchMode || FilterMatchMode.CONTAINS;
        const filterPredicate = (FilterService as any).filters?.[matchMode];
        if (typeof filterPredicate !== 'function') return true;

        return filterPredicate(this.resolveRecordField(record, field), constraint.value);
    }

    resolveRecordField(record: any, field: string): any {
        if (!record) return undefined;
        if (field.indexOf('.') === -1) return record[field];

        return field
            .split('.')
            .reduce(
                (current: any, part: string) => (current === null || current === undefined ? undefined : current[part]),
                record
            );
    }

    getExportFileName(): string {
        const headerText = this.props.context.parameters.HeaderText?.raw;
        const dataSet = this.props.context.parameters.DataSource;
        const targetEntityType =
            typeof dataSet.getTargetEntityType === 'function' ? dataSet.getTargetEntityType() : undefined;

        return (headerText || targetEntityType || 'ModernDataGrid').toString();
    }

    getExportFileStamp(): string {
        const now = new Date();
        const pad = (value: number) => value.toString().padStart(2, '0');
        return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    }

    exportToExcel = () => {
        const columns = this.getVisibleColumns().map((column) => ({
            header: this.getColumnHeader(column),
            field: column.name
        }));
        if (!columns.length) return;

        // Se exportan las mismas filas que muestra la grilla (buscador global + filtros
        // de columna) con las mismas columnas visibles que el usuario tiene seleccionadas.
        const rows = this.getRecordsForExport();

        console.log('[ModernDataGrid] exportando a Excel', {
            columnas: columns.map((column) => column.field),
            filas: rows.length,
            filasCargadas: this.state.records.length
        });

        exportRowsToExcel({
            fileName: `${this.getExportFileName()}_${this.getExportFileStamp()}`,
            sheetName: this.getStrings().exportSheetName,
            columns,
            rows
        }).catch((error) => console.error('Error exporting to Excel:', error));
    };

    /** Idioma configurado en la propiedad Language del manifest. */
    getLanguage(): Language {
        return this.props.context.parameters.Language?.raw === 'es' ? 'es' : 'en';
    }

    /** Textos del control (buscador, botones, mensajes y exportación). */
    getStrings(): GridStrings {
        return getStrings(this.getLanguage());
    }

    /** Activa el idioma de los textos propios y de los internos de PrimeReact. */
    applyLanguage(): void {
        const language = this.getLanguage();
        if (this.appliedLanguage === language) return;

        applyPrimeReactLanguage(language);
        this.appliedLanguage = language;
    }

    /** Clave de las reglas de color (texto + columnas), memoizada por identidad de columnas. */
    getRowColorsKey(): string {
        const raw = this.props.context.parameters.RowColorRules?.raw || '';
        const source = this.props.context.parameters.DataSource.columns || [];

        if (this.rowColorsKeyCache && this.rowColorsKeyCache.raw === raw && this.rowColorsKeyCache.source === source) {
            return this.rowColorsKeyCache.key;
        }

        const labels = this.getColumnLabels();
        const key = `${raw}|${source
            .map((column) => `${column.name}:${column.displayName}:${labels[column.name] || ''}`)
            .join(',')}`;
        this.rowColorsKeyCache = { raw, source, key };

        return key;
    }

    /** Configuración de colores de fila compilada (se recompila si cambia el texto o las columnas). */
    getRowColors(): CompiledRowColors {
        const key = this.getRowColorsKey();

        if (!this.rowColorsCache || this.rowColorsCache.key !== key) {
            const raw = this.props.context.parameters.RowColorRules?.raw || '';
            const labels = this.getColumnLabels();
            const columns = (this.props.context.parameters.DataSource.columns || []).map((column) => ({
                name: column.name,
                alias: column.alias,
                displayName: column.displayName,
                label: labels[column.name]
            }));

            this.rowColorsCache = { key, compiled: compileRowColors(raw, columns) };
            // Cambiaron las reglas: las clases ya calculadas dejan de ser válidas.
            this.rowClassByRow = new WeakMap<object, string>();
            this.rowClassRulesKey = key;
        }

        return this.rowColorsCache.compiled;
    }

    /**
     * Clase de color de la fila. Se calcula una sola vez por fila y por conjunto de reglas
     * (WeakMap), así que PrimeReact puede pedirla para cada fila pintada sin reevaluar las reglas
     * ni reconstruir la clave de configuración.
     */
    getRowClassName(record: Record<string, any>): string {
        this.rowsPaintedThisRender++;

        const rulesKey = this.getRowColorsKey();

        if (this.rowClassRulesKey !== rulesKey) {
            this.rowClassByRow = new WeakMap<object, string>();
            this.rowClassRulesKey = rulesKey;
        }

        if (!record || typeof record !== 'object') {
            return record ? this.getRowColors().classNameFor(record) : '';
        }

        const cached = this.rowClassByRow.get(record);

        if (cached !== undefined) {
            return cached;
        }

        const className = this.getRowColors().classNameFor(record);
        this.rowClassByRow.set(record, className);

        return className;
    }

    /** Callback estable de clases de fila (misma identidad en todos los renders). */
    rowClassName = (row: any) => this.getRowClassName(row);

    /** Publica las reglas de color en una hoja de estilos propia de este control. */
    syncRowColorStyles(): void {
        const css = this.getRowColors().css;

        if (!css) {
            this.clearRowColorStyles();

            return;
        }

        if (!this.rowColorStyleElement || !this.rowColorStyleElement.isConnected) {
            this.rowColorStyleElement = document.createElement('style');
            this.rowColorStyleElement.setAttribute('data-modern-data-grid', 'row-colors');
            document.head.appendChild(this.rowColorStyleElement);
        }

        if (this.rowColorStyleElement.textContent !== css) {
            this.rowColorStyleElement.textContent = css;
        }
    }

    /** Elimina la hoja de estilos de colores de fila. */
    clearRowColorStyles(): void {
        if (this.rowColorStyleElement) {
            this.rowColorStyleElement.remove();
            this.rowColorStyleElement = null;
        }
    }

    renderHeader() {
        const strings = this.getStrings();
        const displayHeader = this.props.context.parameters.DisplayHeader?.raw ?? false;
        const displaySearch = this.props.context.parameters.DisplaySearch?.raw ?? false;
        const headerText = this.props.context.parameters.HeaderText?.raw ?? this.props.context.parameters.DataSource.getTargetEntityType();

        if (!displayHeader) {
            return null;
        }

        return (
            <div className="modern-data-grid-header flex flex-wrap gap-2 justify-content-between align-items-center">
                <h4 className="m-0">{headerText}</h4>
                <div className="modern-data-grid-actions flex align-items-center gap-2">
                    {this.getColumnOptions().length > 0 && (
                        <MultiSelect
                            value={this.getSelectedColumnNames()}
                            options={this.getColumnOptions()}
                            onChange={this.onColumnSelectionChange}
                            placeholder={strings.columnsPlaceholder}
                            filter
                            selectAllLabel={strings.selectAllColumns}
                            scrollHeight="18rem"
                            className="modern-data-grid-column-selector"
                            panelClassName="modern-data-grid-columns-panel"
                            aria-label={strings.columnsSelector}
                            tooltip={strings.columnsSelector}
                        />
                    )}
                    {displaySearch && (
                        <IconField iconPosition="left">
                            <InputIcon>
                                <SearchIcon />
                            </InputIcon>
                            <SearchBox
                                value={this.state.searchText}
                                resetToken={this.state.searchResetToken}
                                placeholder={strings.keywordSearch}
                                onChange={this.onSearchTextChange}
                                onFlush={this.onSearchSubmit}
                            />
                        </IconField>
                    )}
                    <Button
                        type="button"
                        icon={<FilterSlashIcon />}
                        text
                        rounded
                        disabled={!this.hasActiveFilters()}
                        aria-label={strings.clearFilters}
                        tooltip={strings.clearFilters}
                        onClick={this.clearFilters}
                    />
                    <Button
                        type="button"
                        icon={<RefreshIcon />}
                        text
                        rounded
                        aria-label={strings.refresh}
                        tooltip={strings.refresh}
                        onClick={this.refreshData}
                    />
                    <Button
                        type="button"
                        icon={<ExcelIcon />}
                        text
                        rounded
                        aria-label={strings.exportToExcel}
                        tooltip={strings.exportToExcel}
                        onClick={this.exportToExcel}
                    />
                </div>
            </div>
        );
    }
    getFieldValue(col: ComponentFramework.PropertyHelper.DataSetApi.Column): string {
        return col.alias || col.name;
    }

    getRecordsFromContext(): any[] {
        const { context } = this.props;
        if (context.parameters.DataSource && !context.parameters.DataSource.loading) {
            const dataSet = context.parameters.DataSource as ComponentFramework.PropertyTypes.DataSet;
            ////console.log('DataSet:', dataSet);

            const records = dataSet.sortedRecordIds.map(recordId => {
                const record = dataSet.records[recordId];
                return {
                    id: recordId,
                    ...dataSet.columns.reduce((rec: Record<string, any>, col) => {
                        rec[col.name] = record.getValue(col.alias);
                        //console.log(rec)
                        return rec;
                    }, {})
                };
            });
            ////console.log('Mapped Records:', records);
            return records;
        }
        return [];
    }

    /**
     * Revalida el dataset y repinta. Varias peticiones seguidas (montaje, cambio de columnas,
     * filtros…) se agrupan en una sola: el mapeo lee el dataset cuando se ejecuta, así que no se
     * pierde ninguna fila y se evitan repintados encadenados.
     */
    forceRefreshDataset = () => {
        if (this.forceRefreshTimeout) {
            return;
        }

        this.forceRefreshTimeout = setTimeout(() => {
            this.forceRefreshTimeout = null;
            this.props.notifyOutputChanged();
            this.mapRecordsToState(true);
            this.forceUpdate();
        }, 300);
    };

    /** Filas por página del pie: las elegidas por el usuario, las del dataset o 25. */
    getPageSize(): number {
        if (this.state.pageSizeOverride && this.state.pageSizeOverride > 0) {
            return this.state.pageSizeOverride;
        }

        const pageSize = this.props.context.parameters.DataSource?.paging?.pageSize;

        return pageSize && pageSize > 0 ? pageSize : 25;
    }

    /** true si la fuente todavía tiene filas que no están cargadas en la grilla. */
    hasMoreRowsInSource(): boolean {
        if (this.extraPageDismissed) {
            return false;
        }

        const dataSet = this.props.context.parameters.DataSource;
        const paging = dataSet?.paging;

        if (!paging || typeof paging.loadNextPage !== 'function') {
            return false;
        }

        if (paging.hasNextPage) {
            return true;
        }

        const loadedRows = dataSet.sortedRecordIds ? dataSet.sortedRecordIds.length : 0;

        // Total conocido y mayor que lo cargado -> quedan filas.
        if (paging.totalResultCount > loadedRows) {
            return true;
        }

        // Sin total fiable: si la última página está completa, probablemente queden filas.
        return paging.totalResultCount <= 0 && loadedRows > 0 && loadedRows % this.getPageSize() === 0;
    }

    /** Páginas que se pueden mostrar con las filas ya cargadas. */
    getLoadedPageCount(): number {
        const rows = this.getPageSize();

        return Math.max(1, Math.ceil(this.getFilteredRecordCount() / rows));
    }

    /**
     * Propiedades de paginación del pie.
     *
     * Se navega entre las páginas que ya están cargadas (instantáneo) y, mientras la
     * fuente tenga más filas, el pie muestra **una página extra** para poder pedirlas.
     * Nunca se mueve la vista a una página sin filas: la petición queda pendiente
     * hasta que llegan los datos (`applyPendingPage`).
     */
    getPaginationProps(paginator: boolean): any {
        const pageSize = this.getPageSize();
        const loadedRows = this.getFilteredRecordCount();
        const extraPage = this.hasMoreRowsInSource() ? pageSize : 0;
        const key = `${paginator}|${pageSize}|${loadedRows}|${extraPage}|${this.state.currentPage}`;

        // Objeto memoizado: PrimeReact recibe la misma identidad mientras nada cambie.
        if (this.paginationPropsCache?.key === key) {
            return this.paginationPropsCache.props;
        }

        const props = {
            paginator,
            rows: pageSize,
            totalRecords: loadedRows + extraPage,
            first: (this.state.currentPage - 1) * pageSize,
            onPage: this.onPageChange
        };
        this.paginationPropsCache = { key, props };

        return props;
    }

    /** Navegación del pie: mueve la vista o pide a la fuente las filas que falten. */
    onPageChange = (event: any) => {
        const rows = event.rows || 0;
        const targetPage = (event.page === undefined ? 0 : event.page) + 1;
        const pageSize = this.getPageSize();

        // Cambio de filas por página: solo cambia el paginado en pantalla (la fuente queda igual).
        if (rows > 0 && rows !== pageSize) {
            this.autoLoadFrom = -1;
            this.extraPageDismissed = false;
            this.setState({ pageSizeOverride: rows, currentPage: 1, pendingPage: null });

            return;
        }

        if (targetPage === this.state.currentPage) {
            this.forceUpdate();

            return;
        }

        // Página ya cargada: la vista se mueve al instante.
        if (targetPage <= this.getLoadedPageCount()) {
            this.setState({ currentPage: targetPage });

            return;
        }

        // Página más allá de lo cargado: se piden más filas a la fuente.
        this.setState({ pendingPage: targetPage });
        this.requestMoreRows();
    };

    /** Pide a la fuente las filas que falten para la página solicitada. */
    requestMoreRows(): void {
        this.autoLoadFrom = -1;
        this.ensureMoreRowsLoaded(true);

        if (this.pendingTimeout) {
            clearTimeout(this.pendingTimeout);
        }

        // Si la fuente no responde, se libera el estado pendiente para no bloquear el pie.
        this.pendingTimeout = setTimeout(() => {
            if (this.state.pendingPage !== null) {
                console.log('[ModernDataGrid] la fuente no entregó más filas para la página solicitada');

                this.extraPageDismissed = true;
                this.setState({ pendingPage: null });
            }
        }, 6000);
    }

    /** Si había una página pendiente y ya hay filas para mostrarla, se mueve la vista. */
    applyPendingPage(): void {
        const pendingPage = this.state.pendingPage;

        if (pendingPage === null) {
            return;
        }

        if (pendingPage <= this.getLoadedPageCount()) {
            if (this.pendingTimeout) {
                clearTimeout(this.pendingTimeout);
                this.pendingTimeout = null;
            }

            this.setState({ currentPage: pendingPage, pendingPage: null });

            return;
        }

        // Todavía faltan filas: se sigue pidiendo mientras la fuente tenga más.
        if (this.hasMoreRowsInSource()) {
            this.ensureMoreRowsLoaded();
        }
    }

    /**
     * Pide a la fuente una página tan grande como el tope para traer **todos** los registros
     * de una sola vez (incluida la última página incompleta). El pie sigue paginando en
     * pantalla con el tamaño que definió la app (`Default Rows`).
     */
    requestWholeSource(): void {
        const dataSet = this.props.context.parameters.DataSource;
        const paging = dataSet?.paging;

        if (!paging || typeof paging.setPageSize !== 'function') {
            return;
        }

        const currentPageSize = paging.pageSize && paging.pageSize > 0 ? paging.pageSize : 0;

        // Se recuerda el tamaño de página de la app: es el que usa el pie en pantalla.
        if (!this.displayPageSize || this.displayPageSize <= 0) {
            this.displayPageSize = currentPageSize > 0 ? currentPageSize : 25;
        }

        if (this.state.pageSizeOverride !== this.displayPageSize) {
            this.setState({ pageSizeOverride: this.displayPageSize });
        }

        if (currentPageSize >= DataGrid.maxLoadedRows) {
            // El host ya entrega la fuente completa en una página: no hay nada que pedir.
            return;
        }

        console.log('[ModernDataGrid] pidiendo toda la fuente', {
            paginaDeLaApp: this.displayPageSize,
            paginaActual: currentPageSize,
            objetivo: DataGrid.maxLoadedRows
        });

        this.autoLoadFrom = -1;
        this.emptyLoadAttempts = 0;
        paging.setPageSize(DataGrid.maxLoadedRows);

        if (typeof paging.reset === 'function') {
            paging.reset();
        }

        this.scheduleLoadWatch();
    }

    /**
     * Pide a la fuente las páginas que falten (con tope de seguridad) para que haya
     * filas que paginar, filtrar y exportar. Se detiene cuando la fuente ya no tiene
     * más páginas o cuando se alcanza el tope.
     *
     * `force` (petición explícita del usuario desde el pie) intenta la carga aunque el
     * dataset diga que no hay más páginas o aunque ya se haya alcanzado el tope: si la
     * fuente no entrega nada, el aviso se libera solo y el pie deja de ofrecerlo.
     */
    ensureMoreRowsLoaded(force = false): void {
        const dataSet = this.props.context.parameters.DataSource;
        const paging = dataSet?.paging;

        if (!paging || typeof paging.loadNextPage !== 'function') {
            return;
        }

        if (dataSet.loading) {
            // La fuente sigue respondiendo: se reintenta cuando termine (componentDidUpdate o vigilante).
            return;
        }

        const loadedRows = dataSet.sortedRecordIds ? dataSet.sortedRecordIds.length : 0;
        const limit = this.deepLoad ? DataGrid.maxLoadedRows : DataGrid.maxAutoLoadedRows;

        // El tope solo frena la carga automática: si el usuario pide otra página, se intenta.
        if (!force && loadedRows >= limit) {
            return;
        }

        // Sin más páginas ni indicios de más filas no se insiste (salvo petición del usuario).
        if (!force && !paging.hasNextPage && !this.hasMoreRowsInSource()) {
            return;
        }

        if (loadedRows === this.autoLoadFrom) {
            // La fuente no entregó filas nuevas en el último intento: se reintenta unas veces más.
            if (this.emptyLoadAttempts >= DataGrid.maxLoadRetries) {
                if (!this.extraPageDismissed) {
                    console.log('[ModernDataGrid] la fuente no entregó más filas', {
                        filasCargadas: loadedRows,
                        filasFiltradas: this.getFilteredRecordCount(),
                        totalResultCount: paging.totalResultCount,
                        hasNextPage: paging.hasNextPage,
                        paginaFuente: paging.pageSize
                    });

                    this.extraPageDismissed = true;
                }

                return;
            }

            this.emptyLoadAttempts++;
        } else {
            this.emptyLoadAttempts = 0;
        }

        this.autoLoadFrom = loadedRows;
        paging.loadNextPage();
        this.scheduleLoadWatch();
    }

    /** Deja en la consola el estado de la paginación (útil para diagnosticar). */
    logPaginationInfo(): void {
        const dataSet = this.props.context.parameters.DataSource;
        const paging = dataSet?.paging;
        const pageSize = this.getPageSize();

        console.log('[ModernDataGrid] paginación', {
            filasCargadas: dataSet?.sortedRecordIds ? dataSet.sortedRecordIds.length : 0,
            filasFiltradas: this.getFilteredRecordCount(),
            filasPorPagina: pageSize,
            paginas: Math.max(1, Math.ceil(this.getFilteredRecordCount() / pageSize)),
            totalResultCount: paging?.totalResultCount,
            hasNextPage: paging?.hasNextPage,
            paginaFuente: paging?.pageSize
        });
    }

    /** Limpia el buscador global y todos los filtros de columna (deja el control como al cargar). */
    clearFilters = () => {
        const columns = this.props.context.parameters.DataSource.columns || [];
        const clearedFilters = columns.reduce((acc: any, column) => {
            acc[column.name] = {
                operator: FilterOperator.AND,
                constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }]
            };

            return acc;
        }, {});

        // Se vuelve al estado inicial de la carga: sin pendientes, sin descartes y con la fuente completa.
        this.autoLoadFrom = -1;
        this.extraPageDismissed = false;
        this.emptyLoadAttempts = 0;
        this.clearPendingTimeout();
        this.clearSearchDebounce();

        this.setState(
            {
                filters: clearedFilters,
                globalFilterValue: '',
                searchText: '',
                searchResetToken: this.state.searchResetToken + 1,
                gridEpoch: this.state.gridEpoch + 1,
                currentPage: 1,
                pendingPage: null
            },
            () => {
                this.requestWholeSource();
                this.ensureMoreRowsLoaded();
            }
        );
    };

    /** true si hay algún filtro activo (de columna o búsqueda global). */
    hasActiveFilters(): boolean {
        if (this.state.globalFilterValue) {
            return true;
        }

        const filters = this.state.filters || {};

        return Object.keys(filters).some((field) => {
            const filterModel = filters[field];

            if (!filterModel) {
                return false;
            }

            const constraints = filterModel.constraints ? filterModel.constraints : [filterModel];

            return constraints.some(
                (constraint: any) =>
                    constraint && constraint.value !== null && constraint.value !== undefined && constraint.value !== ''
            );
        });
    }

    render() {
        const { context } = this.props;
        const started = this.perfNow();
        const strings = this.getStrings();
        const filters = this.getFiltersForTable();
        const records = this.getFilteredRecords(this.state.records);
        const header = this.renderHeader();
        const displayPagination = context.parameters.DisplayPagination?.raw ?? true;
        const emptyMessage = context.parameters.EmptyMessage?.raw ?? strings.emptyMessage;
        // "menu": el icono de filtro de cada columna despliega el buscador con "Contains".
        const filterDisplayType = "menu";
        const allowedSelectionModes: Array<"multiple" | "checkbox"> = ["multiple", "checkbox"];
        const selectionMode = (context.parameters.SelectionMode?.raw && allowedSelectionModes.includes(context.parameters.SelectionMode?.raw as any))
            ? (context.parameters.SelectionMode?.raw as "multiple" | "checkbox")
            : "multiple";
        const allowSorting = context.parameters.AllowSorting?.raw ?? false;
        const allowFiltering = context.parameters.AllowFiltering?.raw ?? false;
        const rowsPerPageOptions = this.getRowsPerPageOptions();
        const visibleColumns = this.getVisibleColumns();

        this.perf.renders++;
        const rowsPaintedLastRender = this.rowsPaintedThisRender;
        this.perf.rowsPainted += rowsPaintedLastRender;
        this.rowsPaintedThisRender = 0;

        if (this.isPerfEnabled()) {
            console.log('[ModernDataGrid][perf] render', {
                render: this.perf.renders,
                filasCargadas: this.state.records.length,
                filasFiltradas: records.length,
                columnasVisibles: visibleColumns.length,
                filasPintadasRenderAnterior: rowsPaintedLastRender,
                ms: +this.perfSince(started).toFixed(2)
            });
        }


        return (
            <div className="modern-data-grid card">
                <DataTable
                    key={`modern-data-grid-${this.state.gridEpoch}`}
                    value={records}
                    {...this.getPaginationProps(displayPagination)}
                    loading={this.state.pendingPage !== null}
                    header={header}
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    rowsPerPageOptions={rowsPerPageOptions}
                    /*
                totalResultCount: number;
                firstPageNumber: number;
                lastPageNumber: number;
                pageSize: number;
                hasNextPage: boolean;
                hasPreviousPage: boolean;
                loadNextPage(loadOnlyNewPage?: boolean): void;
                loadPreviousPage(loadOnlyNewPage?: boolean): void;
                reset(): void;
                setPageSize(pageSize: number): void;
                loadExactPage(pageNumber: number): void;
            }
                    
                    */

                    dataKey="id"
                    selectionMode={selectionMode}
                    selection={this.getSelectedRecordsForTable(records)}
                    onSelectionChange={this.onSelectionChange}
                    filters={filters}
                    onFilter={this.onFilterChange}
                    filterDisplay={filterDisplayType as "menu" | "row"}
                    globalFilterFields={this.getGlobalFilterFields()}
                    emptyMessage={emptyMessage}
                    currentPageReportTemplate={this.getPageReportTemplate()}
                    scrollable
                    scrollHeight="flex"
                    virtualScrollerOptions={VIRTUAL_SCROLLER_OPTIONS}
                    rowClassName={this.rowClassName}
                    className="modern-data-grid-table"
                    style={TABLE_STYLE}

                >
                    <Column selectionMode="multiple" headerStyle={SELECTION_COLUMN_HEADER_STYLE}></Column>
                    {visibleColumns.map((col) => {
                        const columnHeader = this.getColumnHeader(col);

                        return (
                            <Column
                                key={col.name}
                                field={col.name}
                                header={columnHeader}
                                sortable={allowSorting}
                                filter={allowFiltering}
                                filterMatchMode={FilterMatchMode.CONTAINS}
                                filterPlaceholder={formatTemplate(strings.searchByColumn, { column: columnHeader })}
                                showFilterMatchModes
                                showApplyButton={false}
                                style={this.getColumnStyle(col.name)}
                                body={this.getColumnBodyRenderer(col.name)}
                            />
                        );
                    })}
                </DataTable>
            </div>
        );
    }
}

export default DataGrid;