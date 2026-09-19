# Modern Data Grid (PCF) — Documentación

Control de código (Power Apps Component Framework) que muestra un dataset de Dataverse en una grilla moderna con React y PrimeReact, pensada para **Canvas Apps** y **formularios model-driven**.

---

## 1. Identidad y versiones

| Elemento | Valor |
|---|---|
| Nombre de la solución | `ID0007_ModernGrid` (nombre para mostrar `ID0007`) |
| Publicador / prefijo | `ID0007` |
| Versión de la solución | `1.0.0.37` |
| Control | `ID0007.ModernDataGrid` (constructor `ModernDataGrid`) |
| Versión del control (manifest) | `0.0.50` |
| Namespace | `ID0007` — **nunca** volver a `GUK` (ya existe `GUK.ModernDataGrid` de otro publicador y la importación falla) |

> La versión del manifest (`0.0.50`) y la versión de la solución (`1.0.0.37`) son independientes. Para que Dataverse **actualice** la solución ya instalada, la versión de la solución debe ser mayor que la importada.

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

## 4.3 Dónde salen las propiedades en Power Apps (Mostrar / Avanzado)

Todo control de Power Apps, incluido este componente de código, tiene dos pestañas en el panel de propiedades:

- **Mostrar** — la lista corta, con las propiedades del componente.
- **Avanzado** — la lista completa, siempre disponible.

Detalles que conviene conocer:

1. **Las propiedades de un componente de código aparecen en `Mostrar` cuando cambia la versión del manifest y la app se vuelve a abrir.** Si importas una solución con la misma versión de control que ya tenía la app, Power Apps no refresca la pestaña `Mostrar` y las propiedades siguen solo en `Avanzado`. Por eso cada versión de este paquete sube el número de control (`0.0.50` en esta entrega): al importar hay que **cerrar y volver a abrir** la app y aceptar la actualización del componente.
2. **La selección de columnas está en la propiedad `Campos visibles`** (aparece como *Campos visibles* en la lista, en el primer lugar de las propiedades). Ahí escribes las columnas que se ven al abrir; el usuario final puede mostrar u ocultar cualquier otra desde el selector de columnas de la barra.
3. En el panel también están `Date Format`, `Views`, `Column Labels`, `Row Color Rules`, las propiedades de formato (`Currency Formats`, `Date Formats`, `Date and Time Formats`, `Time Formats`, `Number Formats`, `Decimal Formats`, `Yes No Labels`), los interruptores de la barra (`Display Header`, `Display Search`, `Display Pagination`), `Allow Sorting`, `Allow Filtering`, `Enable`, `Selection Mode`, `Empty Message`, `Header Text` y `Language`.
4. En **Avanzado** (o desde la barra de fórmulas) aparecen con su **nombre técnico**: `CamposVisibles`, `DateFormats`, `DateTimeFormats`, `TimeFormats`, `Views`, `ColumnLabels`, `RowColorRules`, `IsEnabled`…

> Si no ves una propiedad en `Mostrar`, búscala en **Avanzado**: nunca se pierde, y ambas apuntan al mismo valor.

## 5. Propiedades

| Propiedad | Tipo | Valores válidos | Default (manifest) | Si queda vacía | Ejemplo | Descripción |
|---|---|---|---|---|---|---|
| `DataSource` | **Data set** | cualquier tabla o colección de la app | — | — | `Items` | Origen de datos del que salen las columnas y las filas. Es un *data set*, no una propiedad de texto |
| `DisplayHeader` | TwoOptions | `true`, `false` | `true` | `false` | `true` | Muestra la barra superior con buscador, selector de columnas y botones. **Debe estar en `true` para ver esa barra** |
| `HeaderText` | Texto | texto libre | — | nombre de la entidad | `Cuentas por cobrar 2026` | Título de la grilla (y nombre base del archivo Excel exportado) |
| `DisplaySearch` | TwoOptions | `true`, `false` | — | `false` | `true` | Muestra el buscador global (palabra clave) |
| `DisplayPagination` | TwoOptions | `true`, `false` | `false` | `true` | `true` | Muestra el paginador con selector de filas por página. Con `true` se pinta solo la página activa; con `false`, el listado completo con scroll virtual (§9.6) |
| `EmptyMessage` | Texto | texto libre | `No records found` | mensaje del idioma activo | `No hay cuentas para mostrar` | Texto cuando no hay registros |
| `SelectionMode` | Texto | `multiple`, `checkbox` | `multiple` | `multiple` | `checkbox` | Cómo se seleccionan las filas |
| `AllowSorting` | TwoOptions | `true`, `false` | — | `false` | `true` | Permite ordenar por columna |
| `AllowFiltering` | TwoOptions | `true`, `false` | — | `false` | `true` | Muestra el icono de filtro (embudo) en cada columna |
| `IsEnabled` | TwoOptions | `true`, `false` | `true` | `true` | `true` | Habilita la grilla (afecta a la selección) |
| `CurrencyFormats` | TextArea | `columna=CODIGO[\|locale:…\|decimals:…], …` | vacío | `USD` con idioma `en-US` | `Importe=EUR, Precio=USD\|locale:en-US` | Moneda por columna (ver §8.6) |
| `DateFormats` | TextArea | `columna=patrón, …` (solo columnas de **tipo fecha**) | vacío | `yyyy-MM-dd` | `Fecha=dd/MM/yyyy, Entrega=EEE dd/MM/yyyy` | Formato de las columnas de **solo fecha**. Si la columna no es de ese tipo, se ignora (ver §8.7) |
| `DateTimeFormats` | TextArea | `columna=patrón, …` (solo columnas de **tipo fecha y hora**) | vacío | `yyyy-MM-dd HH:mm:ss` | `FechaSolicitud=dd/MM/yyyy HH:mm` | Formato de las columnas de **fecha y hora**. Si la columna no es de ese tipo, se ignora (ver §8.7) |
| `TimeFormats` | TextArea | `columna=patrón, …` (solo columnas de **tipo hora**) | vacío | `HH:mm:ss` | `HoraInicio=HH:mm` | Formato de las columnas de **solo hora**. Si la columna no es de ese tipo, se ignora (ver §8.7) |
| `NumberFormats` | TextArea | `columna=[decimales][\|grouping:true\|false][\|locale:xx-XX], …` | vacío | 2 decimales, con separador de miles | `Cantidad=3\|grouping:false` | Decimales, separador de miles e idioma regional por columna (ver §8.8) |
| `DecimalFormats` | TextArea | `columna=decimales, …` | vacío | 2 decimales | `Cantidad=3, Precio=2` | Atajo de decimales por columna (ver §8.8) |
| `BooleanLabels` | TextArea | `columna=Verdadero\|Falso, …` | vacío | `Yes` / `No` | `Activo=Sí\|No` | Etiquetas del tipo Sí/No por columna (ver §8.9) |
| `Views` | TextArea (JSON) | objeto o arreglo JSON con las vistas | vacío | sin combo de vistas | `{ "activos": { "nombre": "Activos" } }` | Vistas/informes del usuario final: columnas, títulos, filtros y orden (ver §8.10) |
| `CamposVisibles` (*Campos visibles*) | TextArea | nombres, alias, nombres para mostrar o etiquetas separados por comas | vacío | todas | `ID_Solicitud, Cliente, Fecha` | Columnas **visibles al abrir**. El selector de columnas siempre ofrece todas las del dataset (ver §5.1 y §8.1) |
| `ColumnLabels` | TextArea | `columna=Etiqueta visible, otraColumna=Otra etiqueta` | vacío | nombres del dataset | `nombre=Nombre completo, importe=Importe (€)` | Nombres que verá el usuario final para cada columna (ver §5.1 y §8.5) |
| `Language` | Enum | `en`, `es` | `en` | `en` | `es` | Idioma de todos los textos del control |
| `RowColorRules` | TextArea | `columna=valor:colorFondo[:colorTexto]\|…, otraColumna=…` (`~` = contiene, `*` = cualquiera) | vacío | sin colores | `estado=Activo:#DFF6DD\|Pendiente:#FFF4CE, prioridad=~alta:#FDE7E9` | Colorea el registro completo según el valor de una columna (ver §7.8) |

> En Canvas, el valor que pongas en la app siempre manda; el *default* del manifest se usa al insertar el control y en escenarios model-driven.

## 5.1 Propiedades en detalle

### `DisplayHeader` — TwoOptions · default `true`
Muestra u oculta la **barra superior**. Si está en `false`, desaparecen de la vista el buscador global, el combo de vistas (`Views`), el selector de columnas, el botón de refrescar y el de exportar (la grilla sigue funcionando).
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

### `FieldConfigurations` — **retirada en `1.0.0.37`**
Esta propiedad combinada se eliminó del control. Su equivalente son las propiedades dedicadas, columna a columna:

```text
CurrencyFormats → Importe=EUR
DateFormats     → Fecha=dd/MM/yyyy
DateTimeFormats → Creado=dd/MM/yyyy HH:mm
TimeFormats     → HoraInicio=HH:mm
NumberFormats   → Cantidad=3|grouping:false
DecimalFormats  → Cantidad=3
BooleanLabels   → Activo=Sí|No
```

Si tenías algo configurado en `FieldConfigurations`, móntalo en la propiedad que corresponda al tipo de dato (el detalle de cada una está en §8.6 a §8.9).

### `DateFormat` — **retirada en `1.0.0.37`**
El combo global de 36 formatos se eliminó: los formatos de fecha se configuran **solo** en `DateFormats` (solo fecha), `DateTimeFormats` (fecha y hora) y `TimeFormats` (solo hora). Si una columna de fecha no aparece en ninguna de las tres, se muestra con el formato por defecto de su tipo (`yyyy-MM-dd`, `yyyy-MM-dd HH:mm:ss` o `HH:mm:ss`).

### `CamposVisibles` (*Campos visibles*) — TextArea · default vacío
Columnas que se muestran **al cargar**, separadas por comas (nombre, alias, nombre para mostrar o etiqueta de `ColumnLabels`). Vacío = todas.

