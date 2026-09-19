# Modern Data Grid

> 📘 Full documentation (properties, formats, Excel export, row coloring, troubleshooting): [DOCUMENTATION.md](DOCUMENTATION.md)

- **Optimized for Canvas Apps**
- **Responsive**
- **Works Seamlessly with Any Data Source**
- **Includes Built-In Filtering, Sorting, and Keyword Search**
- **Supports Pagination** (Ensure "Default Rows" is set above 0 for it to display)

For any issues or feedback, please use the "Issues" tab at the top of the page.

![modernDataGrid - Promo](https://github.com/user-attachments/assets/5e1b4db6-ed2b-4a42-bc7c-07d49cb9b159)


## Installation

To ensure the custom component runs properly, you must first enable code components for Canvas Apps.

### Enabling Code Components for Canvas Apps
1. Navigate to [Power Platform Admin Center](https://admin.powerplatform.microsoft.com).
2. Select **Environments** from the navigation menu on the left.
3. Click **Settings** from the ribbon.
   ![modernDataGrid_7](https://github.com/user-attachments/assets/be53be87-54dd-4a2b-a88c-c63284a3890e)
5. Under the **Product** section, select **Features**.
   ![modernDataGrid_6](https://github.com/user-attachments/assets/72568470-6f6c-4b00-9be9-052d401a8d9b)
7. Enable **Allow publishing of canvas apps with code components** under the **Power Apps component framework for canvas apps**.
   ![modernDataGrid_5](https://github.com/user-attachments/assets/1c1b1c4a-22ff-455d-8cfa-5a4a165d2b86)

### Importing the Solution to Your Environment
1. Download the latest solution for this component from the [Modern Data Grid releases](https://github.com/GorgonUK/Modern-Data-Grid/releases).
2. Go to [Power Apps Maker Portal](https://make.powerapps.com).
   ![modernDataGrid_4](https://github.com/user-attachments/assets/ea55fa6b-3ee9-4a6e-8f58-03479f5346d7)
4. Click **Import solution** from the ribbon and follow the prompts.

### Adding the Code Component to Your Canvas App
1. Open your Canvas App in **Edit mode**.
2. Click the magnifying glass icon in the **Insert** tab.
   ![modernDataGrid_3](https://github.com/user-attachments/assets/64f08c80-2042-43db-b0cc-5717169fb062)
4. Select the **Code** tab.
5. Choose **ModernDataGrid** from the list.
   ![modernDataGrid_2](https://github.com/user-attachments/assets/af9e0a95-b590-41c7-a52d-8b5fcb57003e)
7. Click **Insert**.
8. The component is now ready for use in your Canvas App.
   ![modernDataGrid_1](https://github.com/user-attachments/assets/b35ca823-4bc3-4544-be02-b19fd31daa21)


## Properties (inputs)

This is a **dataset** control: its data comes from the `DataSource` data set property. Full reference, per-property detail and copy-ready examples: [DOCUMENTATION.md §5](DOCUMENTATION.md).

| Property | Type | Values | Default | Example |
|---|---|---|---|---|
| `DataSource` (data set) | Data set | any table or collection | — | `Items` |
| `DisplayHeader` | Two options | `true` / `false` | `true` | `true` |
| `HeaderText` | Text | free text | entity name | `Accounts 2026` |
| `DisplaySearch` | Two options | `true` / `false` | `false` | `true` |
| `DisplayPagination` | Two options | `true` / `false` | `false` | `true` |
| `EmptyMessage` | Text | free text | `No records found` | `Nothing to show` |
| `SelectionMode` | Text | `multiple` / `checkbox` | `multiple` | `checkbox` |
| `AllowSorting` | Two options | `true` / `false` | `false` | `true` |
| `AllowFiltering` | Two options | `true` / `false` | `false` | `true` |
| `IsEnabled` | Two options | `true` / `false` | `true` | `true` |
| `FieldConfigurations` | Text area | `column=key:value\|key:value, …` with keys `currency`, `dateFormat`, `decimalPlaces`, `trueLabel`, `falseLabel` | sample value | `Amount=currency:EUR, Flag=trueLabel:Yes\|falseLabel:No` |
| `DateFormat` | Enum (36 options) | `default`, `dd_MM_yyyy`, `yyyy-MM-dd`, `dd_MM_yyyy_HH_mm`, `HH_mm`, … | `default` | `dd_MM_yyyy_HH_mm` |
| `InitialColumns` | Text area | comma separated names, aliases or display names | empty (all columns) | `name, Amount, Date` |
| `ColumnLabels` | Text area | `column=Label, otherColumn=Other label` | empty (data set names) | `amount=Amount (€)` |
| `Language` | Enum | `en` / `es` | `en` | `es` |
| `RowColorRules` | Text area | `column=value:background[:text]\|value:background, …` (`~` contains, `*` any) | empty | `status=Active:#DFF6DD\|Pending:#FFF4CE` |

> **Pagination vs virtual scrolling:** set `DisplayPagination = true` to page through the loaded rows (only the current page is rendered) or `false` to scroll the whole loaded list with virtual scrolling. Do not enable both at the same time: PrimeReact cannot combine them.

## Performance and diagnostics

Large datasets are handled with incremental row mapping (only new rows are formatted), per-row cached search text, stable render inputs for PrimeReact and a 200 ms search debounce (instant with `Enter` or when leaving the field).

Optional diagnostics, disabled by default:

```js
window.__mdgPerf = true;    // logs the [ModernDataGrid][perf] counters
window.__mdgPerfReport();   // console.table with the accumulated summary
```

Details, counters and reference measurements: [DOCUMENTATION.md §9.6](DOCUMENTATION.md).

**Current version:** solution `1.0.0.33` · control `0.0.46`.
