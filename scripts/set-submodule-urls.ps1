#Requires -Version 5.1
<#
.SYNOPSIS
    Aponta os submódulos para as URLs reais de hospedagem.

.DESCRIPTION
    Reescreve as URLs do .gitmodules para o host escolhido e sincroniza a
    configuração local. Serve para migrar de caminhos locais para o remoto e
    para trocar de host ou de organização depois.

.PARAMETER BaseUrl
    Prefixo das URLs, até a organização. Ex.: https://github.com/minha-org
    ou git@github.com:minha-org

.EXAMPLE
    .\scripts\set-submodule-urls.ps1 -BaseUrl git@github.com:bgeromoJs
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
    'backend/api-gateway'      = 'delivery-marketplace-api-gateway'
    'backend/identity-service' = 'delivery-marketplace-identity-service'
    'backend/tenant-service'   = 'delivery-marketplace-tenant-service'
    'backend/catalog-service'  = 'delivery-marketplace-catalog-service'
    'backend/order-service'    = 'delivery-marketplace-order-service'
    'frontend'                 = 'delivery-marketplace-admin-panel-web'
    'mobile/cliente-android'   = 'delivery-marketplace-tenant-app'
    'mobile/vendedor-android'  = 'delivery-marketplace-customer-app'
}

Push-Location $root
try {
    foreach ($path in $repos.Keys) {
        $name = $repos[$path]
        # Vale para HTTPS (https://github.com/org) e SSH (git@github.com:org):
        # o separador do SSH fica antes da organização, não antes do repositório.
        $url = "$base/$name.git"

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