```text
ID_Solicitud, Cliente, Fecha
```

No limita el selector de columnas: el selector siempre lista **todas** las columnas del dataset (con su tipo de dato) para que el usuario final pueda marcar cualquier otra. Si el texto no coincide con ninguna columna, se avisa por consola y se muestran todas.

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

### `CurrencyFormats` — TextArea · default vacío
Moneda de cada columna de tipo **Currency**. La columna se identifica por nombre lógico, alias, nombre para mostrar o la etiqueta de `ColumnLabels`.
```text
Importe=EUR, Precio=USD|locale:en-US|decimals:2
```
Código ISO (`EUR`, `USD`, `COP`…) y, opcionalmente, `locale` y `decimals`. Si la columna no aparece, se usa `USD` con idioma `en-US`. Detalle en §8.6.

### `DateFormats` — TextArea · default vacío
Formato de las columnas de **solo fecha** (`DateAndTime.DateOnly`).
```text
Fecha=dd/MM/yyyy, Entrega=EEE dd/MM/yyyy
```
Se aplica **automáticamente solo a las columnas de tipo fecha**: si la columna indicada es de fecha y hora, de hora o de texto, **no se aplica** (y la consola lo avisa). Acepta cualquier patrón de fecha (`dd/MM/yyyy`, `EEE dd/MM/yyyy`) o un token del catálogo (`dd_MM_yyyy`). Detalle en §8.7.

### `DateTimeFormats` — TextArea · default vacío
Formato de las columnas de **fecha y hora** (`DateAndTime.DateAndTime`).
```text
FechaSolicitud=dd/MM/yyyy HH:mm, FechaCargue=dd/MM/yyyy H:mm
```
Se aplica **solo a las columnas de fecha y hora**; si la columna es de otro tipo, no se aplica. Para mostrar **solo la hora** de una columna de fecha y hora, basta con un patrón de hora: `FechaSolicitud=HH:mm`. Detalle en §8.7.

### `TimeFormats` — TextArea · default vacío
Formato de las columnas de **solo hora** (`DateAndTime.TimeOnly`).
```text
HoraInicio=HH:mm, Duracion=HH:mm:ss
```
Se aplica **solo a las columnas de tipo hora**; si la columna es de otro tipo, no se aplica.

### `NumberFormats` — TextArea · default vacío
Formato de los números de tipo **Decimal** por columna: decimales, separador de miles e idioma regional.
```text
Cantidad=3|grouping:false, Peso=1|locale:es-ES, Saldo=decimals:2
```
El valor principal son los decimales (`3`); las opciones son `decimals`, `grouping` (`true`/`false`) y `locale`. Detalle en §8.8.

### `DecimalFormats` — TextArea · default vacío
Atajo para definir **solo los decimales** de una columna decimal.
```text
Cantidad=3, Precio=2, Porcentaje=1
```
Si la misma columna está en `NumberFormats`, esa propiedad tiene prioridad. Detalle en §8.8.

### `BooleanLabels` — TextArea · default vacío
Etiquetas que se muestran en lugar de **Sí/No** (`TwoOptions`) por columna.
```text
Activo=Sí|No, Aprobado=Sí|Pendiente
```
El primer valor es el de "verdadero" y el segundo el de "falso"; si se omite el segundo se mantiene `No`. Detalle en §8.9.

### `Views` — TextArea (JSON) · default vacío
Vistas (informes) que el usuario final elige en un **combo de la barra**, junto al selector de columnas. Cada vista define sus **columnas**, **títulos**, **filtros**, **orden** y el **archivo y hoja** del Excel exportado.
```text
{ "activos": { "nombre": "Activos", "columnas": "cliente;estado;fecha", "filtros": "estado = Activo", "ordenarPor": "fecha", "ordenDescendente": true } }
```
Acepta JSON estricto y también el formato de objeto de JavaScript (nombres de propiedad sin comillas y `;` como separador). Detalle completo, clave por clave, en §8.10.

## 5.2 Ejemplos de configuración listos para copiar

### A. Grilla financiera en español con semáforo por estado

| Propiedad | Valor |
|---|---|
| `Language` | `es` |
| `DisplayHeader` / `DisplaySearch` / `DisplayPagination` | `true` |
| `AllowSorting` / `AllowFiltering` | `true` |
| `CamposVisibles` | `cliente, importe, vencimiento, estado, responsable` |
| `DateFormats` | `vencimiento=dd/MM/yyyy` |
| `CurrencyFormats` | `importe=EUR` |
| `DecimalFormats` | `importe=2` |
| `BooleanLabels` | `vigente=Sí\|Vencido` |
| `RowColorRules` | `estado=~vigente:#C6EFCE\|~vencido:#FDE7E9:#A80000, responsable=*:#F5F5F5` |
| `ColumnLabels` | `cliente=Cliente, importe=Importe (€), vencimiento=Vence el, estado=Situación` |

### B. Agenda de citas con fecha y hora

| Propiedad | Valor |
|---|---|
| `Language` | `es` |
| `DateTimeFormats` | `inicio=dd/MM/yyyy HH:mm, fin=dd/MM/yyyy HH:mm` |
| `TimeFormats` | `duracion=HH:mm` |
| `AllowSorting` | `true` |
| `EmptyMessage` | `No hay citas para mostrar` |
| `SelectionMode` | `checkbox` |
| `RowColorRules` | `estado=~confirmada:#C6EFCE\|~cancelada:#FDE7E9` |

### C. Catálogo largo con muchas columnas

| Propiedad | Valor |
|---|---|
| `Language` | `en` |
| `DisplaySearch` | `true` |
| `CamposVisibles` | `sku, nombre, precio, stock` |
| `CurrencyFormats` | `precio=USD` |
| `DecimalFormats` | `stock=0` |
| `RowColorRules` | `stock=0:#FDE7E9\|*:#F5F5F5` |

### D. Informes por vista (combo junto al selector de columnas)

| Propiedad | Valor |
|---|---|
| `Language` | `es` |
| `Views` | `{"activos":{"nombre":"Activos","descripcion":"Solo lo vigente","columnas":"cliente;estado;fecha;importe","titulos":{"fecha":"Fecha de alta"},"filtros":"estado = Activo","ordenarPor":"fecha","ordenDescendente":true,"archivo":"activos_{fecha}.xlsx","hoja":"Activos"}}` |
| `DisplayHeader` | `true` (el combo vive en la barra) |
| `AllowFiltering` | `true` (los filtros manuales se suman a los de la vista) |

### E. Consulta de solo lectura

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
- **Selector de vistas/informes** para el usuario final (columnas, títulos, filtros y orden definidos por el programador), junto al selector de columnas.
- **Filtro por rango de fechas** en las columnas de fecha y fecha y hora (calendario con día inicial y final, ambos incluidos).
- **Selector de columnas para el usuario final** (mostrar/ocultar columnas en tiempo de ejecución): lista todas las columnas del dataset con su **tipo de dato** y botones **Todas** / **Quitar todas**.
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

El texto se escribe de forma inmediata, pero el filtrado se aplica con un **retardo de 200 ms** (así escribir una palabra no recorre todo el dataset en cada pulsación) y **de forma instantánea** al pulsar `Enter` o al salir del campo. El botón *Limpiar filtros* (§7.12) vacía el buscador de golpe, incluso si el término todavía no se había aplicado.

### 7.2 Filtros por columna (Contiene)
Con `AllowFiltering = true` cada columna muestra el **icono de embudo**; al pulsarlo se despliega un panel con:
- selector de coincidencia (**Contenga** por defecto, más *Comience con*, *Termine con*, *Igual a*, etc.),
- el campo de búsqueda,
- y los botones **Limpiar** / **Aplicar**.

Escribe y filtra **mientras escribes** (con un pequeño retardo), y acepta `Enter`. El embudo se resalta cuando la columna tiene un filtro activo. Los textos del panel salen del idioma activo (*Contenga*, *Aplicar*, *Limpiar*…). Para quitarlos **todos** de golpe está el botón *Limpiar filtros* de la barra (§7.12).

**Columnas de fecha y de fecha y hora:** el panel del embudo muestra un **calendario de rango**. Se elige el **día inicial** y después el **día final**, y se aplican los registros de ambos días y los intermedios (los dos extremos están incluidos, comparando la fecha real del registro y no el texto que se ve en la celda). Mientras solo hay un extremo elegido, la grilla no se filtra todavía. El calendario trae los botones **Hoy** y **Limpiar** (este último quita el filtro). El rango también se respeta al **exportar a Excel** (§7.7) y el botón *Limpiar filtros* lo quita junto con el resto de filtros.

> El rango se guarda como los dos extremos del día en milisegundos, así que funciona con cualquier formato de fecha visible (`dd/MM/yyyy`, `EEE dd/MM/yyyy`, con hora, etc.).

### 7.3 Ordenamiento
Con `AllowSorting = true` se puede ordenar por cada columna (ascendente/descendente) sobre las filas cargadas. En las columnas de **fecha y fecha y hora** el orden es **cronológico**: se ordena por la fecha real del registro, no por el texto que se ve en la celda (así `16/09/2026` queda después de `31/12/2025` aunque como texto no lo estaría). Las vistas también pueden definir el orden inicial (`ordenarPor` + `ordenDescendente`, §8.10).

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
- **Qué se pinta en cada modo**: con `DisplayPagination = true` la grilla dibuja **solo las filas de la página activa** (`Default Rows`); con `DisplayPagination = false` dibuja el listado completo con **scroll virtual** (en el DOM solo están las filas visibles). Es la combinación correcta en PrimeReact: **paginador y scroll virtual no se usan a la vez** (explicación en §9.4 y medición en §9.6).

El texto del paginador muestra el rango visible y la **cantidad filtrada** (registros que cumplen el buscador global y los filtros de columna):

```text
Mostrando 51 a 54 registros · Filtrados: 54
```

