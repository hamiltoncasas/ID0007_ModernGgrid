# Modern Data Grid (PCF) — Documentación

Control de código (Power Apps Component Framework) que muestra un dataset de Dataverse en una grilla moderna con React y PrimeReact, pensada para **Canvas Apps** y **formularios model-driven**.

---

## 1. Identidad y versiones

| Elemento | Valor |
|---|---|
| Nombre de la solución | `ID0007_ModernGrid` (nombre para mostrar `ID0007`) |
| Publicador / prefijo | `ID0007` |
| Versión de la solución | `1.0.0.32` |
| Control | `ID0007.ModernDataGrid` (constructor `ModernDataGrid`) |
| Versión del control (manifest) | `0.0.45` |
| Namespace | `ID0007` — **nunca** volver a `GUK` (ya existe `GUK.ModernDataGrid` de otro publicador y la importación falla) |

> La versión del manifest (`0.0.45`) y la versión de la solución (`1.0.0.32`) son independientes. Para que Dataverse **actualice** la solución ya instalada, la versión de la solución debe ser mayor que la importada.

## 2. Requisitos

1. Entorno de Power Platform con Dataverse.
2. Para Canvas Apps: en el **Centro de administración de Power Platform** → Entornos → Configuración → Producto → Características → habilitar *"Allow publishing of canvas apps with code components"* (permitir la publicación de aplicaciones de lienzo con componentes de código).
3. Una tabla/origen de datos al que apuntar el control (se alimenta por el *dataset* `DataSource`).

## 3. Instalación

Los paquetes se generan en:

```text
Solution\ModernDataGrid\bin\Release\ModernDataGrid_managed.zip     (gestionada)
Solution\ModernDataGrid\bin\Release\ModernDataGrid.zip             (no gestionada)
```

1. Power Apps Maker → **Soluciones** → **Importar solución** → seleccionar el ZIP.
2. Usar **solo** el ZIP recién generado (no descargas antiguas) y el **managed** para producción.
3. Si ya tenías la versión anterior, la importación la actualiza siempre que la versión sea mayor.
4. Tras importar, **cierra y vuelve a abrir** la app de lienzo para que el navegador descargue el nuevo `bundle.js` (si ves el comportamiento anterior, es caché).

## 4. Uso en la aplicación

**Canvas App**: Insertar → Componentes → **Code components** → `ModernDataGrid`.
**Model-driven**: añadir el control a una columna de la vista/formulario y enlazar el *dataset*.

Luego, en las propiedades del control:

| Propiedad de la app | Valor |
|---|---|
| `Items` / origen del dataset | la tabla o colección a mostrar |
| `Default Rows` | mayor que `0` (si no, no hay paginación real) |
| `IsEnabled` | `true` para permitir la selección de registros |

## 4.1 Cómo configurar las propiedades (paso a paso)

**Canvas App**

1. Selecciona el control **ModernDataGrid** en el lienzo.
2. Abre el **panel de propiedades** de la derecha (o el panel avanzado, que lista las propiedades del componente).
3. Localiza la propiedad por su nombre (por ejemplo **Column Labels**) y escribe el valor en su caja.
4. También puedes hacerlo desde la barra de fórmulas de la app:

```text
ModernDataGrid1.ColumnLabels = "nombre=Nombre completo, importe=Importe (€)"
```

5. Si acabas de importar una versión nueva del componente, **cierra y vuelve a abrir** la app (caché del navegador).

> En Power Apps, si el texto contiene comillas dobles (`"`), duplícalas (`""`). Acentos, `€`, `(`, `)`, `:`, `|` y apóstrofos funcionan sin problema.

**Formulario model-driven**

1. Edita el formulario y selecciona el control.
2. En **Propiedades** del control, rellena el campo de la propiedad (por ejemplo *Column Labels*).
3. Guarda y publica.

## 4.2 Cómo identificar una columna

- **En Dataverse**: Tablas → tu tabla → *Columnas*: **Name** es el nombre lógico (`cuentas_pk`) y **Display name** el nombre visible (`Cuenta`). Cualquiera de los dos sirve.
- **En la app**: el nombre que ya ves en la grilla es el *Display name* del dataset, así que puedes copiarlo tal cual.
- **Mayúsculas y acentos no importan** (`IMPORTE` = `importe` = `Importé`).
- Los **espacios internos** sí cuentan (`Campo A` ≠ `CampoA`); los del principio y el final se ignoran.

## 5. Propiedades

| Propiedad | Tipo | Default (manifest) | Si queda vacía | Descripción |
|---|---|---|---|---|
| `DisplayHeader` | TwoOptions | `true` | `false` | Muestra la barra superior con buscador, selector de columnas y botones. **Debe estar en `true` para ver esa barra** |
| `HeaderText` | Texto | — | nombre de la entidad | Título de la grilla |
| `DisplaySearch` | TwoOptions | — | `false` | Muestra el buscador global (palabra clave) |
| `DisplayPagination` | TwoOptions | `false` | `true` | Muestra el paginador con selector de filas por página |
| `EmptyMessage` | Texto | `No records found` | mensaje del idioma activo | Texto cuando no hay registros |
| `SelectionMode` | Texto | `multiple` | `multiple` | `multiple` o `checkbox` |
| `AllowSorting` | TwoOptions | — | `false` | Permite ordenar por columna |
| `AllowFiltering` | TwoOptions | — | `false` | Muestra el icono de filtro (embudo) en cada columna |
| `IsEnabled` | TwoOptions | `true` | `true` | Habilita la grilla (afecta a la selección) |
| `FieldConfigurations` | TextArea | ejemplo de moneda/fecha/decimal/booleano | — | Formato de valores **por columna** (ver §5.1 y §8.2) |
| `DateFormat` | Enum (36 opciones) | `default` | `default` | Formato **global** de fecha / fecha y hora / hora para las columnas de fecha (ver §5.1 y §8.3) |
| `InitialColumns` | TextArea | vacío | todas | Columnas iniciales, separadas por comas: **nombre, alias o nombre para mostrar**. Vacío = todas |
| `ColumnLabels` | TextArea | vacío | nombres del dataset | Nombres que verá el usuario final para cada columna: `columna=Nombre visible` (ver §5.1 y §8.5) |
| `Language` | Enum (`en` \| `es`) | `en` | `en` | Idioma de todos los textos del control |
| `RowColorRules` | TextArea | vacío | sin colores | Colorea el registro completo según el valor de una columna (ver §7.8) |

> En Canvas, el valor que pongas en la app siempre manda; el *default* del manifest se usa al insertar el control y en escenarios model-driven.

## 5.1 Propiedades en detalle

### `DisplayHeader` — TwoOptions · default `true`
Muestra u oculta la **barra superior**. Si está en `false`, desaparecen de la vista el buscador global, el selector de columnas, el botón de refrescar y el de exportar (la grilla sigue funcionando).
```text
true
```

### `HeaderText` — Texto · default vacío
Título que se muestra a la izquierda de la barra. Si lo dejas vacío se usa el nombre de la entidad del dataset. También se utiliza como **nombre base del archivo Excel** exportado.
```text
Cuentas por cobrar 2026
```

### `DisplaySearch` — TwoOptions · default vacío (equivale a `false`)
Muestra el **buscador global** por palabra clave. Filtra sobre el valor ya formateado de todas las columnas y se combina (AND) con los filtros de columna.
```text
true
```

