---
name: modern-data-grid
description: "Use when modifying, debugging, building, packaging, or publishing the Modern Data Grid Power Platform PCF control. Covers React/PrimeReact behavior, Dataverse solution metadata, PCF namespace conflicts, managed and unmanaged ZIP generation, and validation."
---

# Modern Data Grid Skill

## Purpose

Use this skill to continue development of the Modern Data Grid PCF control in Power Platform. Preserve the existing behavior and solution identity unless the user explicitly requests a new identity or version.

## Project Structure

- `ModernDataGrid/ControlManifest.Input.xml`: PCF manifest and namespace.
- `ModernDataGrid/index.ts`: PCF React entry point.
- `ModernDataGrid/components/DataGrid.tsx`: main React/PrimeReact grid.
- `ModernDataGrid/components/DataGrid.css`: sizing, overflow, and styles.
- `ModernDataGrid/helpers/Utils.ts`: formatting helpers.
- `ModernDataGrid/helpers/ExcelExport.ts`: dependency-free XLSX writer (the OPC/ZIP container is built by hand).
- `ModernDataGrid/helpers/RowColoring.ts`: parser and compiler of the row color rules.
- `ModernDataGrid/helpers/Localization.ts`: `en`/`es` strings and the Spanish PrimeReact locale.
- `ModernDataGrid/helpers/DateFormat.ts`: catalog of the date patterns (`DateFormats`/`DateTimeFormats`/`TimeFormats`) plus `resolveDatePattern()` (token or literal pattern).
- `ModernDataGrid/helpers/FieldFormats.ts`: per-column formats (`CurrencyFormats`, `DateFormats`, `DateTimeFormats`, `TimeFormats`, `NumberFormats`, `DecimalFormats`, `BooleanLabels`) with strict matching by column data type.
- `ModernDataGrid/helpers/Views.ts`: `Views` property (views/reports): tolerant JSON parsing, filter grammar (`=`, `!=`, `%…%`, `>`, `>=`, `<`, `<=`), column/title resolution and the exported file name/sheet.
- `ModernDataGrid/helpers/ColumnTypes.ts`: translated name of each column data type (shown in the column selector).
- `ModernDataGrid/helpers/ColumnLabels.ts`: display-name overrides for column headers (`ColumnLabels`).
- `ModernDataGrid/components/ExcelIcon.tsx`: inline SVG icon for the Excel button.
- `Modern-Data-Grid.pcfproj`: PCF MSBuild project.
- `Solution/ModernDataGrid/ModernDataGrid.cdsproj`: Dataverse solution project.
- `Solution/ModernDataGrid/src/Other/Solution.xml`: solution and publisher metadata.
- `Solution/ModernDataGrid/bin/Release/`: generated solution ZIPs.
- `DOCUMENTATION.md`: maker and user documentation (properties in detail §5.1, copy-ready examples §5.2, per-data-type formats §8.x, import checklist §9.5, troubleshooting and FAQ §11, changelog §13). Update it together with the manifest whenever properties change.

## Current Identity

- Solution unique name: `ID0007_ModernGrid`
- Solution display name: `ID0007`
- Publisher unique name, name, and description: `ID0007`
- Publisher customization prefix: `ID0007`
- Solution version: `1.0.0.37`
- PCF control name: `ID0007.ModernDataGrid`
- PCF constructor: `ModernDataGrid`

The namespace must remain `ID0007`. Never restore `GUK`; Dataverse already has `GUK.ModernDataGrid` owned by another publisher and importing it fails. If the identity changes, update both `Solution.xml` and `ControlManifest.Input.xml`, then rebuild the PCF before packaging.

## Implemented Features

