# Commerce 360 / E5 : lancer les vues RFM, la recette, puis l'export local.
# Depuis commerce-360 :
# powershell -ExecutionPolicy Bypass -File .\scripts\run_e5.ps1
# Aucune reimportation Olist, aucun UPDATE des tables source.
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Push-Location $projectRoot

try {
    $python = Join-Path $projectRoot '.venv\Scripts\python.exe'
    if (-not (Test-Path $python)) {
        throw 'Environnement .venv manquant. Creer et installer requirements.txt.'
    }

    Write-Host '[1/5] Tests Python hors ligne E2-E5'
    & $python -m unittest discover -s tests -v
    if ($LASTEXITCODE -ne 0) { throw 'Echec des tests Python.' }

    Write-Host '[2/5] Etat PostgreSQL Docker (base existante)'
    & docker compose ps
    if ($LASTEXITCODE -ne 0) { throw 'Docker Compose inaccessible.' }

    Write-Host '[3/5] Creation de 5 vues E5 uniquement (aucune ligne modifiee)'
    & docker compose cp '.\sql\06_e5_rfm.sql' 'postgres:/tmp/06_e5_rfm.sql'
    if ($LASTEXITCODE -ne 0) { throw 'Copie E5 SQL echouee.' }
    & docker compose exec -T postgres psql -X -v ON_ERROR_STOP=1 -1 -U commerce360 -d commerce360 -f '/tmp/06_e5_rfm.sql'
    if ($LASTEXITCODE -ne 0) { throw 'Creation vues E5 echouee.' }

    Write-Host '[4/5] Reconciliation E5 a E2/E3 et audit des segments'
    & docker compose cp '.\sql\07_e5_checks.sql' 'postgres:/tmp/07_e5_checks.sql'
    if ($LASTEXITCODE -ne 0) { throw 'Copie E5 checks echouee.' }
    & docker compose exec -T postgres psql -X -v ON_ERROR_STOP=1 -U commerce360 -d commerce360 -f '/tmp/07_e5_checks.sql'
    if ($LASTEXITCODE -ne 0) { throw 'Recette SQL E5 echouee ; ne pas valider la PR.' }

    Write-Host '[5/5] Exports de SYNTHESES uniquement (sans ID clients)'
    & $python 'scripts\export_e5.py'
    if ($LASTEXITCODE -ne 0) { throw 'Export E5 echoue ; ne pas valider la PR.' }

    Write-Host 'E5 : tests, recette SQL et exports locaux termines.' -ForegroundColor Green
}
finally {
    Pop-Location
}