### `DisplayPagination` — TwoOptions · default `false` en manifest (`true` si no se define)
Muestra el paginador con navegación por páginas, selector de filas por página y el texto *Mostrando X a Y registros · Filtrados: Z*.
```text
true
```

### `EmptyMessage` — Texto · default `No records found`
Mensaje que se muestra cuando no hay registros. Si lo dejas vacío, se usa el del idioma activo (`No se encontraron registros.` en español).
```text
No hay cuentas para mostrar
```

### `SelectionMode` — Texto · default `multiple`
Modo de selección de registros: `multiple` (fila completa) o `checkbox` (casilla). Cualquier otro valor cae a `multiple`.
```text
checkbox
```

### `AllowSorting` — TwoOptions · default vacío (equivale a `false`)
Permite ordenar haciendo clic en el encabezado de cada columna (ascendente/descendente).
```text
true
```

### `AllowFiltering` — TwoOptions · default vacío (equivale a `false`)
Muestra el **icono de embudo** en cada columna; al pulsarlo se abre el panel de filtro con el campo de búsqueda y la coincidencia **Contenga** por defecto.
```text
true
```

### `IsEnabled` — TwoOptions · default `true`
Habilita la interacción del control. Con `false` no se permite seleccionar registros.
```text
true
```

### `FieldConfigurations` — TextArea · default ejemplo de moneda/fecha/decimal/booleano
Formato de valores **columna a columna**, identificando la columna por **nombre, alias o nombre para mostrar** (sin distinguir mayúsculas ni acentos).
```text
Importe=currency:EUR, Cantidad=decimalPlaces:3, Activo=trueLabel:Sí|falseLabel:No, Fecha=dateFormat:dd/MM/yyyy HH:mm
```
Claves: `currency`, `dateFormat`, `decimalPlaces`, `trueLabel`, `falseLabel` (detalle en §8.2). Si una columna no aparece, se usan los valores por defecto.

### `DateFormat` — Enum (36 opciones) · default `default`
Formato **global** aplicado a todas las columnas de fecha y fecha/hora. La opción `Predeterminado (según el tipo de dato)` deja los formatos actuales (`yyyy-MM-dd` para solo fecha y `yyyy-MM-dd HH:mm:ss` para fecha y hora). Incluye 16 formatos de fecha, 14 de fecha y hora y 5 de hora (lista completa en §8.3). Si una columna define `dateFormat` en `FieldConfigurations`, **esa columna gana** sobre este valor global.
```text
dd/MM/yyyy HH:mm
```

### `InitialColumns` — TextArea · default vacío
Columnas que se muestran al cargar, separadas por comas (nombre, alias o nombre para mostrar). Vacío = todas. Define además el conjunto inicial del que parte el selector de columnas del usuario final.
```text
nombre, Importe, Fecha
```

### `ColumnLabels` — TextArea · default vacío
Nombres que verá el **usuario final** para cada columna. La columna se identifica por nombre lógico, alias o nombre para mostrar.
```text
nombre=Nombre completo, importe=Importe (€), cuentas_pk=Cuenta
```
Vacío = se usan los nombres del dataset. Detalle completo en §8.5.

### `Language` — Enum (`en`/`es`) · default `en`
Idioma de **todos** los textos del control, incluidos los internos de la grilla (panel de filtro, paginador, selector de columnas) y el nombre de la hoja del Excel.
```text
Español
```

### `RowColorRules` — TextArea · default vacío
Colorea el **registro completo** según el valor de una o varias columnas (detalle y gramática en §7.8).
```text
estado=Activo:#DFF6DD|Pendiente:#FFF4CE, prioridad=~alta:#FDE7E9
```

## 5.2 Ejemplos de configuración listos para copiar

### A. Grilla financiera en español con semáforo por estado

| Propiedad | Valor |
|---|---|
| `Language` | `es` |
| `DisplayHeader` / `DisplaySearch` / `DisplayPagination` | `true` |
| `AllowSorting` / `AllowFiltering` | `true` |
| `InitialColumns` | `cliente, importe, vencimiento, estado, responsable` |
| `DateFormat` | `dd_MM_yyyy` |
| `FieldConfigurations` | `importe=currency:EUR, estado=trueLabel:Vigente\|falseLabel:Vencido` |
| `RowColorRules` | `estado=~vigente:#C6EFCE\|~vencido:#FDE7E9:#A80000, responsable=*:#F5F5F5` |
| `ColumnLabels` | `cliente=Cliente, importe=Importe (€), vencimiento=Vence el, estado=Situación` |

### B. Agenda de citas con fecha y hora

| Propiedad | Valor |
|---|---|
| `Language` | `es` |
| `DateFormat` | `dd_MM_yyyy_HH_mm` |
| `AllowSorting` | `true` |
| `EmptyMessage` | `No hay citas para mostrar` |
| `SelectionMode` | `checkbox` |
| `RowColorRules` | `estado=~confirmada:#C6EFCE\|~cancelada:#FDE7E9` |

### C. Catálogo largo con muchas columnas

| Propiedad | Valor |
|---|---|
| `Language` | `en` |
| `DisplaySearch` | `true` |
| `InitialColumns` | `sku, nombre, precio, stock` |
| `FieldConfigurations` | `precio=currency:USD, stock=decimalPlaces:0` |
| `RowColorRules` | `stock=0:#FDE7E9\|*:#F5F5F5` |

### D. Consulta de solo lectura

| Propiedad | Valor |
|---|---|
| `IsEnabled` | `false` |
| `DisplayPagination` / `AllowFiltering` | `true` |
| `AllowSorting` | `true` |
| `RowColorRules` | *(vacío)* |

## 6. Funcionalidades

- Buscador global por palabra clave sobre todas las columnas cargadas.
- Filtro **Contiene** por columna (panel desplegable con el campo de búsqueda).
- Ordenamiento por columna.
- Paginación contra el *paging* del dataset + selector de filas por página y botón de refresco.
- Selección de registros (múltiple o con checkbox) sincronizada con el dataset.
- **Selector de columnas para el usuario final** (mostrar/ocultar columnas en tiempo de ejecución).
- **Botón para limpiar todos los filtros** (buscador global + filtros de columna) de un clic.
- **Exportación a Excel (.xlsx real)** de lo que está filtrado.
- **Coloreado del registro completo** según el valor de una columna.
- Idiomas **español / inglés** para todos los textos (incluidos los internos de la grilla).
- **Nombres de columna personalizados**: el programador define con `ColumnLabels` cómo se llama cada columna para el usuario final (encabezado, Excel, filtro y selector).
- Formato de valores por tipo de dato (moneda, fecha, decimal, sí/no, teléfono, URL), configurable **por columna** y con un **combo global de 36 formatos de fecha** (fecha, fecha y hora y hora).
- Scroll horizontal y vertical contenido en el tamaño del control (sin desbordar la página).

## 7. Detalle de funcionalidades

### 7.1 Buscador global
Se muestra si `DisplaySearch = true` (dentro de la barra, que requiere `DisplayHeader = true`). Filtra en vivo, ignorando mayúsculas y **acentos**, sobre el valor ya formateado de **todas** las columnas de los registros cargados. Se combina (AND) con los filtros por columna.