El **total de la tabla en la base de datos no se muestra**.

### 7.5 Selección de registros
`SelectionMode`: `multiple` o `checkbox`. La selección se publica en el dataset (`setSelectedRecordIds`), de modo que la app puede leerla. Con `IsEnabled = false` no se permite seleccionar.

### 7.6 Selector de columnas (usuario final)
En la barra hay un desplegable que lista **todas las columnas del dataset** para que el usuario final las marque o desmarque en tiempo de ejecución (por ejemplo, para no ver una columna que no necesita). El disparador es cuadrado y **no muestra texto ni etiquetas** (solo su icono), para que la barra quepa en una fila. `Campos visibles` define qué columnas vienen marcadas al abrir; vacío = todas. La selección del usuario no modifica el dataset, solo lo que se pinta (y lo que se exporta).

El panel de la lista muestra, en cada opción, el **nombre de la columna** y su **tipo de dato** (Texto, Fecha y hora, Número, Moneda, Sí/No, Opción, Correo…), y lleva dos botones al pie:

- **Todas** — marca todas las columnas (también está la casilla de *Todas* en la cabecera de la lista).
- **Quitar todas** — desmarca todas las columnas seleccionadas; con **Todas** se vuelven a marcar.

Si el programador definió **vistas** (§8.10), al lado de este selector aparece el **combo de vistas**: al elegir una, la grilla cambia de columnas, títulos, filtros y orden, y el usuario puede seguir marcando o desmarcando columnas por encima de la vista elegida (las columnas de la vista siempre están disponibles porque el selector lista todo el dataset).

### 7.7 Exportar a Excel
Botón con el icono de Excel en la barra. Genera un archivo **`.xlsx` real** (Office Open XML) sin librerías externas, con:

- **Solo las filas que se ven**: aplica exactamente el mismo criterio que la grilla (vista activa + buscador global + filtros por columna, con el mismo motor de comparación y el mismo modo de coincidencia de la columna) sobre los registros cargados. Si la vista muestra 23 resultados, el archivo trae esos **23**.
- **Solo las columnas visibles** según el selector de columnas / `Campos visibles` / la vista elegida (y con sus etiquetas de `ColumnLabels` o los títulos de la vista).
- Encabezados con el nombre para mostrar y en negrita, ancho de columna automático.
- Los valores tal como se ven en la grilla (ya formateados).
- Nombre de archivo: `HeaderText` (o el nombre de la entidad) + marca de fecha/hora. Hoja: `Datos` en español, `Data` en inglés.
- Si la **vista** activa define `archivo` y `hoja` (§8.10), se usan esos: por ejemplo `activos_{fecha}.xlsx` genera `activos_20260916.xlsx` y la hoja con el nombre indicado.
- En la consola aparece `[ModernDataGrid] exportando a Excel { columnas, filas, filasCargadas, vista, archivo, hoja }` para comprobar qué se está guardando.
- El tooltip del botón se muestra con ancho de lectura (sin texto amontonado) en los tres botones de la barra.

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
| `Currency` | `$1,234.50` (USD, `en-US`) | `CurrencyFormats` |
| `Decimal` | 2 posiciones, con separador de miles | `DecimalFormats` / `NumberFormats` |
| `TwoOptions` | `Yes` / `No` | `BooleanLabels` |
| `DateAndTime.DateOnly` | `yyyy-MM-dd` | `DateFormats` |
| `DateAndTime.DateAndTime` | `yyyy-MM-dd HH:mm:ss` | `DateTimeFormats` |
| `DateAndTime.TimeOnly` | `HH:mm:ss` | `TimeFormats` |
| `SingleLine.Phone` | se prefija con `tel:` | — |
| `SingleLine.URL` | se prefija con `<a href=…>` | — |

**Cómo se elige el formato** (solo se aplica el que corresponda al tipo de dato de la columna):

1. `DateFormats` para las columnas de **solo fecha**, `DateTimeFormats` para las de **fecha y hora** y `TimeFormats` para las de **solo hora**. La columna se identifica por nombre lógico, alias, nombre para mostrar o la etiqueta de `ColumnLabels`.
2. Si la columna no está en la propiedad de su tipo, se queda con el **valor por defecto del tipo** (`yyyy-MM-dd`, `yyyy-MM-dd HH:mm:ss` o `HH:mm:ss`).
3. Si una columna aparece en la propiedad de **otro** tipo (por ejemplo una columna de fecha y hora escrita en `DateFormats`), ese formato se **ignora** y la consola del navegador lo avisa una vez.

Como los filtros por columna, el buscador global, los colores de fila y la exportación trabajan sobre el **valor ya formateado**, cualquier cambio de formato afecta también a esas funciones.

### 7.11 Nombres de columna para el usuario final
El programador puede **renombrar** las columnas con `ColumnLabels` sin tocar Dataverse:

```text
nombre=Nombre completo, importe=Importe (€), cuentas_pk=Cuenta
```

El nombre se aplica al **encabezado** de la grilla, al **encabezado del Excel**, al **placeholder del filtro** de esa columna (*Buscar en …*) y a las **opciones del selector de columnas**. Además sirve como identificador en `Campos visibles` y `RowColorRules`. Detalle en §8.5.

### 7.12 Limpiar todos los filtros
El botón con el icono de **filtro tachado** limpia de un clic el buscador global, los filtros de todas las columnas (incluidos los rangos de fechas), la **vista** elegida y el orden, y devuelve la grilla a la página 1 con todas las columnas. Está **deshabilitado** cuando no hay ningún filtro activo, de modo que se ve de un vistazo si la grilla está filtrada.

### 7.13 Vistas (informes) para el usuario final
Cuando la propiedad `Views` tiene contenido (§8.10), en la barra aparece un **combo** justo al lado del selector de columnas. La primera opción (`Todos los registros`) quita el filtro de vista; el resto son las vistas definidas por el programador, cada una con su **nombre** y su **descripción** en la lista.

Al elegir una vista, el control:

1. deja visibles **solo las columnas** que indica la vista (en el orden escrito);
2. aplica los **títulos** de columna de la vista (encabezado, filtro y Excel);
3. aplica los **filtros** de la vista (se combinan con **Y** entre sí);
4. aplica el **orden** (`ordenarPor` + `ordenDescendente`);
5. limpia el buscador y los filtros manuales y vuelve a la **página 1**, para que el informe se vea tal cual se definió;
6. usa el **archivo** y la **hoja** de la vista al exportar a Excel.

Después de elegir una vista el usuario puede **filtrar y buscar encima de ella** (los filtros manuales se suman con **Y** a los de la vista) y mostrar u ocultar columnas con el selector. Una vista puede venir marcada con `predeterminada: true` para que se aplique al abrir el control.

> Diagnóstico: si una columna, una regla o un título de la vista no existen en el dataset, la consola del navegador (F12) indica exactamente cuál se ignoró.

## 8. Referencia de formatos

### 8.1 `CamposVisibles` (*Campos visibles*)
Lista separada por comas de columnas a mostrar **al cargar**. Acepta **nombre lógico, alias, nombre para mostrar o la etiqueta de `ColumnLabels`** (sin distinguir mayúsculas ni acentos).

```text
ID_Solicitud, Cliente, FechaSolicitud
```

Vacío = todas las columnas del dataset. **No limita el selector de columnas**: el usuario final siempre puede marcar cualquier columna del dataset (el selector lista todas, con su tipo de dato). Si ninguna entrada coincide con una columna, la consola lo avisa y se muestran todas.

### 8.2 `FieldConfigurations` (retirada en `1.0.0.37`)
Esta propiedad se **eliminó** del control en la versión `1.0.0.37` (control `0.0.50`). En su lugar se usan las propiedades por tipo de dato, que admiten la misma información sin la sintaxis `clave:valor`:

| Antes (retirada) | Ahora |
|---|---|
| `Importe=currency:EUR` | `CurrencyFormats` → `Importe=EUR` |
| `Fecha=dateFormat:dd/MM/yyyy` | `DateFormats` → `Fecha=dd/MM/yyyy` |
| `Creado=dateFormat:dd/MM/yyyy HH:mm` | `DateTimeFormats` → `Creado=dd/MM/yyyy HH:mm` |
| `Cantidad=decimalPlaces:3` | `DecimalFormats` → `Cantidad=3` (o `NumberFormats` → `Cantidad=3\|grouping:false`) |
| `Activo=trueLabel:Sí\|falseLabel:No` | `BooleanLabels` → `Activo=Sí\|No` |

Detalle de cada propiedad nueva en §8.6 a §8.9. Si una app todavía tiene texto en `FieldConfigurations`, hay que moverlo a estas propiedades: la propiedad ya no existe en el manifest.

### 8.3 Catálogo de patrones de fecha (referencia)
Valores que puedes escribir en `DateFormats`, `DateTimeFormats` y `TimeFormats`. La columna izquierda es el **token** (nombre corto que también se acepta) y la derecha el **ejemplo** con el patrón real; puedes escribir el patrón directamente (`dd/MM/yyyy HH:mm`) o cualquier otro patrón de fecha válido.

**Solo fecha (16)**

| Token | Patrón y ejemplo |
|---|---|
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
- Además, la etiqueta funciona como **identificador** en `CamposVisibles`, las propiedades de formato y `RowColorRules`, así que puedes configurar por el nombre que ve el usuario:

```text
ColumnLabels   → importe=Importe (€)
CurrencyFormats→ Importe (€)=EUR
RowColorRules  → Importe (€)=~1.000:#FFF4CE
```

Para saber **dónde** se escribe esta propiedad en la app, ver §4.1; para saber qué identificador usar en cada columna, §4.2.

**Diagnóstico**: si una entrada no se aplica, la consola del navegador (F12) indica el motivo:

```text
ColumnLabels: la columna "cuentas" no existe en el dataset.
ColumnLabels: entrada no válida "Nombre completo" (se espera columna=Etiqueta).
```

