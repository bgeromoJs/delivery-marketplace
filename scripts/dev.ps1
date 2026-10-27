#Requires -Version 5.1
<#
.SYNOPSIS
    Atalhos do kit de desenvolvimento do Delivery Marketplace.

.DESCRIPTION
    infra  Sobe só a infraestrutura (PostgreSQL, Redis, Redpanda, Console).
    apps   Sobe tudo em containers: infra + 5 serviços + frontend.
    down   Para e remove os containers (mantém os volumes).
    reset  Remove containers E volumes, e sobe a infra limpa (recria os bancos).
    logs   Acompanha os logs de tudo que está no profile apps.
    ps     Mostra o estado dos containers.

.EXAMPLE
    .\scripts\dev.ps1 infra
    .\scripts\dev.ps1 apps
    .\scripts\dev.ps1 reset
#>
[CmdletBinding()]
param(
    [ValidateSet('infra', 'apps', 'down', 'reset', 'logs', 'ps')]
    [string]$Action = 'infra'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root

try {
    if (-not (Test-Path (Join-Path $root '.env'))) {
        Write-Host 'Aviso: .env não encontrado. Usando os defaults do docker-compose.yml.' -ForegroundColor Yellow
        Write-Host '       Copie .env.example para .env para ajustar seed, JWT e URL da API.' -ForegroundColor Yellow
        Write-Host ''
    }

    switch ($Action) {
        'infra' {
            docker compose up -d
            Write-Host ''
            Write-Host 'Infraestrutura no ar:' -ForegroundColor Green
            Write-Host '  PostgreSQL  localhost:5432  (postgres/postgrespassword)'
            Write-Host '  Redis       localhost:6379'
            Write-Host '  Redpanda    localhost:19092'
            Write-Host '  Console     http://localhost:8085'
            Write-Host ''
            Write-Host 'Agora suba os serviços nativamente (mvnw spring-boot:run) ou use: .\scripts\dev.ps1 apps'
        }
        'apps' {
            docker compose --profile apps up -d --build
            Write-Host ''
            Write-Host 'Ambiente completo no ar:' -ForegroundColor Green
            Write-Host '  Web         http://localhost:3000'
            Write-Host '  Gateway     http://localhost:8080'
            Write-Host '  Swagger     http://localhost:8080/swagger-ui.html'
            Write-Host '  Console     http://localhost:8085'
        }
        'down' {
            docker compose --profile apps down
        }
        'reset' {
            Write-Host 'Removendo containers e volumes...' -ForegroundColor Yellow
            docker compose --profile apps down -v
            docker compose up -d
            Write-Host ''
            Write-Host 'Bancos recriados a partir de docker/init-db.sql.' -ForegroundColor Green
        }
        'logs' {
            docker compose --profile apps logs -f --tail=200
        }
        'ps' {
            docker compose --profile apps ps
        }
    }
}
finally {
    Pop-Location
}