### 7.2 Filtros por columna (Contiene)
Con `AllowFiltering = true` cada columna muestra el **icono de embudo**; al pulsarlo se despliega un panel con:
- selector de coincidencia (**Contenga** por defecto, más *Comience con*, *Termine con*, *Igual a*, etc.),
- el campo de búsqueda,
- y los botones **Limpiar** / **Aplicar**.

Escribe y filtra **mientras escribes** (con un pequeño retardo), y acepta `Enter`. El embudo se resalta cuando la columna tiene un filtro activo. Los textos del panel salen del idioma activo (*Contenga*, *Aplicar*, *Limpiar*…). Para quitarlos **todos** de golpe está el botón *Limpiar filtros* de la barra (§7.12).

### 7.3 Ordenamiento
Con `AllowSorting = true` se puede ordenar por cada columna (ascendente/descendente) sobre las filas cargadas.

### 7.4 Paginación y refresco
El pie funciona con **dos capas**, de modo que siempre se puede llegar a los registros que existen aunque no estén cargados todavía:

1. **Navegación inmediata sobre lo cargado**: el pie mueve la vista entre las páginas que ya están en la grilla sin consultar la fuente.
2. **Páginas que faltan**: mientras la fuente tenga más filas (`hasNextPage`, o un total mayor que lo cargado), el pie muestra **una página extra**. Al pedirla, el control trae de la fuente las filas necesarias y, cuando llegan, salta a esa página.

La vista **nunca** se mueve a una página sin filas: si avanzas y todavía no hay datos, la grilla muestra su indicador de carga y se queda donde está hasta que la fuente responde (si no responde en unos segundos, se libera el aviso y se avisa por consola). Así el pie responde en cualquier host —con o sin paginación real en el dataset, con `totalResultCount` conocido o `-1`— y **nunca deja la tabla vacía**.

Además, para que haya filas que paginar, el control **trae de la fuente todos los registros disponibles** con dos mecanismos:

1. **Una sola página grande**: al abrir el control, al pulsar *Actualizar* y al pulsar *Limpiar filtros* se pide a `Items` una página del tamaño del tope (**10000 filas**), de modo que **también llega la última página incompleta** (con 113 registros y `Default Rows = 25` se cargan los 113 y el pie muestra 5 páginas). El pie sigue paginando **en pantalla** con el tamaño que definió la app (`Default Rows`). En la consola aparece `[ModernDataGrid] pidiendo toda la fuente`.
2. **Carga página a página** (si el host ignora el tamaño grande): se piden páginas con `loadNextPage()` mientras la fuente indique que hay más (`hasNextPage`, un total mayor que lo cargado o una última página completa), **reintentando hasta 3 veces** antes de darla por agotada.

Cuando termina, el pie, el buscador, los filtros, los colores de fila y el Excel trabajan sobre **todos** los registros cargados.

Consecuencia práctica: **sin filtros aplicados**, la cantidad que muestra el pie (*Filtrados: N*) es el **total de registros de la fuente** (los que se pudieron cargar), y *Mostrando X a Y* recorre ese total con la navegación por páginas.

- **Filas por página**: el tamaño de página del dataset (`Default Rows`) o **25** si no lo informa; el usuario puede cambiarlo con el desplegable del pie. El cambio es **solo del paginado en pantalla**: la fuente y las filas cargadas no se tocan y se vuelve a la página 1.
- El pie es **independiente de `totalResultCount`**: si llega `-1` no pasa nada.
- Si la fuente no informa el total y la última página está completa, se ofrece igualmente **una página extra** por si quedan registros. Al pedirla, el control consulta la fuente **aunque el dataset diga que no hay más páginas**; si no entrega nada en unos segundos, deja de ofrecerse (y lo indica en la consola).
- El botón de **refrescar** (icono circular) vuelve a la primera página, **limpia la selección** (local y en el dataset), **vuelve a pedir los datos a `Items`** (`refresh()`) y **recarga todos los registros**; la grilla se repinta con los datos nuevos (antes podía quedarse mostrando las filas anteriores).
- **Limpiar filtros** (§7.12) quita el buscador y **todos** los filtros de columna, vuelve a la página 1 y **deja el control como recién cargado** (vuelve a pedir la fuente completa).
- **Diagnóstico**: en la consola del navegador aparece `[ModernDataGrid] paginación { filasCargadas, filasFiltradas, filasPorPagina, paginas, totalResultCount, hasNextPage, paginaFuente }` cada vez que cambian las filas cargadas.

El texto del paginador muestra el rango visible y la **cantidad filtrada** (registros que cumplen el buscador global y los filtros de columna):

```text
Mostrando 51 a 54 registros · Filtrados: 54
```

El **total de la tabla en la base de datos no se muestra**.

### 7.5 Selección de registros
`SelectionMode`: `multiple` o `checkbox`. La selección se publica en el dataset (`setSelectedRecordIds`), de modo que la app puede leerla. Con `IsEnabled = false` no se permite seleccionar.

### 7.6 Selector de columnas (usuario final)
En la barra hay un desplegable que lista **las columnas disponibles** para que el usuario final las marque o desmarque en tiempo de ejecución (por ejemplo, para no ver una columna que no necesita). El disparador **no muestra texto ni etiquetas** (solo su icono), para que la barra no se desborde. `InitialColumns` define la lista inicial disponible; vacío = todas las columnas del dataset. La selección del usuario no modifica el dataset, solo lo que se pinta (y lo que se exporta).

### 7.7 Exportar a Excel
Botón con el icono de Excel en la barra. Genera un archivo **`.xlsx` real** (Office Open XML) sin librerías externas, con:

- **Solo las filas que se ven**: aplica exactamente el mismo criterio que la grilla (buscador global + filtros por columna, con el mismo motor de comparación y el mismo modo de coincidencia de la columna) sobre los registros cargados. Si la vista muestra 23 resultados, el archivo trae esos **23**.
- **Solo las columnas visibles** según el selector de columnas / `InitialColumns` (y con sus etiquetas de `ColumnLabels`).
- Encabezados con el nombre para mostrar y en negrita, ancho de columna automático.
- Los valores tal como se ven en la grilla (ya formateados).
- Nombre de archivo: `HeaderText` (o el nombre de la entidad) + marca de fecha/hora. Hoja: `Datos` en español, `Data` en inglés.
- En la consola aparece `[ModernDataGrid] exportando a Excel { columnas, filas, filasCargadas }` para comprobar qué se está guardando.

> El alcance es lo que está **cargado** en el control (todas las páginas ya cargadas que cumplan los filtros), no la tabla completa de Dataverse sin paginar. Para más filas, amplía `Default Rows` en la app.

### 7.8 Coloreado de registros (`RowColorRules`)
Colorea **la fila completa** según el valor de una o varias columnas:

```text
estado=Activo:#DFF6DD|Pendiente:#FFF4CE|Bloqueado:#FDE7E9:#A80000, prioridad=~alta:#FDE7E9
```

