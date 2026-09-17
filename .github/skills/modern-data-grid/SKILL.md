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
- `Modern-Data-Grid.pcfproj`: PCF MSBuild project.
- `Solution/ModernDataGrid/ModernDataGrid.cdsproj`: Dataverse solution project.
- `Solution/ModernDataGrid/src/Other/Solution.xml`: solution and publisher metadata.
- `Solution/ModernDataGrid/bin/Release/`: generated solution ZIPs.

## Current Identity

- Solution unique name: `ID0007_ModernGrid`
- Solution display name: `ID0007`
- Publisher unique name, name, and description: `ID0007`
- Publisher customization prefix: `ID0007`
- Solution version: `1.0.0.18`
- PCF control name: `ID0007.ModernDataGrid`
- PCF constructor: `ModernDataGrid`

The namespace must remain `ID0007`. Never restore `GUK`; Dataverse already has `GUK.ModernDataGrid` owned by another publisher and importing it fails. If the identity changes, update both `Solution.xml` and `ControlManifest.Input.xml`, then rebuild the PCF before packaging.

## Implemented Features

- Dataset-backed PCF control using React and PrimeReact.
- Header, global search, sorting, pagination, selection, and per-column filtering.
- Global search across mapped record fields.
- Column filters controlled through `filters` and `onFilter`; keep this callback when editing filters.
- Manual refresh button that resets paging and calls `DataSource.refresh()`.
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
- The toolbar wraps (`flex-wrap`) so the search box, the refresh button and the Excel button always stay visible; the refresh and Excel icons are inline SVG, not the PrimeIcons font.

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

1. Run `npm run build`.
2. Run the MSBuild packaging command.
3. Confirm both ZIPs exist.
4. Inspect `solution.xml` inside both ZIPs.
5. Confirm version `1.0.0.18`, solution/publisher `ID0007`, and control `ID0007.ModernDataGrid`.
6. Import only the newly generated ZIP, not an older download.

The packager output must show:

```text
- ID0007.ModernDataGrid
```

## Manifest Rules

When adding a property, edit `ControlManifest.Input.xml`, run `npm run build` to regenerate manifest types, use the generated `IInputs` type, and rebuild the solution. Do not manually edit generated manifest types.

The PCF version in the manifest, currently `0.0.31`, is separate from the four-part Dataverse solution version.

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
