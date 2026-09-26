# dependencias.ps1 - Audita que bloquea eliminar la solucion ID0008_ModernGrid / publicador ID0008.
#
# Responde a la pregunta "por que no puedo borrar la solucion o el publicador":
#   - Que apps (o formularios, flujos, pasos de plugin) dependen del control de codigo.
#   - En que soluciones esta incluido el control.
#   - Que version y tipo (managed / unmanaged) tienen las soluciones nueva y antigua.
#
# Requisitos: PAC CLI (pac) autenticado en el entorno que quieras auditar:
#   pac auth create --environment https://<org>.crm.dynamics.com
#   (o 'pac auth select' para elegir el perfil activo)
#
# Uso (desde la raiz del repositorio):
#   powershell -ExecutionPolicy Bypass -File scripts\dependencias.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\dependencias.ps1 -EnvironmentUrl https://<org>.crm.dynamics.com
#
# NOTE: this file is intentionally ASCII-only so Windows PowerShell 5.1 reads it correctly.

[CmdletBinding()]
param(
    [string] $ControlName = 'ID0008_ID0008.ModernDataGrid',
    [string] $LegacyControlName = 'ID0007_ID0007.ModernDataGrid',
    [string] $NewSolution = 'ID0008_ModernGrid',
    [string] $LegacySolution = 'ID0007_ModernGrid',
    [string] $EnvironmentUrl = ''
)

$ErrorActionPreference = 'Stop'

function Write-Head([string] $text) {
    Write-Host ""
    Write-Host ("=== " + $text + " ===") -ForegroundColor Cyan
}

function Invoke-PacFetch([string] $xml) {
    if ($EnvironmentUrl) {
        return (& pac org fetch --environment $EnvironmentUrl --xml $xml 2>&1)
    }
    return (& pac org fetch --xml $xml 2>&1)
}

function Show-Fetch([string] $where, [string] $xml) {
    Write-Host ("  * " + $where) -ForegroundColor Yellow
    try {
        $out = (Invoke-PacFetch $xml) -join "`n"
    } catch {
        Write-Host ("    no se pudo consultar: " + $_.Exception.Message) -ForegroundColor Red
        return ''
    }
    Write-Host $out
    return $out
}

# ---------------------------------------------------------------- PAC CLI check
if (-not (Get-Command pac -ErrorAction SilentlyContinue)) {
    Write-Host "PAC CLI no esta instalado. Consultas para pegar en el navegador (sustituye <org>):" -ForegroundColor Red
    Write-Host ("  https://<org>.api.crm.dynamics.com/api/data/v9.2/customcontrols?`$select=name,customcontrolid,version&`$filter=name eq '" + $ControlName + "'")
    Write-Host "  https://<org>.api.crm.dynamics.com/api/data/v9.2/dependencies?`$select=dependentcomponenttype,dependentcomponentobjectid,dependencytype&`$filter=requiredcomponenttype eq 66"
    Write-Host ("  https://<org>.api.crm.dynamics.com/api/data/v9.2/solutions?`$select=uniquename,version,ismanaged,installedon&`$filter=uniquename eq '" + $NewSolution + "' or uniquename eq '" + $LegacySolution + "'")
    exit 0
}

Write-Host "Auditoria de dependencias del control de codigo" -ForegroundColor Cyan
Write-Host ("  control nuevo : " + $ControlName)
Write-Host ("  control viejo : " + $LegacyControlName)
if ($EnvironmentUrl) { Write-Host ("  entorno       : " + $EnvironmentUrl) } else { Write-Host "  entorno       : perfil activo de pac auth" }

$componentTypes = @{
    '1'  = 'Entity';               '2'   = 'Attribute';      '24' = 'Form';
    '26' = 'Saved Query';          '29'  = 'Workflow (flujo)'; '60' = 'System Form';
    '61' = 'Web Resource';         '66'  = 'Custom Control'; '68' = 'Custom Control Default Config';
    '92' = 'SDK Step (plugin)';    '300' = 'Canvas App'
}