- Dataset-backed PCF control using React and PrimeReact.
- Header, global search, sorting, pagination, selection, and per-column filtering.
- Global search across mapped record fields.
- Column filters controlled through `filters` and `onFilter`; keep this callback when editing filters.
- Manual refresh button that resets paging and calls `DataSource.refresh()`.
- The pagination report shows the visible range plus the **filtered** count (`Mostrando 51 a 54 registros · Filtrados: 54`), not the database total.
- `CamposVisibles` property: comma-separated column names, aliases, display names or `ColumnLabels` labels; empty means all columns (it only sets the initial visible set).
- Internal horizontal and vertical scrolling constrained to the PCF host dimensions.
- Managed and unmanaged solution packaging.
- Per-column formats split by concern (`CurrencyFormats`, `DateFormats`, `DateTimeFormats`, `TimeFormats`, `NumberFormats`, `DecimalFormats`, `BooleanLabels`). The three date properties apply **only** to columns whose data type matches them.
- Date and date-and-time columns filter through an inline **range calendar** (`between`, both endpoints included) backed by the hidden milliseconds field.
- `Views` property: a combo next to the column selector applies ready-made reports (columns, titles, filters, sorting, exported file and sheet).
- Column selector for the end user: lists every data set column with its translated data type, plus **Select all** / **Clear all** buttons in the panel footer.
- Toolbar on a single compact row (title truncates, the search box shrinks).
- Per-column filters use the `menu` display: the funnel icon opens a panel with the search input and `Contains` as the default match mode.
- Column selector in the toolbar: the end user can show or hide any column available in the dataset. `CamposVisibles` defines the starting set and stays respected.
- Excel export button in the toolbar: writes a real `.xlsx` (generated in `helpers/ExcelExport.ts`) with the rows currently matching the global search and the per-column filters, using the visible columns only.
- Sorting stays delegated to PrimeReact through the `sortable` columns and the `AllowSorting` property.
- `Language` property (`Enum`: `en`/`es`) translates the control texts and the PrimeReact internals (filter panel, match modes, paginator, column selector).
- The column selector trigger shows only its icon: no chips and no label, so the toolbar never overflows.
- The toolbar wraps (`flex-wrap`) and every toolbar control is 2.5rem tall, so nothing is ever pushed out of view; all toolbar icons (search, refresh, Excel) are inline SVG and the control no longer depends on the PrimeIcons font.
- `RowColorRules` property: colors the whole row from a column value (`columna=valor:#fondo[:texto]|valor:#fondo`, `~` for contains, `*` for any value).
- Per-column formats: the column is matched by name, alias, display name or `ColumnLabels` label with `normalizeText()` (case, accents and outer spaces ignored). `CurrencyFormats` sets the currency, `NumberFormats`/`DecimalFormats` the decimals and locale, `BooleanLabels` the Yes/No labels and the three date properties the date patterns.
- `ColumnLabels` property: display names for the end user (`columna=Nombre`); applied to the grid header, the Excel header, the filter placeholder and the column selector, and usable as a column identifier in the other config properties.
- Clear filters button: resets the global search and every column filter and goes back to page 1; it is disabled while nothing is filtered.
- Pagination over the loaded rows (never depends on `totalResultCount`) plus an extra page while the source has more rows: asking for it calls `loadNextPage()` and the view jumps when the rows arrive. Missing source pages are also loaded automatically (capped at 2000 rows).
- Refresh button reloads from the origin: clears the selection (`clearSelectedRecordIds()`), resets paging, calls `DataSource.refresh()` and asks for the whole source in one big page (plus the page-by-page fallback with retries), so the footer, the search, the filters and the Excel export work again on **all** the records of `Items`, trailing partial page included.

## Layout Rules

The root `modern-data-grid` element must keep `width: 100%`, `height: 100%`, `min-width: 0`, `min-height: 0`, and `overflow: hidden`. The DataTable wrapper owns scrolling. Do not set overflow on arbitrary parent elements with JavaScript or move scrolling to the page. The column filter panel and the column selector panel are rendered by PrimeReact `Portal` into `document.body`, so they are not clipped by that rule.

## Filter Model

Keep the controlled filter state in the `menu` shape:

```text
{ [field]: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] } }
```

With `filterDisplay="menu"` PrimeReact writes the typed value into `constraints[index].value` and reads `filterModel.operator`. The legacy row shape `{ value, matchMode }` silently stops filtering because the row input writes `filterModel.value` while the filter engine reads the constraints. `getFiltersForTable()` guarantees one model per dataset column before rendering so the panel always has a model to write into. Keep `filters` and `onFilter` wired together when editing the filter code.

