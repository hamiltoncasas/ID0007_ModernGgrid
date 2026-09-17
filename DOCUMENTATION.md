# Modern Data Grid (PCF) — Documentación

Control de código (Power Apps Component Framework) que muestra un dataset de Dataverse en una grilla moderna con React y PrimeReact, pensada para **Canvas Apps** y **formularios model-driven**.

---

## 1. Identidad y versiones

| Elemento | Valor |
|---|---|
| Nombre de la solución | `ID0007_ModernGrid` (nombre para mostrar `ID0007`) |
| Publicador / prefijo | `ID0007` |
| Versión de la solución | `1.0.0.20` |
| Control | `ID0007.ModernDataGrid` (constructor `ModernDataGrid`) |
| Versión del control (manifest) | `0.0.33` |
| Namespace | `ID0007` — **nunca** volver a `GUK` (ya existe `GUK.ModernDataGrid` de otro publicador y la importación falla) |

> La versión del manifest (`0.0.33`) y la versión de la solución (`1.0.0.20`) son independientes. Para que Dataverse **actualice** la solución ya instalada, la versión de la solución debe ser mayor que la importada.

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
| `Enable` | `true` para permitir la selección de registros |

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
| `FieldConfigurations` | TextArea | ejemplo de moneda/fecha/decimal/booleano | — | Formato de valores por tipo de dato (ver §7.1 y limitación en §10) |
| `InitialColumns` | TextArea | vacío | todas | Columnas iniciales, separadas por comas: **nombre, alias o nombre para mostrar**. Vacío = todas |
| `Language` | Enum (`en` \| `es`) | `en` | `en` | Idioma de todos los textos del control |
| `RowColorRules` | TextArea | vacío | sin colores | Colorea el registro completo según el valor de una columna (ver §7.6) |

> En Canvas, el valor que pongas en la app siempre manda; el *default* del manifest se usa al insertar el control y en escenarios model-driven.

## 6. Funcionalidades

- Buscador global por palabra clave sobre todas las columnas cargadas.
- Filtro **Contiene** por columna (panel desplegable con el campo de búsqueda).
- Ordenamiento por columna.
- Paginación contra el *paging* del dataset + selector de filas por página y botón de refresco.
- Selección de registros (múltiple o con checkbox) sincronizada con el dataset.
- **Selector de columnas para el usuario final** (mostrar/ocultar columnas en tiempo de ejecución).
- **Exportación a Excel (.xlsx real)** de lo que está filtrado.
- **Coloreado del registro completo** según el valor de una columna.
- Idiomas **español / inglés** para todos los textos (incluidos los internos de la grilla).
- Formato de valores por tipo de dato (moneda, fecha, decimal, sí/no, teléfono, URL).
- Scroll horizontal y vertical contenido en el tamaño del control (sin desbordar la página).

## 7. Detalle de funcionalidades

### 7.1 Buscador global
Se muestra si `DisplaySearch = true` (dentro de la barra, que requiere `DisplayHeader = true`). Filtra en vivo, ignorando mayúsculas y **acentos**, sobre el valor ya formateado de **todas** las columnas de los registros cargados. Se combina (AND) con los filtros por columna.

### 7.2 Filtros por columna (Contiene)
Con `AllowFiltering = true` cada columna muestra el **icono de embudo**; al pulsarlo se despliega un panel con:
- selector de coincidencia (**Contenga** por defecto, más *Comience con*, *Termine con*, *Igual a*, etc.),
- el campo de búsqueda,
- y los botones **Limpiar** / **Aplicar**.

Escribe y filtra **mientras escribes** (con un pequeño retardo), y acepta `Enter`. El embudo se resalta cuando la columna tiene un filtro activo. Los textos del panel salen del idioma activo (*Contenga*, *Aplicar*, *Limpiar*…).

### 7.3 Ordenamiento
Con `AllowSorting = true` se puede ordenar por cada columna (ascendente/descendente) sobre las filas cargadas.

### 7.4 Paginación y refresco
El paginador trabaja **contra el dataset** (`loadNextPage`, `loadPreviousPage`, `loadExactPage`, `setPageSize`), por lo que se puede recorrer todo el conjunto de datos aunque no esté cargado de golpe. El botón de **refrescar** (icono circular) vuelve a la página 1 y llama a `DataSource.refresh()`, limpiando además la selección.

### 7.5 Selección de registros
`SelectionMode`: `multiple` o `checkbox`. La selección se publica en el dataset (`setSelectedRecordIds`), de modo que la app puede leerla. Con `IsEnabled = false` no se permite seleccionar.