**Nota**: la etiqueta es un texto único, **no cambia con la propiedad `Language`**. Si necesitas nombres distintos por idioma, hoy hay que usar una app por idioma (o pedir etiquetas por idioma como mejora).

### 8.6 `CurrencyFormats`
Moneda de cada columna de tipo **Currency**, una por entrada. La columna se identifica por nombre lógico, alias, nombre para mostrar o la etiqueta de `ColumnLabels` (sin distinguir mayúsculas ni acentos).

| Parte | Significado | Ejemplo |
|---|---|---|
| `columna=CODIGO` | Moneda en formato ISO 4217 | `Importe=EUR` |
| `locale:xx-XX` | Idioma regional con el que se pinta (signo, posición, separadores) | `Precio=USD\|locale:es-CO` → `US$ 1.234,50` |
| `decimals:n` | Número fijo de decimales | `Saldo=COP\|decimals:0` |

```text
Importe=EUR, Precio=USD|locale:en-US|decimals:2, Saldo=COP|decimals:0
```

- Sin opciones: `Importe=EUR` se pinta con el idioma `en-US` y los decimales que correspondan a la moneda.
- Si el código de la moneda o el `locale` no son válidos, esa columna se muestra con el valor sin formatear y la consola avisa del error (la grilla sigue funcionando).
- Vacío = todas las columnas de moneda con `USD` y `en-US`.

### 8.7 `DateFormats`, `DateTimeFormats` y `TimeFormats`
Formato de fecha por columna, **separado por tipo de dato**:

| Propiedad | Se aplica a | Ejemplo |
|---|---|---|
| `DateFormats` | Columnas de **solo fecha** (`DateAndTime.DateOnly`) | `Fecha=dd/MM/yyyy` → `16/09/2026` |
| `DateTimeFormats` | Columnas de **fecha y hora** (`DateAndTime.DateAndTime`) | `Creado=dd/MM/yyyy HH:mm` → `16/09/2026 18:30` |
| `TimeFormats` | Columnas de **solo hora** (`DateAndTime.TimeOnly`) | `HoraInicio=HH:mm` → `18:30` |

```text
DateFormats     → Fecha=dd/MM/yyyy, Entrega=EEE dd/MM/yyyy, Mes=MMM yyyy
DateTimeFormats → Creado=dd/MM/yyyy HH:mm, Cita=EEEE d de MMMM de yyyy HH:mm
TimeFormats     → HoraInicio=HH:mm, Duracion=HH:mm:ss
```

- El formato se puede escribir como **patrón** (`dd/MM/yyyy`, `HH:mm`, `d 'de' MMMM 'de' yyyy`) o con un **token** del catálogo de §8.3 (`dd_MM_yyyy`, `dd_MM_yyyy_HH_mm`); no hay una lista cerrada de formatos.
- Separa las columnas con `,`. Si un patrón lleva `|`, es porque estás usando una propiedad de formato con opciones; en las de fecha el patrón completo se toma como valor.
- **Para ver solo la hora** de una columna de fecha y hora, define un patrón de hora en `DateTimeFormats`: `Creado=HH:mm`.
- **El tipo de dato manda**: cada propiedad se aplica **solo** si la columna es de su tipo. Una columna de fecha y hora escrita en `DateFormats`, una columna de solo fecha escrita en `DateTimeFormats` o una columna de texto en cualquiera de las tres **no reciben ese formato** (se quedan con el valor por defecto de su tipo) y la consola del navegador lo avisa una vez. Así, si te equivocas al escribir el nombre de la columna o la pones en la propiedad equivocada, el resultado es simplemente que no se aplica nada.
- Un formato con hora aplicado a una columna de **solo fecha** mostraría `00:00`, pero como ese caso no está permitido por el tipo de dato, la propiedad se ignora.
- **Sin formato**: se usan los valores por defecto (`yyyy-MM-dd` para solo fecha, `yyyy-MM-dd HH:mm:ss` para fecha y hora y `HH:mm:ss` para solo hora).

### 8.8 `NumberFormats` y `DecimalFormats`
Formato de los números de tipo **Decimal** por columna.

| Propiedad | Para qué | Ejemplo | Resultado |
|---|---|---|---|
| `NumberFormats` | Decimales, separador de miles e idioma regional | `Cantidad=3\|grouping:false` | `7123.456` (sin separador de miles, 3 decimales) |
| `NumberFormats` | Solo el idioma regional | `Peso=1\|locale:es-ES` | `1.234,5` |
| `NumberFormats` | Decimales escritos como opción | `Saldo=decimals:2` | `1,234.50` (con `en-US`) |
| `DecimalFormats` | Atajo de solo decimales | `Cantidad=3` | `7.123` |

```text
NumberFormats  → Cantidad=3|grouping:false, Peso=1|locale:es-ES, Saldo=decimals:2
DecimalFormats → Porcentaje=1, Precio=2
```

- El **valor principal** de la entrada son los decimales (`Cantidad=3`); las opciones van después de `|`.
- Opciones disponibles: `decimals` (decimales), `grouping` (`true`/`false`, separador de miles) y `locale` (idioma regional, por ejemplo `es-CO`, `en-US`, `es-ES`).
- Si la misma columna aparece en `NumberFormats` y en `DecimalFormats`, gana `NumberFormats`.
- Sin configuración: **2 decimales** con separador de miles y `en-US`.
- Si el `locale` no es válido, la columna se muestra sin formatear y la consola avisa (la grilla sigue funcionando).

### 8.9 `BooleanLabels`
Etiquetas que se muestran en lugar de `Yes`/`No` en las columnas de tipo **TwoOptions** (Sí/No).

| Parte | Significado | Ejemplo |
|---|---|---|
| `columna=Verdadero\|Falso` | Etiquetas para el valor verdadero y el falso | `Activo=Sí\|No` |
| `columna=Verdadero` | Se cambia solo la etiqueta de verdadero (el falso sigue en `No`) | `Aprobado=Sí` |

```text
Activo=Sí|No, Aprobado=Sí|Pendiente, Archivado=Archivado
```

- Separa las columnas con `,` y las dos etiquetas con `|` (la segunda es opcional).
- Las etiquetas se aplican al valor visible, así que también son lo que se **busca**, **filtra**, **colorea** y **exporta**.
- Vacío = `Yes` / `No` (o `Sí`/`No` si prefieres configurarlas así).



### 8.10 `Views` (vistas / informes)
Vistas que el usuario final elige en el **combo de la barra**, junto al selector de columnas (§7.13). La propiedad recibe **un objeto JSON** con una entrada por vista, o un **arreglo** de vistas.

#### 8.10.1 Estructura

```json
{
  "clave-de-la-vista": {
    "nombre": "Nombre que verá el usuario",
    "descripcion": "Texto de apoyo que aparece en la lista",
    "columnas": "columna1;columna2;columna3",
    "titulos": { "columna1": "Título visible", "columna2": "Otro título" },
    "filtros": "columna1 = Valor; columna2 %texto%",
    "ordenarPor": "columna1",
    "ordenDescendente": true,
    "archivo": "informe_{fecha}.xlsx",
    "hoja": "Nombre de la hoja",
    "predeterminada": true
  },
  "otra-vista": { "nombre": "Otra vista", "filtros": "estado = Activo" }
}
```

- Se acepta **JSON estricto** y también el formato de objeto de JavaScript (nombres de propiedad **sin comillas** y `;` en lugar de `,`), así que puedes pegar algo como:

```text
{
    activos: {
        nombre: "Activos";
        descripcion: "Solo lo vigente";
        columnas: "cliente;estado;fecha";
        filtros: "estado = Activo";
        ordenarPor: "fecha";
        ordenDescendente: true
    };
    pendientes: {
        nombre: "Pendientes";
        columnas: "cliente;estado;fecha",
        filtros: "estado = Pendiente",
        ordenarPor: "fecha"
    }
}
```

- La **clave** de cada vista (`activos`) es el identificador interno; si no pones `nombre`, se usa la clave como texto del combo.
- Todas las claves son **opcionales** salvo que quieras usar la vista: una vista con solo `nombre` sirve para "no ocultar nada".
- Los nombres de columna se escriben por **nombre lógico, alias, nombre para mostrar o la etiqueta de `ColumnLabels`** (sin distinguir mayúsculas ni acentos).
- En el ejemplo anterior, la coma final después de `"columnas": "cliente;estado;fecha",` y el punto y coma como separador son válidos: el analizador tolera ambas formas.

#### 8.10.2 Clave por clave

| Clave | Tipo | Obligatoria | Qué hace | Ejemplo |
|---|---|---|---|---|
| `nombre` | texto | no (se usa la clave) | Texto que aparece en el combo | `"Registros activos"` |
| `descripcion` | texto | no | Línea de apoyo bajo el nombre, dentro de la lista | `"Solo lo que está vigente"` |
| `columnas` | texto o arreglo | no | Columnas que se ven al elegir la vista, **en ese orden** (oculta las demás) | `"cliente;estado;fecha"` |
| `titulos` | objeto | no | Renombra columnas **solo en esa vista** (encabezado, filtro y Excel) | `{ "fecha": "Fecha de alta" }` |
| `filtros` | texto o arreglo | no | Reglas que se aplican al elegir la vista (se combinan con **Y**) | `"estado = Activo; cliente %ACME%"` |
| `ordenarPor` | texto | no | Columna por la que se ordena (en las columnas de fecha el orden es cronológico) | `"fecha"` |
| `ordenDescendente` | booleano | no (`false`) | `true` = de mayor a menor | `true` |
| `archivo` | texto | no | Nombre base del Excel exportado con esa vista; admite `{fecha}`, `{hora}` y `{fechaHora}` | `"activos_{fecha}.xlsx"` |
| `hoja` | texto | no | Nombre de la hoja del Excel (se limpian caracteres no válidos y se recorta a 31) | `"Activos"` |
| `predeterminada` | booleano | no (`false`) | Aplica la vista al abrir el control | `true` |
| `clave` / `key` | texto | no | Solo cuando se usa un **arreglo** de vistas: identifica la vista | `"clave": "activos"` |

