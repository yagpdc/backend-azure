# Script PowerShell para marcar usuário como online

param(
    [Parameter(Mandatory=$true)]
    [string]$UserId
)

Write-Host "🔄 Marcando usuário $UserId como online..." -ForegroundColor Yellow

$body = @{
    userId = $UserId
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/online" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body

    Write-Host ""
    Write-Host "✅ Sucesso!" -ForegroundColor Green
    Write-Host "Usuário: $($response.userId)"
    Write-Host "Online: $($response.isOnline)"
    Write-Host "Total Online: $($response.totalOnline)"
    Write-Host ""
    Write-Host "Acesse http://localhost:3000/words/ranking para verificar" -ForegroundColor Cyan
}
catch {
    Write-Host ""
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Certifique-se de que o servidor está rodando em http://localhost:3000" -ForegroundColor Yellow
}
