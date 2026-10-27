#Requires -Version 5.1
<#
.SYNOPSIS
    Inicializa o workspace do delivery-marketplace.

.DESCRIPTION
    Cada serviço, o frontend e cada app Android vivem em um repositório Git
    próprio. Este repositório guarda-chuva apenas amarra as versões por meio de
    submódulos. Execute este script depois de clonar o guarda-chuva para baixar
    cada projeto no SHA registrado.

.EXAMPLE
    .\scripts\bootstrap.ps1
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Push-Location $root
try {
    if (-not (Test-Path (Join-Path $root '.gitmodules'))) {
        throw "Execute este script a partir do repositório guarda-chuva ('.gitmodules' não encontrado)."
    }

    Write-Host 'Atualizando submódulos...' -ForegroundColor Cyan
    git submodule update --init --recursive
    if ($LASTEXITCODE -ne 0) { throw 'git submodule update falhou.' }

    Write-Host ''
    Write-Host 'Projetos disponíveis:' -ForegroundColor Cyan
    git submodule status

    Write-Host ''
    Write-Host 'Próximo passo: docker compose up -d' -ForegroundColor Green
}
finally {
    Pop-Location
}