> Alias en inglés admitidos: `name`, `description`, `columns`, `titles`, `filters`, `sortBy`, `sortDescending`, `file`, `sheet`, `default`.

#### 8.10.3 Operadores de `filtros`

| Escritura | Operador | Ejemplo | Significado |
|---|---|---|---|
| `col = valor` | Igual | `estado = Activo` | El valor visible es igual (sin distinguir mayúsculas ni acentos; numérico si es número) |
| `col != valor` / `col <> valor` | Diferente | `estado != Cerrado` | No es igual |
| `col %valor%` / `col ~valor` | Contiene | `cliente %ACME%` | El texto contiene el valor |
| `col valor%` | Empieza por | `codigo ZH%` | El texto empieza por el valor |
| `col %valor` | Termina con | `correo %@acme.com` | El texto termina con el valor |
| `col > valor` | Mayor que | `importe > 1000` | Numérico, de fecha o de texto |
| `col >= valor` | Mayor o igual | `fecha >= 2026-01-01` | Incluye el valor |
| `col < valor` | Menor que | `cantidad < 10` | — |
| `col <= valor` | Menor o igual | `fecha <= 2026-12-31` | Incluye el valor |

- Varias reglas se escriben **separadas por `;`** (o por un salto de línea) y se combinan con **Y**.
- En las **columnas de fecha** las reglas `=`, `!=`, `>`, `>=`, `<` y `<=` se evalúan contra la fecha real del registro, no contra el texto que se ve, así que funcionan con cualquier formato visible. La fecha se escribe en `AAAA-MM-DD` (también se aceptan `dd/MM/aaaa` y `MM/dd/aaaa`).
- `= 2026-09-16` significa "todo ese día"; `>= 2026-09-16` desde el inicio de ese día; `> 2026-09-16` desde el día siguiente.
- Si escribes una fecha con hora (`2026-09-16 18:30`), se compara el instante exacto.
- Las reglas que citan columnas que no existen, o sin operador reconocible, se ignoran y la consola lo indica.

#### 8.10.4 Cómo se comporta la grilla al elegir una vista

1. Se muestran solo las columnas de `columnas` (si está definido) y con los `titulos`.
2. Se aplican los `filtros` de la vista.
3. Se aplica el orden de `ordenarPor` + `ordenDescendente`.
4. Se limpian el buscador y los filtros manuales, y la grilla vuelve a la **página 1**.
5. El usuario puede filtrar, buscar y mostrar/ocultar columnas por encima de la vista; sus filtros se suman a los de la vista.
6. Al exportar a Excel se usan `archivo` y `hoja` (si están definidos) y solo las filas y columnas visibles.

## 9. Detalles técnicos

### 9.1 Estructura del proyecto

| Archivo | Contenido |
|---|---|
| `ModernDataGrid/ControlManifest.Input.xml` | Manifest: propiedades, recurso y versión del control |
| `ModernDataGrid/index.ts` | Punto de entrada PCF (React) |
| `ModernDataGrid/components/DataGrid.tsx` | Grilla: estado, filtros (incluido el rango de fechas), vistas, paginación, selección, exportación, idioma |
| `ModernDataGrid/components/DataGrid.css` | Layout del control, de la barra de herramientas y de los tooltips |
| `ModernDataGrid/components/ExcelIcon.tsx` | Icono SVG de Excel |
| `ModernDataGrid/helpers/Utils.ts` | Formateo de fechas, normalización de texto y conversión a milisegundos |
| `ModernDataGrid/helpers/DateFormat.ts` | Catálogo de patrones de fecha admitidos por las propiedades de formato y resolución de patrones |
| `ModernDataGrid/helpers/FieldFormats.ts` | Formatos por columna (`CurrencyFormats`, `DateFormats`, `DateTimeFormats`, `TimeFormats`, `NumberFormats`, `DecimalFormats`, `BooleanLabels`) |
| `ModernDataGrid/helpers/Views.ts` | Vistas/informes de la propiedad `Views`: análisis del JSON, filtros, orden, títulos y nombre del Excel |
| `ModernDataGrid/helpers/ColumnLabels.ts` | Etiquetas personalizadas de encabezados (`ColumnLabels`) |
| `ModernDataGrid/helpers/ColumnTypes.ts` | Nombre traducido del tipo de dato de cada columna (selector de columnas) |
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
- **Layout de la barra (desde `1.0.0.35`)**: una sola fila (`flex-wrap: nowrap`) con controles de 2,25 rem e iconos de 1 rem; el título se recorta antes que los controles y el buscador es el que se contrae. El selector de columnas es cuadrado (solo el icono) y su panel muestra el tipo de dato y los botones **Todas** / **Quitar todas**.
- **Selector de columnas y `Campos visibles` (desde `1.0.0.35`, renombrada en `1.0.0.37`)**: `getBaseColumns()` devuelve siempre todas las columnas del dataset (para que el selector y las vistas nunca pierdan columnas) y `getInitialSelection()` traduce `CamposVisibles` a la selección inicial (`null` = todas). Si el texto no coincide con ninguna columna, se avisa por consola y se muestran todas. El nombre técnico anterior (`InitialColumns`) ya no existe.
- **Formato por columna (desde `1.0.0.34`)**: `helpers/FieldFormats.ts` analiza las propiedades de formato (`CurrencyFormats`, `DateFormats`, `DateTimeFormats`, `TimeFormats`, `NumberFormats`, `DecimalFormats`, `BooleanLabels`) y produce el formato de cada columna, resolviendo la columna por nombre, alias, nombre para mostrar o etiqueta. `getParsedFormatProperties()` analiza las siete propiedades **una vez** por cambio de texto y las reparte a todas las columnas del mapeo. (Desde `1.0.0.37` ya no existe la propiedad heredada `FieldConfigurations`.)
- **Rango de fechas (desde `1.0.0.34`)**: el valor visible de una columna de fecha es texto formateado, así que el mapeo guarda además la **fecha real en milisegundos** en un campo oculto (`columna + '__mdgdatevalue'`). El `Column` recibe `filterField` apuntando a ese campo, `filterMatchMode = between` y un `filterElement` con el calendario de rango; el modelo de filtros se indexa por ese mismo campo (`createColumnFilter` / `getFiltersForTable`) y la exportación resuelve el mismo valor (`resolveFilterRecordField`), de modo que grilla y Excel filtran igual. El rango se guarda como `[inicioDelDía, finDelDía]` para que los dos extremos queden incluidos.
- **Vistas (desde `1.0.0.34`)**: `helpers/Views.ts` analiza la propiedad `Views` (JSON estricto o con `;` y nombres sin comillas), traduce los identificadores a nombres lógicos del dataset (`compileView`) y devuelve las columnas, títulos, filtros, orden y el nombre del Excel. Los filtros de la vista se aplican en la misma pasada que el buscador global (`getFilteredRecords`), con caché por `[filas, término, vista]`, y el orden se controla desde el estado (`sortField`/`sortOrder` + `onSort`) para poder aplicarlo desde la vista sin perder el ordenamiento manual.
- **Catálogo de fechas**: `helpers/DateFormat.ts` enumera los patrones de ejemplo (token → patrón) que aceptan `DateFormats`, `DateTimeFormats` y `TimeFormats`. Las propiedades también aceptan cualquier patrón escrito directamente, así que el catálogo es una ayuda. `resolveDatePattern()` resuelve tanto el token como el patrón.
- **Formato estricto por tipo (desde `1.0.0.37`)**: `buildColumnFormat()` toma el patrón **solo** de la propiedad que corresponde al tipo de dato de la columna (`findDateAssignment`), de modo que una columna mal ubicada no recibe ningún formato y se queda con el valor por defecto de su tipo. Los avisos de columna mal ubicada se emiten una sola vez por columna y propiedad (`wrongTypeWarnings`).
- **Normalización compartida**: `normalizeText()` en `helpers/Utils.ts` (sin mayúsculas, sin acentos, sin espacios extremos) se usa tanto para los colores de fila como para resolver la configuración por columna.
- **Nada de apóstrofos en el manifest**: Dataverse valida los atributos con el tipo `noAposStringType`, así que un `'` (por ejemplo en `display-name-key`) hace fallar la importación con *XSD validation failed … The Pattern constraint failed*. Los patrones de date-fns con comillas (`d 'de' MMMM 'de' yyyy`, `yyyy-MM-dd'T'HH:mm:ss`) se escriben **sin** apóstrofos en el manifest; el patrón real vive en `helpers/DateFormat.ts`. Comprobación rápida antes de empaquetar:

```powershell
Select-String -Path ModernDataGrid\ControlManifest.Input.xml -Pattern "=\"[^""]*\x27"
```

- **Rendimiento (desde `1.0.0.32`)**: las notas de mantenimiento del mapeo incremental, la identidad estable de props, el buscador con retardo y la regla de paginador/scroll virtual están en §9.4 y la medición y el diagnóstico en §9.6.

