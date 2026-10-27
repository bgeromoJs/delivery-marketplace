#Requires -Version 5.1
<#
.SYNOPSIS
    Aponta os submódulos para as URLs reais de hospedagem.

.DESCRIPTION
    Enquanto não há hospedagem definida, o .gitmodules usa caminhos locais
    relativos, o que só funciona na máquina que criou os repositórios.
    Este script reescreve as URLs para o host escolhido e sincroniza a
    configuração local.

.PARAMETER BaseUrl
    Prefixo das URLs. Ex.: https://github.com/minha-org ou git@github.com:minha-org

.EXAMPLE
    .\scripts\set-submodule-urls.ps1 -BaseUrl https://github.com/delivery-marketplace
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$BaseUrl
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$base = $BaseUrl.TrimEnd('/')

# Caminho no guarda-chuva -> nome do repositório remoto.
$repos = [ordered]@{
    'backend/api-gateway'      = 'api-gateway'
    'backend/identity-service' = 'identity-service'
    'backend/tenant-service'   = 'tenant-service'
    'backend/catalog-service'  = 'catalog-service'
    'backend/order-service'    = 'order-service'
    'frontend'                 = 'delivery-web'
    'mobile/cliente-android'   = 'cliente-android'
    'mobile/vendedor-android'  = 'vendedor-android'
}

Push-Location $root
try {
    foreach ($path in $repos.Keys) {
        $name = $repos[$path]
        $url = if ($base -like 'git@*' -or $base -like 'ssh://*') {
            "$base/$name.git"
        } else {
            "$base/$name.git"
        }

        git submodule set-url $path $url
        if ($LASTEXITCODE -ne 0) { throw "Falha ao ajustar a URL de '$path'." }
        Write-Host "  $path -> $url"
    }

    git submodule sync --recursive
    if ($LASTEXITCODE -ne 0) { throw 'git submodule sync falhou.' }

    Write-Host ''
    Write-Host 'URLs atualizadas. Revise e commite o .gitmodules.' -ForegroundColor Green
}
finally {
    Pop-Location
}
