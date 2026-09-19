/**
 * Filtros de columna compilados (los que usa la exportación a Excel para reproducir
 * exactamente lo que muestra la grilla).
 *
 * El modelo de filtros de PrimeReact se recorre una sola vez y se deja resuelto:
 *
 * - el **campo del registro** que se evalúa (en las columnas de fecha, el campo oculto con
 *   la fecha real en milisegundos, porque el valor visible de la celda está formateado),
 * - el **operador** (`and`/`or`) del campo,
 * - y cada restricción **activa** con su predicado ya tomado de `FilterService`.
 *
 * Así el bucle de filas solo evalúa predicados: no reconstruye el modelo ni busca el modo
 * de coincidencia en cada fila (con miles de filas eso se nota).
 */
import { FilterMatchMode, FilterOperator, FilterService } from 'primereact/api';

/** Restricción activa con su predicado resuelto. */
export interface CompiledColumnConstraint {
    /** Predicado de `FilterService` del modo de coincidencia de la restricción. */
    predicate: (value: any, filter: any) => boolean;
    /** Valor con el que se compara (en las fechas, la fecha real en milisegundos). */
    value: any;
}

/** Filtro de columna resuelto. */
export interface CompiledColumnFilter {
    /** Campo del registro que se evalúa. */
    field: string;
    /** Operador del modelo (`and`/`or`). */
    operator: string;
    /** Restricciones activas (con valor): solo filtran las que aparecen aquí. */
    constraints: CompiledColumnConstraint[];
}

/** true si la restricción tiene un valor con el que comparar. */
function isActiveConstraint(constraint: any): boolean {
    return !!constraint && constraint.value !== null && constraint.value !== undefined && constraint.value !== '';
}

/**
 * Compila el modelo de filtros de PrimeReact. `resolveField` traduce la clave del modelo
 * al campo del registro (por ejemplo la fecha real de una columna de fecha).
 */
export function compileColumnFilters(
    filters: any,
    resolveField: (field: string) => string
): CompiledColumnFilter[] {
    const compiled: CompiledColumnFilter[] = [];

    Object.keys(filters || {}).forEach((field) => {
        // El filtro global no es un filtro de columna.
        if (field === 'global') {
            return;
        }

        const filterModel = filters[field];

        if (!filterModel) {
            return;
        }

        const modelConstraints = filterModel.constraints ? filterModel.constraints : [filterModel];
        const constraints: CompiledColumnConstraint[] = [];

        modelConstraints.forEach((constraint: any) => {
            if (!isActiveConstraint(constraint)) {
                return;
            }

            // El mismo motor de filtros que usa PrimeReact. Cuando el modelo no trae
            // `matchMode` se aplica el de la columna (CONTAINS en el DataTable), nunca otro:
            // si no, la exportación no coincidiría con las filas que se ven en la grilla.
            const predicate = (FilterService as any).filters?.[constraint.matchMode || FilterMatchMode.CONTAINS];

            constraints.push({
                // Modo de coincidencia desconocido: la restricción no filtra.
                predicate: typeof predicate === 'function' ? predicate : () => true,
                value: constraint.value
            });
        });

        if (constraints.length) {
            compiled.push({
                field: resolveField(field),
                operator: filterModel.operator,
                constraints
            });
        }
    });

    return compiled;
}

/**
 * true si la fila cumple todos los filtros compilados. Con `or`, la fila se queda con
 * cualquiera de las restricciones activas de ese campo; con `and`, con todas.
 */
export function matchesCompiledFilters(
    record: any,
    compiledFilters: CompiledColumnFilter[],
    readField: (record: any, field: string) => any
): boolean {
    for (let index = 0; index < compiledFilters.length; index++) {
        const filter = compiledFilters[index];
        const value = readField(record, filter.field);
        const matchAny = filter.operator === FilterOperator.OR;
        let matched = !matchAny;

        for (let constraintIndex = 0; constraintIndex < filter.constraints.length; constraintIndex++) {
            const constraint = filter.constraints[constraintIndex];
            const result = !!constraint.predicate(value, constraint.value);

            if (matchAny) {
                if (result) {
                    matched = true;

                    break;
                }
            } else if (!result) {
                matched = false;

                break;
            }
        }

        if (!matched) {
            return false;
        }
    }

    return true;
}

/** true si hay alguna restricción de columna con valor (el filtro global no cuenta). */
export function hasActiveColumnFilters(filters: any): boolean {
    return Object.keys(filters || {}).some((field) => {
        // El filtro de texto global no es un filtro de columna.
        if (field === 'global') {
            return false;
        }

        const filterModel = filters[field];

        if (!filterModel) {
            return false;
        }

        const constraints = filterModel.constraints ? filterModel.constraints : [filterModel];

        return constraints.some(isActiveConstraint);
    });
}