`showApplyButton` is set to `false` so typing filters immediately (PrimeReact debounces with `filterDelay`); the panel keeps its Clear button.

## Excel Export

`helpers/ExcelExport.ts` builds the workbook without adding dependencies: it writes `[Content_Types].xml`, `_rels/.rels`, `xl/workbook.xml`, `xl/_rels/workbook.xml.rels`, `xl/styles.xml` and `xl/worksheets/sheet1.xml` (inline strings, bold header) into a ZIP container whose entries are deflated with the browser `CompressionStream` (`deflate-raw`) and stored uncompressed when that API is unavailable.

`DataGrid.getRecordsForExport()` reproduces what the grid shows: the existing global search plus the per-column constraints, evaluated with `FilterService` from `primereact/api` so the match modes stay identical to PrimeReact. When a constraint carries **no `matchMode`**, the fallback must be the column's own mode (`FilterMatchMode.CONTAINS`, as declared in the `Column`), never `STARTS_WITH`: PrimeReact filters those constraints with `contains`, so any other default makes the file disagree with the grid (that bug exported 1 row while the grid showed 23). The export contains every row loaded in the control that matches the filters, formatted with the same `FieldConfigurations`, using only the currently visible columns (the same `getVisibleColumns()` the grid renders, so the two lists cannot diverge). `exportToExcel()` logs `[ModernDataGrid] exportando a Excel { columnas, filas, filasCargadas }`.

## Localization

`helpers/Localization.ts` holds the `GridStrings` for `en` and `es`, plus `applyPrimeReactLanguage()` which registers the Spanish locale with `addLocale('es', ...)` and activates it with `locale('es')`; PrimeReact reads the global locale while rendering, so the language is applied in the constructor and in `shouldComponentUpdate` before the table renders.

`Language` is an `Enum` property. Its `<value>` nodes require **text content** as well as `name` and `display-name-key`, because the manifest schema requires `_` and the type generator builds `EnumProperty<"en" | "es">` from that text:

```xml
<value name="es" display-name-key="Español">es</value>
```

Any user-facing text added to the grid must be added to `GridStrings` (both languages) instead of being hardcoded in the component.

## Row Coloring

`RowColorRules` (`SingleLine.TextArea`) paints the whole `<tr>` from a column value:

```text
estado=Activo:#DFF6DD|Pendiente:#FFF4CE:#7A4F01, prioridad=~alta:#FDE7E9, ciudad=*:#F5F5F5
```

- `,` separates columns, `|` separates rules of the same column and `:` separates the value, the background color and the optional text color.
- `~valor` means contains; `*` matches any value, so place it last inside its column to keep it as the fallback.
- Column tokens accept name, alias or display name; comparison ignores case and accents.
- The first matching rule in written order wins.
- PrimeReact 10 has **no** `rowStyle` prop, so colors must be applied through `rowClassName` plus CSS.
- `helpers/RowColoring.ts` compiles the text into one class per rule plus its stylesheet; `DataGrid.getRowClassName()` feeds `DataTable rowClassName` and the CSS is published once through a `<style data-modern-data-grid="row-colors">` element removed on unmount.
- The generated CSS covers the normal state, the hover state (`:not(.p-highlight):hover`, background darkened 6%) and the selected state (`.p-highlight` keeps the rule color and adds an inset highlight).
- Unknown columns or invalid colors are ignored with a `console.warn`; with the property empty the grid behaves exactly as before.

## Value Formatting

Formats are resolved **per column** by `helpers/FieldFormats.ts`: the column is matched by name, alias, display name or `ColumnLabels` label with `normalizeText()` (case, accents and outer spaces ignored). Without an entry the type handler falls back to its defaults (`USD`, 2 decimals, `Yes`/`No`, `yyyy-MM-dd` / `yyyy-MM-dd HH:mm:ss` / `HH:mm:ss`).

Date patterns come only from the property that matches the column data type:

