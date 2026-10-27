#Requires -Version 5.1
<#
.SYNOPSIS
    Atalhos do kit de desenvolvimento do Delivery Marketplace.

.DESCRIPTION
    up     Sobe TUDO em containers: infraestrutura, 5 serviços e frontend.
    infra  Sobe só a infraestrutura (para rodar as aplicações nativamente).
    down   Para e remove os containers (mantém os volumes).
    reset  Remove containers E volumes, e sobe tudo de novo com os bancos limpos.
    logs   Acompanha os logs de todos os containers.
    ps     Mostra o estado dos containers.

.EXAMPLE
    .\scripts\dev.ps1 up
    .\scripts\dev.ps1 infra
    .\scripts\dev.ps1 reset
#>
[CmdletBinding()]
param(
    [ValidateSet('up', 'infra', 'down', 'reset', 'logs', 'ps')]
    [string]$Action = 'up'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$infraOnly = @('postgres', 'redis', 'redpanda', 'redpanda-console', 'redpanda-init')

Push-Location $root

try {
    if (-not (Test-Path (Join-Path $root '.env'))) {
        Write-Host 'Aviso: .env não encontrado. Usando os defaults do docker-compose.yml.' -ForegroundColor Yellow
        Write-Host '       Copie .env.example para .env para ajustar seed, JWT e URL da API.' -ForegroundColor Yellow
        Write-Host ''
    }

    switch ($Action) {
        'up' {
            Write-Host 'Construindo e subindo o ambiente completo (primeira vez pode levar 10-20 min)...' -ForegroundColor Cyan
            docker compose up -d --build
            Write-Host ''
            Write-Host 'Ambiente no ar:' -ForegroundColor Green
            Write-Host '  Web         http://localhost:3000'
            Write-Host '  Gateway     http://localhost:8080'
            Write-Host '  Swagger     http://localhost:8080/swagger-ui.html'
            Write-Host '  Console     http://localhost:8085'
        }
        'infra' {
            docker compose up -d postgres redis redpanda redpanda-console redpanda-init
            Write-Host ''
            Write-Host 'Infraestrutura no ar:' -ForegroundColor Green
            Write-Host '  PostgreSQL  localhost:5432  (postgres/postgrespassword)'
            Write-Host '  Redis       localhost:6379'
            Write-Host '  Redpanda    localhost:19092'
            Write-Host '  Console     http://localhost:8085'
            Write-Host ''
            Write-Host 'Agora suba os serviços nativamente (mvnw spring-boot:run) ou o frontend (npm run dev).'
        }
        'down' {
            docker compose down
        }
        'reset' {
            Write-Host 'Removendo containers e volumes...' -ForegroundColor Yellow
            docker compose down -v
            docker compose up -d --build
            Write-Host ''
            Write-Host 'Bancos recriados a partir de docker/init-db.sql.' -ForegroundColor Green
        }
        'logs' {
            docker compose logs -f --tail=200
        }
        'ps' {
            docker compose ps
        }
    }
}
finally {
    Pop-Location
}