- `,` separa columnas · `|` separa reglas de la misma columna · `:` separa valor, color de fondo y color de texto (opcional).
- `~valor` → **contiene**; `*` → cualquier valor (ponlo al final para que haga de respaldo).
- Colores admitidos: `#RGB`, `#RRGGBB`, `rgb()/rgba()/hsl()/hsla()` o nombre CSS (`lightgreen`).
- La columna se identifica por **nombre, alias o nombre para mostrar**.
- La comparación ignora mayúsculas, espacios y acentos. Si coinciden varias reglas, gana **la primera** escrita.
- Las filas coloreadas mantienen su color al pasar el ratón (un 6 % más oscuro) y al seleccionarlas (conservan el color y añaden un borde interior azul).
- Columnas inexistentes o colores inválidos se ignoran con un aviso en la consola; con la propiedad vacía la grilla no cambia.

### 7.9 Idioma (`Language`)
`en` (por defecto) o `es`. Traduce **todos** los textos: placeholder del buscador, *Actualizar*, *Exportar a Excel*, selector de columnas, mensaje sin registros, reporte de paginación (*Mostrando X a Y de Z registros*), placeholder de cada filtro (*Buscar en …*), nombre de la hoja de Excel y también los textos internos de la grilla (*Contenga*, *Aplicar*, *Limpiar*, *Coincidir todo*, etiquetas de accesibilidad del paginador, etc.).

### 7.10 Formato de los valores
Los valores se transforman antes de pintarse, filtrarse y exportarse:

| Tipo de dato | Por defecto | Cómo cambiarlo |
|---|---|---|
| `Currency` | `$1,234.50` (USD) | `FieldConfigurations` → `currency` |
| `Decimal` | 2 posiciones | `FieldConfigurations` → `decimalPlaces` |
| `TwoOptions` | `Yes` / `No` | `FieldConfigurations` → `trueLabel` / `falseLabel` |
| `DateAndTime.DateOnly` | `yyyy-MM-dd` | `DateFormat` (global) o `FieldConfigurations` → `dateFormat` |
| `DateAndTime.DateAndTime` | `yyyy-MM-dd HH:mm:ss` | `DateFormat` (global) o `FieldConfigurations` → `dateFormat` |
| `SingleLine.Phone` | se prefija con `tel:` | — |
| `SingleLine.URL` | se prefija con `<a href=…>` | — |

Como los filtros por columna, el buscador global, los colores de fila y la exportación trabajan sobre el **valor ya formateado**, cualquier cambio de formato afecta también a esas funciones.

### 7.11 Nombres de columna para el usuario final
El programador puede **renombrar** las columnas con `ColumnLabels` sin tocar Dataverse:

```text
nombre=Nombre completo, importe=Importe (€), cuentas_pk=Cuenta
```

El nombre se aplica al **encabezado** de la grilla, al **encabezado del Excel**, al **placeholder del filtro** de esa columna (*Buscar en …*) y a las **opciones del selector de columnas**. Además sirve como identificador en `InitialColumns`, `FieldConfigurations` y `RowColorRules`. Detalle en §8.5.

### 7.12 Limpiar todos los filtros
El botón con el icono de **filtro tachado** limpia de un clic el buscador global y los filtros de todas las columnas, y devuelve la grilla a la página 1. Está **deshabilitado** cuando no hay ningún filtro activo, de modo que se ve de un vistazo si la grilla está filtrada.

## 8. Referencia de formatos

### 8.1 `InitialColumns`
Lista separada por comas de columnas a mostrar inicialmente. Acepta **nombre lógico, alias o nombre para mostrar** (sin distinguir mayúsculas ni acentos).

```text
nombre, Importe facturado, cuentas_pk
```

Vacío = todas las columnas del dataset. Es también el conjunto del que parte el selector de columnas del usuario final.

### 8.2 `FieldConfigurations`
Formato general:

```text
Columna=clave:valor|clave:valor, OtraColumna=clave:valor
```

- La **columna** se identifica por nombre lógico, alias o nombre para mostrar (sin distinguir mayúsculas, acentos ni espacios extremos).
- `,` separa columnas y `|` separa pares `clave:valor` dentro de la misma columna.
- Si una columna no aparece en la lista, se aplican los valores por defecto.
- El `dateFormat` de una columna **tiene prioridad** sobre la propiedad global `DateFormat`.

| Tipo de dato | Clave | Ejemplo | Resultado |
|---|---|---|---|
| `Currency` | `currency` | `Importe=currency:GBP` | `£1,234.50` |
| `DateAndTime.DateOnly` | `dateFormat` | `Fecha=dateFormat:dd/MM/yyyy` | `16/09/2026` |
| `DateAndTime.DateAndTime` | `dateFormat` | `Creado=dateFormat:dd/MM/yyyy HH:mm` | `16/09/2026 18:30` |
| `Decimal` | `decimalPlaces` | `Cantidad=decimalPlaces:3` | `7.123` |
| `TwoOptions` | `trueLabel` / `falseLabel` | `Activo=trueLabel:Sí\|falseLabel:No` | `Sí` / `No` |
| `SingleLine.Phone` | — | — | se prefija con `tel:` |
| `SingleLine.URL` | — | — | se prefija con `<a href=…>` |

Ejemplo completo:

```text
Importe=currency:EUR, Cantidad=decimalPlaces:3, Activo=trueLabel:Sí|falseLabel:No, Fecha=dateFormat:dd/MM/yyyy HH:mm
```

> El `dateFormat` admite **cualquier patrón de date-fns** (por ejemplo `d 'de' MMMM 'de' yyyy HH:mm`), no solo los del combo `DateFormat`, así que esta propiedad es la vía para formatos que no estén en la lista.

### 8.3 `DateFormat`
Combo con **36 opciones** (incluida `Predeterminado`). Aplica a todas las columnas de fecha y fecha/hora; cada columna puede sobrescribirlo con `FieldConfigurations`.

**Fecha (16)**

| Opción | Resultado |
|---|---|
| `default` — Predeterminado (según el tipo de dato) | `2026-09-16` / `2026-09-16 18:30:45` |
| `dd-MM-yyyy` | `16-09-2026` |
| `dd_MM_yyyy` | `16/09/2026` |
| `d_M_yyyy` | `16/9/2026` |
| `dd_MM_yy` | `16/09/26` |
| `yyyy-MM-dd` | `2026-09-16` |
| `yyyy_MM_dd` | `2026/09/16` |
| `dd.MM.yyyy` | `16.09.2026` |
| `dd_MMM_yyyy` | `16/sep/2026` |
| `dd_MMM_yy` | `16/sep/26` |
| `dd_MMMM_yyyy` | `16/septiembre/2026` |
| `d_de_MMMM_de_yyyy` | `16 de septiembre de 2026` |
| `MMMM_d_yyyy` | `septiembre 16, 2026` |
| `MMM_yyyy` | `sep 2026` |
| `yyyy` | `2026` |
| `EEE_dd_MM_yyyy` | `mié 16/09/2026` |
| `EEEE_d_de_MMMM_de_yyyy` | `miércoles 16 de septiembre de 2026` |

**Fecha y hora (14)**

