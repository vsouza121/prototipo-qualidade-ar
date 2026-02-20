# ============================================================
# Script PowerShell para executar scripts SQL no banco
# Execute este script no PowerShell para criar as funções no banco
# ============================================================

param(
    [string]$Server = "localhost",
    [string]$Database = "qualidade_ar",
    [string]$User = "Vinicius",
    [string]$Password = "Vinicius@123"
)

$ScriptsPath = $PSScriptRoot

# Ordem de execução dos scripts
$scripts = @(
    "00_master.sql",
    "01_funcoes_iqar.sql",
    "02_procedures.sql",
    "03_triggers.sql",
    "04_views.sql",
    "05_seed_dados.sql",
    "06_jobs_manutencao.sql"
)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  EXECUTANDO SCRIPTS SQL - QUALIDADE DO AR" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Servidor: $Server"
Write-Host "Banco: $Database"
Write-Host "Usuario: $User"
Write-Host ""

foreach ($script in $scripts) {
    $scriptPath = Join-Path $ScriptsPath $script
    
    if (Test-Path $scriptPath) {
        Write-Host "Executando: $script ... " -NoNewline -ForegroundColor Yellow
        
        try {
            # Usar sqlcmd se disponível
            $result = & sqlcmd -S $Server -d $Database -U $User -P $Password -i $scriptPath -b 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "OK" -ForegroundColor Green
            } else {
                Write-Host "ERRO" -ForegroundColor Red
                Write-Host $result -ForegroundColor Red
            }
        }
        catch {
            Write-Host "ERRO: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "Arquivo não encontrado: $script" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  EXECUÇÃO CONCLUÍDA" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para verificar, execute no SSMS:" -ForegroundColor Gray
Write-Host "  SELECT * FROM vw_dashboard_resumo;" -ForegroundColor White
Write-Host "  SELECT * FROM vw_iqar_estacoes;" -ForegroundColor White
Write-Host ""
