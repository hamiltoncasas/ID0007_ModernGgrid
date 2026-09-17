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
- `Modern-Data-Grid.pcfproj`: PCF MSBuild project.
- `Solution/ModernDataGrid/ModernDataGrid.cdsproj`: Dataverse solution project.
- `Solution/ModernDataGrid/src/Other/Solution.xml`: solution and publisher metadata.
- `Solution/ModernDataGrid/bin/Release/`: generated solution ZIPs.

## Current Identity

- Solution unique name: `ID0007_ModernGrid`
- Solution display name: `ID0007`
- Publisher unique name, name, and description: `ID0007`
- Publisher customization prefix: `ID0007`
- Solution version: `1.0.0.16`
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

## Layout Rules

The root `modern-data-grid` element must keep `width: 100%`, `height: 100%`, `min-width: 0`, `min-height: 0`, and `overflow: hidden`. The DataTable wrapper owns scrolling. Do not set overflow on arbitrary parent elements with JavaScript or move scrolling to the page.

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
5. Confirm version `1.0.0.16`, solution/publisher `ID0007`, and control `ID0007.ModernDataGrid`.
6. Import only the newly generated ZIP, not an older download.

The packager output must show:

```text
- ID0007.ModernDataGrid
```

## Manifest Rules

When adding a property, edit `ControlManifest.Input.xml`, run `npm run build` to regenerate manifest types, use the generated `IInputs` type, and rebuild the solution. Do not manually edit generated manifest types.

The PCF version in the manifest, currently `0.0.29`, is separate from the four-part Dataverse solution version.

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