### 7.6 Selector de columnas (usuario final)
En la barra hay un desplegable que lista **las columnas disponibles** para que el usuario final las marque o desmarque en tiempo de ejecución (por ejemplo, para no ver una columna que no necesita). El disparador **no muestra texto ni etiquetas** (solo su icono), para que la barra no se desborde. `InitialColumns` define la lista inicial disponible; vacío = todas las columnas del dataset. La selección del usuario no modifica el dataset, solo lo que se pinta (y lo que se exporta).

### 7.7 Exportar a Excel
Botón con el icono de Excel en la barra. Genera un archivo **`.xlsx` real** (Office Open XML) sin librerías externas, con:

- **Solo las filas visibles**: aplica el mismo criterio que la grilla (buscador global + filtros por columna) sobre los registros cargados.
- **Solo las columnas visibles** según el selector de columnas / `InitialColumns`.
- Encabezados con el nombre para mostrar y en negrita, ancho de columna automático.
- Los valores tal como se ven en la grilla (ya formateados).
- Nombre de archivo: `HeaderText` (o el nombre de la entidad) + marca de fecha/hora. Hoja: `Datos` en español, `Data` en inglés.

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

Claves soportadas por tipo de dato:

| Tipo de dato | Clave | Valor de ejemplo | Resultado |
|---|---|---|---|
| `Currency` | `currency` | `GBP` | `£1,234.50` |
| `DateAndTime.DateOnly` | `dateFormat` | `dd/MM/yyyy` | fecha corta |
| `DateAndTime.DateAndTime` | `dateFormat` | `dd/MM/yyyy HH:mm` | fecha y hora |
| `Decimal` | `decimalPlaces` | `3` | `7.123` |
| `TwoOptions` | `trueLabel` / `falseLabel` | `Sí` / `No` | texto en lugar de Yes/No |
| `SingleLine.Phone` | — | — | se prefija con `tel:` |
| `SingleLine.URL` | — | — | se prefija con `<a href=…>` |

> ⚠️ **Hoy esta propiedad no se aplica** (ver §10.1). Los valores se muestran con los formatos por defecto: moneda **USD**, fechas `yyyy-MM-dd` / `yyyy-MM-dd HH:mm:ss`, decimales con **2** posiciones y `Yes`/`No`.

### 8.3 `RowColorRules`
Detallado en §7.8. Resumen de la gramática:

```text
columna = regla [ "|" regla ]* [ "," columna = regla [ "|" regla ]* ]
regla   = ( valor | "~" valor | "*" ) ":" colorFondo [ ":" colorTexto ]
```

## 9. Detalles técnicos

### 9.1 Estructura del proyecto

| Archivo | Contenido |
|---|---|
| `ModernDataGrid/ControlManifest.Input.xml` | Manifest: propiedades, recurso y versión del control |
| `ModernDataGrid/index.ts` | Punto de entrada PCF (React) |
| `ModernDataGrid/components/DataGrid.tsx` | Grilla: estado, filtros, paginación, selección, exportación, idioma |
| `ModernDataGrid/components/DataGrid.css` | Layout del control y de la barra de herramientas |
| `ModernDataGrid/components/ExcelIcon.tsx` | Icono SVG de Excel |
| `ModernDataGrid/helpers/Utils.ts` | Formateo de fechas |
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
3. Sube la versión de la solución en `Solution.xml` si vas a importar la actualización.
4. Empaqueta con MSBuild y verifica que el log muestre `- ID0007.ModernDataGrid`.
5. Importa **solo** el ZIP recién generado.

### 9.4 Notas de implementación (mantenimiento)

- **Iconos**: todos los iconos de la barra (buscador, refrescar, Excel) son **SVG en línea**; el control **no depende de la fuente de PrimeIcons**. Si añades iconos, usa `primereact/icons/*` o un SVG propio, no clases `pi pi-*` (en algunos entornos la fuente no carga y el icono queda vacío).
- **Paneles flotantes**: el panel de filtro de columna y el del selector de columnas se renderizan con el `Portal` de PrimeReact en `document.body`, así que el `overflow: hidden` de la raíz no los recorta.
- **Modelo de filtros**: mantener el estado controlado en la forma `{ campo: { operator: AND, constraints: [{ value, matchMode }] } }`. El modo `menu` de PrimeReact escribe en `constraints[i].value`; el formato antiguo `{ value, matchMode }` deja de filtrar sin dar error. `getFiltersForTable()` garantiza un modelo por columna antes de renderizar.
- **Colores de fila**: PrimeReact 10 no tiene `rowStyle`, así que se usa `rowClassName` + una hoja `<style data-modern-data-grid="row-colors">` que se elimina al desmontar.
- **Exportación**: se aplican los mismos criterios que la grilla usando `FilterService` de PrimeReact, para que los modos de coincidencia coincidan exactamente.
- **Idioma**: se registra con `addLocale('es', …)` y se activa con `locale('es')` (PrimeReact lee la locale global al pintar), por eso se aplica en el constructor y en `shouldComponentUpdate`.
- **Layout de la barra**: `flex-wrap` + altura uniforme de 2,5 rem; el selector de columnas oculta su etiqueta para no desbordar.

