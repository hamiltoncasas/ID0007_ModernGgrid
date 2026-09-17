/**
 * Etiquetas personalizadas para los encabezados de columna.
 *
 * Formato de la propiedad `ColumnLabels`:
 *
 *   columna=Nombre que verá el usuario, otraColumna=Otro nombre
 *
 * - La coma separa columnas y el **primer** `=` separa el identificador de la etiqueta
 *   (la etiqueta puede contener `:`, `|` y espacios, incluso `(€)`).
 * - La columna se identifica por nombre lógico, alias o nombre para mostrar.
 * - Una etiqueta vacía (`columna=`) deja el nombre que trae el dataset.
 * - Columnas inexistentes se ignoran con un aviso en la consola.
 */
import { normalizeText } from './Utils';

export interface LabeledColumn {
    name: string;
    alias?: string;
    displayName: string;
}

function findColumn(token: string, columns: LabeledColumn[]): LabeledColumn | null {
    const wanted = normalizeText(token);
    const column = columns.find((candidate) =>
        [candidate.name, candidate.alias, candidate.displayName]
            .filter(Boolean)
            .some((identifier) => normalizeText(identifier as string) === wanted)
    );

    return column || null;
}

/** Mapa `{ nombre lógico de la columna -> etiqueta }` para las columnas del dataset. */
export function resolveColumnLabels(raw: string, columns: LabeledColumn[]): Record<string, string> {
    const labels: Record<string, string> = {};

    if (!raw) {
        return labels;
    }

    raw.split(',').forEach((entry) => {
        const separatorIndex = entry.indexOf('=');

        if (separatorIndex === -1) {
            if (entry.trim()) {
                console.warn(`ColumnLabels: entrada no válida "${entry.trim()}" (se espera columna=Etiqueta).`);
            }

            return;
        }

        const token = entry.substring(0, separatorIndex).trim();
        const label = entry.substring(separatorIndex + 1).trim();
        const column = findColumn(token, columns);

        if (!column) {
            console.warn(`ColumnLabels: la columna "${token}" no existe en el dataset.`);

            return;
        }

        if (!label) {
            return;
        }

        labels[column.name] = label;
    });

    return labels;
}