| Opción | Resultado |
|---|---|
| `dd_MM_yyyy_HH_mm` | `16/09/2026 18:30` |
| `dd_MM_yyyy_HH_mm_ss` | `16/09/2026 18:30:45` |
| `dd_MM_yyyy_hh_mm_a` | `16/09/2026 06:30 p. m.` |
| `dd_MM_yyyy_hh_mm_ss_a` | `16/09/2026 06:30:45 p. m.` |
| `d_M_yyyy_HH_mm` | `16/9/2026 18:30` |
| `yyyy-MM-dd_HH_mm` | `2026-09-16 18:30` |
| `yyyy-MM-dd_HH_mm_ss` | `2026-09-16 18:30:45` |
| `yyyy-MM-ddTHH_mm_ss` | `2026-09-16T18:30:45` |
| `dd.MM.yyyy_HH_mm` | `16.09.2026 18:30` |
| `dd.MM.yyyy_HH_mm_ss` | `16.09.2026 18:30:45` |
| `dd-MM-yyyy_HH_mm` | `16-09-2026 18:30` |
| `dd_MMM_yyyy_HH_mm` | `16/sep/2026 18:30` |
| `d_de_MMMM_de_yyyy_HH_mm` | `16 de septiembre de 2026 18:30` |
| `EEE_dd_MM_yyyy_HH_mm` | `mié 16/09/2026 18:30` |

**Hora (5)**

| Opción | Resultado |
|---|---|
| `HH_mm` | `18:30` |
| `HH_mm_ss` | `18:30:45` |
| `hh_mm_a` | `06:30 p. m.` |
| `hh_mm_ss_a` | `06:30:45 p. m.` |
| `HH_mm_ss_SSS` | `18:30:45.123` |

> Nota: si aplicas un formato con hora a una columna de **solo fecha**, la hora saldrá `00:00` porque el valor no la contiene.

### 8.4 `RowColorRules`
Detallado en §7.8. Resumen de la gramática:

```text
columna = regla [ "|" regla ]* [ "," columna = regla [ "|" regla ]* ]
regla   = ( valor | "~" valor | "*" ) ":" colorFondo [ ":" colorTexto ]
```

### 8.5 `ColumnLabels`
Nombres que verá el usuario final para cada columna:

```text
nombre=Nombre completo, importe=Importe (€), cuentas_pk=Cuenta, ciudad=
```

- La coma separa columnas y el **primer** `=` separa el identificador de la etiqueta; la etiqueta puede incluir `:`, `|`, `(`, `€`, espacios…
- La columna se identifica por nombre lógico, alias o nombre para mostrar (sin distinguir mayúsculas ni acentos).
- Una etiqueta vacía (`ciudad=`) deja el nombre que trae el dataset.
- Columnas inexistentes o entradas mal formadas se ignoran con un aviso en la consola del navegador.
- El nombre personalizado se aplica en: **encabezado de la grilla**, **encabezado del Excel exportado**, **placeholder del filtro de esa columna** (*Buscar en …*) y **opciones del selector de columnas**.
- Además, la etiqueta funciona como **identificador** en `InitialColumns`, `FieldConfigurations` y `RowColorRules`, así que puedes configurar por el nombre que ve el usuario:

```text
ColumnLabels        → importe=Importe (€)
FieldConfigurations → Importe (€)=currency:EUR
RowColorRules       → Importe (€)=~1.000:#FFF4CE
```

Para saber **dónde** se escribe esta propiedad en la app, ver §4.1; para saber qué identificador usar en cada columna, §4.2.

**Diagnóstico**: si una entrada no se aplica, la consola del navegador (F12) indica el motivo:

```text
ColumnLabels: la columna "cuentas" no existe en el dataset.
ColumnLabels: entrada no válida "Nombre completo" (se espera columna=Etiqueta).
```

**Nota**: la etiqueta es un texto único, **no cambia con la propiedad `Language`**. Si necesitas nombres distintos por idioma, hoy hay que usar una app por idioma (o pedir etiquetas por idioma como mejora).

## 9. Detalles técnicos

### 9.1 Estructura del proyecto

| Archivo | Contenido |
|---|---|
| `ModernDataGrid/ControlManifest.Input.xml` | Manifest: propiedades, recurso y versión del control |
| `ModernDataGrid/index.ts` | Punto de entrada PCF (React) |
| `ModernDataGrid/components/DataGrid.tsx` | Grilla: estado, filtros, paginación, selección, exportación, idioma |
| `ModernDataGrid/components/DataGrid.css` | Layout del control y de la barra de herramientas |
| `ModernDataGrid/components/ExcelIcon.tsx` | Icono SVG de Excel |
| `ModernDataGrid/helpers/Utils.ts` | Formateo de fechas y normalización de texto |
| `ModernDataGrid/helpers/DateFormat.ts` | Catálogo de formatos de la propiedad `DateFormat` |
| `ModernDataGrid/helpers/ColumnLabels.ts` | Etiquetas personalizadas de encabezados (`ColumnLabels`) |
| `ModernDataGrid/helpers/ExcelExport.ts` | Generador `.xlsx` (contenedor OPC/ZIP sin dependencias) |
| `ModernDataGrid/helpers/RowColoring.ts` | Compilador de reglas de color de fila |
| `ModernDataGrid/helpers/Localization.ts` | Textos es/en y locale español de PrimeReact |
| `Modern-Data-Grid.pcfproj` | Proyecto MSBuild del PCF (salida `out/controls`) |
| `Solution/ModernDataGrid/ModernDataGrid.cdsproj` | Proyecto de solución Dataverse (`SolutionPackageType=Both`) |
| `Solution/ModernDataGrid/src/Other/Solution.xml` | Metadatos de solución/publicador/versión |
| `.github/skills/modern-data-grid/SKILL.md` | Guía de trabajo del proyecto para asistentes de código |

### 9.2 Compilar y empaquetar

Desde la raíz del proyecto:

```powershell
npm install
npm run build                 # compila el control en out\controls
dotnet msbuild .\Solution\ModernDataGrid\ModernDataGrid.cdsproj /t:Build /p:Configuration=Release
```

Salidas esperadas:

```text
Solution\ModernDataGrid\bin\Release\ModernDataGrid.zip
Solution\ModernDataGrid\bin\Release\ModernDataGrid_managed.zip
```

Reconstrucción limpia:

```powershell
npm run clean
npm run build
```

### 9.3 Ciclo de cambio

1. Edita el código (y el manifest si añades propiedades).
2. `npm run build` (regenera `generated/ManifestTypes.d.ts`; **no** editar ese archivo a mano).
3. Comprueba que ningún atributo del manifest tenga apóstrofos (ver §9.4).
4. Sube la versión de la solución en `Solution.xml` si vas a importar la actualización.
5. Empaqueta con MSBuild y verifica que el log muestre `- ID0007.ModernDataGrid`.
6. Importa **solo** el ZIP recién generado.

### 9.4 Notas de implementación (mantenimiento)