- **Mapeo incremental (desde `1.0.0.32`)**: cada fila formateada se guarda en `mappedRowCache` por `recordId` junto a la **referencia** del record del dataset. Si el record es el mismo objeto y la estructura (columnas + propiedades de formato + `DateFormat` + `Language`) no cambió, la fila se **reutiliza** sin volver a formatear (`reusedRows`). Se reformatea **todo** cuando cambia la estructura, cuando la app pide recargar (`invalidateMappedRows`, al pulsar *Actualizar*) o cuando el host revalida con `force` y la firma de filas no cambió. **No se usa `lodash.isEqual`**: la detección de cambios es por firma de filas (`loading`, cantidad, primer y último id) y por comparación de referencias.
- **Texto buscable por fila (desde `1.0.0.32`)**: se calcula una sola vez por fila (minúsculas, todas las columnas, separadas por un salto de línea) en un `WeakMap` ligado a la propia fila; el buscador pasa de O(filas × columnas) a O(filas). El separador no puede escribirse en un buscador de una línea, así que el resultado es equivalente al filtro columna a columna.
- **Identidad estable de props (desde `1.0.0.32`)**: `rowClassName`, `body` y `style` de cada columna, `virtualScrollerOptions`, `rowsPerPageOptions`, `globalFilterFields`, las props del pie, la plantilla del reporte y la selección se calculan una vez y se reutilizan; así vuelve a funcionar el `React.memo` interno de PrimeReact (`TableBody`/`BodyRow`/`BodyCell`) y no se repinta de más.
- **Buscador aislado (`SearchBox`, desde `1.0.0.32`)**: el texto vive dentro del propio buscador, de modo que escribir **no** vuelve a pintar la cuadrícula; el control lo aplica con `searchDebounceMs` (200 ms) o al instante con `Enter`/salida del campo. `clearFilters()` fuerza la sincronización con `searchResetToken`.
- **Paginador y scroll virtual son alternativas (desde `1.0.0.33`)**: `virtualScrollerOptions` se pasa **solo** cuando `DisplayPagination = false`. Con paginador, PrimeReact calcula el cuerpo como `dataToRender(rows)`, donde `rows` ya es el trozo del `VirtualScroller` (`items.slice(firstState, lastState)`), y lo vuelve a recortar con el `first` de la página: toda página posterior al viewport (~40 filas) quedaba vacía y parpadeaba. Nunca actives ambos a la vez.
- **`shouldComponentUpdate` sin efectos secundarios (desde `1.0.0.32`)**: la revalidación del dataset (`needsRefresh`) se consume **una sola vez** en `componentDidUpdate`; antes podía llamar a `DataSource.refresh()` en cada intento de render (y dejar la bandera activa indefinidamente).
- **Sin virtualización no se pierde el layout**: la clase `p-datatable-flex-scrollable` depende de `scrollable && scrollHeight === 'flex'`, no del `VirtualScroller`, así que el alto flexible, el encabezado fijo y el scroll horizontal funcionan igual con paginador.

### 9.5 Checklist de verificación tras importar

1. Power Apps Maker muestra la versión esperada de la solución.
2. Cierra y reabre la app de lienzo; el control responde a las propiedades configuradas.
3. La barra muestra, **en una sola fila**, el combo de vistas (si `Views` tiene contenido), el selector de columnas, el buscador (si `DisplaySearch = true`), refrescar y exportar (si `DisplayHeader = true`). El selector de columnas lista todas las del dataset con su tipo de dato y tiene los botones **Todas** / **Quitar todas**.
4. Con `AllowFiltering = true` aparecen los embudos y el panel abre con **Contenga**; al escribir filtra al momento.
5. El pie del paginador muestra `Mostrando X a Y registros · Filtrados: Z`.
6. El buscador global filtra sobre todas las columnas y se combina con los filtros de columna.
7. El botón de Excel descarga un `.xlsx` que abre en Excel sin advertencias y contiene lo filtrado.
8. Las propiedades de formato (`CurrencyFormats`, `DateFormats`, `DateTimeFormats`, `TimeFormats`, `NumberFormats`, `DecimalFormats`, `BooleanLabels`) se reflejan en los valores (moneda, decimales, Sí/No, fechas y horas); el combo global `DateFormat` sigue funcionando como último recurso.
9. `RowColorRules` colorea las filas (si no, revisa la consola del navegador).
10. Al cambiar `Language` todos los textos (incluido el panel de filtro y el calendario de rango) cambian de idioma.
11. Con `DisplayPagination = true` el pie navega entre páginas (y "anterior" siempre responde).
12. El botón **Limpiar filtros** quita de golpe el buscador, los filtros de columna, los rangos de fecha y la vista, y está deshabilitado cuando no hay ninguno.
13. El embudo de una columna de **fecha o fecha y hora** abre un **calendario de rango**: al elegir los dos días la grilla queda filtrada a ese rango, el embudo se resalta y el Excel trae esas filas.
14. Si `Views` tiene vistas, el **combo** aparece junto al selector de columnas; al elegir una vista cambian las columnas, los títulos, los filtros y el orden, y el Excel usa su `archivo` y su `hoja`.
15. Los tooltips de los botones de la barra se leen con ancho de texto (sin líneas amontonadas).

### 9.6 Diagnóstico de rendimiento (`window.__mdgPerf`)

El control incluye un diagnóstico **opcional**: no se activa por sí solo y no cambia nada para el usuario final. Se enciende desde la consola del navegador y escribe contadores con el trabajo real del control.

```js
window.__mdgPerf = true;    // activa los mensajes [ModernDataGrid][perf]
// …usa la grilla: carga, escribe en el buscador, filtra, ordena, cambia de página, pulsa Actualizar…
window.__mdgPerfReport();   // resumen acumulado (console.table). También se emite al desmontar el control
```

| Contador | Qué mide | Qué esperar |
|---|---|---|
| `updateViews` | Veces que el host pide pintar el control | Crece con cambios del dataset o de las propiedades, **no** con cada tecla |
| `renders`, `renderMedioMs` | Renders de React y su tiempo medio | No debe crecer al escribir en el buscador (solo al aplicar el término) |
| `maps`, `mapMs`, `filasPorMapa` | Pasadas de mapeo de filas y su coste | `maps` ≈ número de páginas cargadas (no el doble) y `mapMs` acotado |
| `mappedRows`, `reusedRows` | Filas formateadas y filas **reutilizadas** del caché incremental | `reusedRows` debe ser casi todo el volumen a partir de la primera página |
| `filterPasses`, `filterMs` | Pasadas del buscador global y su coste | Una por término aplicado |
| `rowsPainted` | Filas que PrimeReact pintó en total | Acotado al viewport (scroll virtual) o al tamaño de página (paginador) |
| `filasCargadas` | Filas que hay en la grilla en ese momento | Debe coincidir con lo que informa `[ModernDataGrid] paginación` |

**Cómo comparar antes/después**

1. Activa `window.__mdgPerf = true` **antes** de tocar la cuadrícula.
2. Carga la grilla y mira `[ModernDataGrid][perf] render`: `filasCargadas` frente a `filasPintadasRenderAnterior`.
3. Escribe una palabra en el buscador: no debería aparecer un `render` por pulsación (el filtrado entra al aplicar el término).
4. Pulsa **Actualizar**: `maps` sube en uno y `reusedRows` se reinicia (reformateo completo, es el comportamiento buscado).
5. Para el “antes”, el paquete anterior no tiene `__mdgPerfReport`; compara con cronómetro o con la sensación de fluidez.

**Medición de referencia** (10.000 filas × 25 columnas, mismo algoritmo del control, un hilo de CPU, sin DOM):

| Escenario | Antes | Después |
|---|---|---|
| Carga completa con páginas de 2.000 filas | 3.735 ms | 671 ms |
| Carga completa con páginas de 500 filas | 12.716 ms | 616 ms |
| Carga completa con páginas de 25 filas (extrapolado a 10.000) | ≈ 4 min | ≈ 0,6 s |
| Buscador, coste por pasada | 140 ms | 14 ms (tras la primera) |
| Selección de 1.000 filas por render | 33 ms | 1,5 ms |
| Renders por interacción | 2 | 1 |

Son cifras de referencia del trabajo de CPU (no incluyen el DOM). En la app, la mejora depende del tamaño de página que entregue el host: revisa `[ModernDataGrid] pidiendo toda la fuente` para ver si honra la página de 10000 filas o si va página a página.

## 10. Limitaciones conocidas

### 10.1 `FieldConfigurations` — resuelto en `1.0.0.21`, retirada en `1.0.0.37`
Histórico: en `1.0.0.21` se corrigió para que se aplicara **por columna** (antes solo funcionaba con la última del texto). En `1.0.0.37` la propiedad se **eliminó** y su función quedó en las propiedades por tipo de dato (`CurrencyFormats`, `DateFormats`, `DateTimeFormats`, `TimeFormats`, `NumberFormats`, `DecimalFormats`, `BooleanLabels`). Si una app la usaba, hay que mover los valores (§8.2).
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
En `FieldConfigurations`, las demás propiedades de formato y `RowColorRules` los caracteres `:`, `|` y `,` son separadores, por lo que un valor que los contenga no se puede expresar literalmente. En `Views` el JSON usa `,` y `{}` para su estructura, así que dentro de los textos de la vista (`filtros`, `columnas`, `titulos`) hay que usar `;` como separador de elementos.

### 10.5 Filtros, orden y paginación sobre lo cargado
Los filtros (incluidos los de las vistas y los rangos de fecha), el orden y el paginado actúan sobre las filas **cargadas** en la grilla (el filtrado no viaja al origen). El control carga automáticamente las páginas que falten hasta un tope de **2000 filas**; si tu tabla tiene más, amplía `Default Rows` en la app para traer más filas en cada carga.

Con `DisplayPagination = true` se pinta **solo la página activa**; con `DisplayPagination = false` se pinta el listado completo con **scroll virtual**. El orden y los filtros siempre actúan sobre las filas cargadas, estén visibles o no.

### 10.6 La barra requiere cabecera
El buscador, el selector de columnas, el **combo de vistas**, el refresco y la exportación viven en la barra superior: si `DisplayHeader = false`, no se muestran.

### 10.7 Contraste de colores
`RowColorRules` no valida el contraste; para combinaciones oscuras usa el color de texto opcional (`valor:#fondo:#texto`).

## 11. Solución de problemas