## 10. Limitaciones conocidas

### 10.1 `FieldConfigurations` no se aplica (pendiente)
Verificado en ejecución: con y sin configuración el resultado es idéntico.

| Configuración | Resultado obtenido | Resultado esperado |
|---|---|---|
| `amount=currency:GBP` | `$1,234.50` | `£1,234.50` |
| `qty=decimalPlaces:3` | `7.12` | `7.123` |
| `flag=trueLabel:Si\|falseLabel:No` | `Yes` | `Si` |
| `date=dateFormat:dd/MM/yyyy` | `2026-09-16` | `16/09/2026` |

**Causa**: `mapRecordsToState` entrega a los manejadores el objeto completo (`{ columna: { clave: valor } }`) y los manejadores leen claves de primer nivel (`config.currency`, `config.dateFormat`, …), por lo que nunca encuentran el valor configurado. **Arreglo**: buscar el bloque de cada columna (`col.name`, alias o nombre para mostrar) antes de invocar el manejador, manteniendo los valores por defecto actuales como respaldo. Es un cambio de comportamiento visible (la moneda/fechas/decimales empiezan a respetar la configuración), así que se aplica solo si se aprueba.

### 10.2 Alcance de la exportación
El `.xlsx` contiene las filas **cargadas** en el control que cumplen los filtros activos, no la tabla completa sin paginar. Para más filas hay que ampliar `Default Rows` en la app (o cargar más páginas).

### 10.3 Teléfono y URL
Los tipos `SingleLine.Phone` y `SingleLine.URL` se prefijan con `tel:` y `<a href="…">` respectivamente, pero el control los pinta **como texto**, así que se ve el marcado literal (`<a href="https://…">…</a>`). Pendiente: renderizar un enlace real.

### 10.4 Valores con separadores reservados
En `FieldConfigurations` y `RowColorRules` los caracteres `:`, `|` y `,` son separadores, por lo que un valor que los contenga no se puede expresar literalmente.

### 10.5 Filtros y orden sobre lo cargado
Los filtros por columna y el ordenamiento actúan sobre las filas ya cargadas en la grilla; la carga de más filas la gobierna el *paging* del dataset.

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

## 12. Ajustes rápidos de la barra

Todo está en `ModernDataGrid/components/DataGrid.css`:

| Quiero… | Cambiar |
|---|---|
| Combo de columnas más ancho | `min-width: 4.5rem` en `.modern-data-grid-column-selector` |
| Ver los nombres/placeholder en el combo | Quitar la regla que oculta `.p-multiselect-label` |
| Iconos más grandes | `width/height` de `.p-button .p-button-icon svg` (hoy `1.15rem`) y `> .p-input-icon svg` (hoy `1.05rem`) |
| Barra más alta o más baja | `height: 2.5rem` en `.p-inputtext`, `.p-multiselect` y `.p-button.p-button-icon-only` |

## 13. Historial de versiones

| Solución / control | Cambios |
|---|---|
| `1.0.0.20` / `0.0.33` | Iconos de buscar, refrescar y exportar como **SVG en línea** (sin depender de la fuente de PrimeIcons, que en algunos entornos no carga y dejaba iconos vacíos); barra con altura uniforme de 2,5 rem; botones cuadrados alineados con el buscador; combo de columnas más grande; documentación en `DOCUMENTATION.md` |
| `1.0.0.19` / `0.0.32` | Nueva propiedad **`RowColorRules`** para colorear el registro completo según el valor de una columna (con `~` contiene, `*` comodín, color de texto, hover y selección) |
| `1.0.0.18` / `0.0.31` | Nueva propiedad **`Language`** (`en`/`es`) que traduce el control y los textos internos de PrimeReact; barra con `flex-wrap` para que ningún botón quede fuera; iconos SVG de refrescar y exportar |
| `1.0.0.17` / `0.0.30` | Filtros por columna con **panel desplegable y *Contiene*** (antes no filtraban); **selector de columnas** para el usuario final; **exportar a Excel** (`.xlsx` real sin dependencias) |
| `1.0.0.16` / `0.0.29` | Identidad `ID0007` (namespace corregido, ya no `GUK`) y guía del proyecto en `.github/skills` |

---

**Repositorio**: `git@github.com:hamiltoncasas/ID0007_ModernGgrid.git` (rama `main`).



