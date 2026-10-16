# Commerce 360 / E3 : recette SQL sur le PostgreSQL Docker local.
# Utilisation PowerShell depuis le dossier commerce-360 :
# powershell -ExecutionPolicy Bypass -File .\scripts\run_e3.ps1
# Aucune suppression de donnees, aucun rerun d'import E2.
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Push-Location $projectRoot

try {
    $python = Join-Path $projectRoot '.venv\Scripts\python.exe'
    if (-not (Test-Path $python)) {
        throw 'Environnement Python introuvable : creer .venv avant la recette E3.'
    }

    Write-Host '[1/4] Tests structurels E2 et E3'
    & $python -m unittest discover -s tests -v
    if ($LASTEXITCODE -ne 0) { throw 'Echec des tests Python.' }

    Write-Host '[2/4] Etat du conteneur PostgreSQL'
    & docker compose ps
    if ($LASTEXITCODE -ne 0) { throw 'Docker Compose inaccessible.' }

    Write-Host '[3/4] Creation/mise a jour des 12 vues E3 (source intacte)'
    & docker compose cp '.\sql\04_e3_analysis.sql' 'postgres:/tmp/04_e3_analysis.sql'
    if ($LASTEXITCODE -ne 0) { throw 'Copie du SQL E3 echouee.' }
    & docker compose exec -T postgres psql -X -v ON_ERROR_STOP=1 -U commerce360 -d commerce360 -f '/tmp/04_e3_analysis.sql'
    if ($LASTEXITCODE -ne 0) { throw 'Creation des vues E3 echouee.' }

    Write-Host '[4/4] Validation des montants, grains et KPI E3'
    & docker compose cp '.\sql\05_e3_checks.sql' 'postgres:/tmp/05_e3_checks.sql'
    if ($LASTEXITCODE -ne 0) { throw 'Copie du SQL de recette echouee.' }
    & docker compose exec -T postgres psql -X -v ON_ERROR_STOP=1 -U commerce360 -d commerce360 -f '/tmp/05_e3_checks.sql'
    if ($LASTEXITCODE -ne 0) { throw 'Recette E3 echouee ; ne pas fusionner.' }

    Write-Host 'E3 : tests locaux et recettes SQL reussis.' -ForegroundColor Green
}
finally {
    Pop-Location
}
