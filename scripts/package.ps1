# package.ps1 - Builds the PCF, packages the Dataverse solution and verifies the result.
#
# What it does:
#   1. Reads the expected identity/versions from the sources:
#        - ControlManifest.Input.xml  -> namespace + control version
#        - src/Other/Solution.xml     -> solution unique name + version + publisher prefix
#   2. Runs the PCF build (npm run build) and the solution packaging (dotnet build) unless -SkipBuild.
#   3. Copies both packages to the repository root (managed + unmanaged).
#   4. VERIFIES the generated packages:
#        - solution.xml: unique name, version and publisher prefix match the sources
#        - ControlManifest.xml: namespace + version match the sources
#        - the control folder is named <prefix>_<namespace>.ModernDataGrid
#        - feature-usage has no children and there is no external-service-usage   (guard)
#   5. Exits with code 1 if any check fails.
#
# Usage (from the repository root):
#   powershell -ExecutionPolicy Bypass -File scripts\package.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\package.ps1 -SkipBuild
#
# NOTE: this file is intentionally ASCII-only so Windows PowerShell 5.1 reads it correctly.

[CmdletBinding()]
param(
    [string] $Configuration = 'Release',
    [switch] $SkipBuild,
    [switch] $NoRootCopy
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

$repoRoot = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $repoRoot 'ModernDataGrid\ControlManifest.Input.xml'
$solutionXmlPath = Join-Path $repoRoot 'Solution\ID0008_ModernGrid\src\Other\Solution.xml'
$solutionProject = Join-Path $repoRoot 'Solution\ID0008_ModernGrid\ID0008_ModernGrid.cdsproj'
$packageDir = Join-Path $repoRoot "Solution\ID0008_ModernGrid\bin\$Configuration"

$failures = New-Object System.Collections.Generic.List[string]

function Read-Text([string] $path) {
    if (-not (Test-Path $path)) { throw "No existe el archivo: $path" }
    return [System.IO.File]::ReadAllText($path)
}

function Get-ZipEntryText($zip, [string] $entryName) {
    $entry = $zip.Entries | Where-Object { $_.FullName -eq $entryName } | Select-Object -First 1
    if (-not $entry) { return $null }
    $reader = New-Object System.IO.StreamReader($entry.Open())
    try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
}

function Check([string] $name, [bool] $ok, [string] $detail) {
    if ($ok) {
        Write-Host ("  OK    " + $name + " -> " + $detail) -ForegroundColor Green
    } else {
        Write-Host ("  FALLA " + $name + " -> " + $detail) -ForegroundColor Red
        $script:failures.Add($name)
    }
}

# ---------------------------------------------------------------- expected values
$manifest = Read-Text $manifestPath
$solutionXml = Read-Text $solutionXmlPath

$namespace = ([regex]::Match($manifest, 'namespace="([^"]+)"')).Groups[1].Value
$controlVersion = ([regex]::Match($manifest, 'constructor="ModernDataGrid"\s+version="([^"]+)"')).Groups[1].Value
$solutionUniqueName = ([regex]::Match($solutionXml, '<UniqueName>([^<]+)</UniqueName>')).Groups[1].Value
$solutionVersion = ([regex]::Match($solutionXml, '<Version>([^<]+)</Version>')).Groups[1].Value
$prefix = ([regex]::Match($solutionXml, '<CustomizationPrefix>([^<]+)</CustomizationPrefix>')).Groups[1].Value
$expectedControlFolder = "${prefix}_${namespace}.ModernDataGrid"

Write-Host ""
Write-Host "Modern Data Grid - empaquetado" -ForegroundColor Cyan
Write-Host ("  solucion : " + $solutionUniqueName + " " + $solutionVersion)
Write-Host ("  control  : " + $namespace + " version " + $controlVersion)
Write-Host ("  carpeta  : Controls/" + $expectedControlFolder)

# ---------------------------------------------------------------- build
if (-not $SkipBuild) {
    Write-Host ""
    Write-Host "1) npm run build" -ForegroundColor Cyan
    & npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build fallo (codigo $LASTEXITCODE)" }

    Write-Host ""
    Write-Host "2) dotnet build (Solution Packager)" -ForegroundColor Cyan
    & dotnet build $solutionProject -c $Configuration
    if ($LASTEXITCODE -ne 0) { throw "dotnet build fallo (codigo $LASTEXITCODE)" }
} else {
    Write-Host ""
    Write-Host "1-2) build omitido (-SkipBuild)" -ForegroundColor Yellow
}

# ---------------------------------------------------------------- copy to the root
$unmanagedPath = Join-Path $packageDir 'ID0008_ModernGrid.zip'
$managedPath = Join-Path $packageDir 'ID0008_ModernGrid_managed.zip'

if (-not $NoRootCopy) {
    Write-Host ""
    Write-Host "3) copiando los paquetes a la raiz del repositorio" -ForegroundColor Cyan
    Copy-Item $unmanagedPath (Join-Path $repoRoot 'ID0008_ModernGrid.zip') -Force
    Copy-Item $managedPath (Join-Path $repoRoot 'ID0008_ModernGrid_managed.zip') -Force
}

# ---------------------------------------------------------------- verify the packages
Write-Host ""
Write-Host "4) verificando los paquetes" -ForegroundColor Cyan

foreach ($package in @(
        @{ Path = $managedPath; Managed = '1'; Name = 'gestionada  ' },
        @{ Path = $unmanagedPath; Managed = '0'; Name = 'no gestionada' })) {

    Write-Host ("  --- " + $package.Name + ": " + (Split-Path -Leaf $package.Path))

    if (-not (Test-Path $package.Path)) {
        Check ("paquete " + (Split-Path -Leaf $package.Path)) $false 'no existe: ejecuta el build'
        continue
    }

    $zip = [System.IO.Compression.ZipFile]::OpenRead($package.Path)
    try {
        $solutionEntry = Get-ZipEntryText $zip 'solution.xml'
        $controlEntry = Get-ZipEntryText $zip ("Controls/" + $expectedControlFolder + "/ControlManifest.xml")

        Check 'solution.xml' ($null -ne $solutionEntry) 'existe'
        Check 'ControlManifest.xml' ($null -ne $controlEntry) ("en Controls/" + $expectedControlFolder)

        if ($solutionEntry) {
            $zipUniqueName = ([regex]::Match($solutionEntry, '<UniqueName>([^<]+)</UniqueName>')).Groups[1].Value
            $zipVersion = ([regex]::Match($solutionEntry, '<Version>([^<]+)</Version>')).Groups[1].Value
            $zipManaged = ([regex]::Match($solutionEntry, '<Managed>([^<]+)</Managed>')).Groups[1].Value
            $zipPublisher = ([regex]::Match($solutionEntry, 'Publisher[\s\S]{0,120}<UniqueName>([^<]+)</UniqueName>')).Groups[1].Value

            Check 'nombre de la solucion' ($zipUniqueName -eq $solutionUniqueName) $zipUniqueName
            Check 'version de la solucion' ($zipVersion -eq $solutionVersion) $zipVersion
            Check 'publicador' ($zipPublisher -eq $prefix) $zipPublisher
            Check 'tipo de paquete' ($zipManaged -eq $package.Managed) ("Managed=" + $zipManaged)
        }

        if ($controlEntry) {
            $zipNamespace = ([regex]::Match($controlEntry, '<control namespace="([^"]+)"')).Groups[1].Value
            $zipControlVersion = ([regex]::Match($controlEntry, 'constructor="ModernDataGrid"\s+version="([^"]+)"')).Groups[1].Value
            $featureUsageEmpty = [regex]::Match($controlEntry, '<feature-usage\s*/>').Success
            $featureUsageChildren = [regex]::Match($controlEntry, '<feature-usage\s*>\s*[^<\s]').Success
            $externalService = [regex]::Matches($controlEntry, 'external-service-usage').Count

            Check 'namespace del control' ($zipNamespace -eq $namespace) $zipNamespace
            Check 'version del control' ($zipControlVersion -eq $controlVersion) $zipControlVersion
            Check 'feature-usage vacio' ($featureUsageEmpty -and -not $featureUsageChildren) 'sin capacidades declaradas'
            Check 'sin external-service-usage' ($externalService -eq 0) 'sin servicios externos'
        }
    } finally {
        $zip.Dispose()
    }
}

# ---------------------------------------------------------------- result
Write-Host ""
if ($failures.Count -gt 0) {
    Write-Host ("RESULTADO: " + $failures.Count + " verificacion(es) fallidas") -ForegroundColor Red
    exit 1
}

Write-Host "RESULTADO: paquetes generados y verificados correctamente" -ForegroundColor Green
Write-Host ""
Write-Host "En los entornos de destino se importa el paquete GESTIONADO; se desinstala desde"
Write-Host "Soluciones -> Desinstalar, que es lo que se lleva sus metadatos (customcontrol,"
Write-Host "customcontrolresource, webresource y la pertenencia a la solucion)."