```ts
DateFormats     -> DateAndTime.DateOnly      // e.g. Fecha=dd/MM/yyyy
DateTimeFormats -> DateAndTime.DateAndTime   // e.g. FechaSolicitud=dd/MM/yyyy HH:mm
TimeFormats     -> DateAndTime.TimeOnly      // e.g. HoraInicio=HH:mm
```

A column listed under a property of another type is **ignored** (`findDateAssignment()` returns nothing and warns once), so a typo never changes a format. The value can be a literal pattern (the space between date and time is a literal character: `dd/MM/yyyy HH:mm`) or a token from `DATE_FORMAT_OPTIONS` in `helpers/DateFormat.ts` (resolved by `resolveDatePattern()`).

Values are formatted **before** filtering, row coloring and export, so a format change also changes what those features see.

## Column Labels

`ColumnLabels` (SingleLine.TextArea) sets the display name of each column for the end user:

```text
nombre=Nombre completo, importe=Importe (€)
```

`helpers/ColumnLabels.ts` resolves every entry against the dataset columns with `normalizeText()` (name, alias or display name; case/accent insensitive) and warns on unknown columns or malformed entries. `DataGrid.getColumnHeader()` is the **single source** for the header text and feeds the grid header, the Excel header, the per-column filter placeholder and the column selector options. The label is also accepted as a column identifier by `InitialColumns`, `getColumnConfiguration()` and `compileRowColors()`.

## Dataset Sync (critical)

`ComponentFramework.PropertyTypes.DataSet` has **no `raw`**, so the parameter loop in `shouldComponentUpdate` never detects that the dataset changed. On its own that makes the grid miss new pages and reloads: `componentDidUpdate` never runs, `mapRecordsToState()` is not called and the footer keeps paginating stale rows (this is why the pager used to break after pressing Refresh). Keep the row signature check:

```ts
getRowSignature(dataSet) // `${loading ? 1 : 0}|${ids.length}|${firstId}|${lastId}`
```

- `shouldComponentUpdate` returns `true` as soon as `getRowSignature(nextProps…DataSource) !== this.processedRowSignature`; `componentDidUpdate` stores the signature and maps the records when it changed (`rowsChanged`).
- `refreshData()` and `componentDidMount()` reset `processedRowSignature = ''` so a reload of the same page is still detected.
- A pure row change only re-maps and repaints (`forceUpdate()`); structural changes (data source, filters, field configurations) still go through `forceRefreshDataset()` and `notifyOutputChanged()`.

## Pagination

The footer works in two layers: it paginates over the loaded rows **and** it can pull the missing ones from the source.

`getPaginationProps()` returns `paginator`, `rows` (`getPageSize()`), `totalRecords`, `first` and `onPage`:

- `totalRecords = getFilteredRecordCount() + (hasMoreRowsInSource() ? pageSize : 0)`, so when the source still has rows the footer shows **one extra page** to go and get them.
- `first = (currentPage - 1) * pageSize`, with `currentPage` in state. Never let `first` point past the loaded rows: `onPageChange` only moves `currentPage` when `targetPage <= getLoadedPageCount()`; otherwise it stores `pendingPage` and calls `requestMoreRows()` (which resets the auto-load guard and calls `loadNextPage()`).

`componentDidUpdate` calls `applyPendingPage()`, which moves the view to `pendingPage` as soon as the loaded pages cover it and keeps asking while `hasMoreRowsInSource()`. A 6 s `pendingTimeout` releases the pending state (`extraPageDismissed = true`) if the source never answers, so the footer never stays blocked; any new rows set `extraPageDismissed = false` again.

`hasMoreRowsInSource()` is true when `paging.hasNextPage` is true, when `totalResultCount` is greater than the loaded rows, or (heuristic for hosts that report `-1`) when the loaded row count is a whole multiple of the page size. Do not derive the footer from `paging.totalResultCount` alone: hosts that cannot page the source report `-1`, the footer stops responding, and a controlled `first` can point past the loaded rows and leave the table empty.