- **Iconos**: todos los iconos de la barra (buscador, refrescar, Excel) son **SVG en línea**; el control **no depende de la fuente de PrimeIcons**. Si añades iconos, usa `primereact/icons/*` o un SVG propio, no clases `pi pi-*` (en algunos entornos la fuente no carga y el icono queda vacío).
- **Paneles flotantes**: el panel de filtro de columna y el del selector de columnas se renderizan con el `Portal` de PrimeReact en `document.body`, así que el `overflow: hidden` de la raíz no los recorta.
- **Modelo de filtros**: mantener el estado controlado en la forma `{ campo: { operator: AND, constraints: [{ value, matchMode }] } }`. El modo `menu` de PrimeReact escribe en `constraints[i].value`; el formato antiguo `{ value, matchMode }` deja de filtrar sin dar error. `getFiltersForTable()` garantiza un modelo por columna antes de renderizar.
- **Colores de fila**: PrimeReact 10 no tiene `rowStyle`, así que se usa `rowClassName` + una hoja `<style data-modern-data-grid="row-colors">` que se elimina al desmontar.
- **Exportación**: se aplican los mismos criterios que la grilla usando `FilterService` de PrimeReact, para que los modos de coincidencia coincidan exactamente.
- **Idioma**: se registra con `addLocale('es', …)` y se activa con `locale('es')` (PrimeReact lee la locale global al pintar), por eso se aplica en el constructor y en `shouldComponentUpdate`.
- **Layout de la barra**: `flex-wrap` + altura uniforme de 2,5 rem; el selector de columnas oculta su etiqueta para no desbordar.
- **Formato por columna**: `getColumnConfiguration()` resuelve el bloque de la columna (nombre, alias o nombre para mostrar) y se lo pasa al manejador de tipo; sin bloque, el manejador usa sus valores por defecto. El `dateFormat` de la columna gana sobre la propiedad global `DateFormat`.
- **Catálogo de fechas**: los tokens de `helpers/DateFormat.ts` y los `<value>` de `DateFormat` en el manifest deben coincidir **en contenido y orden**; hay una prueba automática que los compara y además valida que cada patrón funcione con date-fns.
- **Normalización compartida**: `normalizeText()` en `helpers/Utils.ts` (sin mayúsculas, sin acentos, sin espacios extremos) se usa tanto para los colores de fila como para resolver la configuración por columna.
- **Nada de apóstrofos en el manifest**: Dataverse valida los atributos con el tipo `noAposStringType`, así que un `'` (por ejemplo en `display-name-key`) hace fallar la importación con *XSD validation failed … The Pattern constraint failed*. Los patrones de date-fns con comillas (`d 'de' MMMM 'de' yyyy`, `yyyy-MM-dd'T'HH:mm:ss`) se escriben **sin** apóstrofos en el manifest; el patrón real vive en `helpers/DateFormat.ts`. Comprobación rápida antes de empaquetar:

```powershell
Select-String -Path ModernDataGrid\ControlManifest.Input.xml -Pattern "=\"[^""]*\x27"
```

### 9.5 Checklist de verificación tras importar

1. Power Apps Maker muestra la versión esperada de la solución.
2. Cierra y reabre la app de lienzo; el control responde a las propiedades configuradas.
3. La barra muestra buscador (si `DisplaySearch = true`), selector de columnas, refrescar y exportar (si `DisplayHeader = true`).
4. Con `AllowFiltering = true` aparecen los embudos y el panel abre con **Contenga**; al escribir filtra al momento.
5. El pie del paginador muestra `Mostrando X a Y registros · Filtrados: Z`.
6. El buscador global filtra sobre todas las columnas y se combina con los filtros de columna.
7. El botón de Excel descarga un `.xlsx` que abre en Excel sin advertencias y contiene lo filtrado.
8. `FieldConfigurations` y `DateFormat` se reflejan en los valores (moneda, decimales, Sí/No, fechas).
9. `RowColorRules` colorea las filas (si no, revisa la consola del navegador).
10. Al cambiar `Language` todos los textos (incluido el panel de filtro) cambian de idioma.
11. Con `DisplayPagination = true` el pie navega entre páginas (y "anterior" siempre responde).
12. El botón **Limpiar filtros** quita de golpe el buscador y los filtros de columna, y está deshabilitado cuando no hay ninguno.

## 10. Limitaciones conocidas

### 10.1 `FieldConfigurations` por columna — resuelto en `1.0.0.21`
Hasta la `1.0.0.20` esta propiedad **no se aplicaba**: se entregaba a los manejadores el objeto completo (`{ columna: { clave: valor } }`) y ellos leían claves de primer nivel (`config.currency`, `config.dateFormat`, …), así que la configuración se ignoraba en silencio y siempre salían los valores por defecto.

Desde la `1.0.0.21`, `getColumnConfiguration()` busca el bloque de cada columna (nombre, alias o nombre para mostrar, sin distinguir mayúsculas ni acentos) y los valores por defecto se siguen aplicando cuando no hay configuración. Verificado en las pruebas automáticas:

| Configuración | Antes (`1.0.0.20`) | Ahora (`1.0.0.21`) |
|---|---|---|
| `amount=currency:GBP` | `$1,234.50` | `£1,234.50` |
| `qty=decimalPlaces:3` | `7.12` | `7.123` |
| `flag=trueLabel:Sí\|falseLabel:No` | `Yes` | `Sí` |
| `date=dateFormat:dd/MM/yyyy` | `2026-09-16` | `16/09/2026` |

### 10.2 Alcance de la exportación
El `.xlsx` contiene las filas **cargadas** en el control que cumplen los filtros activos, no la tabla completa sin paginar. Para más filas hay que ampliar `Default Rows` en la app (o cargar más páginas).

### 10.3 Teléfono y URL
Los tipos `SingleLine.Phone` y `SingleLine.URL` se prefijan con `tel:` y `<a href="…">` respectivamente, pero el control los pinta **como texto**, así que se ve el marcado literal (`<a href="https://…">…</a>`). Pendiente: renderizar un enlace real.

### 10.4 Valores con separadores reservados
En `FieldConfigurations` y `RowColorRules` los caracteres `:`, `|` y `,` son separadores, por lo que un valor que los contenga no se puede expresar literalmente.

### 10.5 Filtros, orden y paginación sobre lo cargado
Los filtros, el orden y el paginado actúan sobre las filas **cargadas** en la grilla (el filtrado no viaja al origen). El control carga automáticamente las páginas que falten hasta un tope de **2000 filas**; si tu tabla tiene más, amplía `Default Rows` en la app para traer más filas en cada carga.

### 10.6 La barra requiere cabecera
El buscador, el selector de columnas, el refresco y la exportación viven en la barra superior: si `DisplayHeader = false`, no se muestran.

### 10.7 Contraste de colores
`RowColorRules` no valida el contraste; para combinaciones oscuras usa el color de texto opcional (`valor:#fondo:#texto`).

## 11. Solución de problemas