| Síntoma | Causa / solución |
|---|---|
| No veo la barra, el buscador ni los botones | `DisplayHeader = true` y (para el buscador) `DisplaySearch = true` |
| No veo el selector de columnas o le faltan columnas | Vive en la barra (`DisplayHeader = true`). Desde `1.0.0.35` lista **todas** las columnas del dataset, aunque `InitialColumns` tenga menos: si ves una lista corta, es una versión anterior |
| La barra se parte en dos líneas o los controles se ven grandes | Desde `1.0.0.35` va en **una sola fila** con controles de 2,25 rem. Si aún se parte, hay CSS del host sobre `.modern-data-grid-actions` (revisa §12 para ajustar anchos y alturas) |
| No aparecen los embudos de filtro | `AllowFiltering = true` |
| No puedo ordenar | `AllowSorting = true` |
| El filtro por columna no filtraba | Corregido en la versión de solución `1.0.0.17`; comprueba que importaste esa versión o superior |
| No aparecía el botón de exportar / iconos vacíos | Corregido en `1.0.0.18` (barra con `flex-wrap`) y `1.0.0.20` (iconos SVG, sin depender de la fuente) |
| Tras importar sigo viendo la versión anterior | Caché: cierra y vuelve a abrir la app. Además la importación solo actualiza si la versión de la solución es mayor |
| La exportación no descarga el archivo | Usa Edge/Chrome actualizado y revisa que el navegador no bloquee descargas |
| El combo de columnas se ve pequeño o con nombres | En `1.0.0.20` es un control de 2,5 rem de alto y **no muestra nombres**; si lo ves distinto, es una versión anterior o hay CSS del host interfiriendo |
| Los colores de fila no se aplican | Revisa el nombre de la columna (nombre/alias/nombre para mostrar) y que el color sea válido; mira los avisos de la consola del navegador |
| Los textos siguen en inglés | `Language = es` (o `Español` en el desplegable) |
| Los formatos de fecha no cambian | Usa `DateFormats` (solo fecha), `DateTimeFormats` (fecha y hora) o `TimeFormats` (solo hora) con la versión `1.0.0.37` o superior. Recuerda que cada propiedad **solo** se aplica si la columna es de ese tipo: si la pusiste en otra, se ignora (mira la consola) |
| La moneda sale en USD aunque la configuré | Revisa el nombre de la columna en `CurrencyFormats` (nombre, alias, nombre para mostrar o etiqueta de `ColumnLabels`). Si usas la propiedad heredada, en `FieldConfigurations` con `currency` |
| Los decimales no cambian de 2 posiciones | Igual que el caso anterior: `Columna=3` en `DecimalFormats`, `Columna=3|grouping:false` en `NumberFormats` o `decimalPlaces:3` en `FieldConfigurations` |
| El filtro de una columna de fecha no es una caja de texto | Es lo esperado desde `1.0.0.34`: en las columnas de fecha y fecha y hora el embudo abre un **calendario de rango** (§7.2) |
| El rango de fechas filtra un día de menos | Elige el día inicial y el final: el filtro se aplica cuando están los dos (mientras solo haya uno, la grilla no se filtra). Ambos extremos están incluidos |
| No aparece el combo de vistas | Comprueba que `Views` tenga JSON válido (el control acepta JSON estricto o el formato con `;` y claves sin comillas) y que `DisplayHeader = true`; la consola indica si el texto no se pudo analizar |
| Elijo una vista y no cambia nada | La consola avisa de las columnas, los títulos y las reglas que no existan en el dataset. Revisa los nombres (nombre lógico, alias, nombre para mostrar o etiqueta de `ColumnLabels`) |
| El tooltip de un botón se ve pequeño o amontonado | Corregido en `1.0.0.34` (ancho de lectura, interlineado y salto de palabra). Si lo ves distinto, es una versión anterior o hay CSS del host sobrescribiendo `.p-tooltip .p-tooltip-text` |
| La importación falla con `XSD validation failed … noAposStringType … The Pattern constraint failed` | Hay un **apóstrofo** (`'`) en un atributo del manifest (normalmente `display-name-key`). Corregido en `1.0.0.25`; si lo ves en otra versión, quita el `'` del atributo |
| El pie de páginas no navega o queda vacío | Comprueba `DisplayPagination = true`. Desde `1.0.0.28` el pie navega sobre las filas cargadas y **pide a la fuente las que falten** al avanzar más allá de lo cargado, así que nunca queda vacío. En la consola, `[ModernDataGrid] paginación` indica cuántas filas se cargaron y si la fuente tiene más páginas |
| No puedo ir a la página 2 aunque en el origen hay más registros | El control avanza sobre las filas cargadas o sobre las que la fuente entregue con `loadNextPage()`. Mira la línea `[ModernDataGrid] paginación` de la consola: si `filasCargadas` es igual a `filasPorPagina` y `hasNextPage` es `false`, el origen no ofrece más páginas y hay que subir `Default Rows` en `Items`/`Default Rows` de la app |
| El botón de limpiar filtros está deshabilitado | Es lo esperado: solo se activa cuando hay algún filtro o búsqueda aplicada |
| Solo carga una parte de los registros (por ejemplo 100 de 113) | El control pide a `Items` una página de 10000 filas al abrir, al actualizar y al limpiar filtros y, si el host la ignora, va pidiendo páginas con reintentos. Mira la consola: `[ModernDataGrid] pidiendo toda la fuente` muestra el tamaño aplicado y `[ModernDataGrid] la fuente no entregó más filas` el total que informa el host. Si ese total es menor que los registros de la tabla, el límite está en la app (sube `Default Rows` y el **límite de filas de datos** de Power Apps) |
| El Excel exportado no coincide con lo que veo (trae más o menos filas) | Corregido en `1.0.0.31`: cuando el modelo de filtro no trae modo de coincidencia se aplica el de la columna (`Contains`), igual que la grilla, así que el archivo trae **exactamente** las filas y columnas visibles. Comprueba la consola: `[ModernDataGrid] exportando a Excel { columnas, filas, filasCargadas }` |
| El botón de actualizar no trae datos nuevos | Llama a `refresh()` sobre el dataset; si tu origen no lo soporta (por ejemplo una colección local), vuelve a construirla antes de refrescar |
| Tras pulsar Actualizar el pie se queda con las filas anteriores | Corregido en `1.0.0.29`: el control detecta que `Items` se recargó (firma de filas) y repinta, además de volver a traer todas las páginas. Si lo ves en otra versión, cierra y reabre la app para descargar el paquete nuevo |
| El pie muestra menos páginas que registros hay en `Items` | El control solo puede paginar lo que la fuente le entregue con `loadNextPage()`. Comprueba la línea `[ModernDataGrid] paginación`: si `filasCargadas` se queda en el tamaño de `Default Rows` y `hasNextPage` es `false`, el origen no permite paginar; sube `Default Rows` en la app |
| La página 3 (y siguientes) se veía **en blanco** o parpadeando | Corregido en `1.0.0.33`: PrimeReact no combina paginador con scroll virtual (el `DataTable` volvía a recortar el trozo que ya había recortado el `VirtualScroller`, así que toda página posterior al viewport (~40 filas) quedaba vacía). Ahora el scroll virtual se usa **solo** con `DisplayPagination = false`. Si lo ves en otra versión, importa `1.0.0.33` o superior y cierra/reabre la app |
| Tras *Limpiar filtros* quedaba texto escrito en el buscador | Corregido en `1.0.0.33`: el buscador se vacía aunque el término aún no se hubiera aplicado (carrera del retardo de 200 ms) |
| Con muchas filas sigue notándose lento | Activa el diagnóstico (`window.__mdgPerf = true`, §9.6) y revisa `maps`, `reusedRows` y `filterPasses`. Mira también `[ModernDataGrid] pidiendo toda la fuente`: si `paginaActual` es pequeña, el host no honró la página grande, y conviene subir `Default Rows` y el **límite de filas de datos** de Power Apps |
| Quiero el listado completo con scroll (sin páginas) | Pon `DisplayPagination = false`: se virtualiza todo el listado cargado y el scroll es continuo (es la combinación óptima en PrimeReact) |
| El buscador filtra “un poco después” de escribir | Es el comportamiento previsto desde `1.0.0.32` (200 ms); con `Enter` o al salir del campo se aplica al instante. Para más detalle, ver §7.1 |

### 11.1 Preguntas frecuentes

**¿Puedo mostrar también el total de registros de la base de datos?**
Hoy no: por petición, el pie muestra la **cantidad filtrada**. Volver a mostrar el total implicaría usar `paging.totalResultCount` en la plantilla del paginador.

**¿Cómo uso dos formatos de fecha distintos en la misma grilla?**
Con las propiedades por columna: `DateFormats` (`Fecha=dd/MM/yyyy`), `DateTimeFormats` (`FechaSolicitud=dd/MM/yyyy HH:mm`) y `TimeFormats` (`HoraInicio=HH:mm`). Cada una se aplica **solo** a las columnas de su tipo de dato; si te equivocas de propiedad, ese formato simplemente no se aplica.

**¿Puedo aplicar un patrón de fecha que no esté en el catálogo?**
Sí: `DateFormats`, `DateTimeFormats` y `TimeFormats` aceptan **cualquier patrón de fecha válido** (por ejemplo `Cita=EEEE d de MMMM de yyyy HH:mm`); el catálogo de §8.3 solo lista ejemplos y tokens cortos.

**¿Cómo filtro por un rango de fechas?**
Con `AllowFiltering = true`, pulsa el embudo de una columna de fecha o de fecha y hora: se abre un **calendario de rango**. Elige el día inicial y el final (ambos incluidos) y la grilla, el pie y el Excel quedan filtrados a ese rango (§7.2).

**¿Puedo dejar informes ya armados para el usuario final?**
Sí, con la propiedad `Views` (§8.10): cada vista define columnas, títulos, filtros, orden, y el archivo y la hoja del Excel. El usuario final las elige en el combo que aparece junto al selector de columnas.

**¿Cómo cambio el idioma regional de los importes y de los números?**
Con `CurrencyFormats` (`Importe=USD|locale:es-CO`) y `NumberFormats` (`Cantidad=1|locale:es-ES`): el idioma regional cambia los separadores y la posición del símbolo (§8.6 y §8.8).

