[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9]{8}-[0-9]{6}$')]
    [string]$ReleaseId,

    [string]$KeyPath = 'D:\sshKey',
    [string]$SshHost = 'root@47.109.145.141',
    [string]$ArchivePath = ''
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$deployScript = Join-Path $PSScriptRoot 'deploy-asgard-docs.sh'
$nginxConfig = Join-Path $PSScriptRoot 'asgard.benlampson.cn.conf'

if ([string]::IsNullOrWhiteSpace($ArchivePath)) {
    $ArchivePath = Join-Path $env:TEMP "asgard-docs-$ReleaseId.tgz"
}

foreach ($requiredPath in @('dist/static', $deployScript, $nginxConfig, $KeyPath)) {
    if (-not (Test-Path -LiteralPath (Join-Path $repositoryRoot $requiredPath) -PathType Any) -and
        -not (Test-Path -LiteralPath $requiredPath -PathType Any)) {
        throw "Required deployment input is missing: $requiredPath"
    }
}

Push-Location $repositoryRoot
try {
    Write-Host "Packaging dist/static as $ArchivePath"
    tar -czf $ArchivePath -C dist/static .
    if ($LASTEXITCODE -ne 0) { throw "tar failed with exit code $LASTEXITCODE" }

    scp -i $KeyPath $ArchivePath "$SshHost`:/tmp/"
    if ($LASTEXITCODE -ne 0) { throw "scp archive failed with exit code $LASTEXITCODE" }

    scp -i $KeyPath $nginxConfig "$SshHost`:/tmp/asgard.benlampson.cn.conf"
    if ($LASTEXITCODE -ne 0) { throw "scp Nginx config failed with exit code $LASTEXITCODE" }

    $bash = (Get-Content -Raw -LiteralPath $deployScript).Replace("`r", '')
    $bash | ssh -i $KeyPath $SshHost "bash -s -- $ReleaseId /tmp/asgard-docs-$ReleaseId.tgz /tmp/asgard.benlampson.cn.conf"
    if ($LASTEXITCODE -ne 0) { throw "remote deployment failed with exit code $LASTEXITCODE" }

    Write-Host "Deployment completed: $ReleaseId"
}
finally {
    Pop-Location
}