| Síntoma | Causa / solución |
|---|---|
| No veo la barra, el buscador ni los botones | `DisplayHeader = true` y (para el buscador) `DisplaySearch = true` |
| No aparecen los embudos de filtro | `AllowFiltering = true` |
| No puedo ordenar | `AllowSorting = true` |
| El filtro por columna no filtraba | Corregido en la versión de solución `1.0.0.17`; comprueba que importaste esa versión o superior |
| No aparecía el botón de exportar / iconos vacíos | Corregido en `1.0.0.18` (barra con `flex-wrap`) y `1.0.0.20` (iconos SVG, sin depender de la fuente) |
| Tras importar sigo viendo la versión anterior | Caché: cierra y vuelve a abrir la app. Además la importación solo actualiza si la versión de la solución es mayor |
| La exportación no descarga el archivo | Usa Edge/Chrome actualizado y revisa que el navegador no bloquee descargas |
| El combo de columnas se ve pequeño o con nombres | En `1.0.0.20` es un control de 2,5 rem de alto y **no muestra nombres**; si lo ves distinto, es una versión anterior o hay CSS del host interfiriendo |
| Los colores de fila no se aplican | Revisa el nombre de la columna (nombre/alias/nombre para mostrar) y que el color sea válido; mira los avisos de la consola del navegador |
| Los textos siguen en inglés | `Language = es` (o `Español` en el desplegable) |
| Los formatos de fecha no cambian | Usa la propiedad `DateFormat` o `dateFormat` por columna en `FieldConfigurations` (requiere `1.0.0.21` o superior). Si aplicas un patrón con hora a una columna de solo fecha verás `00:00` |
| La moneda sale en USD aunque la configuré | Revisa el nombre de la columna en `FieldConfigurations` (nombre, alias o nombre para mostrar) y que la versión sea `1.0.0.21` o superior |
| Los decimales no cambian de 2 posiciones | Igual que el caso anterior: `Columna=decimalPlaces:3` y versión `1.0.0.21`+ |
| La importación falla con `XSD validation failed … noAposStringType … The Pattern constraint failed` | Hay un **apóstrofo** (`'`) en un atributo del manifest (normalmente `display-name-key`). Corregido en `1.0.0.25`; si lo ves en otra versión, quita el `'` del atributo |
| El pie de páginas no navega o queda vacío | Comprueba `DisplayPagination = true`. Desde `1.0.0.28` el pie navega sobre las filas cargadas y **pide a la fuente las que falten** al avanzar más allá de lo cargado, así que nunca queda vacío. En la consola, `[ModernDataGrid] paginación` indica cuántas filas se cargaron y si la fuente tiene más páginas |
| No puedo ir a la página 2 aunque en el origen hay más registros | El control avanza sobre las filas cargadas o sobre las que la fuente entregue con `loadNextPage()`. Mira la línea `[ModernDataGrid] paginación` de la consola: si `filasCargadas` es igual a `filasPorPagina` y `hasNextPage` es `false`, el origen no ofrece más páginas y hay que subir `Default Rows` en `Items`/`Default Rows` de la app |
| El botón de limpiar filtros está deshabilitado | Es lo esperado: solo se activa cuando hay algún filtro o búsqueda aplicada |
| Solo carga una parte de los registros (por ejemplo 100 de 113) | El control pide a `Items` una página de 10000 filas al abrir, al actualizar y al limpiar filtros y, si el host la ignora, va pidiendo páginas con reintentos. Mira la consola: `[ModernDataGrid] pidiendo toda la fuente` muestra el tamaño aplicado y `[ModernDataGrid] la fuente no entregó más filas` el total que informa el host. Si ese total es menor que los registros de la tabla, el límite está en la app (sube `Default Rows` y el **límite de filas de datos** de Power Apps) |
| El Excel exportado no coincide con lo que veo (trae más o menos filas) | Corregido en `1.0.0.31`: cuando el modelo de filtro no trae modo de coincidencia se aplica el de la columna (`Contains`), igual que la grilla, así que el archivo trae **exactamente** las filas y columnas visibles. Comprueba la consola: `[ModernDataGrid] exportando a Excel { columnas, filas, filasCargadas }` |
| El botón de actualizar no trae datos nuevos | Llama a `refresh()` sobre el dataset; si tu origen no lo soporta (por ejemplo una colección local), vuelve a construirla antes de refrescar |
| Tras pulsar Actualizar el pie se queda con las filas anteriores | Corregido en `1.0.0.29`: el control detecta que `Items` se recargó (firma de filas) y repinta, además de volver a traer todas las páginas. Si lo ves en otra versión, cierra y reabre la app para descargar el paquete nuevo |
| El pie muestra menos páginas que registros hay en `Items` | El control solo puede paginar lo que la fuente le entregue con `loadNextPage()`. Comprueba la línea `[ModernDataGrid] paginación`: si `filasCargadas` se queda en el tamaño de `Default Rows` y `hasNextPage` es `false`, el origen no permite paginar; sube `Default Rows` en la app |

### 11.1 Preguntas frecuentes

**¿Puedo mostrar también el total de registros de la base de datos?**
Hoy no: por petición, el pie muestra la **cantidad filtrada**. Volver a mostrar el total implicaría usar `paging.totalResultCount` en la plantilla del paginador.

**¿Cómo uso dos formatos de fecha distintos en la misma grilla?**
Con `FieldConfigurations` por columna (`Fecha=dateFormat:dd/MM/yyyy, Creado=dateFormat:yyyy-MM-dd HH:mm`), que tiene prioridad sobre `DateFormat`.

**¿Puedo aplicar un patrón de fecha que no esté en el combo?**
Sí: `dateFormat` por columna acepta **cualquier patrón de date-fns** (por ejemplo `d 'de' MMMM 'de' yyyy HH:mm`).

**¿Los filtros y el buscador consultan toda la tabla de Dataverse?**
No: filtran y ordenan sobre las filas cargadas en el control. Para más filas, amplía `Default Rows` y usa el paginador.

**¿Cómo cambio el nombre de una columna sin tocar Dataverse?**
Con `ColumnLabels`: `nombre=Nombre completo, importe=Importe (€)`. Se aplica al encabezado, al Excel exportado, al placeholder del filtro y al selector de columnas; la etiqueta también sirve como identificador en `FieldConfigurations`, `RowColorRules` e `InitialColumns`.

**¿Cómo quito todos los filtros de golpe?**
Con el botón de **filtro tachado** de la barra (*Limpiar filtros*, §7.12): borra el buscador global y los filtros de todas las columnas y vuelve a la página 1. Está deshabilitado si la grilla no está filtrada.

**¿Los colores de fila se aplican al Excel exportado?**
No, la exportación no lleva colores.

**¿El control modifica datos?**
No: es de solo lectura. Muestra, filtra, ordena, publica la selección de ids y exporta.

**¿Funciona en formularios model-driven?**
Sí, es un control de dataset; los *defaults* del manifest aplican cuando la propiedad no está configurada.

**¿Hay límite de columnas?**
Se muestran las del dataset (o las de `InitialColumns`); el usuario final puede ocultar las que no necesite con el selector.

**¿Necesito la fuente PrimeIcons?**
No. Todos los iconos del control son SVG en línea.

## 12. Ajustes rápidos de la barra

Todo está en `ModernDataGrid/components/DataGrid.css`:

| Quiero… | Cambiar |
|---|---|
| Combo de columnas más ancho | `min-width: 4.5rem` en `.modern-data-grid-column-selector` |
| Ver los nombres/placeholder en el combo | Quitar la regla que oculta `.p-multiselect-label` |
| Iconos más grandes | `width/height` de `.p-button .p-button-icon svg` (hoy `1.15rem`) y `> .p-input-icon svg` (hoy `1.05rem`) |
| Barra más alta o más baja | `height: 2.5rem` en `.p-inputtext`, `.p-multiselect` y `.p-button.p-button-icon-only` |
| Tamaño de página del pie | `getPageSize()` en `DataGrid.tsx` (las filas que elige el usuario con el desplegable; si no, el tamaño de la app `displayPageSize` y, si no, 25). Carga de la fuente: `requestWholeSource()` con `maxLoadedRows` (10000), `maxAutoLoadedRows` (2000, fondo) y `maxLoadRetries` (3) |

## 13. Historial de versiones