**¿Los filtros y el buscador consultan toda la tabla de Dataverse?**
No: filtran y ordenan sobre las filas cargadas en el control. Para más filas, amplía `Default Rows` y usa el paginador.

**¿Cómo cambio el nombre de una columna sin tocar Dataverse?**
Con `ColumnLabels`: `nombre=Nombre completo, importe=Importe (€)`. Se aplica al encabezado, al Excel exportado, al placeholder del filtro y al selector de columnas; la etiqueta también sirve como identificador en `FieldConfigurations`, `DateFormats`, `RowColorRules` e `InitialColumns`. Los `titulos` de una vista (§8.10) renombran solo dentro de esa vista.

**¿Cómo quito todos los filtros de golpe?**
Con el botón de **filtro tachado** de la barra (*Limpiar filtros*, §7.12): borra el buscador global, los filtros de todas las columnas, los rangos de fecha y la vista elegida, y vuelve a la página 1. Está deshabilitado si la grilla no está filtrada.

**¿Los colores de fila se aplican al Excel exportado?**
No, la exportación no lleva colores.

**¿El control modifica datos?**
No: es de solo lectura. Muestra, filtra, ordena, publica la selección de ids y exporta.

**¿Funciona en formularios model-driven?**
Sí, es un control de dataset; los *defaults* del manifest aplican cuando la propiedad no está configurada.

**¿Hay límite de columnas?**
No: el selector de columnas lista **todas** las columnas del dataset (con su tipo de dato) y el usuario final puede ocultar o volver a mostrar cualquiera. `InitialColumns` solo define cuáles vienen visibles al abrir.

**¿Necesito la fuente PrimeIcons?**
No. Todos los iconos del control son SVG en línea.

## 12. Ajustes rápidos de la barra

Todo está en `ModernDataGrid/components/DataGrid.css`:

| Quiero… | Cambiar |
|---|---|
| **Todo en una sola fila** | `.modern-data-grid-header` y `.modern-data-grid-actions` usan `flex-wrap: nowrap !important`; el título (`> h4`) se recorta con puntos suspensivos y el buscador (`flex: 1 1 8rem`) es el que se contrae |
| Altura de todos los controles | `height: 2.25rem` en `.modern-data-grid-actions .p-inputtext, .p-multiselect, .p-dropdown, .p-button.p-button-icon-only` |
| Iconos más grandes o más pequeños | `width/height` de `.p-button .p-button-icon svg` (hoy `1rem`) y `> .p-input-icon svg` (hoy `1rem`) |
| Combo de vistas más ancho o más corto | `flex` / `min-width` de `.modern-data-grid-view-selector` (hoy `0 1 10rem` / `6rem`) |
| Buscador más ancho o más corto | `flex` / `min-width` de `.modern-data-grid-actions .p-icon-field.p-icon-field-left` (hoy `1 1 8rem` / `4.5rem`) |
| Selector de columnas más ancho | `width` / `min-width` de `.modern-data-grid-column-selector` (hoy `2.25rem`, solo el icono) |
| Ver los nombres/placeholder en el combo de columnas | Quitar la regla que oculta `.p-multiselect-label` |
| Botones del pie del selector de columnas | `.modern-data-grid-panel-button` (color, tamaño, separación) |
| Tooltips más anchos o más estrechos | `max-width` de `.p-tooltip .p-tooltip-text` (hoy `20rem`) |
| Calendario de rango más ancho | `min-width` de `.modern-data-grid-date-filter` (hoy `17rem`) |
| Tamaño de página del pie | `getPageSize()` en `DataGrid.tsx` (las filas que elige el usuario con el desplegable; si no, el tamaño de la app `displayPageSize` y, si no, 25). Carga de la fuente: `requestWholeSource()` con `maxLoadedRows` (10000), `maxAutoLoadedRows` (2000, fondo) y `maxLoadRetries` (3) |

## 13. Historial de versiones

| Solución / control | Cambios |
|---|---|
| `1.0.0.37` / `0.0.50` | **Un formato por tipo de fecha y aplicación estricta por tipo de dato.** (1) Se **retira** el combo global `DateFormat` (36 opciones): los formatos de fecha quedan en **tres** propiedades, una por tipo de dato: `DateFormats` (columnas de solo fecha), `DateTimeFormats` (columnas de fecha y hora) y `TimeFormats` (columnas de solo hora). (2) Cada propiedad se aplica **automáticamente solo a las columnas de su tipo**: si la columna escrita no es de ese tipo (por ejemplo una columna de fecha y hora puesta en `DateFormats`, o una columna de texto), el formato **no se aplica** y la columna se queda con el valor por defecto de su tipo (`yyyy-MM-dd`, `yyyy-MM-dd HH:mm:ss` o `HH:mm:ss`); la consola lo avisa una vez por columna y propiedad. No hay cadenas de respaldo entre propiedades, así que un error de ubicación nunca cambia el formato de otra columna. (3) Las propiedades `DateFormats`, `DateTimeFormats` y `TimeFormats` aceptan el patrón escrito tal cual (el espacio entre fecha y hora es un carácter literal: `dd/MM/yyyy HH:mm`) o un token del catálogo de §8.3. (4) Se mantienen `CurrencyFormats`, `NumberFormats`, `DecimalFormats` y `BooleanLabels` (no son formatos de fecha). (5) En esta misma entrega se retira la propiedad heredada `FieldConfigurations`, la selección de columnas pasa a llamarse `CamposVisibles` (*Campos visibles*) y su selector lista todas las columnas del dataset con su tipo de dato. Sin cambios en dataset, buscador, filtros (rango de fechas incluido), vistas, paginación, selección, colores ni exportación |
| `1.0.0.35` / `0.0.48` | **Barra en una sola fila, más compacta, y selector de columnas completo.** (1) La barra ya no se reparte en varias líneas: título + combo de vistas + selector de columnas + buscador + botones van en **una sola fila** (`flex-wrap: nowrap`), con controles de `2.25rem` de alto, iconos de `1rem`, menos separación y un título que se recorta con puntos suspensivos si falta espacio. (2) El **selector de columnas** (Mostrar u ocultar columnas) ahora lista **todas las columnas del dataset** (antes, si `InitialColumns` estaba definido, la lista se limitaba a esas columnas y podía parecer incompleto), muestra el **tipo de dato** de cada columna (Texto, Fecha y hora, Número, Moneda, Sí/No, Opción, Correo…, traducido al idioma del control) y añade al pie los botones **Todas** y **Quitar todas** (desmarca todo; con *Todas* se vuelve a marcar). El disparador es cuadrado, solo con su icono. (3) `InitialColumns` pasa a definir únicamente las columnas **visibles al abrir** y ya no limita lo que el usuario puede mostrar; si su texto no coincide con ninguna columna, la consola lo avisa y se muestran todas. (4) Nuevo helper `helpers/ColumnTypes.ts` con el nombre traducido del tipo de dato. Sin cambios en dataset, buscador, filtros (rango de fechas incluido), vistas, paginación, selección, colores ni exportación |
| `1.0.0.34` / `0.0.47` | **Propiedades de formato separadas, filtro por rango de fechas y vistas (informes).** (1) `FieldConfigurations` se acompaña de propiedades dedicadas por tipo de formato: `CurrencyFormats` (moneda, `locale`, `decimals`), `DateFormats` (solo fecha), `DateTimeFormats` (fecha y hora), `TimeFormats` (solo hora), `NumberFormats` (decimales, separador de miles e idioma regional), `DecimalFormats` (atajo de decimales) y `BooleanLabels` (etiquetas Sí/No). Aceptan token del combo o patrón libre y tienen **prioridad** sobre `FieldConfigurations`, que se mantiene por compatibilidad; el combo global `DateFormat` queda como último recurso. (2) En las columnas de **fecha y fecha y hora** el filtro del embudo pasa a ser un **selector de rango de fechas** (calendario con día inicial y final, ambos incluidos, con *Hoy* y *Limpiar*); el rango se evalúa contra la fecha real del registro y se respeta en la exportación a Excel, así que funciona con cualquier formato visible. (3) Nueva propiedad **`Views`**: vistas/informes en JSON (nombre, descripción, columnas, títulos, filtros, orden, archivo y hoja) que el usuario final elige en un **combo junto al selector de columnas**; al elegir una vista la grilla cambia de columnas, títulos, filtros y orden, el Excel usa su archivo y su hoja, y los filtros manuales se suman a los de la vista. Incluye operadores `=`, `!=`, `%…%`, `…%`, `%…`, `>`, `>=`, `<`, `<=` y análisis tolerante (JSON estricto o formato de objeto con `;` y claves sin comillas). (4) Corregido el **tooltip de los botones de la barra** (el texto salía amontonado): ahora tiene ancho de lectura, interlineado y salto de palabra. (5) Rendimiento: los formatos se analizan una vez por cambio, la vista compilada y sus opciones se memoizan, el rango de fechas usa un campo oculto con la fecha en milisegundos y el modelo de filtros sigue indexado por columna (sin recorridos extra por fila). (6) El orden de las columnas de fecha y fecha y hora pasa a ser **cronológico** (se ordena por la fecha real, no por el texto de la celda), tanto al pulsar el encabezado como al aplicar `ordenarPor` de una vista. Sin cambios de comportamiento en lo que ya funcionaba (dataset, buscador, paginación, selección, colores, Excel estándar) |
| `1.0.0.33` / `0.0.46` | **Corregido: las páginas se veían en blanco (o parpadeando) a partir de la segunda/tercera.** PrimeReact no combina paginador con scroll virtual: el `DataTable` vuelve a recortar con `dataToRender` el trozo que ya había recortado el `VirtualScroller`, de modo que toda página posterior al viewport (~40 filas) quedaba vacía. Ahora el **scroll virtual se usa solo cuando el paginador está desactivado** (`DisplayPagination = false`, lista completa virtualizada); con el paginador activo se renderizan únicamente las filas de la página (`Default Rows`), que es más rápido y evita el parpadeo. No cambia propiedades ni el resto del comportamiento |
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



