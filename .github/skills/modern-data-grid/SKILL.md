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
- `ModernDataGrid/helpers/DateFormat.ts`: catalog of the `DateFormat` property (token -> date-fns pattern). Keep it in sync with the manifest enum.
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
- Solution version: `1.0.0.27`
- PCF control name: `ID0007.ModernDataGrid`
- PCF constructor: `ModernDataGrid`

The namespace must remain `ID0007`. Never restore `GUK`; Dataverse already has `GUK.ModernDataGrid` owned by another publisher and importing it fails. If the identity changes, update both `Solution.xml` and `ControlManifest.Input.xml`, then rebuild the PCF before packaging.

## Implemented Features

- Dataset-backed PCF control using React and PrimeReact.
- Header, global search, sorting, pagination, selection, and per-column filtering.
- Global search across mapped record fields.
- Column filters controlled through `filters` and `onFilter`; keep this callback when editing filters.
- Manual refresh button that resets paging and calls `DataSource.refresh()`.
- The pagination report shows the visible range plus the **filtered** count (`Mostrando 51 a 54 registros · Filtrados: 54`), not the database total; page navigation still uses the dataset total.
- `InitialColumns` property: comma-separated column names, aliases, or display names; empty means all columns.
- Internal horizontal and vertical scrolling constrained to the PCF host dimensions.
- Managed and unmanaged solution packaging.
- Field formatting through `FieldConfigurations`.
- Per-column filters use the `menu` display: the funnel icon opens a panel with the search input and `Contains` as the default match mode.
- Column selector in the toolbar: the end user can show or hide any column available in the dataset. `InitialColumns` still defines the starting set and stays respected.
- Excel export button in the toolbar: writes a real `.xlsx` (generated in `helpers/ExcelExport.ts`) with the rows currently matching the global search and the per-column filters, using the visible columns only.
- Sorting stays delegated to PrimeReact through the `sortable` columns and the `AllowSorting` property.
- `Language` property (`Enum`: `en`/`es`) translates the control texts and the PrimeReact internals (filter panel, match modes, paginator, column selector).
- The column selector trigger shows only its icon: no chips and no label, so the toolbar never overflows.
- The toolbar wraps (`flex-wrap`) and every toolbar control is 2.5rem tall, so nothing is ever pushed out of view; all toolbar icons (search, refresh, Excel) are inline SVG and the control no longer depends on the PrimeIcons font.
- `RowColorRules` property: colors the whole row from a column value (`columna=valor:#fondo[:texto]|valor:#fondo`, `~` for contains, `*` for any value).
- `FieldConfigurations` applies **per column** (resolved by name, alias or display name); it sets currency, decimal places, Yes/No labels and `dateFormat`.
- `DateFormat` property: 36-option combo (date, date+time and time patterns) applied to every date column; a column `dateFormat` wins over it.
- `ColumnLabels` property: display names for the end user (`columna=Nombre`); applied to the grid header, the Excel header, the filter placeholder and the column selector, and usable as a column identifier in the other config properties.
- Clear filters button: resets the global search and every column filter and goes back to page 1; it is disabled while nothing is filtered.
- Client-side pagination over the loaded rows (never depends on `totalResultCount`), plus automatic loading of the missing source pages (capped at 2000 rows).
- Refresh button reloads from the origin: clears the selection (`clearSelectedRecordIds()`), resets paging and calls `DataSource.refresh()`, then re-maps the records.

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

`DataGrid.getRecordsForExport()` reproduces what the grid shows: the existing global search plus the per-column constraints, evaluated with `FilterService` from `primereact/api` so the match modes stay identical to PrimeReact. The export contains every row loaded in the control that matches the filters, formatted with the same `FieldConfigurations`, using only the currently visible columns.

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

`FieldConfigurations` is resolved **per column** by `getColumnConfiguration()`: the column is matched by name, alias or display name with `normalizeText()` (case, accents and outer spaces ignored) and the matched block is what the type handler receives. Without a block the handler falls back to its defaults (`USD`, 2 decimals, `Yes`/`No`, `yyyy-MM-dd` / `yyyy-MM-dd HH:mm:ss`).

The `DateFormat` property is the global fallback for date columns and comes from `helpers/DateFormat.ts`:

```ts
resolveDateFormat(context.parameters.DateFormat?.raw) // token -> date-fns pattern, undefined for "default"
```

Order of precedence for dates: column `dateFormat` -> `DateFormat` -> built-in default.

The manifest enum and `DATE_FORMAT_OPTIONS` must stay identical (same tokens, same order); the automated check compares both lists and validates every pattern against date-fns. Values are formatted **before** filtering, row coloring and export, so a format change also changes what those features see.

## Column Labels

`ColumnLabels` (SingleLine.TextArea) sets the display name of each column for the end user:

```text
nombre=Nombre completo, importe=Importe (€)
```

`helpers/ColumnLabels.ts` resolves every entry against the dataset columns with `normalizeText()` (name, alias or display name; case/accent insensitive) and warns on unknown columns or malformed entries. `DataGrid.getColumnHeader()` is the **single source** for the header text and feeds the grid header, the Excel header, the per-column filter placeholder and the column selector options. The label is also accepted as a column identifier by `InitialColumns`, `getColumnConfiguration()` and `compileRowColors()`.

## Pagination

The footer **always paginates client-side** over the loaded rows: `getPaginationProps()` returns only `paginator` and `rows` (the dataset page size, or 25), so PrimeReact owns `first` and `totalRecords`. Do not pass `first`/`onPage`/`totalRecords` derived from `paging.totalResultCount` again: hosts that cannot page the source report `-1`, the footer stops responding, and a controlled `first` can point past the loaded rows and leave the table empty.

`ensureMoreRowsLoaded()` (called on mount and from `componentDidUpdate`) asks the source for the missing pages with `loadNextPage()` while `hasNextPage` is true, guarded against repeats and capped at `DataGrid.maxAutoLoadedRows` (2000 rows).

The refresh button combines `paging.reset()`, `clearSelectedRecordIds()` and `refresh()`; both refresh and clear-filters bump `gridEpoch`, which is the DataTable `key`, so the footer returns to page 1. `logPaginationInfo()` prints the loaded and filtered rows, the page size, the page count, `totalResultCount` and `hasNextPage`.

## Build Commands

Run from the workspace root:

```powershell
npm install
npm run build
```

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
5. Confirm version `1.0.0.27`, solution/publisher `ID0007`, and control `ID0007.ModernDataGrid`.
6. Import only the newly generated ZIP, not an older download.

The packager output must show:

```text
- ID0007.ModernDataGrid
```

## Manifest Rules

When adding a property, edit `ControlManifest.Input.xml`, run `npm run build` to regenerate manifest types, use the generated `IInputs` type, and rebuild the solution. Do not manually edit generated manifest types.

The PCF version in the manifest, currently `0.0.40`, is separate from the four-part Dataverse solution version.

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
