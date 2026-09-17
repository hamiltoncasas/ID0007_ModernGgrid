import React, { Component } from 'react';
import { FilterMatchMode, FilterOperator, FilterService } from 'primereact/api';
import { DataTable } from 'primereact/datatable';
import isEqual from 'lodash.isequal';
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
    private pendingTimeout: NodeJS.Timeout | null = null;
    private rowColorStyleElement: HTMLStyleElement | null = null;
    /** Tope de filas que se cargan automáticamente para poder paginar y filtrar en cliente. */
    private static readonly maxAutoLoadedRows = 2000;
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
        console.log(this.props.context)

        if (this.props.context.parameters.DataSource && !this.props.context.parameters.DataSource.loading) {
            this.mapRecordsToState();
        } else {
            console.log("Data source not ready at mount.");
        }
        this.saveCurrentParametersToState();
        this.checkAndStartInterval();
        this.syncRowColorStyles();
        this.ensureMoreRowsLoaded();
        this.forceRefreshDataset();

    }

    componentWillUnmount() {
        this.clearRefreshInterval();
        this.clearRowColorStyles();
        this.clearPendingTimeout();
    }

    /** Libera el temporizador de la página pendiente. */
    clearPendingTimeout(): void {
        if (this.pendingTimeout) {
            clearTimeout(this.pendingTimeout);
            this.pendingTimeout = null;
        }
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
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
        }).format(value);
    }

    formatDecimal(value: any, decimalPlaces: number): string {
        return new Intl.NumberFormat("en-US", {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
        }).format(value);
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
      console.log("map to state")
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

        const records = dataSet.sortedRecordIds.map((recordId) => {
            const record = dataSet.records[recordId];
            if (!record) {
                //console.log(`Record ID ${recordId} not found in dataSet.records.`);
                return null;
            }
            console.log("preproceed record", record)
            const processedRecord = {
                id: recordId,
                ...dataSet.columns.reduce((rec: Record<string, any>, col) => {
                    const value = record.getValue(col.alias);
                    const colType = col.dataType;
                    // Configuración propia de esta columna (por nombre, alias o nombre para mostrar).
                    const columnConfig = this.getColumnConfiguration(fieldConfig, col);
                    //Decimal SingleLine.Text
                    try {
                        // Use the typeHandlers map to process the column type
                        rec[col.name] = typeHandlers[colType]
                          ? typeHandlers[colType](value, columnConfig, context)
                          : value; // Default case for unsupported data types
                          console.log("Type handler",typeHandlers[colType])
                      } catch (error) {
                        console.error(`Error processing column "${col.name}" of type "${colType}":`, error);
                        rec[col.name] = value; // Fallback to raw value
                      }
                      return rec;
                }, {}),
            };

            console.log('Processed record:', processedRecord);
            return processedRecord;
        }).filter(Boolean);

        //console.log('Final mapped records:', records);
        //console.log('Columns:', dataSet.columns);

        this.setState(prevState => {
            const isRecordsChanged = !isEqual(prevState.records, records);
            const isColumnsChanged = !isEqual(prevState.columns, dataSet.columns);

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

        if (!dataSet || dataSet.loading) {
            //console.log('DataSet is invalid or still loading. Skipping update.');
            return;
        }

        // Trae de la fuente las páginas que falten para poder paginar/filtrar en cliente.
        this.ensureMoreRowsLoaded();

        // Si había una página pendiente y ya hay filas para mostrarla, se mueve la vista.
        this.applyPendingPage();

        const dataSourceChanged = prevProps.context.parameters.DataSource !== this.props.context.parameters.DataSource;
        const sortedRecordIdsChanged =
            JSON.stringify(prevProps.context.parameters.DataSource.sortedRecordIds) !== JSON.stringify(dataSet.sortedRecordIds);

        if (sortedRecordIdsChanged) {
            this.logPaginationInfo();
            // Llegaron filas nuevas: se vuelve a permitir ofrecer una página extra.
            this.extraPageDismissed = false;
        }

        const filtersChanged = JSON.stringify(prevState.filters) !== JSON.stringify(this.state.filters);
        const prevFieldConfigurations = prevProps.context.parameters.FieldConfigurations?.raw || "";
    const currentFieldConfigurations = this.props.context.parameters.FieldConfigurations?.raw || "";
    
        const fieldConfigurationsChanged = prevFieldConfigurations !== currentFieldConfigurations;


        if (dataSourceChanged || sortedRecordIdsChanged || filtersChanged || fieldConfigurationsChanged) {
            console.log("Changes detected in DataSource, records, filters, or FieldConfigurations. Updating state.");
            this.mapRecordsToState();
            this.forceRefreshDataset();
            //this.setState({ previousFieldConfigurations: currentFieldConfigurations });
        }

        if (!this.areColumnsEqual(prevState.columns, dataSet.columns)) {
            //console.log('Columns have changed. Updating filters.');
            const newFilters = this.updateFilters(dataSet.columns, prevState.filters);

            if (JSON.stringify(prevState.filters) !== JSON.stringify(newFilters)) {
                //console.log('Filters have changed. Updating state.');
                this.setState({ filters: newFilters, needsRefresh: true });
                this.forceRefreshDataset();
            }
        }

        if (prevState.needsRefresh !== this.state.needsRefresh) {
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

        console.log("component udpated")
        console.log(this.props.context.parameters.DataSource.columns)
        console.log(this.props.context.parameters.DataSource)
        const parameterKeys: (keyof IInputs)[] = Object.keys(nextProps.context.parameters) as (keyof IInputs)[];
        const needsRefresh = nextState.needsRefresh;
        if (needsRefresh) {
            this.props.context.parameters.DataSource.refresh();
        }
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

        if (JSON.stringify(this.state.filters) !== JSON.stringify(nextState.filters)) {
            //console.log("Filters have changed. Component should update.");
            return true;
        }

        if (JSON.stringify(this.state.selectedColumns) !== JSON.stringify(nextState.selectedColumns)) {
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

    onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        this.setState({
            globalFilterValue: value,
            filters: {
                ...this.state.filters,
                global: { value, matchMode: FilterMatchMode.CONTAINS }
            }
        }, () => {
            this.forceUpdate();
        });
    };

    refreshData = () => {
        const dataSet = this.props.context.parameters.DataSource;

        // Volver a la primera página y limpiar la selección (local y en el dataset).
        if (typeof dataSet.clearSelectedRecordIds === 'function') {
            dataSet.clearSelectedRecordIds();
        }
        dataSet.paging.reset();
        this.autoLoadFrom = -1;
        this.extraPageDismissed = false;
        this.clearPendingTimeout();
        this.setState(
            {
                gridEpoch: this.state.gridEpoch + 1,
                currentPage: 1,
                pendingPage: null,
                selectedRecordIds: [],
                selectedRecords: []
            },
            () => this.forceUpdate()
        );

        // Pedir de nuevo los datos a la fuente de origen y repintar cuando responda.
        dataSet.refresh();
        this.props.notifyOutputChanged();
        this.forceRefreshDataset();
    };

    getInitialColumnNames(): string[] {
        return (this.props.context.parameters.InitialColumns?.raw || '')
            .split(',')
            .map((column) => normalizeText(column))
            .filter(Boolean);
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
        const requestedColumns = this.getInitialColumnNames();
        if (!requestedColumns.length) return columns;

        const labels = this.getColumnLabels();

        return columns.filter((column) =>
            [column.name, column.alias, column.displayName, labels[column.name]]
                .filter(Boolean)
                .some((name) => requestedColumns.includes(normalizeText(String(name))))
        );
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

        return baseColumns.filter((column) => selectedColumns.includes(column.name));
    }

    getFilteredRecords(records: any[]): any[] {
        const searchTerm = this.state.globalFilterValue.trim().toLowerCase();
        if (!searchTerm) return records;

        return records.filter((record) =>
            this.state.columns.some((column) =>
                String(record[column.name] ?? '').toLowerCase().includes(searchTerm)
            )
        );
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
        }, () => {
            this.forceUpdate();
        });
    };

    onColumnSelectionChange = (event: any) => {
        const value = Array.isArray(event?.value) ? (event.value as string[]) : [];
        this.setState({ selectedColumns: value });
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
        return this.getFilteredRecords(this.state.records).filter((record) => this.matchesColumnFilters(record));
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
        const matchMode = constraint.matchMode || FilterMatchMode.STARTS_WITH;
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

        exportRowsToExcel({
            fileName: `${this.getExportFileName()}_${this.getExportFileStamp()}`,
            sheetName: this.getStrings().exportSheetName,
            columns,
            rows: this.getRecordsForExport()
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

    /** Configuración de colores de fila compilada (se recompila si cambia el texto o las columnas). */
    getRowColors(): CompiledRowColors {
        const raw = this.props.context.parameters.RowColorRules?.raw || '';
        const labels = this.getColumnLabels();
        const columns = (this.props.context.parameters.DataSource.columns || []).map((column) => ({
            name: column.name,
            alias: column.alias,
            displayName: column.displayName,
            label: labels[column.name]
        }));
        const key = `${raw}|${columns.map((column) => `${column.name}:${column.displayName}:${column.label || ''}`).join(',')}`;

        if (!this.rowColorsCache || this.rowColorsCache.key !== key) {
            this.rowColorsCache = { key, compiled: compileRowColors(raw, columns) };
        }

        return this.rowColorsCache.compiled;
    }

    /** Clase de color de la fila según RowColorRules (cadena vacía si no aplica). */
    getRowClassName(record: Record<string, any>): string {
        return this.getRowColors().classNameFor(record);
    }

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
                            <InputText value={this.state.globalFilterValue} onChange={this.onGlobalFilterChange} placeholder={strings.keywordSearch} />
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

    forceRefreshDataset = () => {
        setTimeout(() => {
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

        return {
            paginator,
            rows: pageSize,
            totalRecords: loadedRows + extraPage,
            first: (this.state.currentPage - 1) * pageSize,
            onPage: this.onPageChange
        };
    }

    /** Navegación del pie: mueve la vista o pide a la fuente las filas que falten. */
    onPageChange = (event: any) => {
        const rows = event.rows || 0;
        const targetPage = (event.page === undefined ? 0 : event.page) + 1;
        const pageSize = this.getPageSize();

        // Cambio de filas por página: se vuelve a la primera página.
        if (rows > 0 && rows !== pageSize) {
            const paging = this.props.context.parameters.DataSource?.paging;

            if (paging && typeof paging.setPageSize === 'function') {
                paging.setPageSize(rows);
                paging.reset();
            }

            this.autoLoadFrom = -1;
            this.extraPageDismissed = false;
            this.setState({ pageSizeOverride: rows, currentPage: 1, pendingPage: null }, () => {
                this.ensureMoreRowsLoaded();
                this.forceUpdate();
            });

            return;
        }

        if (targetPage === this.state.currentPage) {
            this.forceUpdate();

            return;
        }

        // Página ya cargada: la vista se mueve al instante.
        if (targetPage <= this.getLoadedPageCount()) {
            this.setState({ currentPage: targetPage }, () => this.forceUpdate());

            return;
        }

        // Página más allá de lo cargado: se piden más filas a la fuente.
        this.setState({ pendingPage: targetPage }, () => this.forceUpdate());
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
                this.setState({ pendingPage: null }, () => this.forceUpdate());
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

            this.setState({ currentPage: pendingPage, pendingPage: null }, () => this.forceUpdate());

            return;
        }

        // Todavía faltan filas: se sigue pidiendo mientras la fuente tenga más.
        if (this.hasMoreRowsInSource()) {
            this.ensureMoreRowsLoaded();
        }
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

        if (!force && !paging.hasNextPage) {
            return;
        }

        const loadedRows = dataSet.sortedRecordIds ? dataSet.sortedRecordIds.length : 0;

        // El tope solo frena la carga automática: si el usuario pide otra página, se intenta.
        if (!force && loadedRows >= DataGrid.maxAutoLoadedRows) {
            return;
        }

        if (loadedRows === this.autoLoadFrom) {
            return;
        }

        this.autoLoadFrom = loadedRows;
        paging.loadNextPage();
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
            hasNextPage: paging?.hasNextPage
        });
    }

    /** Limpia el buscador global y todos los filtros de columna. */
    clearFilters = () => {
        const columns = this.props.context.parameters.DataSource.columns || [];
        const clearedFilters = columns.reduce((acc: any, column) => {
            acc[column.name] = {
                operator: FilterOperator.AND,
                constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }]
            };

            return acc;
        }, {});

        this.setState(
            {
                filters: clearedFilters,
                globalFilterValue: '',
                gridEpoch: this.state.gridEpoch + 1,
                currentPage: 1,
                pendingPage: null
            },
            () => this.forceUpdate()
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
        const strings = this.getStrings();
        const { selectedRecordIds } = this.state;
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
        const rowsPerPageOptions = [5, 15, 25];
        const visibleColumns = this.getVisibleColumns();

        const onRenderItemColumn = (
            item?: Record<string, any>,
            index?: number,
            column?: IColumn,
        ) => {
            //console.log("Rendering item column:");
            //console.log("Item:", item);
            //console.log("Index:", item?.id);
            //console.log("Column:", column);

            if (column && column.fieldName && item) {
                const value = item[column.fieldName];
                //console.log(`Value for field '${column.fieldName}':`, value);

                if (value && typeof value === 'object' && value.toString) {
                    //console.log("Value is an object, using toString():", value.toString());
                    return value.toString();
                }

                if (value == null) {
                    //console.log(`Value for field '${column.fieldName}' is null or undefined.`);
                }

                return value ?? '';
            }

            //console.log("Returning null for the column render.");
            return null;
        };

        type IColumn = {
            fieldName: string;
        };


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
                    selection={records.filter(record => selectedRecordIds.includes(record.id))}
                    onSelectionChange={this.onSelectionChange}
                    filters={filters}
                    onFilter={(event: any) => this.setState({ filters: event.filters })}
                    filterDisplay={filterDisplayType as "menu" | "row"}
                    globalFilterFields={this.state.columns.map(col => col.name)}
                    emptyMessage={emptyMessage}
                    currentPageReportTemplate={formatTemplate(strings.pageReport, { filtered: String(this.getFilteredRecordCount()) })}
                    scrollable
                    scrollHeight="flex"
                    rowClassName={(row: any) => this.getRowClassName(row)}
                    className="modern-data-grid-table"
                    style={{ width: '100%', minWidth: '0' }}

                >
                    <Column selectionMode="multiple" headerStyle={{ width: '3rem' }}></Column>
                    {visibleColumns.map((col, index) => (
                        <Column
                            key={index}
                            field={col.name}
                            header={this.getColumnHeader(col)}
                            sortable={allowSorting}
                            filter={allowFiltering}
                            filterMatchMode={FilterMatchMode.CONTAINS}
                            filterPlaceholder={formatTemplate(strings.searchByColumn, { column: this.getColumnHeader(col) })}
                            showFilterMatchModes
                            showApplyButton={false}
                            style={{ minWidth: '12rem' }}
                            body={(item) => onRenderItemColumn(item, undefined, { fieldName: col.name } as IColumn)}
                        />
                    ))}
                </DataTable>
            </div>
        );
    }
}

export default DataGrid;