| Solución / control | Cambios |
|---|---|
| `1.0.0.32` / `0.0.45` | **Optimización de rendimiento con datasets grandes (sin cambios de propiedades ni de comportamiento visible).** El mapeo de filas pasa a ser **incremental**: las filas ya formateadas se reutilizan y solo se formatea lo que llega en cada página (antes se reformateaba todo lo cargado en cada página, con coste cuadrático). Se elimina la comparación profunda `lodash.isEqual` en favor de firmas y comparación por referencias, se cachea el texto buscable de cada fila, la búsqueda global se aplica con un retardo de 200 ms (inmediato con Enter o al salir del campo) y las propiedades/objetos que recibe PrimeReact pasan a tener identidad estable para no romper su memoización. El color de fila se calcula una vez por fila y el refresco de la fuente (`needsRefresh`) se consume una sola vez (antes podía dispararse en cada render). El control repinta menos veces por interacción (un render en lugar de dos) y la revalidación del dataset se agrupa. **Diagnóstico opcional**: `window.__mdgPerf = true` publica contadores de renders, tiempos de mapeo y filas reutilizadas; `window.__mdgPerfReport()` imprime el resumen (también al desmontar el control). No cambia ninguna propiedad del manifest, ni la exportación a Excel, ni el paginado, ni los filtros |
| `1.0.0.31` / `0.0.44` | **Corregido: el Excel exportado coincide con la vista.** Cuando el modelo de filtro del panel llega **sin modo de coincidencia** se aplica el de la columna (`Contains`), igual que el DataTable; antes se asumía *Comience con* y el archivo podía traer menos filas que la grilla (p. ej. 1 en vez de 23). Se añade en la consola `[ModernDataGrid] exportando a Excel { columnas, filas, filasCargadas }` |
| `1.0.0.30` / `0.0.43` | **Se traen todos los registros de la fuente**: al abrir, al pulsar *Actualizar* y al pulsar *Limpiar filtros* se pide a `Items` una página del tamaño del tope (10000 filas), de modo que también llega la **última página incompleta** (113 registros → 5 páginas de 25) y el paginado en pantalla sigue con el tamaño de la app. Si el host ignora ese tamaño, se piden páginas con `loadNextPage()` **reintentando hasta 3 veces** antes de darla por agotada y se avisa por consola. *Limpiar filtros* reinicia además los contadores internos y *Actualizar* vuelve a pedir la fuente completa |
| `1.0.0.29` / `0.0.42` | **Refrescar recarga todo**: al pulsar *Actualizar* (y al abrir el control) se traen **todas las páginas que ofrezca `Items`** (tope de 10000 filas), la grilla se repinta con los datos nuevos y el pie vuelve a paginar el conjunto completo. **Corregido**: el control no detectaba que el dataset se recargaba o que llegaban páginas nuevas (el `DataSet` no expone `raw`), por lo que el paginado quedaba desincronizado tras refrescar; ahora compara una firma de filas (`loading`, cantidad, primer y último id) y repinta. Sin filtros, *Filtrados* es el total de registros cargados de la fuente |
| `1.0.0.28` / `0.0.41` | **Paginación bidireccional**: además de navegar sobre las filas cargadas, el pie muestra **una página extra mientras la fuente tenga más registros**, la pide con `loadNextPage()` y salta a ella cuando llegan los datos (la vista nunca queda vacía; mientras carga se muestra el indicador de la grilla). Si el origen no informa el total y la última página está completa, también se ofrece esa página extra; cambiar las filas por página respeta la elección del usuario y vuelve a la página 1 |
| `1.0.0.27` / `0.0.40` | **Paginado en cliente real**: el pie deja de depender del dataset (ya no usa `totalResultCount`, `first` ni `onPage`), por lo que navega igual con total conocido, con `-1` o sin paginación en el origen, y **nunca deja la tabla vacía**. El control además **carga automáticamente las páginas que falten** (tope de 2000 filas) y publica el estado de la paginación en la consola |
| `1.0.0.26` / `0.0.39` | **Paginación adaptativa**: el pie navega aunque el dataset no informe el total (`-1`, típico en Canvas) o no pueda paginar (se pagina en cliente sobre lo cargado), y moverse entre páginas ya cargadas es inmediato. Nuevo botón **Limpiar filtros** y **Actualizar** mejorado: limpia la selección (local y en el dataset) y vuelve a pedir los datos a la fuente (`refresh()`) |
| `1.0.0.25` / `0.0.38` | **Corregido**: los `display-name-key` del combo `DateFormat` ya no llevan apóstrofos (Dataverse usa el tipo `noAposStringType` y la importación fallaba con *XSD validation failed*). Los patrones con comillas (`d de MMMM de yyyy`, `yyyy-MM-ddTHH:mm:ss`) se muestran sin apóstrofos; el patrón real no cambia |
| `1.0.0.24` / `0.0.37` | Nueva propiedad **`ColumnLabels`**: el programador define el nombre que verá el usuario para cada columna (`nombre=Nombre completo, importe=Importe (€)`). Se aplica al encabezado, al Excel exportado, al placeholder del filtro y al selector de columnas, y la etiqueta sirve como identificador en `InitialColumns`, `FieldConfigurations` y `RowColorRules` |
| `1.0.0.23` / `0.0.36` | Actualización de **documentación**: ejemplos de configuración listos para copiar (§5.2), checklist de verificación tras importar (§9.5), preguntas frecuentes (§11.1) y corrección de versiones y referencias cruzadas. **Sin cambios funcionales** respecto a `1.0.0.22` |
| `1.0.0.22` / `0.0.35` | El reporte del paginador muestra el rango visible y la **cantidad filtrada** en lugar del total de la base de datos (*Mostrando 51 a 54 registros · Filtrados: 54*) |
| `1.0.0.21` / `0.0.34` | **Arreglado**: `FieldConfigurations` ahora se aplica **por columna** (moneda, decimales, etiquetas Sí/No y `dateFormat`), resolviendo la columna por nombre, alias o nombre para mostrar. Nueva propiedad **`DateFormat`** con 36 formatos de fecha, fecha y hora y hora. Documentación **propiedad a propiedad** en `DOCUMENTATION.md` |
| `1.0.0.20` / `0.0.33` | Iconos de buscar, refrescar y exportar como **SVG en línea** (sin depender de la fuente de PrimeIcons, que en algunos entornos no carga y dejaba iconos vacíos); barra con altura uniforme de 2,5 rem; botones cuadrados alineados con el buscador; combo de columnas más grande; documentación en `DOCUMENTATION.md` |
| `1.0.0.19` / `0.0.32` | Nueva propiedad **`RowColorRules`** para colorear el registro completo según el valor de una columna (con `~` contiene, `*` comodín, color de texto, hover y selección) |
| `1.0.0.18` / `0.0.31` | Nueva propiedad **`Language`** (`en`/`es`) que traduce el control y los textos internos de PrimeReact; barra con `flex-wrap` para que ningún botón quede fuera; iconos SVG de refrescar y exportar |
| `1.0.0.17` / `0.0.30` | Filtros por columna con **panel desplegable y *Contiene*** (antes no filtraban); **selector de columnas** para el usuario final; **exportar a Excel** (`.xlsx` real sin dependencias) |
| `1.0.0.16` / `0.0.29` | Identidad `ID0007` (namespace corregido, ya no `GUK`) y guía del proyecto en `.github/skills` |

---

**Repositorio**: `git@github.com:hamiltoncasas/ID0007_ModernGgrid.git` (rama `main`).