`requestWholeSource()` asks the host for one page as big as the cap (`paging.setPageSize(maxLoadedRows = 10000)` + `paging.reset()`), so the whole source — **including the trailing partial page** (113 records with `Default Rows = 25` → 113 loaded, 5 footer pages) — arrives in one shot. It stores the app page size in `this.displayPageSize` and pins it in `pageSizeOverride`, so the footer keeps paging on screen with the app size while the dataset page is huge. It is called on mount, on refresh and on clear filters, and it logs `[ModernDataGrid] pidiendo toda la fuente`. It does nothing when `paging.pageSize` is already at the cap, so hosts that ignore `setPageSize` simply fall back to the page-by-page chain.

`ensureMoreRowsLoaded(force = false)` is called on mount, from `componentDidUpdate`, from the load watch and from `requestMoreRows()`. It skips while `dataSet.loading`, respects `maxAutoLoadedRows` (2000) for the background load and `maxLoadedRows` (10000) while `this.deepLoad` is true (`componentDidMount` and `refreshData()`), and attempts `loadNextPage()` when `hasNextPage` is true or when `hasMoreRowsInSource()` sees evidence of more rows. `autoLoadFrom` stores the row count of the last attempt: when the count did not grow the attempt is retried up to `maxLoadRetries` (3) times and then the source is logged as exhausted (`[ModernDataGrid] la fuente no entregó más filas`) and `extraPageDismissed` is set, so the chain always terminates. From the footer (`requestMoreRows()`) it runs with `force = true`: it tries `loadNextPage()` even when the dataset reports `hasNextPage = false` or when a cap is already reached, so the end user can always request one more page; if nothing arrives, the 6 s timeout dismisses the extra page. Changing the rows per page goes through `onPageChange` (`rows` differs from `getPageSize()`): it only changes `pageSizeOverride` and returns to page 1 — **it never calls `setPageSize()`/`reset()` on the dataset**, because that would throw away the rows already loaded. `rowsPerPageOptions` always includes the current page size.

`scheduleLoadWatch()` re-checks 400 ms after every `loadNextPage()` (`mapRecordsToState(true)` + `ensureMoreRowsLoaded()` + `forceUpdate()`), so the load completes even when the host does not call `updateView` afterwards. `clearLoadWatch()` runs on unmount and on refresh.

The refresh button combines `paging.reset()`, `clearSelectedRecordIds()`, `refresh()` and `requestWholeSource()`; refresh and clear-filters bump `gridEpoch` (the DataTable `key`), reset `currentPage`/`pendingPage` and reset `autoLoadFrom`, `extraPageDismissed` and `emptyLoadAttempts` so the control goes back to its freshly loaded state. `logPaginationInfo()` prints the loaded and filtered rows, the page size, the page count, `totalResultCount`, `hasNextPage` and `pageSize` of the source.

## Build Commands

Run from the workspace root:

```powershell
npm install
npm run build
```

`pcfconfig.json` sets `"outDir": "./out/controls"` and `"buildMode": "production"`; webpack reads `buildMode` as its `mode`, so `production` minifies the bundle (~1.2 MB instead of ~3.2 MB). The MSBuild packaging step reads the same file, so keep it in `production` when you generate the solution ZIPs.

Clean rebuild:

```powershell
npm run clean
npm run build
```

Create both solution packages:

```powershell
dotnet msbuild .\Solution\ModernDataGrid\ModernDataGrid.cdsproj /t:Build /p:Configuration=Release
```

Expected outputs:

```text
Solution/ModernDataGrid/bin/Release/ModernDataGrid.zip
Solution/ModernDataGrid/bin/Release/ModernDataGrid_managed.zip
```

The solution project must keep `<SolutionPackageType>Both</SolutionPackageType>`. The build targets .NET Framework 4.6.2 and uses `Microsoft.NETFramework.ReferenceAssemblies.net462` version `1.0.0`.

## Validation

After manifest, code, identity, or dependency changes:

1. Run `npm run build` and confirm that no manifest attribute contains an apostrophe (see Manifest Rules).
2. Run the MSBuild packaging command.
3. Confirm both ZIPs exist.
4. Inspect `solution.xml` inside both ZIPs.
5. Confirm version `1.0.0.37`, solution/publisher `ID0007`, and control `ID0007.ModernDataGrid`.
6. Import only the newly generated ZIP, not an older download.