# ---------------------------------------------------------------- por cada control
foreach ($control in @($ControlName, $LegacyControlName)) {

    Write-Head ("Control: " + $control)

    $controlXml = "<fetch><entity name='customcontrol'><attribute name='customcontrolid'/><attribute name='name'/><attribute name='version'/><attribute name='componentstate'/><filter><condition attribute='name' operator='eq' value='" + $control + "'/></filter></entity></fetch>"
    $controlOut = Show-Fetch "el componente existe? (customcontrol)" $controlXml

    $idMatch = [regex]::Match($controlOut, '"customcontrolid"\s*:\s*"([0-9a-fA-F-]{36})"')
    if (-not $idMatch.Success) {
        Write-Host "    -> no encontrado en este entorno" -ForegroundColor DarkGray
        continue
    }

    $id = $idMatch.Groups[1].Value
    Write-Host ("    -> id: " + $id) -ForegroundColor DarkGray

    $depXml = "<fetch><entity name='dependency'><attribute name='dependencytype'/><attribute name='dependentcomponenttype'/><attribute name='dependentcomponentobjectid'/><attribute name='requiredcomponenttype'/><attribute name='requiredcomponentobjectid'/><filter><condition attribute='requiredcomponentobjectid' operator='eq' value='" + $id + "'/><condition attribute='requiredcomponenttype' operator='eq' value='66'/></filter></entity></fetch>"
    $depOut = Show-Fetch "quien lo retiene? (dependency)" $depXml

    $dependentCount = ([regex]::Matches($depOut, '"dependentcomponentobjectid"')).Count
    if ($dependentCount -gt 0) {
        Write-Host ("    -> HAY " + $dependentCount + " dependencia(s): mientras existan no se puede borrar la solucion ni el publicador") -ForegroundColor Red
        Write-Host "       dependencytype: 1 = interna de solucion, 2 = publicado, 4 = borrador sin publicar"
        Write-Host "       dependientes tipicos: 300 Canvas App (quitar el control, guardar, cerrar y reabrir, publicar)"
    } else {
        Write-Host "    -> sin dependencias: la solucion se puede desinstalar y el publicador borrar" -ForegroundColor Green
    }

    $scXml = "<fetch><entity name='solutioncomponent'><attribute name='componenttype'/><attribute name='objectid'/><filter><condition attribute='objectid' operator='eq' value='" + $id + "'/><condition attribute='componenttype' operator='eq' value='66'/></filter><link-entity name='solution' from='solutionid' to='solutionid' alias='s'><attribute name='uniquename'/><attribute name='version'/><attribute name='ismanaged'/></link-entity></entity></fetch>"
    $scOut = Show-Fetch "en que soluciones esta incluido (solutioncomponent)" $scXml

    if (([regex]::Matches($scOut, '"uniquename"')).Count -gt 1) {
        Write-Host "    -> aparece en MAS de una solucion: deja una sola capa del componente (managed o unmanaged, no ambas)" -ForegroundColor Red
    }
}

# ---------------------------------------------------------------- soluciones
Write-Head "Soluciones"

$solXml = "<fetch><entity name='solution'><attribute name='uniquename'/><attribute name='version'/><attribute name='ismanaged'/><attribute name='installedon'/><filter type='or'><condition attribute='uniquename' operator='eq' value='" + $NewSolution + "'/><condition attribute='uniquename' operator='eq' value='" + $LegacySolution + "'/></filter></entity></fetch>"
Show-Fetch "version y tipo de las soluciones" $solXml | Out-Null

# ---------------------------------------------------------------- resumen
Write-Head "Siguiente paso"
Write-Host "  - Si el control VIEJO ya no tiene dependencias: desinstala o elimina su solucion y borra el publicador."
Write-Host "  - Si el control NUEVO tiene dependencias: quita el control de esas apps, guarda, cierra y reabre"
Write-Host "    la app y publicala (o elimina la app y purga la papelera)."
Write-Host "  - En entornos de destino usa SIEMPRE el paquete gestionado (ID0008_ModernGrid_managed.zip)."
Write-Host "  - Si el componente aparece dos veces (publicador Default por 'pac pcf push' o unmanaged + managed),"
Write-Host "    deja una sola capa antes de borrar."
