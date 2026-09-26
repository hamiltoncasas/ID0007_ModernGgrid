import { IInputs, IOutputs } from "./generated/ManifestTypes";
import DataSetInterfaces = ComponentFramework.PropertyHelper.DataSetApi;
import * as React from "react";
type DataSet = ComponentFramework.PropertyTypes.DataSet;
import DataGrid from "./components/DataGrid";

export class ModernDataGrid implements ComponentFramework.ReactControl<IInputs, IOutputs> {
    /** Versión del control (debe coincidir con la del manifest); se registra al inicializar. */
    private static readonly controlVersion = '0.0.55';
    private container: HTMLDivElement;
    private notifyOutputChanged: () => void;
    /** Número de veces que el host ha pedido pintar el control (diagnóstico con `window.__mdgPerf`). */
    private updateViewCount = 0;
    constructor() {}

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        console.log(`Modern Data Grid (ID0007) ${ModernDataGrid.controlVersion}`);
        this.container = container;
        this.notifyOutputChanged = notifyOutputChanged;
    }
    public updateView(
        context: ComponentFramework.Context<IInputs>
      ): React.ReactElement {
        this.updateViewCount++;

        if (typeof window !== 'undefined' && (window as any).__mdgPerf === true) {
            console.log('[ModernDataGrid][perf] updateView', { numero: this.updateViewCount });
        }

        return React.createElement(DataGrid, {context:context,notifyOutputChanged: this.notifyOutputChanged});
    }

    public getOutputs(): IOutputs {
        return {};
    }

    public destroy(): void {
    }
}