The packager output must show:

```text
- ID0007.ModernDataGrid
```

## Manifest Rules

When adding a property, edit `ControlManifest.Input.xml`, run `npm run build` to regenerate manifest types, use the generated `IInputs` type, and rebuild the solution. Do not manually edit generated manifest types.

The PCF version in the manifest, currently `0.0.50`, is separate from the four-part Dataverse solution version.

Date formats are configured in exactly three properties (`DateFormats`, `DateTimeFormats`, `TimeFormats`) and each one applies **only** to columns whose data type matches it: `buildColumnFormat()` resolves the pattern with `findDateAssignment()` and ignores (with a one-off console warning) a column listed in a property of another type, so a mistake never changes another column's format. There is no global date-format property (the `DateFormat` enum was removed in `0.0.50`).

Keep the column selector (`Mostrar u ocultar columnas`) listing **every** data set column: `getBaseColumns()` must never be narrowed by `InitialColumns` (that property only defines the initial selection, resolved by `getInitialSelection()`), otherwise views can lose columns and the selector looks incomplete. The toolbar must stay on a single row (`flex-wrap: nowrap` overrides the PrimeFlex `!important` utilities, so the override needs `!important` too).

Keep the date range filter working the way PrimeReact expects it: the row value used by the filter is the **filter model key**, so date columns must use the hidden milliseconds field (`column + '__mdgdatevalue'`) as both the `filterField` and the key of the entry in the `filters` state, with `filterMatchMode = between` and the inline range calendar as `filterElement`. The same value must be resolved by the Excel export (`resolveFilterRecordField`) so the file matches the grid. Never key a date filter by the display field: the filter menu writes into `filters[filterField]`.

Views (`Views` property) must stay additive: applying one sets the visible columns, the view titles, the view filters, the sorting and the page, and clears the manual filters; manual search/column filters applied afterwards are combined with the view filters. Keep the view parsing tolerant (strict JSON or JavaScript-object style with `;` and unquoted keys) and never include real customer data in the documentation examples.

Performance work (incremental row mapping, memoized render inputs, search debounce and the optional `window.__mdgPerf` diagnostics) must never change manifest properties or user-visible behavior: keep the dataset property, the export, the pagination and the filters as they are, and keep `shouldComponentUpdate` free of side effects (the dataset `refresh()` is consumed in `componentDidUpdate`).

Never enable `virtualScrollerOptions` and the paginator at the same time: the DataTable slices the virtual scroller viewport again with `dataToRender`, so every page beyond the viewport renders empty. Virtualization is enabled only when `DisplayPagination` is false.

Never use apostrophes (`'`) inside manifest attribute values. Dataverse validates `display-name-key` with the `noAposStringType` type, so a single quote makes the import fail with *XSD validation failed … The Pattern constraint failed*. Patterns that need quotes in date-fns (`d 'de' MMMM 'de' yyyy`, `yyyy-MM-dd'T'HH:mm:ss`) must be written without apostrophes in the manifest; the real pattern lives in `helpers/DateFormat.ts`. Quick check:

```powershell
Select-String -Path ModernDataGrid\ControlManifest.Input.xml -Pattern "=\"[^""]*\x27"
```

## Git Publishing

This project has its own Git repository and currently uses:

```text
git@github.com:hamiltoncasas/ID0007_ModernGgrid.git
```

Run Git commands from `Modern-Data-Grid-main`. The `.gitignore` excludes `node_modules`, `generated`, `out`, `bin`, and `obj`. Review `git status` before committing and never commit credentials or tokens.

Typical workflow:

```powershell
git add .
git commit -m "Describe the change"
git push origin main
```

## Change Discipline

- Preserve public property names unless a breaking change is requested.
- Keep edits focused on the PCF and solution files.
- Do not restore the old `GUK` namespace.
- Rebuild after manifest, namespace, solution metadata, or dependency changes.
- Do not claim a ZIP is updated until packaging succeeds and its metadata is inspected.
